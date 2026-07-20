import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { onImpact } from '../feel/impactBus'

/** Post stack (balanced tier): AO grounds contacts, bloom only fires on HDR
 * flashes/sparks (threshold 1), chromatic aberration pulses with impact energy. */
export function Effects() {
  // Passed by reference into the effect once; mutated per-frame for the pulse.
  const caOffset = useMemo(() => new THREE.Vector2(0, 0), [])

  useEffect(
    () =>
      onImpact((energy) => {
        const target = Math.min(0.011, caOffset.x + energy * 0.006)
        caOffset.set(target, target)
      }),
    [caOffset],
  )

  useFrame((_, delta) => {
    if (caOffset.x > 0.00005) {
      const k = Math.max(0, 1 - delta * 7)
      caOffset.set(caOffset.x * k, caOffset.y * k)
    }
  })

  return (
    <EffectComposer multisampling={0}>
      <N8AO quality="medium" halfRes depthAwareUpsampling aoRadius={1.5} distanceFalloff={0.4} intensity={2} />
      <Bloom mipmapBlur luminanceThreshold={1} intensity={0.75} />
      <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.35} />
      <Vignette offset={0.18} darkness={0.75} />
      <SMAA />
    </EffectComposer>
  )
}
