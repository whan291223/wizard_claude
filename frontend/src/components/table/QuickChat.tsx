import { useState, type CSSProperties } from 'react'
import { EMOTE_PAGES } from '../../utils/emotePhrases'

// Quick-chat panel ported from Game Table.dc.html. Presets only — the backend
// allowlists exactly these phrases (handlers.py `_ALLOWED_EMOTES`), so a free-text
// box would be dropped server-side.

interface QuickChatProps {
  onSend: (phrase: string) => void
  onClose: () => void
}

const panelStyle: CSSProperties = {
  width: 'min(524px, calc(100vw - 24px))', background: 'rgba(9,16,12,0.95)',
  backdropFilter: 'blur(13px)', WebkitBackdropFilter: 'blur(13px)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18,
  boxShadow: '0 24px 56px rgba(0,0,0,0.62)', padding: '14px 16px',
  fontFamily: "'Outfit',sans-serif", color: '#eaf3ec',
}

export default function QuickChat({ onSend, onClose }: QuickChatProps) {
  const [page, setPage] = useState(0)
  const msgs = EMOTE_PAGES[page]

  function pick(phrase: string) {
    onSend(phrase)
    onClose()
  }

  const navBtn: CSSProperties = {
    width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)', color: '#cdded4', fontSize: 15, lineHeight: 1,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9fb8aa', fontWeight: 700 }}>Quick Chat</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={navBtn} onClick={() => setPage((p) => (p + EMOTE_PAGES.length - 1) % EMOTE_PAGES.length)}>‹</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {EMOTE_PAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                style={{
                  border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%',
                  width: i === page ? 7 : 6, height: i === page ? 7 : 6,
                  background: i === page ? '#7dffb0' : 'rgba(255,255,255,0.25)',
                }}
              />
            ))}
          </div>
          <button style={navBtn} onClick={() => setPage((p) => (p + 1) % EMOTE_PAGES.length)}>›</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {msgs.map((text) => (
          <button
            key={text}
            onClick={() => pick(text)}
            style={{
              textAlign: 'left', padding: '10px 12px', borderRadius: 11,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)',
              color: '#eaf3ec', fontSize: 13, fontWeight: 500, lineHeight: 1.25, cursor: 'pointer',
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
