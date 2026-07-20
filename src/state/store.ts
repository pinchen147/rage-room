import { create } from 'zustand'

export interface GameState {
  /** Index into WEAPONS of the equipped weapon. */
  weaponIndex: number
  /** Total breakable mass in the room (set once per room by Dressing). */
  totalMass: number
  /** Mass destroyed so far. */
  destroyedMass: number
  /** Rage meter, 0..1. Fills as you smash. */
  rage: number
  /** Bump to remount the room (press R) — infinite rage. */
  roomKey: number
  /** Performance mode (press P): post-FX off, DPR 1, shadows off. */
  perfLow: boolean
  togglePerf: () => void
  setTotalMass: (total: number) => void
  destroy: (mass: number) => void
  addRage: (amount: number) => void
  setWeapon: (index: number) => void
  cycleWeapon: (dir: number) => void
  resetRoom: () => void
}

// Weapon count is small and static; avoid importing arsenal here (keeps the
// store dependency-free). Kept in sync with WEAPONS.length via WeaponSystem.
const WEAPON_COUNT = 3
const wrap = (i: number): number => ((i % WEAPON_COUNT) + WEAPON_COUNT) % WEAPON_COUNT

export const useGame = create<GameState>((set) => ({
  weaponIndex: 0,
  totalMass: 0,
  destroyedMass: 0,
  rage: 0,
  roomKey: 0,
  perfLow: false,
  togglePerf: () => set((s) => ({ perfLow: !s.perfLow })),
  setTotalMass: (total) => set({ totalMass: total }),
  destroy: (mass) => set((s) => ({ destroyedMass: s.destroyedMass + mass })),
  addRage: (amount) => set((s) => ({ rage: Math.min(1, s.rage + amount) })),
  setWeapon: (index) => set({ weaponIndex: wrap(index) }),
  cycleWeapon: (dir) => set((s) => ({ weaponIndex: wrap(s.weaponIndex + dir) })),
  resetRoom: () => set((s) => ({ roomKey: s.roomKey + 1, destroyedMass: 0 })),
}))

/** Destruction fraction 0..1 — the score. */
export const destructionPct = (s: GameState): number =>
  s.totalMass > 0 ? Math.min(1, s.destroyedMass / s.totalMass) : 0
