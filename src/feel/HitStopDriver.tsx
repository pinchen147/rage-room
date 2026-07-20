import { useFrame } from '@react-three/fiber'
import { useTime } from './timeState'

/** Thaws the world when the hit-stop window elapses. Runs every frame; state
 * flips happen only per-event (freeze on impact, thaw once when elapsed). */
export function HitStopDriver() {
  useFrame(() => {
    const t = useTime.getState()
    if (t.frozen && performance.now() >= t.until) t.thaw()
  })
  return null
}
