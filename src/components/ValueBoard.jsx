import { useState, useMemo } from 'react'
import { PLAYERS, BONUS_SLUGS } from '../data/players'
import styles from './ValueBoard.module.css'

const SORT_OPTIONS = [
  { key: 'est_ppd', label: 'Est. 2026 Pts/$' },
  { key: 'ppd',     label: `Pts/$`           },
  { key: 'pts',     label: 'Pts'             },
  { key: 'rank',    label: 'All-time rank'   },
  { key: 'cashes',  label: 'Cashes'          },
]

const AVAILABLE_YEARS = [2025, 2024, 2023, 2022, 2021, 2019, 2018, 2017, 2016, 2015]

function getYearData(history, year) {
  return history?.find(h => h.year === year) ?? null
}

export function ValueBoard({ db, costs, team, bonusPick, onSelectPlayer, onAddToTeam, onAddBonus, notes }) {
  const [sortBy, setSortBy]               = useState('est_ppd')
  const [filterBonus, setFilterBonus]     = useState(false)
  const [filterHasCost, setFilterHasCost] = useState(false)
  const [filterExclude1, setFilterExclude1] = useState(true)   // exclude $1 players by default
  const [search, setSearch]               = useState('')
  const [showInTeam, setShowInTeam]       = useState(true)
  const [year, setYear]                   = useState(2025)

  const teamSlugs = new Set([...team.map(p => p.slug), ...(bonusPick ? [bonusPick.slug] : [])])

  const rows = useMemo(() => {
    return PLAYERS
      .map(([name, slug, rank, allTimeScore]) => {
        const dbData   = db[slug] || {}
        const cost2026 = costs[slug] ?? null
        const history  = dbData.history || []
        const yd       = getYearData(history, year)
        const pts      = yd?.pts ?? null
        const yCost    = yd?.cost ?? null
        const cashes   = yd?.cashes ?? null
        // Historical pts/$ for selected year
        const ppd      = pts && yCost ? pts / yCost : null
        // Estimated 2026 pts/$ = selected year pts ÷ 2026 cost
        const estPpd   = pts && cost2026 ? pts / cost2026 : null
        const isBonus  = BONUS_SLUGS.has(slug)
        const inTeam   = teamSlugs.has(slug)
        const hasNote  = !!(notes?.[slug])
        return { name, slug, rank, allTimeScore, cost2026, pts, yCost, cashes, ppd, estPpd, isBonus, inTeam, history, hasNote }
      })
      .filter(r => {
        if (filterBonus && !r.isBonus) return false
        if (filterHasCost && !r.cost2026) return false
        if (filterExclude1 && r.cost2026 === 1) return false
        if (!showInTeam && r.inTeam) return false
        if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'est_ppd') {
          if (!a.estPpd && !b.estPpd) return a.rank - b.rank
          if (!a.estPpd) return 1
          if (!b.estPpd) return -1
          return b.estPpd - a.estPpd
        }
        if (sortBy === 'ppd') {
          if (!a.ppd && !b.ppd) return a.rank - b.rank
          if (!a.ppd) return 1
          if (!b.ppd) return -1
          return b.ppd - a.ppd
        }
        if (sortBy === 'pts') {
          if (!a.pts && !b.pts) return a.rank - b.rank
          if (!a.pts) return 1
          if (!b.pts) return -1
          return b.pts - a.pts
        }
        if (sortBy === 'rank')   return a.rank - b.rank
        if (sortBy === 'cashes') return (b.cashes ?? -1) - (a.cashes ?? -1)
        return 0
      })
  }, [db, costs, team, bonusPick, sortBy, filterBonus, filterHasCost, filterExclude1, search, showInTeam, year, notes])

  const topEstPpd = rows.find(r => r.estPpd)?.estPpd || 1
  const topPpd    = rows.find(r => r.ppd)?.ppd || 1
  const topBar    = sortBy === 'est_ppd' ? topEstPpd : topPpd

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <div className={styles.topRow}>
          <input
            className={styles.search}
            type="text"
            placeholder="Filter by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className={styles.yearPicker}>
            <span className={styles.sortLabel}>Year:</span>
            {AVAILABLE_YEARS.map(y => (
              <button
                key={y}
                className={`${styles.sortBtn} ${year === y ? styles.active : ''}`}
                onClick={() => setYear(y)}
              >{y}</button>
            ))}
          </div>
        </div>
        <div className={styles.bottomRow}>
          <div className={styles.sortRow}>
            <span className={styles.sortLabel}>Sort:</span>
            {SORT_OPTIONS.map(o => (
              <button
                key={o.key}
                className={`${styles.sortBtn} ${sortBy === o.key ? styles.active : ''}`}
                onClick={() => setSortBy(o.key)}
              >{o.label}</button>
            ))}
          </div>
          <div className={styles.filters}>
            <label className={styles.check}>
              <input type="checkbox" checked={filterBonus} onChange={e => setFilterBonus(e.target.checked)} />
              Bonus only
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={filterHasCost} onChange={e => setFilterHasCost(e.target.checked)} />
              Has 2026 cost
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={filterExclude1} onChange={e => setFilterExclude1(e.target.checked)} />
              Exclude $1 players
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={!showInTeam} onChange={e => setShowInTeam(!e.target.checked)} />
              Hide my team
            </label>
          </div>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colRank}>#</th>
              <th className={styles.colName}>Player</th>
              <th className={styles.colNum}>{year} Pts</th>
              <th className={styles.colNum}>{year} Cost</th>
              <th className={styles.colNum}>{year} Pts/$</th>
              <th className={styles.colNum}>2026 Cost</th>
              <th className={`${styles.colNum} ${styles.estCol}`} title={`${year} pts ÷ 2026 cost`}>
                Est. 2026 Pts/$
                <span className={styles.colHint}>({year} pts ÷ 2026$)</span>
              </th>
              <th className={styles.colBar}></th>
              <th className={styles.colNum}>{year} Cashes</th>
              <th className={styles.colAction}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.slug} className={r.inTeam ? styles.inTeam : ''}>
                <td className={styles.colRank}><span className={styles.rankNum}>{i + 1}</span></td>
                <td className={styles.colName}>
                  <button className={styles.nameBtn} onClick={() => onSelectPlayer({ name: r.name, slug: r.slug, rank: r.rank, allTimeScore: r.allTimeScore })}>
                    {r.name}
                  </button>
                  {r.isBonus && <span className="tag bonus" style={{ marginLeft: 5, fontSize: 9 }}>B</span>}
                  {r.inTeam  && <span className={styles.inTeamDot} title="In your team">✓</span>}
                  {r.hasNote && <span className={styles.noteDot} title="Has scouting note">📌</span>}
                </td>
                <td className={styles.colNum}>{r.pts ?? <span className={styles.dim}>—</span>}</td>
                <td className={styles.colNum}>{r.yCost ?? <span className={styles.dim}>—</span>}</td>
                <td className={`${styles.colNum} ${r.ppd ? styles.ppdVal : ''}`}>
                  {r.ppd ? r.ppd.toFixed(2) : <span className={styles.dim}>—</span>}
                </td>
                <td className={styles.colNum}>
                  {r.cost2026
                    ? <span className={styles.cost2026}>{r.cost2026}</span>
                    : <span className={styles.dim}>—</span>}
                </td>
                <td className={`${styles.colNum} ${styles.estCol}`}>
                  {r.estPpd
                    ? <span className={`${styles.estPpd} ${r.estPpd >= 2 ? styles.estGood : r.estPpd >= 1.5 ? styles.estOk : ''}`}>
                        {r.estPpd.toFixed(2)}
                      </span>
                    : <span className={styles.dim}>{r.pts ? '—' : '—'}</span>}
                </td>
                <td className={styles.colBar}>
                  {(r.estPpd || r.ppd) && (
                    <div className={styles.bar}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${Math.min(100, ((r.estPpd || r.ppd || 0) / topBar) * 100)}%` }}
                      />
                    </div>
                  )}
                </td>
                <td className={styles.colNum}>{r.cashes ?? <span className={styles.dim}>—</span>}</td>
                <td className={styles.colAction}>
                  {r.inTeam ? (
                    <span className={styles.inTeamLabel}>✓</span>
                  ) : (
                    <div className={styles.actionBtns}>
                      <button className={styles.addBtn} onClick={() => onAddToTeam({ name: r.name, slug: r.slug, rank: r.rank, allTimeScore: r.allTimeScore, cost: r.cost2026, history: r.history })} disabled={!r.cost2026} title={r.cost2026 ? 'Add to team' : 'Enter 2026 cost first'}>+</button>
                      {r.isBonus && <button className={styles.bonusBtn} onClick={() => onAddBonus({ name: r.name, slug: r.slug, rank: r.rank, allTimeScore: r.allTimeScore, history: r.history })} title="Bonus pick">★</button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className={styles.empty}>No players match your filters.</div>}
      </div>
      <div className={styles.hint}>
        {year} data · {rows.filter(r => r.pts).length} players with results · {rows.filter(r => r.cost2026).length} with 2026 costs · {rows.filter(r => r.estPpd).length} with est. pts/$
      </div>
    </div>
  )
}
