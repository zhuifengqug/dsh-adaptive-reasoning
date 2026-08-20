import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const name = 'adaptive-reasoning'
export const inject = ['settings', 'commands']

const PI_AI_NS = 'llm-pi-ai'
const LEVELS = new Set(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
const CACHE_FILE = join(tmpdir(), 'dsh-adaptive-reasoning-models-dev.json')
const DEFAULT_CACHE_HOURS = 24
const MODELS_DEV_URL = 'https://models.dev/api.json'

/** Normalize common deployment suffixes without guessing across unrelated models. */
function normalizedId(id) {
  return id.toLowerCase()
    .replace(/-openai-compact$/, '')
    .replace(/-latest$/, '')
    .replace(/-\d{8}$/, '')
}

/** Return the sole exact or normalized catalog hit; ambiguity deliberately stays unresolved. */
export function findModel(catalog, modelId) {
  const id = normalizedId(modelId)
  const exact = catalog.get(id)
  if (exact !== undefined) return exact
  const hits = [...catalog.entries()].filter(([candidate]) => normalizedId(candidate) === id)
  return hits.length === 1 ? hits[0][1] : undefined
}

/** Translate models.dev reasoning metadata to the opaque ids published by pi-ai. */
export function reasoningEfforts(entry) {
  if (entry === null || typeof entry !== 'object') return undefined
  const options = Array.isArray(entry.reasoning_options) ? entry.reasoning_options : []
  const values = []
  let toggle = false
  for (const option of options) {
    if (option !== null && typeof option === 'object' && option.type === 'toggle') toggle = true
    if (option !== null && typeof option === 'object' && option.type === 'effort' && Array.isArray(option.values)) {
      for (const value of option.values) if (typeof value === 'string') values.push(value)
    }
  }
  if (entry.reasoning !== true && values.length === 0 && !toggle) return undefined
  const mapped = {}
  if (toggle) mapped.off = null
  for (const value of values) {
    const id = value === 'none' ? 'off' : value
    if (LEVELS.has(id)) mapped[id] = id === 'off' ? null : id
  }
  const ids = Object.keys(mapped)
  return ids.length === 0 || (ids.length === 1 && ids[0] === 'off') ? undefined : mapped
}

function indexCatalog(document) {
  const catalog = new Map()
  for (const provider of Object.values(document ?? {})) {
    if (provider === null || typeof provider !== 'object' || provider.models === null || typeof provider.models !== 'object') continue
    for (const [id, entry] of Object.entries(provider.models)) {
      const efforts = reasoningEfforts(entry)
      if (efforts !== undefined) catalog.set(id.toLowerCase(), efforts)
    }
  }
  return catalog
}

function cacheHours(config) {
  const hours = Number(config?.cacheHours)
  return Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_CACHE_HOURS
}

async function loadCatalog(config) {
  const freshness = cacheHours(config) * 60 * 60 * 1000
  try {
    const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
    if (Date.now() - cached.fetchedAt < freshness && cached.document !== undefined) return cached.document
  } catch {
    // A cache miss is expected on first run.
  }
  const response = await fetch(MODELS_DEV_URL, {
    signal: AbortSignal.timeout(15_000),
    headers: { 'User-Agent': 'dsh-adaptive-reasoning' },
  })
  if (!response.ok) throw new Error(`models.dev returned ${response.status}`)
  const document = await response.json()
  try {
    mkdirSync(tmpdir(), { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: Date.now(), document }))
  } catch {
    // Cache persistence is optional and must not prevent enrichment.
  }
  return document
}

// ---- Mode C: family-based conservative declaration (models.dev first, else family heuristic).

const DEEPSEEK_STYLE = ['deepseek', 'qwen', 'glm', 'claude', 'grok']
const OPENAI_STYLE = ['gpt', 'gemini', 'minimax', 'step', 'kimi', 'moonshot', 'mimo', 'mistral', 'yi', 'baichuan', 'hunyuan']
const IMAGE_HINT = /\b(image|img|dalle|dall-e|flux|sdxl|sana)\b/

/** Conservative per-family effort sets, mirroring the manual declaration applied for relays. */
export function familyEfforts(modelId) {
  const bare = String(modelId).slice(String(modelId).lastIndexOf('/') + 1).toLowerCase()
  if (IMAGE_HINT.test(bare)) return undefined
  if (DEEPSEEK_STYLE.some(keyword => bare.includes(keyword))) return { off: null, low: 'low', high: 'high', max: 'max' }
  if (OPENAI_STYLE.some(keyword => bare.includes(keyword))) return { off: null, low: 'low', medium: 'medium', high: 'high' }
  return undefined
}

/** Mode C: a confident models.dev hit wins; otherwise the family heuristic decides. */
export function effortsForModel(catalog, modelId) {
  const fromCatalog = findModel(catalog, modelId)
  if (fromCatalog !== undefined) return fromCatalog
  return familyEfforts(modelId)
}

/**
 * Auto-declare `reasoningEfforts` for one provider's models that still lack
 * one. Never touches models that already declare efforts. Mode C source: a
 * confident models.dev match if the catalog is reachable, else the family
 * heuristic. The caller (the /adaptive-reasoning-declare command) is an
 * explicit user action, so no global opt-in gates it.
 * @param ctx - plugin context with the settings service.
 * @param providerId - route key in the llm-pi-ai section.
 * @param config - plugin config (cacheHours).
 * @returns a human-readable outcome ({ok, text}).
 */
export async function autoDeclareProvider(ctx, providerId, config = {}) {
  const section = ctx.settings.get(PI_AI_NS)
  const provider = section?.providers?.[providerId]
  if (provider === null || typeof provider !== 'object') {
    return { ok: false, text: `供应商 "${providerId}" 不在 llm-pi-ai 配置中` }
  }
  if (!Array.isArray(provider.models) || provider.models.length === 0) {
    return { ok: false, text: `供应商 "${providerId}" 没有可声明的模型列表` }
  }
  let catalog = new Map()
  try {
    catalog = indexCatalog(await loadCatalog(config))
  } catch {
    // The catalog is best-effort; the family heuristic covers a miss.
  }
  const declared = []
  const skipped = []
  const models = provider.models.map((model) => {
    if (model === null || typeof model !== 'object' || typeof model.id !== 'string') return model
    if (model.reasoningEfforts !== undefined) {
      skipped.push(model.id)
      return model
    }
    const efforts = effortsForModel(catalog, model.id)
    if (efforts === undefined) {
      skipped.push(model.id)
      return model
    }
    declared.push(model.id)
    return { ...model, reasoningEfforts: efforts }
  })
  if (declared.length === 0) {
    return { ok: false, text: `供应商 "${providerId}" 没有需要补全的模型（${skipped.length} 个已声明或无法推断）` }
  }
  await ctx.settings.mutate(PI_AI_NS, [{ op: 'set', path: ['providers', providerId, 'models'], value: models }])
  return { ok: true, text: `已为 "${providerId}" 补全 ${declared.length} 个模型：${declared.join(', ')}` }
}

/** Host half. The declare command is an explicit user action and always registered. */
export function apply(ctx, config = {}) {
  ctx.inject(['commands'], (scope) => {
    scope.effect(() => scope.commands.register({
      name: 'adaptive-reasoning-declare',
      description: 'Auto-declare reasoning efforts for a custom pi-ai provider (models.dev first, then family heuristic)',
      input: { hint: 'provider' },
      recordInput: false,
      handler: async (invocation) => {
        const providerId = String(invocation.rawInput ?? '').trim()
        if (providerId.length === 0) {
          return { kind: 'error', text: '用法：/adaptive-reasoning-declare <provider>' }
        }
        try {
          const result = await autoDeclareProvider(ctx, providerId, config)
          return result.ok
            ? { kind: 'success', text: result.text }
            : { kind: 'error', text: result.text }
        } catch (error) {
          return { kind: 'error', text: `自动补全失败：${error instanceof Error ? error.message : String(error)}` }
        }
      },
    }), 'adaptive-reasoning: declare command')
  })

  // Startup models.dev enrichment stays opt-in exactly as before.
  if (config.enrichFromModelsDev !== true) return
  ctx.effect(() => {
    let cancelled = false
    const run = async () => {
      for (let attempt = 0; attempt < 30 && !cancelled; attempt += 1) {
        if (ctx.settings.get(PI_AI_NS) !== undefined) {
          try {
            const providers = ctx.settings.get(PI_AI_NS).providers ?? {}
            const results = await Promise.all(Object.keys(providers).map(async (providerId) => {
              const { ok } = await autoDeclareProvider(ctx, providerId, config)
              return ok ? providerId : null
            }))
            const changed = results.filter(value => value !== null)
            if (changed.length > 0) {
              ctx.logger?.info?.(`${name}: auto-declared reasoning efforts for ${changed.join(', ')}`)
            }
          } catch (error) {
            ctx.logger?.warn?.(`${name}: ${error instanceof Error ? error.message : String(error)}`)
          }
          return
        }
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    void run()
    return () => { cancelled = true }
  }, 'adaptive-reasoning: optional models.dev enrichment')
}
