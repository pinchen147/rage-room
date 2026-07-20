import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/** Pooled physics-free particles: dust puffs (billboarded soft sprites) and hot
 * sparks (HDR color → picked up by bloom). Module-level emit API, zero GC in loop. */

const DUST_N = 240
const SPARK_N = 160
const G = -14

interface Pool {
  pos: Float32Array
  vel: Float32Array
  life: Float32Array
  max: Float32Array
  size: Float32Array
  cursor: number
}

const makePool = (n: number): Pool => ({
  pos: new Float32Array(n * 3),
  vel: new Float32Array(n * 3),
  life: new Float32Array(n),
  max: new Float32Array(n),
  size: new Float32Array(n),
  cursor: 0,
})

const dust = makePool(DUST_N)
const sparks = makePool(SPARK_N)

function spawn(p: Pool, n: number, x: number, y: number, z: number, spread: number, up: number, size: number, life: number): void {
  const cap = p.life.length
  for (let k = 0; k < n; k++) {
    const i = p.cursor++ % cap
    p.pos[i * 3] = x + (Math.random() - 0.5) * 0.3
    p.pos[i * 3 + 1] = y + (Math.random() - 0.5) * 0.3
    p.pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.3
    p.vel[i * 3] = (Math.random() - 0.5) * spread
    p.vel[i * 3 + 1] = Math.random() * up + up * 0.3
    p.vel[i * 3 + 2] = (Math.random() - 0.5) * spread
    p.max[i] = p.life[i] = life * (0.7 + Math.random() * 0.6)
    p.size[i] = size * (0.6 + Math.random() * 0.8)
  }
}

export function emitDust(pos: readonly [number, number, number], count = 14, size = 0.3): void {
  spawn(dust, count, pos[0], pos[1], pos[2], 2.2, 1.1, size, 1.1)
}

export function emitSparks(pos: readonly [number, number, number], count = 12): void {
  spawn(sparks, count, pos[0], pos[1], pos[2], 6, 3.2, 1, 0.55)
}

function makeDustTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function ParticleSystem() {
  const camera = useThree((s) => s.camera)
  const dustRef = useRef<THREE.InstancedMesh>(null)
  const sparkRef = useRef<THREE.InstancedMesh>(null)
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const s = useMemo(() => new THREE.Vector3(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), [])
  const dustTex = useMemo(makeDustTexture, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)

    const dm = dustRef.current
    if (dm) {
      for (let i = 0; i < DUST_N; i++) {
        const l = dust.life[i]
        if (l <= 0) {
          m.makeScale(0, 0, 0)
        } else {
          dust.life[i] = l - dt
          const k = 1 - dt * 2.2
          dust.vel[i * 3] *= k
          dust.vel[i * 3 + 1] = dust.vel[i * 3 + 1] * k + 0.5 * dt
          dust.vel[i * 3 + 2] *= k
          dust.pos[i * 3] += dust.vel[i * 3] * dt
          dust.pos[i * 3 + 1] += dust.vel[i * 3 + 1] * dt
          dust.pos[i * 3 + 2] += dust.vel[i * 3 + 2] * dt
          const u = l / dust.max[i]
          const grow = dust.size[i] * (1.6 - u * 0.9) * (u < 0.25 ? u / 0.25 : 1)
          s.setScalar(grow)
          m.compose(v.set(dust.pos[i * 3], dust.pos[i * 3 + 1], dust.pos[i * 3 + 2]), camera.quaternion, s)
        }
        dm.setMatrixAt(i, m)
      }
      dm.instanceMatrix.needsUpdate = true
    }

    const sm = sparkRef.current
    if (sm) {
      for (let i = 0; i < SPARK_N; i++) {
        const l = sparks.life[i]
        if (l <= 0) {
          m.makeScale(0, 0, 0)
        } else {
          sparks.life[i] = l - dt
          sparks.vel[i * 3 + 1] += G * dt
          sparks.pos[i * 3] += sparks.vel[i * 3] * dt
          sparks.pos[i * 3 + 1] += sparks.vel[i * 3 + 1] * dt
          sparks.pos[i * 3 + 2] += sparks.vel[i * 3 + 2] * dt
          v.set(sparks.vel[i * 3], sparks.vel[i * 3 + 1], sparks.vel[i * 3 + 2])
          const len = v.length()
          q.setFromUnitVectors(zAxis, len > 0.001 ? v.divideScalar(len) : zAxis)
          const u = l / sparks.max[i]
          s.set(0.02, 0.02, 0.05 + len * 0.02).multiplyScalar(u)
          m.compose(v.set(sparks.pos[i * 3], sparks.pos[i * 3 + 1], sparks.pos[i * 3 + 2]), q, s)
        }
        sm.setMatrixAt(i, m)
      }
      sm.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh ref={dustRef} args={[undefined, undefined, DUST_N]} frustumCulled={false}>
        <planeGeometry args={[0.3, 0.3]} />
        <meshBasicMaterial map={dustTex} transparent opacity={0.32} depthWrite={false} color="#b7aa98" />
      </instancedMesh>
      <instancedMesh ref={sparkRef} args={[undefined, undefined, SPARK_N]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={[5, 2.6, 0.9]} toneMapped={false} />
      </instancedMesh>
    </>
  )
}
