import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { onDash } from './dash'
import * as Audio from '../audio/AudioEngine'

const SPEED = 6 // m/s
const JUMP = 5 // m/s
const GRAVITY = -18 // snappier than real g
const EYE = 1.4 // camera height above capsule origin
const LOOK_SENS = 0.00205
const PITCH_LIMIT = 1.45

/** Read-only motion state for the viewmodel (sway/bob) — module ref, no React. */
export const playerMotion = { speed: 0, grounded: true, yaw: 0, pitch: 0 }

interface Keys {
  f: boolean
  b: boolean
  l: boolean
  r: boolean
  jump: boolean
}

const CODE_MAP: Record<string, keyof Keys> = {
  KeyW: 'f',
  ArrowUp: 'f',
  KeyS: 'b',
  ArrowDown: 'b',
  KeyA: 'l',
  ArrowLeft: 'l',
  KeyD: 'r',
  ArrowRight: 'r',
  Space: 'jump',
}

/** First-person controller. Owns the pointer lock AND the camera quaternion —
 * look is written once per frame (after physics) so nothing tears; aim is 1:1. */
export function PlayerController() {
  const body = useRef<RapierRigidBody>(null)
  const { world } = useRapier()
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const keys = useRef<Keys>({ f: false, b: false, l: false, r: false, jump: false })
  const yaw = useRef(0)
  const pitch = useRef(0)

  useEffect(() => {
    const el = gl.domElement
    const requestLock = () => {
      if (document.pointerLockElement === el) return
      try {
        const p = (el as HTMLCanvasElement & { requestPointerLock: (o?: object) => Promise<void> | undefined }).requestPointerLock({
          unadjustedMovement: true,
        })
        p?.catch?.(() => el.requestPointerLock())
      } catch {
        el.requestPointerLock()
      }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return
      yaw.current -= e.movementX * LOOK_SENS
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current - e.movementY * LOOK_SENS))
    }
    const down = (e: KeyboardEvent) => {
      const k = CODE_MAP[e.code]
      if (k) keys.current[k] = true
    }
    const up = (e: KeyboardEvent) => {
      const k = CODE_MAP[e.code]
      if (k) keys.current[k] = false
    }
    el.addEventListener('click', requestLock)
    document.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      el.removeEventListener('click', requestLock)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [gl])

  const controller = useMemo(() => {
    const c = world.createCharacterController(0.01)
    c.enableAutostep(0.4, 0.2, true)
    c.enableSnapToGround(0.5)
    c.setApplyImpulsesToDynamicBodies(true)
    return c
  }, [world])

  useEffect(() => () => world.removeCharacterController(controller), [world, controller])

  const vVel = useRef(0)
  const dashRef = useRef(0)
  const stepDist = useRef(0)
  useEffect(() => onDash((s) => (dashRef.current = s)), [])
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), [])
  const move = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const rb = body.current
    if (!rb) return
    const dt = Math.min(delta, 1 / 30)
    const k = keys.current

    // look (1:1, written before movement reads it)
    euler.set(pitch.current, yaw.current, 0)
    camera.quaternion.setFromEuler(euler)

    const fx = -Math.sin(yaw.current)
    const fz = -Math.cos(yaw.current)
    const rx = -fz
    const rz = fx

    move.set(0, 0, 0)
    if (k.f) move.x += fx, (move.z += fz)
    if (k.b) move.x -= fx, (move.z -= fz)
    if (k.r) move.x += rx, (move.z += rz)
    if (k.l) move.x -= rx, (move.z -= rz)
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(SPEED * dt)

    // Thor dash: fast-decaying forward lunge on top of walking.
    if (dashRef.current > 0.1) {
      move.x += fx * dashRef.current * dt
      move.z += fz * dashRef.current * dt
      dashRef.current *= Math.max(0, 1 - dt * 13)
    } else {
      dashRef.current = 0
    }

    vVel.current += GRAVITY * dt
    const collider = rb.collider(0)
    controller.computeColliderMovement(collider, { x: move.x, y: vVel.current * dt, z: move.z })
    const grounded = controller.computedGrounded()
    if (grounded) vVel.current = k.jump ? JUMP : 0

    const d = controller.computedMovement()
    const t = rb.translation()
    const nx = t.x + d.x
    const ny = t.y + d.y
    const nz = t.z + d.z
    rb.setNextKinematicTranslation({ x: nx, y: ny, z: nz })
    camera.position.set(nx, ny + EYE, nz)

    // motion state for viewmodel + footsteps
    const speed = dt > 0 ? Math.hypot(d.x, d.z) / dt : 0
    playerMotion.speed = speed
    playerMotion.grounded = grounded
    playerMotion.yaw = yaw.current
    playerMotion.pitch = pitch.current
    if (grounded && speed > 1) {
      stepDist.current += speed * dt
      if (stepDist.current > 2.1) {
        stepDist.current = 0
        Audio.footstep()
      }
    }
  })

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[0, 2, 5]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[0.5, 0.35]} />
    </RigidBody>
  )
}
