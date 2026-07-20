import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PointerLockControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { PlayerController } from './input/PlayerController'
import { Room } from './scene/Room'
import { SmashableField } from './props/SmashableBox'
import { WeaponSystem } from './weapons/WeaponSystem'
import { Viewmodel } from './weapons/Viewmodel'
import { JuiceController } from './feel/JuiceController'
import { HUD } from './ui/HUD'

export function App() {
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
        camera={{ fov: 75, near: 0.1, far: 100, position: [0, 1.6, 5] }}
      >
        <color attach="background" args={['#0a0a0b']} />
        <fog attach="fog" args={['#0a0a0b', 10, 44]} />
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
            <Room />
            <PlayerController />
            <SmashableField />
            <WeaponSystem />
            {/* mounted last so its useFrame runs after the player sets camera pos */}
            <JuiceController />
          </Physics>
        </Suspense>
        <AdaptiveDpr pixelated />
        <Viewmodel />
        <PointerLockControls makeDefault />
      </Canvas>
      <HUD />
    </>
  )
}
