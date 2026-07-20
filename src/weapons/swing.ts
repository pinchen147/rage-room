type SwingListener = () => void

const listeners = new Set<SwingListener>()

export function onSwing(cb: SwingListener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Fire the first-person weapon swing/throw animation. */
export function triggerSwing(): void {
  for (const l of listeners) l()
}
