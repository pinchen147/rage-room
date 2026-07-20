export interface MeleeWeapon {
  id: string
  name: string
  kind: 'melee'
  range: number // reach in metres
  cosArc: number // cone width as a cos threshold (higher = narrower)
  power: number // shard launch power
  cooldown: number // seconds between swings
  color: string // viewmodel tint
  dash?: number // forward lunge speed (m/s) on swing — Thor slam
}

export interface ThrowWeapon {
  id: string
  name: string
  kind: 'throw'
  speed: number // launch m/s
  mass: number
  radius: number
  color: string
  metal: number // material metalness for the viewmodel/projectile
  cooldown: number
  blast?: number // explosion radius on impact (grenade)
  blastPower?: number
}

export type Weapon = MeleeWeapon | ThrowWeapon

/** The rage arsenal. Order = the 1..3 hotkeys. */
export const WEAPONS: Weapon[] = [
  { id: 'sledge', name: 'Sledgehammer', kind: 'melee', range: 3.2, cosArc: 0.4, power: 13, cooldown: 0, color: '#8a8f98', dash: 15 },
  { id: 'bowling', name: 'Bowling Ball', kind: 'throw', speed: 26, mass: 16, radius: 0.34, color: '#20232a', metal: 0.3, cooldown: 0 },
  { id: 'grenade', name: 'Grenade', kind: 'throw', speed: 24, mass: 2, radius: 0.18, color: '#3d5a3d', metal: 0.4, cooldown: 0, blast: 6, blastPower: 12 },
]
