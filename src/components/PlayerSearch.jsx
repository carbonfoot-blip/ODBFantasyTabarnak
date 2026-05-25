import { useState, useRef, useEffect } from 'react'
import { PLAYERS, BONUS_SLUGS } from '../data/players'
import styles from './PlayerSearch.module.css'

export function PlayerSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const results = query.length < 1 ? [] : PLAYERS.filter(p =>
    p[0].toLowerCase().includes(query.toLowerCase())
  ).slice(0, 14)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(player) {
    onSelect({ name: player[0], slug: player[1], rank: player[2], allTimeScore: player[3] })
    setQuery('')
    setOpen(false)
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <div className={styles.inputWrap}>
        <svg className={styles.icon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          className={styles.input}
          type="text"
          placeholder="Search players… (e.g. Negreanu, Deeb, Hellmuth)"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button className={styles.clear} onClick={() => { setQuery(''); setOpen(false) }} aria-label="Clear">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((p, i) => {
            const isBonus = BONUS_SLUGS.has(p[1])
            return (
              <button key={`${p[1]}-${i}`} className={styles.item} onClick={() => handleSelect(p)}>
                <span className={styles.itemName}>
                  {p[0]}
                  {isBonus && <span className="tag bonus" style={{ marginLeft: 8 }}>Bonus eligible</span>}
                </span>
                <span className={styles.itemMeta}>
                  #{p[2]} · {p[3].toLocaleString()} pts all-time
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
