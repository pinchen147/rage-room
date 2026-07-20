import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { onImpact } from './impactBus'

const BASE_FOV = 75 // must match the Canvas camera fov

/** Impact-bus-driven camera juice: FOV punch (owned solely here) + positional
 * shake. Mounted last inside <Physics> so its useFrame runs after the player
 * controller sets the base camera position. */
export function JuiceController() {
  const camera = useThree((s) => s.camera)
  const shake = useRef(0)
  const punch = useRef(0)

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

    punch.current *= Math.max(0, 1 - dt * 8)
    const cam = camera as PerspectiveCamera
    if (cam.isPerspectiveCamera) {
      cam.fov = BASE_FOV + punch.current
      cam.updateProjectionMatrix()
    }

    shake.current *= Math.max(0, 1 - dt * 6)
    if (shake.current > 0.001) {
      const m = shake.current * 0.16
      camera.position.x += (Math.random() - 0.5) * m
      camera.position.y += (Math.random() - 0.5) * m
      camera.position.z += (Math.random() - 0.5) * m
    }
  })

  return null
}
