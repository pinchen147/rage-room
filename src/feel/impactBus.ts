export type ImpactListener = (energy: number, x: number, y: number, z: number) => void

const listeners = new Set<ImpactListener>()

export function onImpact(listener: ImpactListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Emit one impact. `energy` (~0..1+) drives every juice channel (shake, FOV
 * punch, audio, particles) off a single number, per the impact-energy bus design. */
export function emitImpact(energy: number, x = 0, y = 0, z = 0): void {
  for (const l of listeners) l(energy, x, y, z)
}
