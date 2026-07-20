import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGame } from '../state/store'

// Interim throwing: click hurls a projectile along your aim, F hurls a heavy
// one. Real flick-charge throwing + melee shape-sweep come with the smash loop.
interface Shot {
  id: number
  pos: [number, number, number]
  vel: [number, number, number]
  heavy: boolean
}
let nextId = 0

function Projectile({ shot, onExpire }: { shot: Shot; onExpire: (id: number) => void }) {
  const ref = useRef<RapierRigidBody>(null)
  useEffect(() => {
    ref.current?.setLinvel({ x: shot.vel[0], y: shot.vel[1], z: shot.vel[2] }, true)
    const t = window.setTimeout(() => onExpire(shot.id), 8000)
    return () => window.clearTimeout(t)
  }, [shot, onExpire])
  const r = shot.heavy ? 0.28 : 0.16
  return (
    <RigidBody ref={ref} colliders="ball" position={shot.pos} ccd mass={shot.heavy ? 12 : 3} restitution={0.2}>
      <mesh castShadow>
        <sphereGeometry args={[r, 16, 16]} />
        <meshStandardMaterial color={shot.heavy ? '#9a9a9a' : '#e6e6e6'} metalness={0.6} roughness={0.3} />
      </mesh>
    </RigidBody>
  )
}

export function Weapons() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const addRage = useGame((s) => s.addRage)
  const [shots, setShots] = useState<Shot[]>([])
  const dir = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const el = gl.domElement
    const throwShot = (heavy: boolean) => {
      camera.getWorldDirection(dir)
      const speed = heavy ? 40 : 26
      const pos: [number, number, number] = [
        camera.position.x + dir.x * 0.8,
        camera.position.y + dir.y * 0.8,
        camera.position.z + dir.z * 0.8,
      ]
      const vel: [number, number, number] = [dir.x * speed, dir.y * speed + (heavy ? 0 : 1.5), dir.z * speed]
      setShots((s) => [...s.slice(-40), { id: nextId++, pos, vel, heavy }])
      addRage(0.02)
    }
    const onMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement === el) {
        e.preventDefault()
        throwShot(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.pointerLockElement === el && (e.code === 'KeyF' || e.code === 'KeyE')) throwShot(true)
    }
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [camera, gl, dir, addRage])

  const expire = useCallback((id: number) => setShots((s) => s.filter((x) => x.id !== id)), [])

  return (
    <>
      {shots.map((s) => (
        <Projectile key={s.id} shot={s} onExpire={expire} />
      ))}
    </>
  )
}
