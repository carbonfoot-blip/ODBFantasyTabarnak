import { rollingAvg } from '../services/api'
import styles from './TeamSidebar.module.css'

const TEAM_SIZE = 8

export function TeamSidebar({ team, bonusPick, budget, onSetBudget, onRemove, onRemoveBonus, onSelectPlayer }) {
  const totalCost = team.reduce((a, p) => a + (p.cost || 0), 0)
  const remaining = budget ? budget - totalCost : null
  const pct = budget ? Math.min(100, (totalCost / budget) * 100) : 0
  const isOver = remaining !== null && remaining < 0

  const allPlayers = [...team, ...(bonusPick ? [bonusPick] : [])]
  const withHistory = allPlayers.filter(p => p.history)

  const teamProjected = withHistory.length
    ? withHistory.reduce((a, p) => a + (rollingAvg(p.history, 'pts', 5) || 0), 0).toFixed(0)
    : null

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>My team</h2>
        {teamProjected && (
          <span className={styles.projected} title="Sum of 5-yr avg pts for players with loaded stats">
            ~{teamProjected} pts projected
          </span>
        )}
      </div>

      {/* Slots */}
      <div className={styles.slots}>
        {Array.from({ length: TEAM_SIZE }).map((_, i) => {
          const p = team[i]
          return (
            <Slot
              key={i}
              num={i + 1}
              player={p}
              onRemove={p ? () => onRemove(p.slug) : null}
              onClick={p ? () => onSelectPlayer(p) : null}
            />
          )
        })}

        {/* Bonus pick */}
        <div className={styles.divider}>Bonus pick (free)</div>
        <Slot
          num="★"
          player={bonusPick}
          isBonus
          onRemove={bonusPick ? onRemoveBonus : null}
          onClick={bonusPick ? () => onSelectPlayer(bonusPick) : null}
        />
      </div>

      {/* Budget */}
      <div className={styles.budgetSection}>
        <div className={styles.budgetRow}>
          <span className={styles.budgetLabel}>Budget</span>
          <div className={styles.budgetInputRow}>
            <input
              type="number"
              className={styles.budgetInput}
              placeholder="Set total"
              defaultValue={budget || ''}
              onBlur={e => onSetBudget(parseFloat(e.target.value) || 0)}
              onKeyDown={e => e.key === 'Enter' && onSetBudget(parseFloat(e.target.value) || 0)}
              min={0}
            />
          </div>
        </div>

        {budget > 0 && (
          <>
            <div className={styles.track}>
              <div
                className={`${styles.fill} ${isOver ? styles.over : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className={styles.budgetNumbers}>
              <span>Used: <strong>{totalCost}</strong></span>
              <span style={{ color: isOver ? 'var(--red)' : 'var(--green)' }}>
                {isOver ? `${Math.abs(remaining)} over!` : `${remaining} left`}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Team summary by game type (if data available) */}
      {withHistory.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryTitle}>Player projections (5-yr avg)</div>
          {allPlayers.map(p => {
            const avg = rollingAvg(p.history, 'pts', 5)
            return (
              <div key={p.slug} className={styles.summaryRow}>
                <button className={`ghost ${styles.summaryName}`} onClick={() => onSelectPlayer(p)}>
                  {p.name}
                  {p.isBonus && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>★</span>}
                </button>
                <span className={styles.summaryPts}>
                  {avg ? avg.toFixed(0) : '—'} pts
                </span>
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}

function Slot({ num, player, isBonus, onRemove, onClick }) {
  const avg = player?.history ? rollingAvg(player.history, 'pts', 5) : null

  if (!player) {
    return (
      <div className={`${styles.slot} ${styles.empty} ${isBonus ? styles.bonusSlot : ''}`}>
        <span className={styles.slotNum}>{num}</span>
        <span className={styles.slotEmpty}>{isBonus ? 'Add bonus pick' : 'Empty'}</span>
      </div>
    )
  }

  return (
    <div className={`${styles.slot} ${isBonus ? styles.bonusSlot : ''}`}>
      <span className={styles.slotNum}>{num}</span>
      <button className={`ghost ${styles.slotName}`} onClick={onClick}>
        {player.name}
      </button>
      <div className={styles.slotMeta}>
        {player.cost ? <span className={styles.slotCost}>{player.cost}</span> : null}
        {avg ? <span className={styles.slotAvg}>{avg.toFixed(0)}pts</span> : null}
      </div>
      <button className={`ghost ${styles.removeBtn}`} onClick={onRemove} aria-label="Remove">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}
