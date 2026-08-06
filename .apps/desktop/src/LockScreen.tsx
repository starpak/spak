import React, { useState, useEffect } from 'react'

export default function LockScreen() {
  const [time, setTime] = useState(new Date())
  const [unlocking, setUnlocking] = useState(false)

  // TODO: replace with proper i18n when desktop app has locale support
  const lang = (typeof navigator !== 'undefined' && navigator.language?.startsWith('zh')) ? 'zh' : 'en'
  const t = lang === 'zh'
    ? { lock_cannot_unlock: '🔒 暂时无法解锁', lock_click_hint: '点击任意位置尝试解锁' }
    : { lock_cannot_unlock: '🔒 Unable to unlock', lock_click_hint: 'Click anywhere to try unlocking' }

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const dateStr = time.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between', padding: '3rem 0',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        color: '#fff', fontFamily: "'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
        userSelect: 'none', cursor: 'default',
      }}
      onClick={() => setUnlocking(true)}
    >
      <div style={{
        marginTop: '8rem', textAlign: 'center',
        transition: 'opacity 0.5s, transform 0.5s',
        opacity: unlocking ? 0 : 1, transform: unlocking ? 'translateY(-20px)' : 'translateY(0)',
      }}>
        <div style={{
          fontSize: '7rem', fontWeight: 200, letterSpacing: '-0.05em',
          textShadow: '0 4px 30px rgba(0,0,0,0.3)',
        }}>{hours}:{minutes}</div>
        <div style={{ fontSize: '1.3rem', fontWeight: 300, opacity: 0.8, marginTop: '0.5rem' }}>{dateStr}</div>
      </div>

      <div style={{ transition: 'opacity 0.5s', opacity: unlocking ? 1 : 0.3 }}>
        <div style={{
          fontSize: '1.5rem', fontWeight: 600, letterSpacing: '0.3em', color: '#00d4ff',
          textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
        }}>S P A K</div>
      </div>

      <div style={{
        marginBottom: '3rem', textAlign: 'center',
        transition: 'opacity 0.5s', opacity: unlocking ? 1 : 0.5,
      }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 400, opacity: 0.6, marginBottom: '0.5rem' }}>
          {unlocking ? t.lock_cannot_unlock : t.lock_click_hint}
        </div>
        <div style={{
          width: '40px', height: '40px', border: '2px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto', fontSize: '1.2rem',
          animation: unlocking ? 'none' : 'pulse 2s infinite',
        }}>🔒</div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
