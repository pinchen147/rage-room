import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { usePbrSet } from './materials'

export const ROOM_HALF = 8 // room is 16 x 16 m — intimate garage
const WALL_H = 2.25 // half-height → walls are 4.5 m tall

const WALLS: { pos: [number, number, number]; half: [number, number, number] }[] = [
  { pos: [0, WALL_H, -ROOM_HALF], half: [ROOM_HALF, WALL_H, 0.5] },
  { pos: [0, WALL_H, ROOM_HALF], half: [ROOM_HALF, WALL_H, 0.5] },
  { pos: [-ROOM_HALF, WALL_H, 0], half: [0.5, WALL_H, ROOM_HALF] },
  { pos: [ROOM_HALF, WALL_H, 0], half: [0.5, WALL_H, ROOM_HALF] },
]

const PILLARS: [number, number][] = [
  [-ROOM_HALF + 0.7, -ROOM_HALF + 0.7],
  [ROOM_HALF - 0.7, -ROOM_HALF + 0.7],
  [-ROOM_HALF + 0.7, ROOM_HALF - 0.7],
  [ROOM_HALF - 0.7, ROOM_HALF - 0.7],
]

/** PBR abandoned-garage shell. Colliders are identical to the original flat room. */
export function Room() {
  const floor = usePbrSet('/assets/textures/garage_floor', [3.5, 3.5])
  const wall = usePbrSet('/assets/textures/concrete_wall_004', [4, 1.2])
  const metal = usePbrSet('/assets/textures/metal_plate', [3, 2], true)

  return (
    <>
      <directionalLight
        castShadow
        position={[6, 11, 3]}
        intensity={1.6}
        color="#fff2dd"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-far={28}
        shadow-bias={-0.0004}
      />

      <RigidBody type="fixed" colliders={false}>
        {/* floor */}
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 16]} />
          <meshStandardMaterial {...floor} roughness={1} metalness={0.02} />
        </mesh>
        <CuboidCollider args={[ROOM_HALF, 0.5, ROOM_HALF]} position={[0, -0.5, 0]} />

        {/* walls */}
        {WALLS.map((w, i) => (
          <mesh key={i} position={w.pos} receiveShadow castShadow>
            <boxGeometry args={[w.half[0] * 2, w.half[1] * 2, w.half[2] * 2]} />
            <meshStandardMaterial {...wall} roughness={1} metalness={0} />
          </mesh>
        ))}
        {WALLS.map((w, i) => (
          <CuboidCollider key={i} args={w.half} position={w.pos} />
        ))}

        {/* roll-up door on the north wall */}
        <mesh position={[0, 1.9, -ROOM_HALF + 0.52]} receiveShadow>
          <boxGeometry args={[5.6, 3.8, 0.08]} />
          <meshStandardMaterial
            map={metal.map}
            normalMap={metal.normalMap}
            roughnessMap={metal.roughnessMap}
            metalnessMap={metal.metalnessMap}
            metalness={1}
            roughness={1}
          />
        </mesh>

        {/* corner pillars */}
        {PILLARS.map(([x, z], i) => (
          <mesh key={i} position={[x, WALL_H, z]} castShadow receiveShadow>
            <boxGeometry args={[0.5, WALL_H * 2, 0.5]} />
            <meshStandardMaterial
              map={metal.map}
              normalMap={metal.normalMap}
              roughnessMap={metal.roughnessMap}
              metalnessMap={metal.metalnessMap}
              metalness={1}
              roughness={1}
            />
          </mesh>
        ))}
      </RigidBody>
    </>
  )
}
