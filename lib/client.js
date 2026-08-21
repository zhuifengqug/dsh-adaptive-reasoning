window.__ModuleLoader__.load({
  id: 'dsh-adaptive-reasoning',
  factory: (require) => {
    const React = require('react')
    const { createRoot } = require('react-dom/client')
    const STYLE_ID = 'dsh-adaptive-reasoning/styles'
    const EFFORT_LABELS = new Set(['推理等级', 'Effort'])

    if (typeof document !== 'undefined' && document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) === null) {
      const style = document.createElement('style')
      style.dataset.pluginCss = STYLE_ID
      style.textContent = `
        .dar-host { position: fixed; z-index: 10000; pointer-events: none; }
        .dar-panel { width: min(304px, calc(100vw - 24px)); pointer-events: auto; padding: 12px; border: 1px solid var(--dsw-alias-border-inverted); border-radius: 8px; background: var(--dsw-specific-menu); box-shadow: var(--dsw-shadow-lv3); color: var(--dsw-alias-label-primary); }
        .dar-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 0 0 8px; }
        .dar-title { color: var(--dsw-alias-label-tertiary); font-size: 12px; font-weight: 600; line-height: 18px; }
        .dar-value { overflow: hidden; color: var(--dsw-alias-label-primary); font-size: 14px; font-weight: 600; line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
        .dar-description { min-height: 18px; margin: -3px 0 8px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
        .dar-track { position: relative; display: grid; align-items: end; height: 56px; }
        .dar-track::before { position: absolute; right: 9px; bottom: 8px; left: 9px; height: 4px; border-radius: 999px; background: var(--dsw-alias-border-l2); content: ''; }
        .dar-fill { position: absolute; left: 9px; bottom: 8px; height: 4px; border-radius: 999px; background: var(--dsw-alias-state-info-primary); pointer-events: none; }
        .dar-flame-canvas { position: absolute; left: 9px; right: 9px; top: 0; bottom: 0; pointer-events: none; }
        .dar-range { position: relative; z-index: 1; width: 100%; height: 56px; margin: 0; cursor: pointer; accent-color: var(--dsw-alias-state-info-primary); }
        .dar-range--hidden { opacity: 0; }
        .dar-range:disabled { cursor: progress; }
        .dar-ticks { position: absolute; right: 9px; bottom: 2px; left: 9px; display: flex; justify-content: space-between; color: var(--dsw-alias-label-caption); font-size: 11px; line-height: 16px; pointer-events: none; }
        .dar-tick { overflow: hidden; max-width: 54px; text-overflow: ellipsis; white-space: nowrap; }
        .dar-tick:first-child { text-align: left; transform: translateX(-3px); }
        .dar-tick:last-child { text-align: right; transform: translateX(3px); }
        .dar-status { padding: 8px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 20px; }
        .dar-error { color: var(--dsw-alias-state-error-primary); }
        .dar-declare { margin-top: 10px; padding: 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-interactive-bg-hover); }
        .dar-declareHint { display: block; margin-bottom: 8px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
        .dar-declareRow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .dar-declareButton { flex: 0 0 auto; padding: 4px 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-interactive-bg); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
        .dar-declareButton:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
        .dar-declareButton:disabled { color: var(--dsw-alias-label-dimmed); cursor: progress; }
        .dar-menu-entry { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 38px; margin-top: 4px; padding: 6px 8px; border: none; border-radius: 10px; background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; line-height: 22px; text-align: left; cursor: pointer; }
        .dar-menu-entry:hover { background: var(--dsw-alias-interactive-bg); }
      `
      document.head.appendChild(style)
    }

    const label = (id) => ({ off: 'Off', minimal: 'Minimal', low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra high', max: 'Max' })[id] || id

    function panelCopy() {
      return document.documentElement.lang.toLowerCase().startsWith('zh')
        ? {
            title: '推理等级',
            loading: '正在读取模型能力…',
            empty: '当前模型未提供可调节的推理等级。',
            error: '无法更新推理等级。',
            autoHint: '此模型未声明推理档位——可按模型家族自动补全（deepseek/qwen/glm/claude/grok → off/low/high/max 等），并写入 llm-pi-ai 配置。',
            autoButton: '自动补全',
            autoEntry: '自动补全推理档位',
            autoWorking: '正在补全并写入配置…',
            autoBridgeFail: '当前环境无法触发自动补全（remote 服务不可用）。',
          }
        : {
            title: 'Reasoning effort',
            loading: 'Loading model capabilities…',
            empty: 'This model provides no adjustable reasoning effort.',
            error: 'Unable to update reasoning effort.',
            autoHint: 'This model declares no reasoning efforts — auto-declare by model family (deepseek/qwen/glm/claude/grok → off/low/high/max, etc.) and write it into the llm-pi-ai config.',
            autoButton: 'Auto-declare',
            autoEntry: 'Auto-declare reasoning effort',
            autoWorking: 'Declaring and writing config…',
            autoBridgeFail: 'Cannot trigger auto-declare in this environment (remote service unavailable).',
          }
    }

    function currentModel(directory) {
      if (directory === null || directory.current === null) return null
      for (const group of directory.groups || []) {
        const model = (group.models || []).find(candidate => candidate.id === directory.current.model)
        if (group.id === directory.current.provider && model !== undefined) return { group, model, current: directory.current }
      }
      return null
    }

    // -------------------------------------------------------------------------
    // Flame renderer: canvas-based animated flame that visualises effort level.
    // -------------------------------------------------------------------------
    function readCssColor(variable) {
      try {
        const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
        if (!raw) return null
        const probe = document.createElement('div')
        probe.style.position = 'absolute'
        probe.style.visibility = 'hidden'
        probe.style.color = raw
        document.body.appendChild(probe)
        const computed = getComputedStyle(probe).color
        document.body.removeChild(probe)
        return computed
      } catch {
        return null
      }
    }

    class FlameRenderer {
      constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d', { alpha: true })
        this.intensity = 0
        this.time = 0
        this.running = false
        this.particles = Array.from({ length: 70 }, () => this.makeParticle())
        this.slotColor = readCssColor('--dsw-alias-border-l2') || 'rgba(128,128,128,0.35)'
        this.handleResize = () => this.resize()
        if (typeof window !== 'undefined') window.addEventListener('resize', this.handleResize)
        this.resize()
      }

      destroy() {
        this.stop()
        if (typeof window !== 'undefined') window.removeEventListener('resize', this.handleResize)
      }

      resize() {
        const rect = this.canvas.getBoundingClientRect()
        const dpr = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 2)
        this.width = rect.width
        this.height = rect.height
        this.canvas.width = Math.max(1, Math.floor(rect.width * dpr))
        this.canvas.height = Math.max(1, Math.floor(rect.height * dpr))
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }

      makeParticle() {
        return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, active: false }
      }

      spawnParticle(originX, originY, intensity) {
        const p = this.particles.find(candidate => !candidate.active)
        if (p === undefined) return
        p.active = true
        p.x = originX + (Math.random() - 0.5) * (10 + intensity * 28)
        p.y = originY
        p.vx = (Math.random() - 0.5) * 0.7
        p.vy = -0.6 - Math.random() * (0.8 + intensity * 1.6)
        p.maxLife = 0.35 + Math.random() * (0.55 + intensity * 0.7)
        p.life = p.maxLife
        p.size = 0.8 + Math.random() * (1.2 + intensity * 1.8)
      }

      setIntensity(intensity) {
        this.intensity = Math.max(0, Math.min(1, intensity))
      }

      start() {
        if (this.running) return
        this.running = true
        const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduced) {
          this.draw(true)
          return
        }
        const loop = () => {
          if (!this.running) return
          this.draw(false)
          this.time += 1
          requestAnimationFrame(loop)
        }
        requestAnimationFrame(loop)
      }

      stop() {
        this.running = false
      }

      palette(intensity) {
        // Cold grey-blue at 0, through orange/yellow, to red/white-hot at 1.
        const hue = 215 - intensity * 215
        const sat = 8 + intensity * 92
        const lit = 74 - intensity * 18
        return { hue, sat, lit }
      }

      draw(staticOnly) {
        if (this.width <= 0 || this.height <= 0) this.resize()
        const { ctx, width, height, intensity } = this
        if (width <= 0 || height <= 0) return

        ctx.globalCompositeOperation = 'source-over'
        if (staticOnly) {
          ctx.clearRect(0, 0, width, height)
        } else {
          // Light trail for smooth flame motion.
          ctx.fillStyle = 'rgba(0,0,0,0.22)'
          ctx.fillRect(0, 0, width, height)
        }

        const baseY = height - 10
        const trackLeft = 9
        const trackRight = width - 9
        const trackWidth = Math.max(1, trackRight - trackLeft)
        const pal = this.palette(intensity)

        // Fuel slot.
        this.roundRect(trackLeft, baseY - 2, trackWidth, 4, 2, this.slotColor)

        if (intensity < 0.02) {
          // Extinguished ember at the current thumb position.
          const x = trackLeft + intensity * trackWidth
          ctx.beginPath()
          ctx.arc(x, baseY, 2.2, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${pal.hue}, ${pal.sat}%, ${pal.lit}%, 0.55)`
          ctx.fill()
          return
        }

        // Pulsing base glow.
        const pulse = staticOnly ? 1 : 0.85 + Math.sin(this.time * 0.12) * 0.15
        const glowGradient = ctx.createRadialGradient(width / 2, baseY, 2, width / 2, baseY, trackWidth * 0.55)
        glowGradient.addColorStop(0, `hsla(${pal.hue}, ${pal.sat}%, ${pal.lit + 12}%, ${(0.18 + intensity * 0.32) * pulse})`)
        glowGradient.addColorStop(1, `hsla(${pal.hue}, ${pal.sat}%, ${pal.lit}%, 0)`)
        ctx.fillStyle = glowGradient
        ctx.fillRect(0, 0, width, height)

        // Main flame body, drawn with additive blending.
        ctx.globalCompositeOperation = 'lighter'
        const flameHeight = 12 + intensity * (height - 26)
        const slices = Math.max(24, Math.floor(trackWidth / 3.5))

        for (let layer = 0; layer < 3; layer++) {
          const layerHue = pal.hue + layer * 10
          const layerAlpha = 0.5 - layer * 0.1
          const layerHeight = flameHeight * (1 - layer * 0.15)

          for (let i = 0; i <= slices; i++) {
            const t = i / slices
            const x = trackLeft + t * trackWidth
            const normalizedX = t * 2 - 1
            const bell = Math.exp(-normalizedX * normalizedX * (1.3 + intensity * 0.8))
            const noise = staticOnly ? 0 : Math.sin(this.time * 0.14 + t * 9 + layer * 2.3) * (2 + intensity * 4)
            const h = Math.max(0, layerHeight * bell + noise)
            if (h < 1) continue

            const grad = ctx.createLinearGradient(x, baseY, x, baseY - h)
            grad.addColorStop(0, `hsla(${layerHue}, ${pal.sat}%, ${Math.min(100, pal.lit + 12)}%, ${layerAlpha})`)
            grad.addColorStop(0.55, `hsla(${layerHue - 10}, ${pal.sat}%, ${pal.lit}%, ${layerAlpha * 0.75})`)
            grad.addColorStop(1, `hsla(${layerHue - 22}, ${pal.sat}%, ${pal.lit - 8}%, 0)`)

            const w = trackWidth / slices + 1
            ctx.fillStyle = grad
            ctx.fillRect(x - w / 2, baseY - h, w, h)
          }
        }

        if (staticOnly || intensity < 0.12) return

        // Spark particles.
        const spawnRate = 0.04 + intensity * 0.32
        if (Math.random() < spawnRate) {
          this.spawnParticle(trackLeft + intensity * trackWidth, baseY - flameHeight * 0.55, intensity)
        }

        for (const p of this.particles) {
          if (!p.active) continue
          p.life -= staticOnly ? 0 : 0.016
          if (p.life <= 0) { p.active = false; continue }
          if (!staticOnly) {
            p.x += p.vx + Math.sin(this.time * 0.11 + p.y * 0.12) * 0.25
            p.y += p.vy
          }
          const lifeRatio = p.life / p.maxLife
          const alpha = lifeRatio * (0.35 + intensity * 0.5)
          const size = p.size * lifeRatio
          ctx.beginPath()
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${pal.hue - 8}, ${pal.sat}%, ${Math.min(100, pal.lit + 18)}%, ${alpha})`
          ctx.fill()
        }
      }

      roundRect(x, y, w, h, r, color) {
        const ctx = this.ctx
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y)
        ctx.quadraticCurveTo(x + w, y, x + w, y + r)
        ctx.lineTo(x + w, y + h - r)
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
        ctx.lineTo(x + r, y + h)
        ctx.quadraticCurveTo(x, y + h, x, y + h - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()
        ctx.fillStyle = color
        ctx.fill()
      }
    }

    function EffortPanel({ api, remote, sessionId, close }) {
      const [directory, setDirectory] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [draft, setDraft] = React.useState(0)
      const [busy, setBusy] = React.useState(false)
      const [declaring, setDeclaring] = React.useState(false)
      const canvasRef = React.useRef(null)
      const rendererRef = React.useRef(null)
      const intensityRef = React.useRef(0)
      const copy = panelCopy()
      const loadDirectory = (aliveRef) => {
        api.sessions.models({ sessionId }).then(response => {
          if (!aliveRef.live) return
          if (response.result.ok) setDirectory(response.result.value)
          else setError(response.result.error.message)
        }, cause => { if (aliveRef.live) setError(String(cause)) })
      }
      React.useEffect(() => {
        const alive = { live: true }
        loadDirectory(alive)
        return () => { alive.live = false }
      }, [api, sessionId])
      const selection = currentModel(directory)
      const reasoning = selection?.model.reasoning
      const efforts = reasoning?.efforts || []
      const effective = selection?.current.reasoningEffort ?? reasoning?.defaultEffort
      const selected = Math.max(0, efforts.findIndex(effort => effort.id === effective))
      React.useEffect(() => { setDraft(selected) }, [selected, efforts.length])

      // Initialise flame renderer via callback ref so it is created the moment
      // the canvas mounts (after directory loads), not only on first render.
      // useCallback keeps the ref stable across re-renders so React does not
      // tear down and rebuild the renderer on every state change.
      const setCanvas = React.useCallback((node) => {
        canvasRef.current = node
        if (node !== null && rendererRef.current === null) {
          const renderer = new FlameRenderer(node)
          rendererRef.current = renderer
          renderer.setIntensity(intensityRef.current)
          renderer.start()
        }
        if (node === null && rendererRef.current !== null) {
          rendererRef.current.destroy()
          rendererRef.current = null
        }
      }, [])

      // Keep flame intensity in sync with the slider draft.
      React.useEffect(() => {
        const intensity = efforts.length > 1 ? draft / (efforts.length - 1) : 0
        intensityRef.current = intensity
        rendererRef.current?.setIntensity(intensity)
      }, [draft, efforts.length])

      if (error !== null) return React.createElement('div', { className: 'dar-status dar-error', role: 'alert' }, `${copy.error} ${error}`)
      if (directory === null) return React.createElement('div', { className: 'dar-status' }, copy.loading)
      if (selection === null) return React.createElement('div', { className: 'dar-status' }, copy.empty)
      const runAutoDeclare = async () => {
        if (selection === null) return
        setBusy(true)
        setDeclaring(true)
        setError(null)
        try {
          const commands = remote && remote.commands
          if (!commands) throw new Error(copy.autoBridgeFail)
          const execution = await commands.execute(sessionId, `/adaptive-reasoning-declare ${selection.group.id}`)
          if (execution == null || execution.result == null) throw new Error(copy.autoBridgeFail)
          if (execution.result.kind !== 'success') throw new Error(execution.result.text || copy.error)
          const alive = { live: true }
          loadDirectory(alive)
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setBusy(false)
          setDeclaring(false)
        }
      }
      if (efforts.length === 0) {
        return React.createElement('div', { className: 'dar-panel', role: 'dialog', 'aria-label': copy.title },
          React.createElement('div', { className: 'dar-heading' },
            React.createElement('span', { className: 'dar-title' }, copy.title),
            React.createElement('span', { className: 'dar-value' }, '—')),
          React.createElement('div', { className: 'dar-status' }, copy.empty),
          React.createElement('div', { className: 'dar-declare' },
            React.createElement('span', { className: 'dar-declareHint' },
              declaring ? copy.autoWorking : copy.autoHint),
            React.createElement('div', { className: 'dar-declareRow' },
              React.createElement('button', {
                type: 'button',
                className: 'dar-declareButton',
                disabled: busy,
                onClick: () => { void runAutoDeclare() },
              }, copy.autoButton))))
      }
      if (efforts.length === 1) return React.createElement('div', { className: 'dar-status' }, `${copy.title}: ${efforts[0].name || label(efforts[0].id)}`)
      const value = efforts[draft] || efforts[selected]
      const percent = (draft / (efforts.length - 1)) * 100
      const submit = async (index) => {
        const effort = efforts[index]
        if (effort === undefined || selection === null) return
        setBusy(true)
        setError(null)
        try {
          const response = await api.sessions.selectModel({ sessionId, provider: selection.current.provider, model: selection.current.model, reasoningEffort: effort.id })
          if (!response.result.ok) throw new Error(response.result.error.message)
          setDirectory(previous => previous === null ? previous : { ...previous, current: { ...previous.current, reasoningEffort: effort.id } })
        } catch (cause) {
          setDraft(selected)
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally { setBusy(false) }
      }
      return React.createElement('div', { className: 'dar-panel', role: 'dialog', 'aria-label': copy.title },
        React.createElement('div', { className: 'dar-heading' },
          React.createElement('span', { className: 'dar-title' }, copy.title),
          React.createElement('span', { className: 'dar-value', 'aria-live': 'polite' }, value.name || label(value.id))),
        value.description ? React.createElement('div', { className: 'dar-description' }, value.description) : null,
        React.createElement('div', { className: 'dar-track' },
          React.createElement('div', { className: 'dar-fill', style: { width: `calc(${percent}% - ${percent === 0 ? 0 : 9}px)` } }),
          React.createElement('canvas', { className: 'dar-flame-canvas', ref: setCanvas, 'aria-hidden': true }),
          React.createElement('input', { className: 'dar-range dar-range--hidden', type: 'range', min: 0, max: efforts.length - 1, step: 1, value: draft, disabled: busy, 'aria-label': copy.title, 'aria-valuetext': value.name || label(value.id), onChange: event => setDraft(Number(event.target.value)), onPointerUp: event => { void submit(Number(event.currentTarget.value)) }, onKeyUp: event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) void submit(Number(event.currentTarget.value)) } }),
          React.createElement('div', { className: 'dar-ticks', 'aria-hidden': true }, efforts.map(effort => React.createElement('span', { className: 'dar-tick', key: effort.id }, effort.name || label(effort.id))))))
    }

    const inject = ['connection', 'sessions', 'remote']
    function apply(ctx) {
      const host = document.createElement('div')
      host.className = 'dar-host'
      document.body.appendChild(host)
      let root = null
      const api = ctx.get('connection').api
      const sessionOf = () => ctx.get('sessions').list.getSnapshot().current
      const hide = () => { root?.unmount(); root = null }
      const show = (sessionId, anchor) => {
        const rect = anchor.getBoundingClientRect()
        const width = Math.min(304, window.innerWidth - 24)
        host.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`
        host.style.top = `${rect.top > 180 ? Math.max(12, rect.top - 176) : Math.min(window.innerHeight - 176, rect.bottom + 8)}px`
        if (root === null) root = createRoot(host)
        root.render(React.createElement(EffortPanel, {
          api,
          remote: ctx.get('remote') ?? ctx.remote,
          sessionId,
          close: hide,
        }))
      }
      // For a model with no reasoning metadata the official menu has no
      // "推理等级" row, so the panel would be unreachable. When such an open
      // model menu mounts, inject an "auto-declare" entry that opens the panel.
      const ensureDeclareEntry = (sessionId) => {
        if (sessionId === undefined || api === undefined) return
        api.sessions.models({ sessionId }).then((response) => {
          if (!response.result.ok) return
          const selection = currentModel(response.result.value)
          if (selection === null) return
          const efforts = selection.model.reasoning?.efforts || []
          if (efforts.length > 0) return
          const menu = Array.from(document.querySelectorAll('[role="menu"]')).find((m) =>
            m.offsetParent !== null
            && Array.from(m.querySelectorAll('button[role="menuitem"]')).some((b) => /^(模型|Model)$/.test((b.textContent || '').trim())))
          if (menu === undefined) return
          if (menu.querySelector('[data-adaptive-declare-entry]') !== null) return
          const entry = document.createElement('button')
          entry.type = 'button'
          entry.setAttribute('role', 'menuitem')
          entry.dataset.adaptiveDeclareEntry = ''
          entry.className = 'dar-menu-entry'
          entry.textContent = panelCopy().autoEntry
          menu.appendChild(entry)
        }, () => {})
      }
      const onClick = (event) => {
        const target = event.target instanceof Element ? event.target : null
        if (target === null || host.contains(target)) return
        const sessionId = sessionOf()
        if (sessionId === undefined) return
        const injected = target.closest('[data-adaptive-declare-entry]')
        if (injected instanceof Element) {
          event.preventDefault(); event.stopPropagation(); show(sessionId, injected)
          return
        }
        const menuTrigger = target.closest('button[aria-haspopup="menu"]')
        if (menuTrigger instanceof Element) {
          setTimeout(() => ensureDeclareEntry(sessionId), 0)
        }
        const row = target.closest('button[role="menuitem"]')
        if (row === null) { hide(); return }
        const text = (row.textContent || '').trim()
        if (![...EFFORT_LABELS].some(value => text.startsWith(value))) return
        event.preventDefault(); event.stopPropagation(); show(sessionId, row)
      }
      document.addEventListener('click', onClick, true)
      ctx.effect(() => () => { document.removeEventListener('click', onClick, true); hide(); host.remove() }, 'adaptive-reasoning: effort panel')
    }
    return { inject, apply }
  },
})
