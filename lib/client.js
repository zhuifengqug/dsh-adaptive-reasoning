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
        .dar-track { position: relative; display: grid; align-items: center; height: 34px; }
        .dar-track::before { position: absolute; right: 9px; left: 9px; height: 4px; border-radius: 999px; background: var(--dsw-alias-border-l2); content: ''; }
        .dar-fill { position: absolute; left: 9px; height: 4px; border-radius: 999px; background: var(--dsw-alias-state-info-primary); pointer-events: none; }
        .dar-range { position: relative; z-index: 1; width: 100%; height: 34px; margin: 0; cursor: pointer; accent-color: var(--dsw-alias-state-info-primary); }
        .dar-range:disabled { cursor: progress; }
        .dar-ticks { position: absolute; right: 9px; bottom: 0; left: 9px; display: flex; justify-content: space-between; color: var(--dsw-alias-label-caption); font-size: 11px; line-height: 16px; pointer-events: none; }
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
        @media (prefers-reduced-motion: no-preference) { .dar-fill { transition: width 140ms ease; } }
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

    function EffortPanel({ api, remote, sessionId, close }) {
      const [directory, setDirectory] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [draft, setDraft] = React.useState(0)
      const [busy, setBusy] = React.useState(false)
      const [declaring, setDeclaring] = React.useState(false)
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
          React.createElement('input', { className: 'dar-range', type: 'range', min: 0, max: efforts.length - 1, step: 1, value: draft, disabled: busy, 'aria-label': copy.title, 'aria-valuetext': value.name || label(value.id), onChange: event => setDraft(Number(event.target.value)), onPointerUp: event => { void submit(Number(event.currentTarget.value)) }, onKeyUp: event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) void submit(Number(event.currentTarget.value)) } }),
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
