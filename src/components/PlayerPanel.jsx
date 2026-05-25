import { useState } from 'react'
import { BONUS_SLUGS } from '../data/players'
import { rollingAvg } from '../services/api'
import styles from './PlayerPanel.module.css'

const TABS = ['History', 'By Game Type', 'By Buy-In']

export function PlayerPanel({ player, savedCost, onSaveCost, onAddToTeam, onAddBonus, note, onEditNote }) {
  const [tab, setTab]   = useState('History')
  const [cost, setCost] = useState(savedCost ?? player.cost ?? '')

  const isBonus  = BONUS_SLUGS.has(player.slug)
  const hist     = player.history || []
  const realYears = hist.filter(y => !y.pending)
  const avg5     = rollingAvg(hist, 'pts', 5)
  const effCost  = parseFloat(cost) || null
  const ppd      = avg5 && effCost ? (avg5 / effCost).toFixed(2) : null

  function handleCostBlur() {
    const val = parseFloat(cost) || null
    if (val !== savedCost) onSaveCost(player.slug, val)
  }

  function handleAddTeam() {
    if (!effCost) { alert('Enter the 2026 cost first.'); return }
    onAddToTeam({ ...player, cost: effCost })
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
            {player.timesDrafted != null && <> · Drafted <strong>{player.timesDrafted}×</strong></>}
            {player.avgSalary    != null && <> · Avg salary <strong>${player.avgSalary}</strong></>}
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
              onBlur={handleCostBlur}
              onKeyDown={e => e.key === 'Enter' && handleCostBlur()}
            />
          </div>
          <div className={styles.actions}>
            <button className="primary" onClick={handleAddTeam}>+ Add to team</button>
            {isBonus && (
              <button onClick={() => onAddBonus({ ...player, cost: 0 })} title="Add as free bonus pick">
                ★ Bonus pick
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.cards}>
        <StatCard label="5-yr avg pts"   value={avg5 ? avg5.toFixed(1) : '—'} sub="last 5 seasons" />
        <StatCard label="Pts / $"        value={ppd ?? '—'} sub={effCost ? `at cost ${effCost}` : 'enter cost above'} highlight={!!ppd} />
        <StatCard label="Total cashes"   value={player.totalCashes ?? (realYears.reduce((a,b) => a+(b.cashes||0),0) || '—')} sub="all-time" />
        <StatCard label="Times drafted"  value={player.timesDrafted ?? '—'} sub="main 25k league" />
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t} className={`${styles.tab} ${tab===t ? styles.tabActive:''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {tab === 'History' && (
          hist.length === 0
            ? <div className={styles.empty}>No history data available for this player.</div>
            : <HistoryTable history={[...hist, {year:2026, pending:true}]} cost2026={effCost} />
        )}
        {tab === 'By Game Type' && (
          !player.gameType
            ? <div className={styles.empty}>No game type data available.</div>
            : <SimpleTable rows={player.gameType} cols={['type','pts','cashes']} headers={['Game type','Total pts','Cashes']} />
        )}
        {tab === 'By Buy-In' && (
          !player.buyIn
            ? <div className={styles.empty}>No buy-in data available.</div>
            : <SimpleTable rows={player.buyIn} cols={['level','pts','cashes']} headers={['Buy-in level','Total pts','Cashes']} />
        )}
      </div>

      {/* Scouting note */}
      <div className={styles.noteSection}>
        <div className={styles.noteSectionHeader}>
          <span className={styles.noteLabel}>📌 Scouting note</span>
          <button className={styles.noteEditBtn} onClick={onEditNote}>
            {note ? 'Edit note' : '+ Add note'}
          </button>
        </div>
        {note ? (
          <div className={styles.noteText}>{note.text}</div>
        ) : (
          <div className={styles.noteEmpty}>No scouting note yet — click "Add note" to add one.</div>
        )}
        {note?.updatedAt && (
          <div className={styles.noteTime}>Updated {new Date(note.updatedAt).toLocaleString()}</div>
        )}
      </div>

      <div className={styles.scoringNote}>
        * 2026 rule changes: bracelet = flat +25 pts (no multiplier) · Low-stakes (≤$1.5K) field bonus capped at 100 pts · Historical pts are as recorded on 25KFantasy.
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardLabel}>{label}</div>
      <div className={styles.cardValue} style={highlight ? { color:'var(--accent)' } : {}}>
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
            const isPending   = y.pending
            const effectiveCost = isPending ? cost2026 : y.cost
            const ppd = (!isPending && effectiveCost && y.pts)
              ? (y.pts / effectiveCost).toFixed(2) : null

            return (
              <tr key={y.year} className={isPending ? styles.pendingRow : ''}>
                <td>
                  <span className={styles.year}>{y.year}</span>
                  {isPending && <span className="tag pending" style={{marginLeft:8}}>pending</span>}
                </td>
                <td className={styles.right}>
                  {isPending
                    ? (cost2026 ? cost2026 : <span className={styles.dim}>TBD</span>)
                    : (y.cost ?? '—')}
                </td>
                <td className={styles.right}>
                  {isPending ? <span className={styles.dim}>—</span> : (y.pts ?? 0)}
                </td>
                <td className={`${styles.right} ${!isPending && y.cashes >= 10 ? styles.highCash:''}`}>
                  {isPending ? <span className={styles.dim}>—</span> : (y.cashes ?? 0)}
                </td>
                <td className={`${styles.right} ${ppd ? styles.ppdValue:''}`}>
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
          <tr>{headers.map((h,i) => <th key={h} className={i>0 ? styles.right:''}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row,i) => (
            <tr key={i}>
              {cols.map((c,ci) => (
                <td key={c} className={ci>0 ? styles.right:''}>{row[c] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
