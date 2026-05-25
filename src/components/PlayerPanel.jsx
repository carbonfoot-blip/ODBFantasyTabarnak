import { useState } from 'react'
import { BONUS_SLUGS } from '../data/players'
import { ptsPerDollar, rollingAvg } from '../services/api'
import styles from './PlayerPanel.module.css'

const TABS = ['History', 'By Game Type', 'By Buy-In']

export function PlayerPanel({ player, onAddToTeam, onAddBonus, onFetchStats, loading }) {
  const [tab, setTab] = useState('History')
  const [cost, setCost] = useState(player.cost ?? '')

  const isBonus = BONUS_SLUGS.has(player.slug)
  const hist = player.history || []
  const realYears = hist.filter(y => !y.pending)

  const avg5 = rollingAvg(hist, 'pts', 5)
  const effCost = parseFloat(cost) || null
  const ppd = avg5 && effCost ? (avg5 / effCost).toFixed(2) : null

  function handleAddTeam() {
    if (!effCost) { alert('Enter the 2026 cost first.'); return }
    onAddToTeam({ ...player, cost: effCost })
  }

  function handleAddBonus() {
    onAddBonus({ ...player, cost: 0 })
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.nameRow}>
            <h2 className={styles.name}>{player.name}</h2>
            <span className={styles.rank}>#{player.rank} all-time</span>
            {isBonus && <span className="tag bonus">Bonus eligible</span>}
          </div>
          <div className={styles.allTime}>
            All-time score: <strong>{player.allTimeScore?.toLocaleString()}</strong>
            {player.timesDrafted && <> · Drafted <strong>{player.timesDrafted}×</strong></>}
            {player.avgSalary && <> · Avg salary <strong>{player.avgSalary}</strong></>}
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.costRow}>
            <label className={styles.costLabel}>2026 cost</label>
            <input
              type="number"
              className={styles.costInput}
              placeholder="?"
              value={cost}
              min={0}
              step={0.5}
              onChange={e => setCost(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button className="primary" onClick={handleAddTeam}>+ Add to team</button>
            {isBonus && (
              <button onClick={handleAddBonus} title="Add as free bonus pick">★ Bonus pick</button>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.cards}>
        <StatCard label="5-yr avg pts" value={avg5 ? avg5.toFixed(1) : '—'} sub="last 5 years" />
        <StatCard label="Pts / $" value={ppd ?? '—'} sub={effCost ? `at cost ${effCost}` : 'enter cost above'} highlight={!!ppd} />
        <StatCard label="Total cashes" value={player.totalCashes ?? (realYears.reduce((a, b) => a + (b.cashes || 0), 0) || '—')} sub="all-time" />
        <StatCard label="Times drafted" value={player.timesDrafted ?? '—'} sub="main 25k league" />
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <div className={styles.tabSpacer} />
        {!player.history && (
          <button className="primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={onFetchStats} disabled={loading}>
            {loading ? '⏳ Loading…' : '↗ Load stats from 25KFantasy'}
          </button>
        )}
        {player.history && (
          <button style={{ fontSize: 12, padding: '6px 12px' }} onClick={onFetchStats} disabled={loading} title="Refresh data">
            {loading ? '⏳' : '↻ Refresh'}
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {tab === 'History' && (
          !player.history
            ? <div className={styles.empty}>Click "Load stats from 25KFantasy" to fetch this player's year-by-year history.</div>
            : <HistoryTable history={hist} cost2026={effCost} />
        )}
        {tab === 'By Game Type' && (
          !player.gameType
            ? <div className={styles.empty}>Load stats first to see game type breakdown.</div>
            : <SimpleTable rows={player.gameType} cols={['type', 'pts', 'cashes']} headers={['Game type', 'Total pts', 'Cashes']} />
        )}
        {tab === 'By Buy-In' && (
          !player.buyIn
            ? <div className={styles.empty}>Load stats first to see buy-in breakdown.</div>
            : <SimpleTable rows={player.buyIn} cols={['level', 'pts', 'cashes']} headers={['Buy-in level', 'Total pts', 'Cashes']} />
        )}
      </div>

      <div className={styles.scoringNote}>
        * Pts (2026 rules): bracelet = flat +25 bonus; low-stakes (≤$1.5K) field bonus capped at 100 pts. Historical pts are as recorded on 25KFantasy. Full recalculation requires event-level data.
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardLabel}>{label}</div>
      <div className={styles.cardValue} style={highlight ? { color: 'var(--accent)' } : {}}>
        {value}
      </div>
      {sub && <div className={styles.cardSub}>{sub}</div>}
    </div>
  )
}

function HistoryTable({ history, cost2026 }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Year</th>
            <th className={styles.right}>Cost</th>
            <th className={styles.right}>Total pts</th>
            <th className={styles.right}>Cashes</th>
            <th className={styles.right}>Pts / $</th>
          </tr>
        </thead>
        <tbody>
          {history.map(y => {
            const isPending = y.pending
            const effectiveCost = isPending ? cost2026 : y.cost
            const ppd = (!isPending && effectiveCost && y.pts)
              ? (y.pts / effectiveCost).toFixed(2) : null

            return (
              <tr key={y.year} className={isPending ? styles.pendingRow : ''}>
                <td>
                  <span className={styles.year}>{y.year}</span>
                  {isPending && <span className="tag pending" style={{ marginLeft: 8 }}>pending</span>}
                </td>
                <td className={styles.right}>
                  {isPending
                    ? (cost2026 ? cost2026 : <span className={styles.dim}>TBD</span>)
                    : (y.cost ?? '—')}
                </td>
                <td className={styles.right}>
                  {isPending ? <span className={styles.dim}>—</span> : (y.pts ?? 0)}
                </td>
                <td className={`${styles.right} ${!isPending && y.cashes >= 10 ? styles.highCash : ''}`}>
                  {isPending ? <span className={styles.dim}>—</span> : (y.cashes ?? 0)}
                </td>
                <td className={`${styles.right} ${ppd ? styles.ppdValue : ''}`}>
                  {isPending ? <span className={styles.dim}>—</span> : (ppd ?? '—')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SimpleTable({ rows, cols, headers }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{headers.map((h, i) => <th key={h} className={i > 0 ? styles.right : ''}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cols.map((c, ci) => (
                <td key={c} className={ci > 0 ? styles.right : ''}>{row[c] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
