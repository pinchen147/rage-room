import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGame } from '../state/store'
import { WEAPONS } from './arsenal'
import type { ThrowWeapon } from './arsenal'
import { GrenadeMesh } from './GrenadeMesh'
import { blastBodies, radialSmash, slam } from '../systems/destruction'
import { enqueuePhysicsOp } from '../systems/physicsQueue'
import { emitImpact } from '../feel/impactBus'
import { hitStop } from '../feel/timeState'
import { triggerSwing } from './swing'
import { triggerDash } from '../input/dash'
import { emitDust, emitSparks } from '../vfx/Particles'
import { emitFlash } from '../vfx/ExplosionFlash'
import * as Audio from '../audio/AudioEngine'

const SLAM_DELAY_MS = 110 // impact resolves when the viewmodel slam lands
const GRENADE_FUSE_S = 1.6

interface Shot {
  id: number
  pos: [number, number, number]
  vel: [number, number, number]
  weapon: ThrowWeapon
}
let nextId = 0

const Projectile = memo(function Projectile({ shot, onExpire }: { shot: Shot; onExpire: (id: number) => void }) {
  const ref = useRef<RapierRigidBody>(null)
  const spent = useRef(false)
  const w = shot.weapon

  const detonate = () => {
    if (spent.current) return
    spent.current = true
    const p = ref.current?.translation()
    onExpire(shot.id)
    if (!p) return
    const at: [number, number, number] = [p.x, p.y, p.z]
    // World mutations run at the safe pre-step point, never in this callback.
    enqueuePhysicsOp((w2) => {
      radialSmash(at[0], at[1], at[2], w.blast ?? 5, w.blastPower ?? 10)
      blastBodies(w2, at[0], at[1], at[2], w.blast ?? 5, 3.2)
      Audio.explosion(at)
      emitFlash(at)
      emitDust(at, 18, 0.7)
      emitSparks(at, 18)
      emitImpact(1, ...at)
      hitStop(70)
    })
  }
  const detonateRef = useRef(detonate)
  detonateRef.current = detonate

  useEffect(() => {
    ref.current?.setLinvel({ x: shot.vel[0], y: shot.vel[1], z: shot.vel[2] }, true)
    if (!w.blast) {
      const t = window.setTimeout(() => onExpire(shot.id), 8000)
      return () => window.clearTimeout(t)
    }
    // frag: tumble in flight, detonate on first touch (safety timeout as backstop)
    ref.current?.setAngvel({ x: 6 + Math.random() * 6, y: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 8 }, true)
    const safety = window.setTimeout(() => detonateRef.current(), 8000)
    return () => window.clearTimeout(safety)
  }, [shot, w, onExpire])

  return (
    <RigidBody
      ref={ref}
      colliders="ball"
      position={shot.pos}
      ccd
      mass={w.mass}
      restitution={0.25}
      onCollisionEnter={w.blast ? () => detonateRef.current() : undefined}
    >
      {w.blast ? (
        <GrenadeMesh scale={w.radius / 0.1} armed fuse={GRENADE_FUSE_S} />
      ) : (
        <mesh castShadow>
          <sphereGeometry args={[w.radius, 18, 18]} />
          <meshStandardMaterial color={w.color} metalness={w.metal} roughness={0.35} />
        </mesh>
      )}
    </RigidBody>
  )
})

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

  /** The sledge impact — resolves at the pre-step safe point after the swing
   * visually lands, on the aim at that moment. */
  const resolveSlam = useCallback(
    (range: number, power: number) => {
      enqueuePhysicsOp((w2) => {
        camera.getWorldDirection(fwd)
        const r = slam(w2, camera.position.x, camera.position.y, camera.position.z, fwd.x, fwd.y, fwd.z, range, power)
        if (r.hits > 0) {
          addRage(0.02 + r.hits * 0.02)
          emitImpact(0.4 + Math.min(0.5, r.hits * 0.1), ...r.point)
          hitStop(40 + Math.min(40, r.hits * 10))
        } else {
          // ground slam: thud + dust + shockwave, no break
          Audio.clank('generic', 0.5, r.point)
          emitDust(r.point, 10, 0.4)
          emitImpact(0.22, ...r.point)
        }
      })
    },
    [camera, fwd, addRage],
  )

  const attack = useCallback(() => {
    const now = performance.now() / 1000
    if (now < cooldownUntil.current) return
    const w = WEAPONS[weaponRef.current]
    cooldownUntil.current = now + w.cooldown
    triggerSwing()
    if (w.kind === 'melee') {
      if (w.dash) triggerDash(w.dash)
      Audio.whoosh(true)
      window.setTimeout(() => resolveSlam(w.range, w.power), SLAM_DELAY_MS)
    } else {
      Audio.whoosh(w.id === 'bowling')
      camera.getWorldDirection(fwd)
      const pos: [number, number, number] = [
        camera.position.x + fwd.x * 0.9,
        camera.position.y + fwd.y * 0.9,
        camera.position.z + fwd.z * 0.9,
      ]
      const vel: [number, number, number] = [fwd.x * w.speed, fwd.y * w.speed + 1.5, fwd.z * w.speed]
      setShots((s) => [...s.slice(-11), { id: nextId++, pos, vel, weapon: w }])
      addRage(0.02)
      emitImpact(0.08)
    }
  }, [camera, fwd, addRage, resolveSlam])

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
      } else if (e.code === 'KeyP') {
        useGame.getState().togglePerf()
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
