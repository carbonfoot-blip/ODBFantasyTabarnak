import { useState } from 'react'
import { BONUS_SLUGS } from '../data/players'
import { rollingAvg } from '../services/api'
import { PlayerSearch } from './PlayerSearch'
import styles from './ComparePanel.module.css'

const YEARS = [2021, 2022, 2023, 2024, 2025]

export function ComparePanel({ db, costs, onAddToTeam, onAddBonus, notes, onSelectTab }) {
  const [players, setPlayers] = useState([])

  function addPlayer(base) {
    if (players.find(p => p.slug === base.slug)) return
    if (players.length >= 3) return
    const dbData = db[base.slug] || {}
    const cost   = costs[base.slug] ?? null
    setPlayers(prev => [...prev, { ...base, ...dbData, cost }])
  }

  function removePlayer(slug) {
    setPlayers(prev => prev.filter(p => p.slug !== slug))
  }

  const metrics = players.map(p => {
    const history = p.history || []
    const avg5    = rollingAvg(history, 'pts', 5)
    const cost    = costs[p.slug] ?? p.cost ?? null
    const ppd     = avg5 && cost ? avg5 / cost : null
    const isBonus = BONUS_SLUGS.has(p.slug)
    return { ...p, avg5, ppd, cost, isBonus }
  })

  // Best value highlight
  const bestPpd  = Math.max(...metrics.map(m => m.ppd  ?? 0))
  const bestAvg5 = Math.max(...metrics.map(m => m.avg5 ?? 0))

  return (
    <div className={styles.wrap}>
      {/* Search to add players */}
      <div className={styles.searchRow}>
        <PlayerSearch onSelect={addPlayer} />
        <span className={styles.hint}>
          {players.length === 0 ? 'Search and add up to 3 players to compare'
            : players.length < 3 ? `${3 - players.length} more slot${players.length === 2 ? '' : 's'} available`
            : 'Remove a player to add another'}
        </span>
      </div>

      {players.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>♠ vs ♥ vs ♦</div>
          <p>Add players above to compare them side by side</p>
        </div>
      ) : (
        <>
          {/* Player cards */}
          <div className={styles.cards} style={{ gridTemplateColumns: `repeat(${players.length}, 1fr)` }}>
            {metrics.map(m => (
              <div key={m.slug} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardName}>{m.name}</div>
                  <div className={styles.cardMeta}>
                    #{m.rank} all-time · {m.allTimeScore?.toLocaleString()} pts
                    {m.isBonus && <span className="tag bonus" style={{ marginLeft: 6 }}>Bonus</span>}
                  </div>
                  <button className={styles.removeBtn} onClick={() => removePlayer(m.slug)}>✕</button>
                </div>

                {/* Key metrics */}
                <div className={styles.metricGrid}>
                  <Metric
                    label="5-yr avg pts"
                    value={m.avg5 ? m.avg5.toFixed(1) : '—'}
                    best={m.avg5 === bestAvg5 && m.avg5 > 0}
                  />
                  <Metric
                    label="2026 cost"
                    value={m.cost ?? '—'}
                    sub={m.cost ? null : 'not set'}
                  />
                  <Metric
                    label="Pts / $"
                    value={m.ppd ? m.ppd.toFixed(2) : '—'}
                    best={m.ppd === bestPpd && m.ppd > 0}
                    highlight
                  />
                  <Metric
                    label="2025 Pts / $"
                    value={(() => { const yd = (m.history||[]).find(h=>h.year===2025); return (yd?.pts && yd?.cost) ? (yd.pts/yd.cost).toFixed(2) : '—' })()}
                    highlight={true}
                    best={(()=>{ const yd=(m.history||[]).find(h=>h.year===2025); return yd?.pts&&yd?.cost ? yd.pts/yd.cost : 0 })() === Math.max(...metrics.map(mx=>{ const y=(mx.history||[]).find(h=>h.year===2025); return y?.pts&&y?.cost?y.pts/y.cost:0 }))}
                  />
                  <Metric
                    label="Total cashes"
                    value={m.totalCashes ?? '—'}
                  />
                  <Metric
                    label="Times drafted"
                    value={m.timesDrafted ?? '—'}
                  />
                  <Metric
                    label="Avg salary"
                    value={m.avgSalary ?? '—'}
                  />
                </div>

                {/* Year-by-year sparkline */}
                <div className={styles.yearSection}>
                  <div className={styles.yearLabel}>Recent years</div>
                  <div className={styles.yearRows}>
                    {YEARS.map(yr => {
                      const entry = (m.history || []).find(h => h.year === yr)
                      return (
                        <div key={yr} className={styles.yearRow}>
                          <span className={styles.yr}>{yr}</span>
                          <span className={styles.yrPts}>{entry?.pts ?? <span className={styles.dim}>—</span>}</span>
                          <span className={styles.yrCost}>{entry?.cost ? `$${entry.cost}` : <span className={styles.dim}>—</span>}</span>
                          <span className={styles.yrCashes}>{entry?.cashes != null ? `${entry.cashes}c` : <span className={styles.dim}>—</span>}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Scouting note */}
                <div className={styles.noteSection}>
                  <div className={styles.noteLabel}>📌 Scouting note</div>
                  <div className={styles.noteText}>
                    {notes?.[m.slug]
                      ? <span>{notes[m.slug].text}</span>
                      : <span className={styles.noNote} onClick={() => onSelectTab && onSelectTab('social', m)}>No note yet — click Social Media tab to add one</span>
                    }
                  </div>
                </div>

                {/* Add buttons */}
                <div className={styles.cardActions}>
                  <button
                    className="primary"
                    style={{ fontSize: 12, padding: '6px 12px', width: '100%', justifyContent: 'center' }}
                    onClick={() => onAddToTeam({ ...m, cost: m.cost })}
                    disabled={!m.cost}
                    title={m.cost ? 'Add to team' : 'Enter 2026 cost first'}
                  >+ Add to team</button>
                  {m.isBonus && (
                    <button
                      style={{ fontSize: 12, padding: '6px 12px', width: '100%', justifyContent: 'center' }}
                      onClick={() => onAddBonus(m)}
                    >★ Bonus pick</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Head-to-head year table */}
          {players.length > 1 && (
            <div className={styles.h2hSection}>
              <div className={styles.h2hTitle}>Year-by-year comparison</div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Year</th>
                      {metrics.map(m => <th key={m.slug} colSpan={2}>{m.name.split(' ')[1] || m.name.split(' ')[0]}</th>)}
                    </tr>
                    <tr className={styles.subHeader}>
                      <th></th>
                      {metrics.map(m => (
                        <>
                          <th key={`${m.slug}-pts`}>Pts</th>
                          <th key={`${m.slug}-cost`}>Cost</th>
                        </>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[2019, 2021, 2022, 2023, 2024, 2025].map(yr => {
                      const entries = metrics.map(m => (m.history || []).find(h => h.year === yr))
                      const maxPts  = Math.max(...entries.map(e => e?.pts ?? 0))
                      return (
                        <tr key={yr}>
                          <td className={styles.yrCell}>{yr}</td>
                          {entries.map((e, i) => (
                            <>
                              <td key={`${i}-pts`} className={`${styles.numCell} ${e?.pts === maxPts && maxPts > 0 ? styles.winner : ''}`}>
                                {e?.pts ?? <span className={styles.dim}>—</span>}
                              </td>
                              <td key={`${i}-cost`} className={styles.numCell} style={{ color: 'var(--text3)' }}>
                                {e?.cost ?? <span className={styles.dim}>—</span>}
                              </td>
                            </>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Metric({ label, value, best, highlight, sub }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={`${styles.metricValue} ${best ? styles.best : ''} ${highlight && best ? styles.highlightBest : ''}`}>
        {value}
        {best && <span className={styles.crown}>👑</span>}
      </div>
      {sub && <div className={styles.metricSub}>{sub}</div>}
    </div>
  )
}
