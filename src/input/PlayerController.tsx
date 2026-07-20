import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'

const SPEED = 6 // m/s
const JUMP = 5 // m/s
const GRAVITY = -18 // snappier than real g
const EYE = 1.4 // camera height above capsule origin
const CAPSULE_HALF = 0.5
const CAPSULE_RADIUS = 0.35
const UP = new THREE.Vector3(0, 1, 0)

interface Keys {
  f: boolean
  b: boolean
  l: boolean
  r: boolean
  jump: boolean
}

// Own window listeners — no drei KeyboardControls context, which does not cross
// R3F's reconciler boundary reliably and can leave WASD dead.
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

export function PlayerController() {
  const body = useRef<RapierRigidBody>(null)
  const { world } = useRapier()
  const camera = useThree((s) => s.camera)
  const keys = useRef<Keys>({ f: false, b: false, l: false, r: false, jump: false })

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = CODE_MAP[e.code]
      if (k) keys.current[k] = true
    }
    const up = (e: KeyboardEvent) => {
      const k = CODE_MAP[e.code]
      if (k) keys.current[k] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const controller = useMemo(() => {
    const c = world.createCharacterController(0.01)
    c.enableAutostep(0.4, 0.2, true)
    c.enableSnapToGround(0.5)
    c.setApplyImpulsesToDynamicBodies(true)
    return c
  }, [world])

  useEffect(() => () => world.removeCharacterController(controller), [world, controller])

  const vVel = useRef(0)
  const move = useMemo(() => new THREE.Vector3(), [])
  const forward = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const rb = body.current
    if (!rb) return
    const dt = Math.min(delta, 1 / 30)
    const k = keys.current

    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, UP).normalize()

    move.set(0, 0, 0)
    if (k.f) move.add(forward)
    if (k.b) move.sub(forward)
    if (k.r) move.add(right)
    if (k.l) move.sub(right)
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(SPEED * dt)

    vVel.current += GRAVITY * dt
    const desired = { x: move.x, y: vVel.current * dt, z: move.z }

    const collider = rb.collider(0)
    controller.computeColliderMovement(collider, desired)
    if (controller.computedGrounded()) {
      vVel.current = k.jump ? JUMP : 0
    }

    const d = controller.computedMovement()
    const t = rb.translation()
    const nx = t.x + d.x
    const ny = t.y + d.y
    const nz = t.z + d.z
    rb.setNextKinematicTranslation({ x: nx, y: ny, z: nz })
    camera.position.set(nx, ny + EYE, nz)
  })

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[0, 2, 5]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[CAPSULE_HALF, CAPSULE_RADIUS]} />
    </RigidBody>
  )
}
