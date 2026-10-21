import { useEffect, useRef, useState } from 'react'

/** Position de la surface, en fraction de la hauteur de la scène. */
export const SURFACE = 0.44
const AMP = 0.012

/** Même vague côté JS (titre découpé) et côté shader (eau). */
const wave = (nx: number, t: number) =>
  Math.sin(nx * 6.2832 * 1.3 + t * 0.9) + 0.55 * Math.sin(nx * 6.2832 * 2.7 - t * 1.3) + 0.22 * Math.sin(nx * 6.2832 * 5.1 + t * 2.1)

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`

const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uSurface; uniform float uDpr;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*noise(p); p *= 2.03; a *= .5; } return v; }
float wave(float nx, float t){ return sin(nx*6.2832*1.3 + t*.9) + .55*sin(nx*6.2832*2.7 - t*1.3) + .22*sin(nx*6.2832*5.1 + t*2.1); }
float caustic(vec2 p, float t){
  vec2 i = p; float c = 1.; float inten = .005;
  for (int n = 0; n < 4; n++){
    float tt = t * (1. - (3.5 / float(n+1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1. / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.);
}
void main(){
  float W = uRes.x, H = uRes.y;
  vec2 f = gl_FragCoord.xy;
  float y = H - f.y;
  float nx = f.x / W;
  float sy = H*uSurface + H*${AMP}*wave(nx, uTime);
  vec3 col;
  if (y < sy) {
    float k = y / sy;
    col = mix(vec3(.86,.92,.98), vec3(.62,.79,.95), k*k);
    float band = H*.085;
    float d = (sy - y) / band;
    if (d < 1.) {
      vec2 q = vec2(nx*6. + uTime*.03, (sy - y)/band);
      float n = fbm(vec2(q.x*(1.5 + 3.*d), q.y*7. - uTime*.35));
      vec3 surf = mix(vec3(.36,.60,.86), vec3(.78,.88,.97), n);
      surf += smoothstep(.6, .78, n) * (1. - d) * .35;
      col = mix(col, surf, smoothstep(1., .1, d) * .9);
    }
  } else {
    float depth = (y - sy) / (H - sy);
    vec3 top = vec3(.33,.65,.93), mid = vec3(.17,.48,.84), deep = vec3(.11,.36,.73);
    col = depth < .45 ? mix(top, mid, depth/.45) : mix(mid, deep, (depth - .45)/.55);
    vec2 src = vec2(W*.62, sy - H*.7);
    vec2 dir = vec2(f.x, y) - src;
    float ang = atan(dir.x, dir.y);
    float r = smoothstep(.48, .95, fbm(vec2(ang*10., uTime*.12)));
    col += vec3(.80,.93,1.) * r * exp(-depth*2.4) * .34;
    vec2 cp = mod(vec2(f.x, y*1.8) / W * 6.2832 * 1.4, 6.2832) - 250.;
    col += vec3(.65,.85,1.) * clamp(caustic(cp, uTime*.45), 0., 1.) * smoothstep(.45, 1., depth) * .18;
    float under = (y - sy) / uDpr;
    col += vec3(.85,1.,1.) * exp(-under/10.) * .18;
    col = mix(col, vec3(.10,.30,.58), exp(-pow((under - 5.)/3.5, 2.)) * .45);
  }
  float dl = abs(y - sy) / uDpr;
  col = mix(col, vec3(1.), exp(-dl*dl/1.6) * .75);
  vec2 uv = f / uRes;
  col *= mix(.82, 1., smoothstep(1.15, .35, length(uv - vec2(.5, .45))));
  col += (hash(f + fract(uTime)) - .5) * .03;
  gl_FragColor = vec4(col, 1.);
}`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
  return s
}

const surfacePath = (w: number, h: number, t: number, toward: number) => {
  const n = 64
  let d = ''
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w
    d += `${i ? 'L' : 'M'}${x.toFixed(1)},${(h * SURFACE + h * AMP * wave(i / n, t)).toFixed(1)}`
  }
  return `${d}L${w},${toward}L0,${toward}Z`
}

/** Scène d'eau réaliste (WebGL) et titre à moitié immergé, synchronisés sur la même vague. */
export function WaterScene() {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const above = useRef<SVGPathElement>(null)
  const below = useRef<SVGPathElement>(null)
  const [size, setSize] = useState({ w: 1000, h: 520 })

  useEffect(() => {
    const el = host.current!
    const cv = canvas.current!
    const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false })
    let prog: WebGLProgram | null = null
    if (gl) {
      try {
        prog = gl.createProgram()!
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        gl.useProgram(prog)
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const loc = gl.getAttribLocation(prog, 'p')
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      } catch (e) {
        console.warn('WaterScene : WebGL indisponible', e)
        prog = null
      }
    }
    if (!prog) el.classList.add('water-fallback')

    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const resize = () => {
      w = el.clientWidth
      h = el.clientHeight
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      setSize({ w, h })
      if (gl && prog) gl.viewport(0, 0, cv.width, cv.height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(el)

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      const t = still ? 0 : now / 1000
      if (gl && prog) {
        gl.uniform2f(gl.getUniformLocation(prog, 'uRes'), cv.width, cv.height)
        gl.uniform1f(gl.getUniformLocation(prog, 'uTime'), t)
        gl.uniform1f(gl.getUniformLocation(prog, 'uSurface'), SURFACE)
        gl.uniform1f(gl.getUniformLocation(prog, 'uDpr'), dpr)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      above.current?.setAttribute('d', surfacePath(w, h, t, -10))
      below.current?.setAttribute('d', surfacePath(w, h, t, h + 10))
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  const { w, h } = size
  // Sur grand écran la scène est plus large que haute : le texte suit la plus petite des deux mesures.
  const base = Math.min(w, h * 1.92)
  const fs = Math.min(w * 0.17, h * 0.34)
  const title = {
    x: w / 2,
    y: h * SURFACE + 0.35 * fs,
    textAnchor: 'middle',
    textLength: Math.min(fs * 5.1, w * 0.92),
    lengthAdjust: 'spacingAndGlyphs',
    style: { fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: fs },
  } as const

  return (
    <div ref={host} className="water absolute inset-0 overflow-hidden">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <svg ref={svg} viewBox={`0 0 ${w} ${h}`} className="title-in absolute inset-0 h-full w-full" role="img" aria-label="HydroGraph">
        <defs>
          <clipPath id="above"><path ref={above} /></clipPath>
          <clipPath id="below"><path ref={below} /></clipPath>
          <filter id="refract" x="-5%" y="-20%" width="110%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.004 0.02" numOctaves="1" seed="4">
              <animate attributeName="baseFrequency" dur="14s" values="0.004 0.02;0.006 0.026;0.004 0.02" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="4" />
          </filter>
        </defs>
        <text {...title} fill="#0b2860" clipPath="url(#above)">HYDROGRAPH</text>
        <g clipPath="url(#below)">
          <g filter="url(#refract)">
            <text {...title} fill="#d9f1ff" fillOpacity="0.85">HYDROGRAPH</text>

          </g>
          <text x={w / 2} y={h * 0.68} textAnchor="middle" fill="#fff" fillOpacity="0.9" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300, fontSize: base * 0.026, letterSpacing: base * 0.009 }}>
              LA MÉTÉO DE L’EAU
            </text>
        </g>
      </svg>
    </div>
  )
}
