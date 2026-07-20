/** Material classes drive break thresholds, debris looks, and audio layering. */
export type MaterialClass = 'glass' | 'wood' | 'metal' | 'ceramic' | 'plastic' | 'cardboard' | 'rubber' | 'generic'

export type Tier = 'heavy' | 'medium' | 'light'

const seq = (prefix: string, from: number, to: number, pad: number, ext = 'ogg'): string[] =>
  Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${String(from + i).padStart(pad, '0')}.${ext}`)

const impact = (name: string) => seq(`/assets/audio/impact/${name}_`, 0, 4, 3)
const brk = (name: string, n: number) => seq(`/assets/audio/break/bfh1_${name}_`, 1, n, 2)

/** Round-robin sample sets, keyed by name. Paths are exact files on disk. */
export const SETS: Record<string, string[]> = {
  // transients (Kenney impact, 5 takes each)
  glass_heavy: impact('impactGlass_heavy'),
  glass_medium: impact('impactGlass_medium'),
  glass_light: impact('impactGlass_light'),
  wood_heavy: impact('impactWood_heavy'),
  wood_medium: impact('impactWood_medium'),
  wood_light: impact('impactWood_light'),
  metal_heavy: impact('impactMetal_heavy'),
  metal_medium: impact('impactMetal_medium'),
  metal_light: impact('impactMetal_light'),
  plate_heavy: impact('impactPlate_heavy'),
  plate_medium: impact('impactPlate_medium'),
  plate_light: impact('impactPlate_light'),
  punch_heavy: impact('impactPunch_heavy'),
  punch_medium: impact('impactPunch_medium'),
  soft_heavy: impact('impactSoft_heavy'),
  soft_medium: impact('impactSoft_medium'),
  generic_light: impact('impactGeneric_light'),

  // break bodies + debris tails (rubberduck, real recordings)
  glass_break: brk('glass_breaking', 6),
  glass_fall: brk('glass_falling', 4),
  wood_break: brk('wood_breaking', 4),
  wood_fall: brk('wood_falling', 2),
  rock_break: brk('rock_breaking', 3),
  rock_fall: brk('rock_falling', 9),
  gen_break: brk('breaking', 3),
  gen_fall: brk('falling', 7),
  gen_hit: brk('hit', 13),
  metal_hit: brk('metal_hit', 6),
  metal_fall: brk('metal_falling', 5),
  misc: brk('misc', 7),

  // whoosh (artisticdude swishes, wav)
  whoosh_light: seq('/assets/audio/whoosh/swish-', 1, 4, 1, 'wav'),
  whoosh_heavy: seq('/assets/audio/whoosh/swish-', 5, 13, 1, 'wav'),

  // explosion stack
  bang: seq('/assets/audio/explosion/bang_', 1, 10, 2),
  cannon: seq('/assets/audio/explosion/cannon_', 1, 5, 2),
  exp_crunch: seq('/assets/audio/scifi/explosionCrunch_', 0, 4, 3),
  exp_sub: seq('/assets/audio/scifi/lowFrequency_explosion_', 0, 1, 3),

  // movement + UI
  footstep: seq('/assets/audio/impact/footstep_concrete_', 0, 4, 3),
  ui_click: seq('/assets/audio/ui/click_', 1, 5, 3),
  ui_confirm: seq('/assets/audio/ui/confirmation_', 1, 4, 3),
  ui_glass: seq('/assets/audio/ui/glass_', 1, 6, 3),
}

interface SmashRecipe {
  transient: Record<Tier, string>
  body: string
  tail: string
  garnish?: string
}

/** Per-material layering: transient (Kenney) + break body + debris tail (rubberduck). */
export const SMASH: Record<MaterialClass, SmashRecipe> = {
  glass: {
    transient: { heavy: 'glass_heavy', medium: 'glass_medium', light: 'glass_light' },
    body: 'glass_break',
    tail: 'glass_fall',
    garnish: 'ui_glass',
  },
  wood: {
    transient: { heavy: 'wood_heavy', medium: 'wood_medium', light: 'wood_light' },
    body: 'wood_break',
    tail: 'wood_fall',
  },
  ceramic: {
    transient: { heavy: 'plate_heavy', medium: 'plate_medium', light: 'plate_light' },
    body: 'rock_break',
    tail: 'rock_fall',
  },
  metal: {
    transient: { heavy: 'metal_heavy', medium: 'metal_medium', light: 'metal_light' },
    body: 'metal_hit',
    tail: 'metal_fall',
  },
  plastic: {
    transient: { heavy: 'soft_heavy', medium: 'soft_medium', light: 'generic_light' },
    body: 'gen_break',
    tail: 'gen_fall',
  },
  cardboard: {
    transient: { heavy: 'soft_heavy', medium: 'soft_medium', light: 'generic_light' },
    body: 'misc',
    tail: 'gen_fall',
  },
  rubber: {
    transient: { heavy: 'soft_heavy', medium: 'soft_medium', light: 'generic_light' },
    body: 'misc',
    tail: 'gen_fall',
  },
  generic: {
    transient: { heavy: 'punch_heavy', medium: 'punch_medium', light: 'generic_light' },
    body: 'gen_break',
    tail: 'gen_fall',
  },
}

export const tierFor = (energy: number): Tier => (energy > 0.55 ? 'heavy' : energy > 0.22 ? 'medium' : 'light')
