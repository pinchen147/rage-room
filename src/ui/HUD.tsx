import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { destructionPct, useGame } from '../state/store'
import { WEAPONS } from '../weapons/arsenal'

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

const panel: CSSProperties = { position: 'absolute', top: 20, left: 20, lineHeight: 1.3, textShadow: '0 1px 3px #000' }

const weaponBox: CSSProperties = {
  position: 'absolute',
  top: 20,
  right: 20,
  textAlign: 'right',
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
  const weaponIndex = useGame((s) => s.weaponIndex)
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
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.7, marginTop: 6 }}>RAGE {Math.round(rage * 100)}%</div>
        <div style={{ fontSize: 10, opacity: 0.4, marginTop: 8 }}>last impact {lastImpact.toFixed(1)} m/s</div>
      </div>

      <div style={weaponBox}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.7, marginBottom: 6 }}>WEAPON</div>
        {WEAPONS.map((weapon, i) => (
          <div
            key={weapon.id}
            style={{
              fontSize: i === weaponIndex ? 16 : 13,
              fontWeight: i === weaponIndex ? 700 : 400,
              opacity: i === weaponIndex ? 1 : 0.4,
              marginBottom: 2,
            }}
          >
            {i + 1} · {weapon.name}
            {i === weaponIndex ? '  ◄' : ''}
          </div>
        ))}
        <div style={{ fontSize: 10, opacity: 0.55, marginTop: 6 }}>1–3 · Q / E · scroll to swap</div>
      </div>

      {!locked && (
        <div style={start}>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 3 }}>RAGE ROOM</div>
          <div style={{ fontSize: 14, opacity: 0.85 }}>click to play</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8, lineHeight: 1.7 }}>
            WASD move · mouse look · click / F = attack
            <br />1–3 / Q / E = swap weapon · scroll = cycle · R = new room · Esc = release
          </div>
        </div>
      )}

      <div style={hint}>click / F = attack · 1–3 / Q / E swap · R = reset room · smash to 100%</div>
    </div>
  )
}
