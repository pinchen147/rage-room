import { create } from 'zustand'
import { WEAPONS } from '../weapons/arsenal'

export interface GameState {
  /** Index into WEAPONS of the equipped weapon. */
  weaponIndex: number
  /** Sum of mass of every registered destructible prop. */
  totalMass: number
  /** Sum of mass already destroyed. */
  destroyedMass: number
  /** Rage meter, 0..1. Fills as you smash; feeds slow-mo overdrive (next phase). */
  rage: number
  /** Debug: relative speed of the last prop impact (m/s), shown on the HUD. */
  lastImpact: number
  /** Bump to remount the room (press R) — infinite rage. */
  roomKey: number
  registerProp: (mass: number) => void
  destroy: (mass: number) => void
  addRage: (amount: number) => void
  reportImpact: (v: number) => void
  setWeapon: (index: number) => void
  cycleWeapon: (dir: number) => void
  resetRoom: () => void
}

const wrap = (i: number): number => ((i % WEAPONS.length) + WEAPONS.length) % WEAPONS.length

export const useGame = create<GameState>((set) => ({
  weaponIndex: 0,
  totalMass: 0,
  destroyedMass: 0,
  rage: 0,
  lastImpact: 0,
  roomKey: 0,
  registerProp: (mass) => set((s) => ({ totalMass: s.totalMass + mass })),
  destroy: (mass) => set((s) => ({ destroyedMass: s.destroyedMass + mass })),
  addRage: (amount) => set((s) => ({ rage: Math.min(1, s.rage + amount) })),
  reportImpact: (v) => set({ lastImpact: v }),
  setWeapon: (index) => set({ weaponIndex: wrap(index) }),
  cycleWeapon: (dir) => set((s) => ({ weaponIndex: wrap(s.weaponIndex + dir) })),
  // Reset destroyed/total so remounted props re-register a fresh count; keep rage.
  resetRoom: () => set((s) => ({ roomKey: s.roomKey + 1, totalMass: 0, destroyedMass: 0 })),
}))

/** Destruction fraction 0..1 — the v1 score. */
export const destructionPct = (s: GameState): number =>
  s.totalMass > 0 ? s.destroyedMass / s.totalMass : 0
