import { create } from 'zustand'

export type Phase = 'menu' | 'playing'
export type Weapon = 'bat' | 'sledgehammer' | 'crowbar'

export interface GameState {
  phase: Phase
  weapon: Weapon
  /** Sum of mass of every registered destructible prop. */
  totalMass: number
  /** Sum of mass already destroyed. */
  destroyedMass: number
  /** Rage meter, 0..1. Fills as you smash; feeds slow-mo overdrive. */
  rage: number
  /** Debug: relative speed of the last prop impact (m/s), shown on the HUD for tuning. */
  lastImpact: number
  registerProp: (mass: number) => void
  destroy: (mass: number) => void
  addRage: (amount: number) => void
  reportImpact: (v: number) => void
  setWeapon: (w: Weapon) => void
  start: () => void
  reset: () => void
}

export const useGame = create<GameState>((set) => ({
  phase: 'menu',
  weapon: 'sledgehammer',
  totalMass: 0,
  destroyedMass: 0,
  rage: 0,
  lastImpact: 0,
  registerProp: (mass) => set((s) => ({ totalMass: s.totalMass + mass })),
  destroy: (mass) => set((s) => ({ destroyedMass: s.destroyedMass + mass })),
  addRage: (amount) => set((s) => ({ rage: Math.min(1, s.rage + amount) })),
  reportImpact: (v) => set({ lastImpact: v }),
  setWeapon: (weapon) => set({ weapon }),
  start: () => set({ phase: 'playing' }),
  reset: () => set({ destroyedMass: 0, rage: 0 }),
}))

/** Destruction fraction 0..1 — the v1 score. Selector for reactive reads. */
export const destructionPct = (s: GameState): number =>
  s.totalMass > 0 ? s.destroyedMass / s.totalMass : 0
