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
        @font-face { font-family: 'PressStart2P'; src: url('https://cdn.jsdelivr.net/npm/@fontsource/press-start-2p@5.2.7/files/press-start-2p-latin-400-normal.woff2') format('woff2'); font-weight: normal; font-style: normal; font-display: swap; }
        @font-face { font-family: 'Zpix'; src: url('https://cdn.jsdelivr.net/gh/SolidZORO/zpix-pixel-font@3.1.11/website/zpix.woff2') format('woff2'); font-weight: normal; font-style: normal; font-display: swap; }
        .dar-host { position: fixed; z-index: 10000; pointer-events: none; }
        .dar-panel { width: min(274px, calc(100vw - 22px)); pointer-events: auto; padding: 12px 12px 11px; border: 2px solid #6a2c1e; border-radius: 0; background: #150a08; box-shadow: inset 0 0 0 2px #150a08, inset 0 0 0 4px #6a2c1e, 5px 5px 0 0 rgba(0, 0, 0, 0.55); color: #f0d8c8; font-family: 'PressStart2P', 'Zpix', 'Courier New', monospace; image-rendering: pixelated; }
        .dar-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 0 0 9px; }
        .dar-title { color: #b98a76; font-size: 10px; line-height: 14px; }
        .dar-value { overflow: hidden; color: #f0d8c8; font-size: 11px; line-height: 16px; text-overflow: ellipsis; white-space: nowrap; text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.6); }
        .dar-description { min-height: 14px; margin: -2px 0 9px; color: #b98a76; font-size: 8px; line-height: 14px; }
        .dar-track { position: relative; display: grid; align-items: end; height: 28px; border: 2px solid #2e2926; border-radius: 0; background: #070606; box-shadow: inset 0 0 0 2px #070606; image-rendering: pixelated; }
        .dar-cells { position: absolute; inset: 5px; display: flex; gap: 2px; pointer-events: none; }
        .dar-cell { flex: 1; min-width: 4px; border: 1px solid #292522; background: #11100f; }
        .dar-flame-canvas { position: absolute; inset: 0; width: 100%; height: 100%; mix-blend-mode: screen; pointer-events: none; image-rendering: pixelated; }
        .dar-range { position: relative; z-index: 1; width: 100%; height: 28px; margin: 0; cursor: pointer; }
        .dar-range--hidden { opacity: 0; }
        .dar-range:disabled { cursor: progress; }
        .dar-labels { display: flex; justify-content: space-between; margin: 0 2px 5px; color: #b98a76; font-size: 8px; line-height: 12px; pointer-events: none; }
        .dar-tick { overflow: hidden; max-width: 50px; text-overflow: ellipsis; white-space: nowrap; }
        .dar-tick:first-child { text-align: left; }
        .dar-tick:last-child { text-align: right; }
        .dar-status { padding: 7px 0 0; color: #b98a76; font-size: 10px; line-height: 14px; }
        .dar-error { color: #ff6a4a; }
        .dar-declare { margin-top: 9px; padding: 7px; border: 2px solid #3a1c14; background: #1a0d0a; }
        .dar-declareHint { display: block; margin-bottom: 7px; color: #b98a76; font-size: 8px; line-height: 14px; }
        .dar-declareRow { display: flex; align-items: center; justify-content: space-between; gap: 7px; }
        .dar-declareButton { flex: 0 0 auto; padding: 5px 10px; border: 2px solid #6a2c1e; border-radius: 0; background: #2a1410; color: #f0d8c8; font: inherit; font-size: 10px; cursor: pointer; }
        .dar-declareButton:hover:not(:disabled) { background: #3a1c14; }
        .dar-declareButton:disabled { color: #6a4a3e; cursor: progress; }
        .dar-menu-entry { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 32px; margin-top: 4px; padding: 6px 7px; border: none; border-radius: 0; background: #1a0d0a; color: #f0d8c8; font-family: 'PressStart2P', 'Zpix', 'Courier New', monospace; font-size: 10px; line-height: 14px; text-align: left; cursor: pointer; }
        .dar-menu-entry:hover { background: #2a1410; }
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
    // WebGL2 fire shaders (three-pass ignition -> blur -> composite; the fire's
    // leading edge follows the slider value). Warm ember/orange/white palette.
    // -------------------------------------------------------------------------
    const VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main(){ v_uv=a_pos*0.5+0.5; gl_Position=vec4(a_pos,0.0,1.0); }
`

    const FRAG_SIM = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 fc;
uniform float u_time, u_slider, u_elapsed;
uniform sampler2D u_back;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 uv=v_uv;
  vec2 g=uv*vec2(72.0,6.0);
  vec2 id=floor(g);
  vec2 cf=fract(g);
  float h=hash(id);
  vec2 ap=abs(cf-0.5);
  float cell=smoothstep(0.34,0.22,max(ap.x*0.9,ap.y));
  vec3 prev=texture(u_back,uv).rgb;
  float fade_mask = smoothstep(0.0, 0.4, uv.x);
  vec3 decay = prev * 0.90 * fade_mask;
  float intensity = smoothstep(0.0, 0.2, u_slider) * mix(0.08, 1.0, pow(u_slider, 0.55));
  float t=u_time;
  float cellDelay = h * 1.2;
  float cellAge   = max(u_elapsed - cellDelay, 0.0);
  float ignited   = step(0.001, cellAge);
  float cellSpd   = 0.85 + h * 0.30;
  float eased = 1.0 - pow(1.0 - clamp(cellAge / 2.5, 0.0, 1.0), 3.0);
  float dist  = eased * u_slider * cellSpd * ignited;
  float cellOff = (h - 0.5) * 0.05;
  float front   = max(u_slider - dist - cellOff, 0.02);
  float tail    = max(u_slider - front, 0.001);
  float inZ   = step(front - 0.003, uv.x) * step(uv.x, u_slider + 0.003);
  float dn    = clamp(max(u_slider - uv.x, 0.0) / tail, 0.0, 1.0);
  float bright = pow(1.0 - dn, 0.65);
  bright = max(bright, 0.04 * ignited) * inZ;
  bright *= 1.0 - smoothstep(0.94, 1.05, dn);
  float es = mix(0.15, 0.5, min(u_elapsed / 1.0, 1.0));
  float vy = abs(uv.y - 0.5) * 2.0;
  float vf = pow(max(1.0 - vy * vy * 0.45, 0.0), 0.75);
  float ts = mix(0.85, 1.0, min(u_elapsed / 1.5, 1.0));
  float f1 = sin(uv.x * 30.0 + t * 15.0 * ts + h * 6.28);
  float f2 = sin(uv.x * 17.0 + t * 8.0 * ts + h * 3.14);
  float f3 = sin(uv.x * 52.0 + t * 25.0 * ts + h * 10.0);
  float flame = smoothstep(0.08, 0.92, (f1 + f2 * 0.5 + f3 * 0.25) * 0.35 + 0.5);
  float r1 = sin(dn * 16.0 - t * 5.0 * ts + h * 3.0);
  float r2 = sin(dn * 8.0 - t * 2.5 * ts + h * 5.0);
  float rhythm = smoothstep(-0.15, 0.55, r1) * (r2 * 0.5 + 0.5);
  rhythm = pow(max(rhythm, 0.0), 1.2);
  float avgSpd = dist / max(cellAge, 0.001);
  float age    = max(cellAge - max(u_slider - uv.x, 0.0) / max(avgSpd, 0.001), 0.0);
  float flash  = step(0.0, age) * exp(-age * 3.2);
  float sp  = fract(t * (0.38 + h * 0.15) + h * 7.0);
  float sX  = u_slider - sp * tail;
  float sY  = 0.5 + sin(sp * 11.0 + h * 6.28) * 0.28;
  float spark = smoothstep(0.014, 0.0, abs(uv.x - sX))
              * smoothstep(0.18, 0.0, abs(uv.y - sY))
              * (1.0 - sp) * (1.0 - sp) * es;
  float energy = bright * vf * (flame * 0.42 + rhythm * 0.38)
               + flash * bright * vf * 0.55
               + spark * 0.7 * inZ;
  energy *= es * intensity;
  float edgeBase = exp(-pow((uv.x - front) * 18.0, 2.0));
  float ef1 = sin(uv.x * 45.0 + t * 20.0 * ts + h * 6.28) * 0.5 + 0.5;
  float ef2 = sin(uv.x * 28.0 + t * 11.0 * ts + h * 3.14) * 0.5 + 0.5;
  float edge = edgeBase * (0.25 + ef1 * ef2 * 1.5) * 1.6 * intensity * es;
  float leadD    = front - uv.x;
  float leadZone = smoothstep(0.07, 0.0, leadD) * step(0.0, leadD) * vf;
  float h2       = hash(id + vec2(99.0, 33.0));
  float leadF    = sin(leadD * 100.0 + t * 20.0 * ts + h2 * 6.28) * 0.5 + 0.5;
  float leadSpark = leadZone * step(0.6, h2) * leadF * intensity * es * 0.5;
  float total = energy + edge + leadSpark;
  float heat = clamp(u_slider, 0.0, 1.0);
  vec3 ash   = vec3(0.018, 0.017, 0.016);
  vec3 coal  = vec3(0.075, 0.060, 0.052);
  vec3 ember = vec3(0.46, 0.025, 0.006);
  vec3 red   = vec3(0.95, 0.080, 0.010);
  vec3 hot   = vec3(1.0, 0.38, 0.035);
  vec3 tone  = mix(coal, ember, smoothstep(0.12, 0.62, heat));
  tone       = mix(tone, red, smoothstep(0.55, 0.95, heat));
  float temp = 1.0 - dn;
  vec3 col = mix(ash, tone, 0.22 + 0.78 * temp);
  col *= total;
  float pulse = sin(t * 2.8) * 0.15 + 1.0;
  float core  = exp(-pow((uv.x - u_slider) * 16.0, 2.0));
  vec3 coreTone = mix(red, hot, smoothstep(0.72, 1.0, heat));
  col += coreTone * core * 1.9 * pulse * intensity * es;
  col += ember * exp(-pow((uv.x - u_slider) * 3.5, 2.0)) * 0.10 * intensity * es;
  col *= cell;
  col *= fade_mask;
  fc = vec4(min(decay + col, vec3(1.5)), 1.0);
}
`

    const FRAG_BLUR = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 fc;
uniform sampler2D u_tex;
uniform vec2 u_dir, u_res;
uniform float u_ext;
vec3 s(vec2 uv){
  vec3 c=texture(u_tex,uv).rgb;
  return u_ext>0.5 && dot(c,vec3(0.2126,0.7152,0.0722))<0.3 ? vec3(0.0) : c;
}
void main(){
  vec2 o=u_dir*1.8/u_res;
  vec3 r=s(v_uv)*0.227027;
  r+=s(v_uv+o)*0.194595;    r+=s(v_uv-o)*0.194595;
  r+=s(v_uv+o*2.0)*0.121622;r+=s(v_uv-o*2.0)*0.121622;
  r+=s(v_uv+o*3.0)*0.054054;r+=s(v_uv-o*3.0)*0.054054;
  fc=vec4(r,1.0);
}
`

    const FRAG_COMP = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 fc;
uniform sampler2D u_scene, u_glow;
void main(){
  vec3 s=texture(u_scene,v_uv).rgb;
  vec3 g=texture(u_glow,v_uv).rgb;
  fc=vec4(1.0-exp(-(s+g*1.2+s*g*0.35)*1.15),1.0);
}
`

    // -------------------------------------------------------------------------
    // WebGL2 fire engine. Runs a single render loop for the canvas lifetime;
    // the slider target is read through getSlider() so value changes never
    // re-initialise the pipeline. Returns null when WebGL2 is unavailable
    // (the static base fill remains as fallback) or reduced motion is set.
    // -------------------------------------------------------------------------
    function createWebglFire(canvas, getSlider, getActive) {
      const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return null
      const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: false, antialias: false })
      if (gl === null) {
        console.warn('[adaptive-reasoning] fire: webgl2 unavailable (hardware acceleration off?)')
        return null
      }
      let rafId = null
      let resizeObserver = null
      let resizeDebounce = 0
      let loopRunning = false
      let idleFrames = 0
      let startTime = null
      let springValue = 0.7
      let springVelocity = 0
      let lastSpringTime = 0
      const MAX_IDLE = 180
      const SPRING_STIFFNESS = 7
      const SPRING_DAMP = 0.55
      const PIXEL_SIZE = 4
      let simProg = null
      let blurProg = null
      let compProg = null
      let vao = null
      let vbo = null
      let programsReady = false
      let simA = null
      let simB = null
      let blurH = null
      let blurV = null
      let simW = 0
      let simH = 0
      const U = {}

      const onContextLost = (event) => event.preventDefault()
      const onContextRestored = () => {
        programsReady = false
        compilePrograms()
        if (programsReady) {
          resize()
          if (getSlider() > 0) ensureLoop()
        }
      }

      function compileShader(type, src) {
        const sh = gl.createShader(type)
        if (sh === null) return null
        gl.shaderSource(sh, src)
        gl.compileShader(sh)
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          gl.deleteShader(sh)
          return null
        }
        return sh
      }

      function linkProgram(vsSrc, fsSrc) {
        const v = compileShader(gl.VERTEX_SHADER, vsSrc)
        const f = compileShader(gl.FRAGMENT_SHADER, fsSrc)
        if (v === null || f === null) return null
        const p = gl.createProgram()
        if (p === null) return null
        gl.attachShader(p, v)
        gl.attachShader(p, f)
        gl.bindAttribLocation(p, 0, 'a_pos')
        gl.linkProgram(p)
        gl.deleteShader(v)
        gl.deleteShader(f)
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null
        return p
      }

      function compilePrograms() {
        simProg = linkProgram(VERT, FRAG_SIM)
        blurProg = linkProgram(VERT, FRAG_BLUR)
        compProg = linkProgram(VERT, FRAG_COMP)
        if (simProg === null || blurProg === null || compProg === null) return
        vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1, -1, 1, -1, -1, 1,
          -1, 1, 1, -1, 1, 1,
        ]), gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        U.simTime = gl.getUniformLocation(simProg, 'u_time')
        U.simSlider = gl.getUniformLocation(simProg, 'u_slider')
        U.simElapsed = gl.getUniformLocation(simProg, 'u_elapsed')
        U.simBack = gl.getUniformLocation(simProg, 'u_back')
        U.blurDir = gl.getUniformLocation(blurProg, 'u_dir')
        U.blurExt = gl.getUniformLocation(blurProg, 'u_ext')
        U.blurTex = gl.getUniformLocation(blurProg, 'u_tex')
        U.blurRes = gl.getUniformLocation(blurProg, 'u_res')
        U.compScene = gl.getUniformLocation(compProg, 'u_scene')
        U.compGlow = gl.getUniformLocation(compProg, 'u_glow')
        programsReady = true
      }

      function makeFBO() {
        const fbo = gl.createFramebuffer()
        const tex = gl.createTexture()
        if (fbo === null || tex === null) return null
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simW, simH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        return { fbo, tex }
      }

      function createFBOs() {
        simA = makeFBO()
        simB = makeFBO()
        blurH = makeFBO()
        blurV = makeFBO()
      }

      function destroyFBO(entry) {
        if (entry === null) return
        gl.deleteFramebuffer(entry.fbo)
        gl.deleteTexture(entry.tex)
      }

      function destroyFBOs() {
        destroyFBO(simA); simA = null
        destroyFBO(simB); simB = null
        destroyFBO(blurH); blurH = null
        destroyFBO(blurV); blurV = null
      }

      function destroyPrograms() {
        if (simProg !== null) gl.deleteProgram(simProg)
        if (blurProg !== null) gl.deleteProgram(blurProg)
        if (compProg !== null) gl.deleteProgram(compProg)
        if (vao !== null) gl.deleteVertexArray(vao)
        if (vbo !== null) gl.deleteBuffer(vbo)
        simProg = blurProg = compProg = null
        vao = null
        vbo = null
        programsReady = false
      }

      function resize() {
        const rect = canvas.getBoundingClientRect()
        const w = rect.width || canvas.clientWidth || 132
        const h = rect.height || canvas.clientHeight || 30
        if (!w || !h) return
        const dpr = window.devicePixelRatio || 1
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        // Low-res simulation buffers: one texel per PIXEL_SIZE css px, then
        // NEAREST-upscaled at composite time for the chunky pixel look.
        simW = Math.max(8, Math.round(w / PIXEL_SIZE))
        simH = Math.max(8, Math.round(h / PIXEL_SIZE))
        destroyFBOs()
        createFBOs()
      }

      function ensureLoop() {
        if (simA === null || simB === null) {
          resize()
          if (simA === null || simB === null) return
        }
        if (loopRunning) {
          idleFrames = 0
          return
        }
        loopRunning = true
        idleFrames = 0
        // The clock starts at zero so the shader's ignition animation plays
        // on first open: the fire appears to ignite and spread from the
        // slider as it is dragged, per the requested ember effect.
        startTime = performance.now()
        lastSpringTime = performance.now()
        springValue = getSlider()
        springVelocity = 0
        gl.bindFramebuffer(gl.FRAMEBUFFER, simA.fbo)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.bindFramebuffer(gl.FRAMEBUFFER, simB.fbo)
        gl.clear(gl.COLOR_BUFFER_BIT)
        rafId = requestAnimationFrame(render)
      }

      function renderFrame(t) {
        const now = performance.now()
        const dt = Math.min((now - lastSpringTime) / 1e3, 0.05)
        lastSpringTime = now
        const target = getSlider()
        if (springValue < target) {
          const force = (target - springValue) * SPRING_STIFFNESS
          springVelocity += force * dt
          springVelocity *= 1 - SPRING_DAMP * dt * 6
          springValue += springVelocity * dt
          if (springValue > target) {
            springValue = target
            springVelocity = 0
          }
        } else {
          springValue = target
          springVelocity = 0
        }
        if (getSlider() <= 0 && !getActive()) {
          if (++idleFrames > MAX_IDLE) {
            loopRunning = false
            rafId = null
            return
          }
          return
        }
        idleFrames = 0
        const elapsed = startTime !== null ? (now - startTime) / 1e3 : 0
        if (simB !== null && simProg !== null && blurProg !== null && compProg !== null && blurH !== null && blurV !== null && simA !== null) {
          // Simulation + blur run at the low pixel resolution.
          gl.viewport(0, 0, simW, simH)
          gl.bindFramebuffer(gl.FRAMEBUFFER, simB.fbo)
          gl.useProgram(simProg)
          gl.uniform1f(U.simTime, t * 0.001)
          gl.uniform1f(U.simSlider, springValue)
          gl.uniform1f(U.simElapsed, elapsed)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, simA.tex)
          gl.uniform1i(U.simBack, 0)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
          gl.useProgram(blurProg)
          gl.uniform2f(U.blurRes, simW, simH)
          gl.bindFramebuffer(gl.FRAMEBUFFER, blurH.fbo)
          gl.uniform2f(U.blurDir, 1, 0)
          gl.uniform1f(U.blurExt, 1)
          gl.bindTexture(gl.TEXTURE_2D, simB.tex)
          gl.uniform1i(U.blurTex, 0)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
          gl.bindFramebuffer(gl.FRAMEBUFFER, blurV.fbo)
          gl.uniform2f(U.blurDir, 0, 1)
          gl.uniform1f(U.blurExt, 0)
          gl.bindTexture(gl.TEXTURE_2D, blurH.tex)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
          // Composite NEAREST-upscales the low-res scene for the pixel look.
          gl.bindFramebuffer(gl.FRAMEBUFFER, null)
          gl.viewport(0, 0, canvas.width, canvas.height)
          gl.useProgram(compProg)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, simB.tex)
          gl.uniform1i(U.compScene, 0)
          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, blurV.tex)
          gl.uniform1i(U.compGlow, 1)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
          const tmp = simA
          simA = simB
          simB = tmp
        }
      }

      function render(t) {
        renderFrame(t)
        if (loopRunning) rafId = requestAnimationFrame(render)
      }

      canvas.addEventListener('webglcontextlost', onContextLost)
      canvas.addEventListener('webglcontextrestored', onContextRestored)
      compilePrograms()
      if (programsReady) {
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            window.clearTimeout(resizeDebounce)
            resizeDebounce = window.setTimeout(resize, 80)
          })
          resizeObserver.observe(canvas)
        }
        resize()
        if (getSlider() > 0) ensureLoop()
      } else {
        console.warn('[adaptive-reasoning] fire: shader/program compile failed')
      }

      return {
        // Restart the loop when the value becomes non-zero after a pause.
        ensureLoop: () => { if (getSlider() > 0) ensureLoop() },
        dispose: () => {
          if (rafId !== null) cancelAnimationFrame(rafId)
          if (resizeObserver !== null) resizeObserver.disconnect()
          window.clearTimeout(resizeDebounce)
          loopRunning = false
          destroyFBOs()
          destroyPrograms()
          canvas.removeEventListener('webglcontextlost', onContextLost)
          canvas.removeEventListener('webglcontextrestored', onContextRestored)
        },
      }
    }

    function EffortPanel({ api, remote, sessionId, close }) {
      const [directory, setDirectory] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [rawValue, setRawValue] = React.useState(0)
      const [dragging, setDragging] = React.useState(false)
      const [declaring, setDeclaring] = React.useState(false)
      const canvasRef = React.useRef(null)
      const fireRef = React.useRef(null)
      const slider01Ref = React.useRef(0)
      const lastWriteRef = React.useRef(0)
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
      const usable = selection !== null && efforts.length > 1
      const step100 = efforts.length > 1 ? 100 / (efforts.length - 1) : 100

      // Reset the 0..100 raw value when the directory loads or selection
      // changes. useLayoutEffect runs before paint so the first visible
      // frame already shows the current level (no all-grey flash).
      React.useLayoutEffect(() => {
        if (!usable) { setRawValue(0); setDragging(false); return }
        setRawValue(selected * step100)
        setDragging(false)
      }, [directory, selected, step100, usable])

      // WebGL canvas lifecycle via callback ref: created the moment the canvas
      // mounts (after directory loads), disposed on unmount. useCallback keeps
      // the ref stable so re-renders do not tear down and rebuild the engine.
      const setCanvas = React.useCallback((node) => {
        canvasRef.current = node
        if (node !== null && fireRef.current === null) {
          fireRef.current = createWebglFire(node, () => slider01Ref.current, () => true)
        }
        if (node === null && fireRef.current !== null) {
          fireRef.current.dispose()
          fireRef.current = null
        }
      }, [])

      // Keep the shader slider value fresh every render and revive the loop.
      React.useEffect(() => {
        slider01Ref.current = usable ? 0.15 + rawValue / 100 * 0.85 : 0
        if (slider01Ref.current > 0) fireRef.current?.ensureLoop()
      })

      // Write the nearest declared effort for a raw 0..100 value. Deliberately
      // does NOT update the directory state: the reset effect would otherwise
      // snap rawValue back mid-drag and break continuous dragging.
      const writeEffort = (v) => {
        if (!usable || selection === null) return
        const idx = Math.round(v / step100)
        const effort = efforts[idx]
        if (effort === undefined) return
        api.sessions.selectModel({
          sessionId,
          provider: selection.current.provider,
          model: selection.current.model,
          reasoningEffort: effort.id,
        }).then(response => {
          if (!response.result.ok) setError(response.result.error.message)
          else setError(null)
        }, cause => setError(String(cause)))
      }

      // Continuous 0..100 dragging with a 16ms throttle: requests never pile up.
      const onInput = (event) => {
        if (!usable) return
        const v = Number(event.target.value)
        setRawValue(v)
        const now = performance.now()
        if (now - lastWriteRef.current >= 16) {
          lastWriteRef.current = now
          writeEffort(v)
        }
      }

      // Snap to the nearest declared level on release/blur/keyboard end and
      // issue one confirming write.
      const commit = (event) => {
        if (!usable) return
        const v = Number(event.target.value)
        const idx = Math.round(v / step100)
        setRawValue(idx * step100)
        setDragging(false)
        writeEffort(v)
      }

      const onKeyUp = (event) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) commit(event)
      }

      if (error !== null && (directory === null || selection === null)) return React.createElement('div', { className: 'dar-status dar-error', role: 'alert' }, `${copy.error} ${error}`)
      if (directory === null) return React.createElement('div', { className: 'dar-status' }, copy.loading)
      if (selection === null) return React.createElement('div', { className: 'dar-status' }, copy.empty)
      const runAutoDeclare = async () => {
        if (selection === null) return
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
                disabled: declaring,
                onClick: () => { void runAutoDeclare() },
              }, copy.autoButton))))
      }
      if (efforts.length === 1) return React.createElement('div', { className: 'dar-status' }, `${copy.title}: ${efforts[0].name || label(efforts[0].id)}`)
      const displayIndex = Math.min(Math.max(Math.round(rawValue / step100), 0), efforts.length - 1)
      const level = efforts[displayIndex]
      // Photograph-inspired per-level palette: charred grey -> deep ember
      // fissure -> saturated red -> a small orange-red hottest level.
      const mixRgb = (from, to, amount) => from.map((value, index) => Math.round(value + (to[index] - value) * amount))
      const levelRgb = (t) => {
        const coal = [42, 39, 37]
        const ember = [92, 12, 4]
        const red = [205, 22, 4]
        const hot = [255, 92, 7]
        if (t < 0.35) return mixRgb(coal, ember, t / 0.35)
        if (t < 0.80) return mixRgb(ember, red, (t - 0.35) / 0.45)
        return mixRgb(red, hot, (t - 0.80) / 0.20)
      }
      const rgb = (color) => `rgb(${color[0]}, ${color[1]}, ${color[2]})`
      const cellStyle = (cellIndex) => {
        const t = efforts.length > 1 ? cellIndex / (efforts.length - 1) : 0
        const on = cellIndex <= displayIndex
        const color = levelRgb(t)
        const border = mixRgb(color, [255, 112, 30], on ? 0.24 : 0.05)
        return {
          background: on ? rgb(color) : 'rgb(17, 16, 15)',
          borderColor: on ? rgb(border) : 'rgb(41, 37, 34)',
          boxShadow: on ? `inset 0 0 3px rgba(255, 72, 12, ${(0.18 + t * 0.42).toFixed(2)})` : 'none',
        }
      }
      const valueT = efforts.length > 1 ? displayIndex / (efforts.length - 1) : 0
      const valueColor = rgb(mixRgb(levelRgb(valueT), [255, 210, 180], 0.22))
      return React.createElement('div', { className: 'dar-panel', role: 'dialog', 'aria-label': copy.title },
        React.createElement('div', { className: 'dar-heading' },
          React.createElement('span', { className: 'dar-title' }, copy.title),
          React.createElement('span', { className: 'dar-value', style: { color: valueColor }, 'aria-live': 'polite' }, level.name || label(level.id))),
        level.description ? React.createElement('div', { className: 'dar-description' }, level.description) : null,
        React.createElement('div', { className: 'dar-labels', 'aria-hidden': true }, efforts.map(effort => React.createElement('span', { className: 'dar-tick', key: effort.id }, effort.name || label(effort.id)))),
        React.createElement('div', { className: `dar-track${dragging ? ' dar-dragging' : ''}` },
          React.createElement('div', { className: 'dar-cells', 'aria-hidden': true }, efforts.map((effort, cellIndex) => React.createElement('span', { className: `dar-cell${cellIndex <= displayIndex ? ' dar-cell-on' : ''}`, style: cellStyle(cellIndex), key: effort.id }))),
          React.createElement('canvas', { className: 'dar-flame-canvas', ref: setCanvas, 'aria-hidden': true }),
          React.createElement('input', { className: 'dar-range dar-range--hidden', type: 'range', min: 0, max: 100, step: 1, value: rawValue, 'aria-label': copy.title, 'aria-valuetext': level.name || label(level.id), onInput, onPointerDown: () => setDragging(true), onPointerUp: commit, onPointerLeave: () => setDragging(false), onBlur: commit, onKeyUp })),
        error !== null ? React.createElement('div', { className: 'dar-status dar-error', role: 'alert' }, `${copy.error} ${error}`) : null)
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
      const show = (sessionId, anchor, menu = null) => {
        // Replace the whole official menu in-place. Capture its rect before
        // hiding it, then use the same left/top instead of placing the panel
        // above or below the clicked row.
        const rect = (menu ?? anchor).getBoundingClientRect()
        const width = Math.min(274, window.innerWidth - 22)
        const left = menu !== null ? rect.left : Math.max(11, Math.min(rect.right - width, window.innerWidth - width - 11))
        const top = menu !== null ? rect.top : (rect.top > 160 ? Math.max(11, rect.top - 156) : Math.min(window.innerHeight - 156, rect.bottom + 7))
        if (menu !== null) menu.style.display = 'none'
        host.style.left = `${Math.max(11, Math.min(left, window.innerWidth - width - 11))}px`
        host.style.top = `${Math.max(11, Math.min(top, window.innerHeight - 156))}px`
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
        const menu = row.closest('[role="menu"]')
        const text = (row.textContent || '').trim()
        if (![...EFFORT_LABELS].some(value => text.startsWith(value))) return
        event.preventDefault(); event.stopPropagation(); show(sessionId, row, menu)
      }
      document.addEventListener('click', onClick, true)
      ctx.effect(() => () => { document.removeEventListener('click', onClick, true); hide(); host.remove() }, 'adaptive-reasoning: effort panel')
    }
    return { inject, apply }
  },
})
