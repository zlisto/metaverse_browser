import { useCallback, useEffect, useRef, useState } from 'react'
import { whoosh } from './whoosh.js'

// The Metaverse Browser ("me"): shows one world at a time in an iframe, carries your identity,
// keeps history, and follows portals. Speaks mvw/0.1, see ../PROTOCOL.md.

const PROTOCOL = 'mvw/0.1'
// the local copies while developing, the live worlds once deployed
const LIVE = !import.meta.env.DEV
const BOOKMARKS = [
  { label: 'Yale SOM', href: LIVE ? 'https://zlisto.github.io/yale_som_virtual/' : 'http://localhost:5173/', spawn: null },
  { label: 'Darul Kebab', href: LIVE ? 'https://zlisto.github.io/darul_kebab/' : 'http://localhost:5174/', spawn: null },
  ...(LIVE ? [] : [{ label: 'Metaverse Square', href: 'http://localhost:5178/', spawn: null }]), // not online yet
]
const COLORS = ['#ff4fa3', '#4fc8f0', '#ffb703', '#06d6a0', '#b388ff']

// a world entry is { href, spawn }; its address is href with ?spawn=
const addressOf = ({ href, spawn }) => {
  const u = new URL(href)
  if (spawn) u.searchParams.set('spawn', spawn)
  return u.toString()
}
function parseAddress(text) {
  const raw = text.trim()
  const u = new URL(/^https?:\/\//.test(raw) ? raw : `http://${raw}`)
  if (!/^https?:$/.test(u.protocol)) throw new Error('not a web address')
  const spawn = u.searchParams.get('spawn')
  u.searchParams.delete('spawn')
  return { href: u.toString(), spawn }
}
const pretty = (addr) => addr.replace(/^https?:\/\//, '').replace(/\/$/, '')

function loadIdentity() {
  try {
    const v = JSON.parse(localStorage.getItem('mvw.identity'))
    if (v?.name) return v
  } catch {
    // no saved identity yet
  }
  return { name: 'Visitor', color: COLORS[0] }
}

function startEntry() {
  try {
    const w = new URLSearchParams(location.search).get('world')
    if (w) return parseAddress(w)
  } catch {
    // bad ?world= value; fall back to the first bookmark
  }
  return { href: BOOKMARKS[0].href, spawn: null }
}

export default function App() {
  const [hist, setHist] = useState(() => ({ stack: [startEntry()], i: 0 }))
  const [typed, setTyped] = useState(null) // address bar text while editing
  const [fading, setFading] = useState(true)
  const [where, setWhere] = useState('')
  const [manifest, setManifest] = useState(null)
  const [panel, setPanel] = useState(true)
  const [youOpen, setYouOpen] = useState(false)
  const [me, setMe] = useState(loadIdentity)
  const frame = useRef()
  const state = useRef({})
  const entry = hist.stack[hist.i]
  const address = addressOf(entry)
  state.current = { hist, me }

  // go somewhere: fade out, then swap the world. `back` rewrites the current entry's spawn
  // so Back returns you next to the portal you took.
  const go = useCallback((next, { back, move } = {}) => {
    whoosh()
    setFading(true)
    setTimeout(() => {
      setHist(({ stack, i }) => {
        if (move !== undefined) return { stack, i: move }
        const s = stack.slice(0, i + 1)
        if (back) s[i] = { ...s[i], spawn: back }
        return { stack: [...s, next], i: i + 1 }
      })
      setWhere('')
    }, 280)
  }, [])

  // remember where we are in the browser's own URL, so a reload keeps you in the same world
  useEffect(() => {
    const u = new URL(location.href)
    u.searchParams.set('world', address)
    history.replaceState(null, '', u)
  }, [address])

  // read the world's manifest: its name, spawns and portals
  useEffect(() => {
    let live = true
    setManifest(null)
    fetch(new URL('.well-known/metaverse.json', entry.href))
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => live && setManifest(m?.protocol ? m : { error: 'no manifest' }))
      .catch(() => live && setManifest({ error: 'manifest not reachable' }))
    return () => {
      live = false
    }
  }, [entry.href])

  // messages from the world we're showing (and only that one)
  useEffect(() => {
    const onMsg = (e) => {
      const win = frame.current?.contentWindow
      const m = e.data
      if (!win || e.source !== win || m?.protocol !== PROTOCOL) return
      if (m.type === 'ready') win.postMessage({ protocol: PROTOCOL, type: 'enter', identity: state.current.me }, '*')
      else if (m.type === 'presence') setWhere(String(m.where ?? '').slice(0, 120))
      else if (m.type === 'navigate') {
        try {
          const next = parseAddress(m.href)
          if (m.spawn) next.spawn = String(m.spawn)
          go(next, { back: m.back ? String(m.back) : undefined })
        } catch {
          // ignore portals to things that aren't web addresses
        }
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [go])

  // identity changes reach the world right away, and are saved for next time
  useEffect(() => {
    localStorage.setItem('mvw.identity', JSON.stringify(me))
    frame.current?.contentWindow?.postMessage({ protocol: PROTOCOL, type: 'enter', identity: me }, '*')
  }, [me])

  const submit = (e) => {
    e.preventDefault()
    try {
      go(parseAddress(typed ?? address))
      setTyped(null)
      frame.current?.focus()
    } catch {
      setTyped(typed) // leave the bad text there to fix
    }
  }
  const canBack = hist.i > 0
  const canFwd = hist.i < hist.stack.length - 1
  const reload = () => {
    setFading(true)
    frame.current.src = address
  }

  return (
    <div className="app">
      <header className="bar">
        <div className="nav">
          <button disabled={!canBack} onClick={() => go(null, { move: hist.i - 1 })} title="Back">
            ←
          </button>
          <button disabled={!canFwd} onClick={() => go(null, { move: hist.i + 1 })} title="Forward">
            →
          </button>
          <button onClick={reload} title="Reload">
            ↻
          </button>
        </div>
        <form className="address" onSubmit={submit}>
          <span className="scheme">world</span>
          <input
            value={typed ?? pretty(address)}
            onChange={(e) => setTyped(e.target.value)}
            onFocus={(e) => {
              setTyped(address)
              requestAnimationFrame(() => e.target.select())
            }}
            onBlur={() => setTyped(null)}
            spellCheck={false}
            aria-label="World address"
          />
        </form>
        <button className="you" onClick={() => setYouOpen((v) => !v)} style={{ '--c': me.color }}>
          <span className="avatar">{me.name.slice(0, 1).toUpperCase()}</span>
          {me.name}
        </button>
      </header>

      <nav className="marks">
        {BOOKMARKS.map((b) => (
          <button key={b.href} className={entry.href === b.href ? 'on' : ''} onClick={() => go({ href: b.href, spawn: b.spawn })}>
            {b.label}
          </button>
        ))}
        <span className="grow" />
        <button onClick={() => setPanel((v) => !v)}>{panel ? 'hide world info' : 'world info'}</button>
      </nav>

      <main className="stage">
        <iframe
          ref={frame}
          key={hist.i + address}
          src={address}
          title={manifest?.name || 'world'}
          allow="fullscreen; gamepad; xr-spatial-tracking"
          onLoad={() => setFading(false)}
        />
        <div className={fading ? 'fade on' : 'fade'}>
          <div className="warp" />
        </div>

        {panel && (
          <aside className="info">
            <div className="kicker">You are in</div>
            <h2>{manifest?.name || pretty(entry.href)}</h2>
            {where && (
              <p className="where">
                <span className="dot" />
                {where}
              </p>
            )}
            {manifest?.description && <p className="desc">{manifest.description}</p>}
            {manifest?.error && <p className="desc muted">This world has no readable manifest ({manifest.error}).</p>}
            {manifest?.portals?.length > 0 && (
              <>
                <div className="kicker">Portals from here</div>
                {manifest.portals.map((p) => (
                  <button
                    key={p.id}
                    className="portal"
                    onClick={() => {
                      try {
                        go({ ...parseAddress(p.href), spawn: p.spawn || null })
                      } catch {
                        // a bad href in someone's manifest; skip it
                      }
                    }}
                  >
                    <b>{p.label || p.href}</b>
                    <span>{p.where || pretty(p.href)}</span>
                  </button>
                ))}
              </>
            )}
            {manifest?.spawns && (
              <>
                <div className="kicker">Spawn points</div>
                <div className="spawns">
                  {Object.entries(manifest.spawns).map(([id, text]) => (
                    <button key={id} title={text} className={(entry.spawn || 'default') === id ? 'on' : ''} onClick={() => go({ href: entry.href, spawn: id })}>
                      {id}
                    </button>
                  ))}
                </div>
              </>
            )}
          </aside>
        )}

        {youOpen && (
          <div className="youpanel">
            <div className="kicker">Your identity</div>
            <p className="desc">Worlds you visit see this name.</p>
            <input value={me.name} maxLength={24} onChange={(e) => setMe({ ...me, name: e.target.value || 'Visitor' })} aria-label="Your name" />
            <div className="swatches">
              {COLORS.map((c) => (
                <button key={c} aria-label={`color ${c}`} className={me.color === c ? 'on' : ''} style={{ background: c }} onClick={() => setMe({ ...me, color: c })} />
              ))}
            </div>
            <button className="done" onClick={() => setYouOpen(false)}>
              Done
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
