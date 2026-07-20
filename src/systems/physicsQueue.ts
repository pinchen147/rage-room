import { useBeforePhysicsStep } from '@react-three/rapier'
import type { RapierContext } from '@react-three/rapier'

type PhysicsWorld = RapierContext['world']
type Op = (world: PhysicsWorld) => void

/** All world-mutating game ops (slams, blasts, detonations) run here — at the
 * single safe point right before the physics step — never from setTimeout or
 * collision callbacks. Mutating the world at arbitrary frame points is what
 * panics the Rapier WASM ("unreachable" → poisoned borrows → total crash). */
const queue: Op[] = []

export function enqueuePhysicsOp(op: Op): void {
  queue.push(op)
}

/** Mount once inside <Physics>. */
export function PhysicsQueue() {
  useBeforePhysicsStep((world) => {
    while (queue.length > 0) {
      const op = queue.shift()!
      try {
        op(world)
      } catch (err) {
        console.error('physics op failed:', err)
      }
    }
  })
  return null
}
