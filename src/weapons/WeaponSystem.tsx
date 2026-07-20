import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGame } from '../state/store'
import { WEAPONS } from './arsenal'
import type { ThrowWeapon } from './arsenal'
import { meleeSmash, radialSmash } from '../systems/destruction'
import { emitImpact } from '../feel/impactBus'
import { triggerSwing } from './swing'
import { triggerDash } from '../input/dash'

interface Shot {
  id: number
  pos: [number, number, number]
  vel: [number, number, number]
  weapon: ThrowWeapon
}
let nextId = 0

function Projectile({ shot, onExpire }: { shot: Shot; onExpire: (id: number) => void }) {
  const ref = useRef<RapierRigidBody>(null)
  const spent = useRef(false)
  const w = shot.weapon
  useEffect(() => {
    ref.current?.setLinvel({ x: shot.vel[0], y: shot.vel[1], z: shot.vel[2] }, true)
    const t = window.setTimeout(() => onExpire(shot.id), 8000)
    return () => window.clearTimeout(t)
  }, [shot, onExpire])

  return (
    <RigidBody
      ref={ref}
      colliders="ball"
      position={shot.pos}
      ccd
      mass={w.mass}
      restitution={0.25}
      onCollisionEnter={
        w.blast
          ? ({ target }) => {
              if (spent.current) return
              spent.current = true
              const p = target.rigidBody?.translation()
              if (p) {
                radialSmash(p.x, p.y, p.z, w.blast ?? 5, w.blastPower ?? 10)
                emitImpact(0.9, p.x, p.y, p.z)
              }
              onExpire(shot.id)
            }
          : undefined
      }
    >
      <mesh castShadow>
        <sphereGeometry args={[w.radius, 18, 18]} />
        <meshStandardMaterial
          color={w.color}
          metalness={w.metal}
          roughness={0.35}
          emissive={w.blast ? '#39ff6a' : '#000000'}
          emissiveIntensity={w.blast ? 0.5 : 0}
        />
      </mesh>
    </RigidBody>
  )
}

export function WeaponSystem() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const weaponIndex = useGame((s) => s.weaponIndex)
  const setWeapon = useGame((s) => s.setWeapon)
  const cycleWeapon = useGame((s) => s.cycleWeapon)
  const resetRoom = useGame((s) => s.resetRoom)
  const addRage = useGame((s) => s.addRage)
  const [shots, setShots] = useState<Shot[]>([])
  const fwd = useMemo(() => new THREE.Vector3(), [])
  const cooldownUntil = useRef(0)
  const weaponRef = useRef(weaponIndex)
  weaponRef.current = weaponIndex

  const attack = useCallback(() => {
    const now = performance.now() / 1000
    if (now < cooldownUntil.current) return
    const w = WEAPONS[weaponRef.current]
    cooldownUntil.current = now + w.cooldown
    triggerSwing()
    camera.getWorldDirection(fwd)
    if (w.kind === 'melee') {
      if (w.dash) triggerDash(w.dash)
      const hits = meleeSmash(
        camera.position.x,
        camera.position.y,
        camera.position.z,
        fwd.x,
        fwd.y,
        fwd.z,
        w.range,
        w.cosArc,
        w.power,
      )
      addRage(0.02 + hits * 0.02)
      emitImpact(0.5) // Thor slam shakes the screen even on a whiff
    } else {
      const pos: [number, number, number] = [
        camera.position.x + fwd.x * 0.9,
        camera.position.y + fwd.y * 0.9,
        camera.position.z + fwd.z * 0.9,
      ]
      const vel: [number, number, number] = [fwd.x * w.speed, fwd.y * w.speed + 1.5, fwd.z * w.speed]
      setShots((s) => [...s.slice(-30), { id: nextId++, pos, vel, weapon: w }])
      addRage(0.02)
      emitImpact(0.08)
    }
  }, [camera, fwd, addRage])

  useEffect(() => {
    const el = gl.domElement
    const locked = () => document.pointerLockElement === el
    const onMouseDown = (e: MouseEvent) => {
      if (locked()) {
        e.preventDefault()
        attack()
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
        const n = Number(e.code.replace(/\D/g, '')) - 1
        if (n >= 0 && n < WEAPONS.length) setWeapon(n)
      } else if (e.code === 'KeyQ') {
        cycleWeapon(-1)
      } else if (e.code === 'KeyE') {
        cycleWeapon(1)
      } else if (e.code === 'KeyR') {
        resetRoom()
      } else if (e.code === 'KeyF' && locked()) {
        attack()
      }
    }
    const onWheel = (e: WheelEvent) => {
      if (locked()) cycleWeapon(e.deltaY > 0 ? 1 : -1)
    }
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl, attack, setWeapon, cycleWeapon, resetRoom])

  const expire = useCallback((id: number) => setShots((s) => s.filter((x) => x.id !== id)), [])

  return (
    <>
      {shots.map((s) => (
        <Projectile key={s.id} shot={s} onExpire={expire} />
      ))}
    </>
  )
}
