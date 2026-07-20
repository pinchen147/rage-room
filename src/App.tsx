import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Environment, Stats } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { PlayerController } from './input/PlayerController'
import { Room } from './scene/Room'
import { Dressing } from './scene/Dressing'
import { WeaponSystem } from './weapons/WeaponSystem'
import { Viewmodel } from './weapons/Viewmodel'
import { DebrisManager } from './props/Debris'
import { ParticleSystem } from './vfx/Particles'
import { JuiceController } from './feel/JuiceController'
import { HitStopDriver } from './feel/HitStopDriver'
import { AudioListenerSync } from './audio/AudioListenerSync'
import { Effects } from './render/Effects'
import { useTime } from './feel/timeState'
import { HUD } from './ui/HUD'
import './loaders/assets'

const DEBUG = typeof window !== 'undefined' && window.location.search.includes('debug')

export function App() {
  const frozen = useTime((s) => s.frozen)

  return (
    <>
      <Canvas
        shadows="percentage"
        dpr={[1, 1.25]}
        gl={{ antialias: false, stencil: false, depth: false, powerPreference: 'high-performance' }}
        camera={{ fov: 75, near: 0.1, far: 100, position: [0, 1.6, 5] }}
      >
        <color attach="background" args={['#0b0b0c']} />
        <fog attach="fog" args={['#0b0b0c', 12, 40]} />
        <Suspense fallback={null}>
          <Environment files="/assets/hdri/abandoned_garage_1k.hdr" />
          {/* physics steps first (priority -100); all camera/FX code runs after at 0 */}
          <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} paused={frozen} updatePriority={-100}>
            <Room />
            <PlayerController />
            <Dressing />
            <WeaponSystem />
            <DebrisManager />
            {/* last inside Physics so shake/FOV apply after the controller writes the camera */}
            <JuiceController />
          </Physics>
          <Effects />
        </Suspense>
        <ParticleSystem />
        <AudioListenerSync />
        <HitStopDriver />
        <AdaptiveDpr pixelated />
        <Viewmodel />
        {DEBUG && <Stats />}
      </Canvas>
      <HUD />
    </>
  )
}
