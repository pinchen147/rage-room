import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { updateListener } from './AudioEngine'

/** Keeps the Web Audio listener glued to the camera for spatial panning. */
export function AudioListenerSync() {
  const camera = useThree((s) => s.camera)
  const fwd = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    camera.getWorldDirection(fwd)
    updateListener(camera.position.x, camera.position.y, camera.position.z, fwd.x, fwd.y, fwd.z)
  })
  return null
}
