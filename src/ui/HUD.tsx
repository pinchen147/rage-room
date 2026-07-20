import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { destructionPct, useGame } from '../state/store'

const overlay: CSSProperties = { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10 }

const crosshair: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  fontSize: 20,
  opacity: 0.6,
  color: '#fff',
}

const panel: CSSProperties = {
  position: 'absolute',
  top: 20,
  left: 20,
  lineHeight: 1.3,
  textShadow: '0 1px 3px #000',
}

const hint: CSSProperties = {
  position: 'absolute',
  bottom: 18,
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: 12,
  opacity: 0.6,
  whiteSpace: 'nowrap',
}

const start: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  background: 'rgba(0, 0, 0, 0.55)',
  textAlign: 'center',
}

export function HUD() {
  const pct = useGame(destructionPct)
  const rage = useGame((s) => s.rage)
  const lastImpact = useGame((s) => s.lastImpact)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const onChange = () => setLocked(!!document.pointerLockElement)
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])

  return (
    <div style={overlay}>
      <div style={crosshair}>+</div>
      <div style={panel}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.7 }}>DESTRUCTION</div>
        <div style={{ fontSize: 30, fontWeight: 700 }}>{Math.round(pct * 100)}%</div>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.7, marginTop: 6 }}>
          RAGE {Math.round(rage * 100)}%
        </div>
        <div style={{ fontSize: 10, opacity: 0.45, marginTop: 8 }}>
          last impact {lastImpact.toFixed(1)} m/s
        </div>
      </div>

      {!locked && (
        <div style={start}>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 3 }}>RAGE ROOM</div>
          <div style={{ fontSize: 14, opacity: 0.85 }}>click to play</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
            WASD move · mouse look · click = throw · F = heavy smash · Esc release
          </div>
        </div>
      )}

      <div style={hint}>click = throw · F = heavy smash · WASD move · smash boxes to 100%</div>
    </div>
  )
}
