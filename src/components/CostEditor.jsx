import { useState, useMemo } from 'react'
import { PLAYERS, BONUS_SLUGS } from '../data/players'
import styles from './CostEditor.module.css'

export function CostEditor({ db, costs, onSaveCost }) {
  const [search, setSearch]       = useState('')
  const [filterBonus, setFilterBonus] = useState(false)
  const [saved, setSaved]         = useState({})

  const rows = useMemo(() => {
    return PLAYERS
      .filter(([name, slug]) => {
        if (filterBonus && !BONUS_SLUGS.has(slug)) return false
        if (search && !name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .map(([name, slug, rank, allTimeScore]) => {
        const dbData  = db[slug] || {}
        const hist    = dbData.history || []
        const yd2025  = hist.find(h => h.year === 2025)
        const pts2025 = yd2025?.pts ?? null
        return { name, slug, rank, allTimeScore, pts2025, isBonus: BONUS_SLUGS.has(slug) }
      })
  }, [db, search, filterBonus])

  function handleChange(slug, value) {
    const cost = parseFloat(value) || null
    onSaveCost(slug, cost)
    setSaved(prev => ({ ...prev, [slug]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [slug]: false })), 1200)
  }

  function handlePaste(e) {
    // Allow pasting tab-separated or newline-separated "name\tcost" pairs
    const text = e.clipboardData.getData('text')
    const lines = text.split('\n').filter(Boolean)
    let matched = 0
    for (const line of lines) {
      const parts = line.split(/[\t,]/)
      if (parts.length >= 2) {
        const namePart = parts[0].trim().toLowerCase()
        const cost     = parseFloat(parts[parts.length - 1])
        if (isNaN(cost)) continue
        const player = PLAYERS.find(([n]) => n.toLowerCase().includes(namePart) || namePart.includes(n.toLowerCase().split(' ')[1] || ''))
        if (player) { onSaveCost(player[1], cost); matched++ }
      }
    }
    if (matched > 0) {
      e.preventDefault()
      alert(`✓ Pasted costs for ${matched} players`)
    }
  }

  const totalSet = Object.values(costs).filter(Boolean).length
  const totalPlayers = PLAYERS.length

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: `${(totalSet / totalPlayers) * 100}%` }} />
        </div>
        <p className={styles.progressLabel}>
          <strong>{totalSet}</strong> / {totalPlayers} costs entered
          {totalSet === 0 && ' — enter 2026 draft costs below to unlock pts/$ rankings'}
        </p>
        <p className={styles.pasteHint}>
          💡 Tip: You can paste a tab-separated list (name → cost) to bulk-fill costs
        </p>
      </div>

      <div className={styles.controls}>
        <input
          className={styles.search}
          type="text"
          placeholder="Filter players…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onPaste={handlePaste}
        />
        <label className={styles.check}>
          <input type="checkbox" checked={filterBonus} onChange={e => setFilterBonus(e.target.checked)} />
          Bonus eligible only
        </label>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Player</th>
              <th className={styles.right}>All-time rank</th>
              <th className={styles.right}>2025 pts</th>
              <th className={styles.right}>2026 cost</th>
              <th className={styles.right}>Pts / $</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const cost = costs[r.slug] ?? null
              const ppd  = r.pts2025 && cost ? (r.pts2025 / cost).toFixed(2) : null
              return (
                <tr key={r.slug} className={r.isBonus ? styles.bonusRow : ''}>
                  <td>
                    <span className={styles.playerName}>{r.name}</span>
                    {r.isBonus && <span className="tag bonus" style={{ marginLeft: 6, fontSize: 9 }}>B</span>}
                  </td>
                  <td className={styles.right}><span className={styles.dim}>#{r.rank}</span></td>
                  <td className={styles.right}>{r.pts2025 ?? <span className={styles.dim}>—</span>}</td>
                  <td className={styles.right}>
                    <div className={styles.inputWrap}>
                      <input
                        type="number"
                        className={`${styles.costInput} ${saved[r.slug] ? styles.justSaved : ''}`}
                        placeholder="—"
                        value={cost ?? ''}
                        min={0}
                        step={0.5}
                        onChange={e => handleChange(r.slug, e.target.value)}
                      />
                    </div>
                  </td>
                  <td className={`${styles.right} ${ppd ? styles.ppdVal : ''}`}>
                    {ppd ?? <span className={styles.dim}>—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
