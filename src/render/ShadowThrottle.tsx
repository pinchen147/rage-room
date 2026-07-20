import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { onImpact } from '../feel/impactBus'

/** The shadow depth pass is one of the biggest steady costs, yet the scene is
 * static between hits. Freeze shadow-map updates and re-render them only for a
 * window after any impact (plus a periodic keepalive for respawns/settling). */
export function ShadowThrottle() {
  const gl = useThree((s) => s.gl)
  const dirtyUntil = useRef(Number.MAX_SAFE_INTEGER) // warm up until first frame flips it
  const lastKeepalive = useRef(0)

  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    dirtyUntil.current = performance.now() + 2000
    const off = onImpact(() => {
      dirtyUntil.current = performance.now() + 1600
    })
    return () => {
      gl.shadowMap.autoUpdate = true
      off()
    }
  }, [gl])

  useFrame(() => {
    const now = performance.now()
    if (now < dirtyUntil.current) {
      gl.shadowMap.needsUpdate = true
    } else if (now - lastKeepalive.current > 1200) {
      // one refresh frame every 1.2s catches respawns and slow settling
      lastKeepalive.current = now
      gl.shadowMap.needsUpdate = true
    }
  })

  return null
}
