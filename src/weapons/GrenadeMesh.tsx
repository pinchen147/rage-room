import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** Procedural frag grenade: olive fragmentation body, fuze head, safety lever,
 * pin ring, and a red indicator. When `armed`, the indicator blinks faster and
 * faster over the fuse time. Shared by the viewmodel and the projectile. */
export function GrenadeMesh({ scale = 1, armed = false, fuse = 1.6 }: { scale?: number; armed?: boolean; fuse?: number }) {
  const tip = useRef<THREE.MeshStandardMaterial>(null)
  const born = useMemo(() => performance.now() / 1000, [])

  useFrame(() => {
    const m = tip.current
    if (!m) return
    if (!armed) {
      m.emissiveIntensity = 1.2
      return
    }
    const t = Math.min(1, (performance.now() / 1000 - born) / fuse)
    const freq = 4 + t * 22 // blink accelerates toward detonation
    m.emissiveIntensity = Math.sin(t * t * freq * Math.PI * 8) > 0 ? 5 : 0.4
  })

  return (
    <group scale={scale}>
      {/* fragmentation body */}
      <mesh castShadow scale={[1, 1.2, 1]}>
        <sphereGeometry args={[0.085, 16, 12]} />
        <meshStandardMaterial color="#3c4a34" metalness={0.45} roughness={0.55} />
      </mesh>
      {/* score grooves read as a darker equator band */}
      <mesh scale={[1.01, 0.35, 1.01]}>
        <sphereGeometry args={[0.086, 16, 8]} />
        <meshStandardMaterial color="#2c3826" metalness={0.4} roughness={0.7} />
      </mesh>
      {/* fuze neck + cap */}
      <mesh position={[0, 0.115, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.034, 0.05, 10]} />
        <meshStandardMaterial color="#6b6f66" metalness={0.8} roughness={0.35} />
      </mesh>
      {/* safety lever hugging the side */}
      <mesh position={[0.052, 0.075, 0]} rotation={[0, 0, -0.5]} castShadow>
        <boxGeometry args={[0.016, 0.12, 0.028]} />
        <meshStandardMaterial color="#7a7f75" metalness={0.75} roughness={0.4} />
      </mesh>
      {/* pin ring */}
      <mesh position={[-0.045, 0.13, 0]} rotation={[Math.PI / 2, 0, 0.4]}>
        <torusGeometry args={[0.024, 0.005, 8, 16]} />
        <meshStandardMaterial color="#b8a25a" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* armed indicator — HDR when lit so it blooms */}
      <mesh position={[0, 0.148, 0]}>
        <sphereGeometry args={[0.011, 8, 8]} />
        <meshStandardMaterial ref={tip} color="#ff3b30" emissive="#ff3b30" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  )
}
