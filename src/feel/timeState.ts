import { create } from 'zustand'

interface TimeState {
  frozen: boolean
  until: number
  freeze: (untilMs: number) => void
  thaw: () => void
}

export const useTime = create<TimeState>((set) => ({
  frozen: false,
  until: 0,
  freeze: (untilMs) => set((s) => ({ frozen: true, until: Math.max(s.until, untilMs) })),
  thaw: () => set({ frozen: false, until: 0 }),
}))

/** Hit-stop: freeze the physics world for `ms` (energy-scaled by callers).
 * Uses max-accumulate so chained hits never stack into a long stall. */
export function hitStop(ms: number): void {
  useTime.getState().freeze(performance.now() + ms)
}
