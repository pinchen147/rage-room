import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../state/store'
import { WEAPONS } from './arsenal'
import { onSwing } from './swing'
import { playerMotion } from '../input/PlayerController'

const ease = (x: number): number => x * x * (3 - 2 * x) // smoothstep
const damp = (cur: number, target: number, lambda: number, dt: number): number =>
  cur + (target - cur) * (1 - Math.exp(-lambda * dt))

/** First-person weapon: camera-space placement + swing anim + look-sway and
 * walk-bob for weight. The sledge head wears the real metal_plate PBR set. */
export function Viewmodel() {
  const camera = useThree((s) => s.camera)
  const group = useRef<THREE.Group>(null)
  const weaponIndex = useGame((s) => s.weaponIndex)
  const w = WEAPONS[weaponIndex]
  const isMelee = w.kind === 'melee'
  const swingStart = useRef(-999)

  const metalTex = useTexture({
    map: '/assets/textures/metal_plate/diff_1k.jpg',
    normalMap: '/assets/textures/metal_plate/nor_gl_1k.jpg',
    roughnessMap: '/assets/textures/metal_plate/rough_1k.jpg',
    metalnessMap: '/assets/textures/metal_plate/metal_1k.jpg',
  })
  useEffect(() => {
    metalTex.map.colorSpace = THREE.SRGBColorSpace
  }, [metalTex])

  const sway = useRef({ x: 0, y: 0 })
  const prev = useRef({ yaw: 0, pitch: 0 })
  const bobT = useRef(0)

  useEffect(() => onSwing(() => (swingStart.current = performance.now() / 1000)), [])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(delta, 1 / 30)
    const t = performance.now() / 1000 - swingStart.current
    const dur = isMelee ? 0.28 : 0.16

    // look sway: weapon lags the camera slightly
    const dYaw = playerMotion.yaw - prev.current.yaw
    const dPitch = playerMotion.pitch - prev.current.pitch
    prev.current.yaw = playerMotion.yaw
    prev.current.pitch = playerMotion.pitch
    sway.current.x = damp(sway.current.x, THREE.MathUtils.clamp(-dYaw * 2.2, -0.05, 0.05), 10, dt)
    sway.current.y = damp(sway.current.y, THREE.MathUtils.clamp(dPitch * 1.8, -0.04, 0.04), 10, dt)

    // walk bob
    const speedNorm = Math.min(1, playerMotion.speed / 6)
    if (playerMotion.grounded && speedNorm > 0.05) bobT.current += dt * (4.6 + speedNorm * 3.4)
    const bobY = Math.sin(bobT.current * 2) * 0.009 * speedNorm
    const bobX = Math.cos(bobT.current) * 0.006 * speedNorm

    let swing = 0
    let lunge = 0
    let drop = 0
    if (t >= 0 && t < dur) {
      const p = t / dur
      if (isMelee) {
        if (p < 0.22) {
          swing = -0.9 * ease(p / 0.22)
        } else if (p < 0.5) {
          const k = ease((p - 0.22) / 0.28)
          swing = -0.9 + k * 2.5
          lunge = Math.sin(k * Math.PI) * 0.2
          drop = Math.sin(k * Math.PI) * 0.09
        } else {
          swing = 1.6 * (1 - ease((p - 0.5) / 0.5))
        }
      } else {
        const k = ease(p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6)
        swing = -0.6 * k
        lunge = 0.28 * k
      }
    }

    g.position.copy(camera.position)
    g.quaternion.copy(camera.quaternion)
    g.translateX(0.3 + sway.current.x + bobX)
    g.translateY(-0.28 - drop + sway.current.y + bobY)
    g.translateZ(-0.62 - lunge)
    g.rotateZ(0.12 + sway.current.x * 0.6)
    g.rotateX(-0.2 + swing + sway.current.y * 0.8)
  })

  return (
    <group ref={group}>
      {w.kind === 'melee' ? (
        <>
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.024, 0.028, 0.5, 10]} />
            <meshStandardMaterial color="#5a4128" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.22, 0.18, 0.2]} />
            <meshStandardMaterial {...metalTex} metalness={1} roughness={1} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, -0.05, 0]}>
          <sphereGeometry args={[w.radius, 18, 18]} />
          <meshStandardMaterial
            color={w.color}
            metalness={w.metal}
            roughness={0.35}
            emissive={w.blast ? '#39ff6a' : '#000000'}
            emissiveIntensity={w.blast ? 2.2 : 0}
          />
        </mesh>
      )}
    </group>
  )
}
