import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { onImpact } from './impactBus'

const BASE_FOV = 75 // must match the Canvas camera fov

/** Impact-bus camera juice: FOV punch (owned solely here) + coherent-noise
 * shake. Mounted last inside <Physics> so it runs after the controller writes
 * the base camera transform each frame. */
export function JuiceController() {
  const camera = useThree((s) => s.camera)
  const shake = useRef(0)
  const punch = useRef(0)
  const lastFov = useRef(BASE_FOV)
  const t = useRef(0)

  useEffect(
    () =>
      onImpact((energy) => {
        shake.current = Math.min(0.7, shake.current + energy * 0.28)
        punch.current = Math.min(14, punch.current + energy * 9)
      }),
    [],
  )

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    t.current += dt

    punch.current *= Math.max(0, 1 - dt * 8)
    const cam = camera as PerspectiveCamera
    const fov = BASE_FOV + punch.current
    if (cam.isPerspectiveCamera && Math.abs(fov - lastFov.current) > 0.02) {
      cam.fov = fov
      cam.updateProjectionMatrix()
      lastFov.current = fov
    }

    shake.current *= Math.max(0, 1 - dt * 6)
    if (shake.current > 0.001) {
      const s = shake.current * 0.14
      const tt = t.current
      camera.position.x += (Math.sin(tt * 39.7) + Math.sin(tt * 23.3) * 0.6) * s * 0.5
      camera.position.y += (Math.sin(tt * 33.1 + 1.7) + Math.sin(tt * 19.9 + 0.6) * 0.6) * s * 0.5
      camera.position.z += Math.sin(tt * 27.7 + 3.1) * s * 0.3
    }
  })

  return null
}
