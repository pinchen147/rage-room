import { CuboidCollider, RigidBody } from '@react-three/rapier'

const HALF = 12 // room is 24 x 24
const WALL_H = 3 // half-height → walls are 6m tall

// [halfX, halfY, halfZ] extents + centre position for each wall.
const WALLS: { pos: [number, number, number]; half: [number, number, number] }[] = [
  { pos: [0, WALL_H, -HALF], half: [HALF, WALL_H, 0.5] },
  { pos: [0, WALL_H, HALF], half: [HALF, WALL_H, 0.5] },
  { pos: [-HALF, WALL_H, 0], half: [0.5, WALL_H, HALF] },
  { pos: [HALF, WALL_H, 0], half: [0.5, WALL_H, HALF] },
]

export function Room() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#8a97a8', '#242426', 0.5]} />
      <directionalLight
        castShadow
        position={[6, 13, 4]}
        intensity={2.2}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={40}
      />

      {/* Static shell: floor + 4 walls, one fixed body, explicit colliders. */}
      <RigidBody type="fixed" colliders={false}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[24, 24]} />
          <meshStandardMaterial color="#34343a" roughness={0.95} metalness={0} />
        </mesh>
        <CuboidCollider args={[HALF, 0.5, HALF]} position={[0, -0.5, 0]} />

        {WALLS.map((w, i) => (
          <mesh key={i} position={w.pos} receiveShadow castShadow>
            <boxGeometry args={[w.half[0] * 2, w.half[1] * 2, w.half[2] * 2]} />
            <meshStandardMaterial color="#26262b" roughness={0.9} metalness={0.05} />
          </mesh>
        ))}
        {WALLS.map((w, i) => (
          <CuboidCollider key={i} args={w.half} position={w.pos} />
        ))}
      </RigidBody>
    </>
  )
}
