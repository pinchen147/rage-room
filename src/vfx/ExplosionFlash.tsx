import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** One reusable point light that flashes hot at the latest explosion and decays
 * over ~0.3s. Module-level emit keeps call sites one-liners. */

let pending: [number, number, number] | null = null

export function emitFlash(pos: readonly [number, number, number]): void {
  pending = [pos[0], pos[1] + 0.4, pos[2]]
}

export function ExplosionFlash() {
  const light = useRef<THREE.PointLight>(null)
  const intensity = useRef(0)

  useFrame((_, delta) => {
    const l = light.current
    if (!l) return
    if (pending) {
      l.position.set(...pending)
      intensity.current = 110
      pending = null
    }
    intensity.current *= Math.exp(-Math.min(delta, 1 / 30) * 11)
    l.intensity = intensity.current
    l.visible = intensity.current > 0.5
  })

  return <pointLight ref={light} visible={false} color="#ffbe78" distance={15} decay={1.8} />
}
