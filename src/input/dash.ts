type DashListener = (strength: number) => void

const listeners = new Set<DashListener>()

export function onDash(cb: DashListener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Kick a forward lunge in the player's current facing (m/s, decays fast). */
export function triggerDash(strength: number): void {
  for (const l of listeners) l(strength)
}
