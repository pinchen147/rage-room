import { SETS, SMASH, tierFor } from './sfx'
import type { MaterialClass } from './sfx'

/** Thin Web Audio layer (locked PRD design): decoded-buffer pool, round-robin +
 * pitch/gain jitter, world-positioned PannerNodes, hard voice cap with priority
 * shedding, one master compressor. Singleton module — call sites stay one-liners. */

const VOICE_CAP = 28

let ctx: AudioContext | null = null
let master: GainNode | null = null
const buffers = new Map<string, AudioBuffer>()
const rrIndex = new Map<string, number>()
let activeVoices = 0
let lastClank = 0

function ensureCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -14
    compressor.knee.value = 24
    compressor.ratio.value = 5
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(compressor)
    compressor.connect(ctx.destination)
  }
  return ctx
}

/** Fetch + decode every mapped sample. Safe to call while the context is suspended. */
export async function preload(): Promise<void> {
  const c = ensureCtx()
  const urls = [...new Set(Object.values(SETS).flat())]
  await Promise.all(
    urls.map(async (url) => {
      if (buffers.has(url)) return
      try {
        const res = await fetch(url)
        const data = await res.arrayBuffer()
        buffers.set(url, await c.decodeAudioData(data))
      } catch {
        // A missing sample degrades to silence for that take — never fatal.
      }
    }),
  )
}

/** Resume on the user gesture (pointer-lock click) — required by autoplay policy. */
export function unlock(): void {
  void ensureCtx().resume()
}

export function updateListener(x: number, y: number, z: number, fx: number, fy: number, fz: number): void {
  if (!ctx) return
  const l = ctx.listener
  l.setPosition(x, y, z)
  l.setOrientation(fx, fy, fz, 0, 1, 0)
}

interface PlayOpts {
  pos?: readonly [number, number, number]
  gain?: number
  pitch?: number
  jitter?: number // pitch jitter span, default 0.1
  delay?: number // seconds
  priority?: 0 | 1 | 2 // 0 garnish (shed first) · 1 normal · 2 critical
}

function playSet(set: string, opts: PlayOpts = {}): void {
  const c = ctx
  if (!c || !master || c.state !== 'running') return
  const { pos, gain = 1, pitch = 1, jitter = 0.1, delay = 0, priority = 1 } = opts
  if (activeVoices >= VOICE_CAP && priority < 2) return

  const files = SETS[set]
  if (!files || files.length === 0) return
  const i = (rrIndex.get(set) ?? Math.floor(Math.random() * files.length)) % files.length
  rrIndex.set(set, i + 1)
  const buffer = buffers.get(files[i])
  if (!buffer) return

  const src = c.createBufferSource()
  src.buffer = buffer
  src.playbackRate.value = pitch * (1 + (Math.random() - 0.5) * jitter)

  const g = c.createGain()
  g.gain.value = gain * (0.89 + Math.random() * 0.22)
  src.connect(g)

  if (pos) {
    const p = c.createPanner()
    p.panningModel = 'equalpower'
    p.distanceModel = 'inverse'
    p.refDistance = 2.5
    p.maxDistance = 50
    p.rolloffFactor = 1
    p.setPosition(pos[0], pos[1], pos[2])
    g.connect(p)
    p.connect(master)
  } else {
    g.connect(master)
  }

  activeVoices++
  src.onended = () => {
    activeVoices--
  }
  src.start(c.currentTime + delay)
}

// ---------- High-level game events ----------

export function smash(material: MaterialClass, energy: number, pos: readonly [number, number, number]): void {
  const recipe = SMASH[material]
  const tier = tierFor(energy)
  const loud = 0.55 + Math.min(0.45, energy * 0.6)
  playSet(recipe.transient[tier], { pos, gain: loud, priority: 2 })
  playSet(recipe.body, { pos, gain: loud * 0.9, priority: 2, delay: 0.015 })
  playSet(recipe.tail, { pos, gain: loud * 0.5, priority: 1, delay: 0.1 })
  if (recipe.garnish) playSet(recipe.garnish, { pos, gain: 0.25, priority: 0, delay: 0.05, pitch: 1.2 })
}

/** Non-breaking impact clank (dressing hits, barrels, walls). Rate-limited. */
export function clank(material: MaterialClass, energy: number, pos: readonly [number, number, number]): void {
  const now = performance.now()
  if (now - lastClank < 60) return
  lastClank = now
  const recipe = SMASH[material]
  playSet(recipe.transient[tierFor(energy)], { pos, gain: 0.25 + energy * 0.4, priority: 1 })
}

export function whoosh(heavy: boolean): void {
  playSet(heavy ? 'whoosh_heavy' : 'whoosh_light', { gain: heavy ? 0.55 : 0.4, priority: 1 })
}

export function explosion(pos: readonly [number, number, number]): void {
  playSet('bang', { pos, gain: 1, priority: 2 })
  playSet('cannon', { pos, gain: 0.9, priority: 2, delay: 0.02 })
  playSet('exp_sub', { gain: 1, priority: 2 })
  playSet('exp_crunch', { pos, gain: 0.7, priority: 1, delay: 0.04 })
}

export function footstep(): void {
  playSet('footstep', { gain: 0.18, priority: 0, jitter: 0.16 })
}

export function uiClick(): void {
  playSet('ui_click', { gain: 0.4, priority: 1 })
}

export function rageFull(): void {
  playSet('ui_confirm', { gain: 0.6, priority: 1 })
}
