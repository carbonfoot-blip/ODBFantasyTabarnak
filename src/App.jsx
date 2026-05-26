import { useState, useEffect } from 'react'
import { PlayerSearch }  from './components/PlayerSearch'
import { PlayerPanel }   from './components/PlayerPanel'
import { TeamSidebar }   from './components/TeamSidebar'
import { ValueBoard }    from './components/ValueBoard'
import { ComparePanel }  from './components/ComparePanel'
import { CostEditor }    from './components/CostEditor'
import { SocialTab }     from './components/SocialTab'
import { DbEditor }      from './components/DbEditor'
import { NoteModal }    from './components/NoteModal'
import { ToastContainer } from './components/Toast'
import { useLocalStorage } from './hooks/useLocalStorage'
import { fetchNotes } from './services/notesService'
import styles from './App.module.css'

const MAX_TEAM = 8
const TABS = [
  { id: 'search',  label: '🔍 Search'    },
  { id: 'value',   label: '📊 Rankings'  },
  { id: 'compare', label: '⚡ Compare'   },
  { id: 'costs',   label: '💰 Costs'     },
  { id: 'social',  label: '📌 Scouting'  },
  { id: 'db',      label: '🗄 DB Editor' },
]

export default function App() {
  const [team, setTeam]           = useLocalStorage('odb_team_2026', [])
  const [bonusPick, setBonusPick] = useLocalStorage('odb_bonus_2026', null)
  const [budget, setBudget]       = useLocalStorage('odb_budget_2026', 0)
  const [costs, setCosts]         = useLocalStorage('odb_costs_2026', {})
  const [notes, setNotes]         = useLocalStorage('odb_notes_2026', {})
  const [gistId, setGistId]       = useLocalStorage('odb_gist_id', '')
  const [ghToken, setGhToken]     = useLocalStorage('odb_gh_token', '')

  const [db, setDb]               = useState({})
  const [dbLoaded, setDbLoaded]   = useState(false)
  const [dbError, setDbError]     = useState(null)
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [activeTab, setActiveTab] = useState('search')
  const [toasts, setToasts]       = useState([])
  const [noteModal, setNoteModal] = useState(null) // player object or null

  useEffect(() => {
    fetch('./players-db.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => {
        setDb(data)
        setDbLoaded(true)
        // Auto-import 2026 costs from DB into costs state
        // DB cost2026 always wins (it was set by the update-costs script)
        setCosts(prev => {
          const merged = { ...prev }
          let imported = 0
          Object.entries(data).forEach(([slug, player]) => {
            // cost2026 field (set by update-costs-2026.mjs) takes priority
            if (player.cost2026 != null) {
              if (merged[slug] !== player.cost2026) {
                merged[slug] = player.cost2026
                imported++
              }
            // Fallback: check history for 2026 pending entry cost
            } else {
              const y2026 = player.history?.find(y => y.year === 2026)
              if (y2026?.cost != null && !merged[slug]) {
                merged[slug] = y2026.cost
                imported++
              }
            }
          })
          if (imported > 0) console.log(`Auto-imported ${imported} 2026 costs from DB`)
          return merged
        })
      })
      .catch(err => { setDbError(err.message); setDbLoaded(true) })
  }, [])

  // Auto-sync notes from JSONBin on load if configured
  useEffect(() => {
    if (!gistId) return
    fetchNotes(gistId, ghToken)
      .then(remote => { if (Object.keys(remote).length) setNotes(remote) })
      .catch(() => {})
  }, [gistId, ghToken])

  function toast(message) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message }])
  }
  function removeToast(id) { setToasts(prev => prev.filter(t => t.id !== id)) }

  function handleSelectPlayer(base, tab) {
    const dbData = db[base.slug] || {}
    const cost   = costs[base.slug] ?? null
    setCurrentPlayer({ ...base, ...dbData, cost })
    if (tab) setActiveTab(tab)
    else setActiveTab('search')
  }

  function handleSaveCost(slug, cost) {
    setCosts(prev => ({ ...prev, [slug]: cost }))
    setCurrentPlayer(prev => prev?.slug === slug ? { ...prev, cost } : prev)
    setTeam(prev => prev.map(p => p.slug === slug ? { ...p, cost } : p))
    if (bonusPick?.slug === slug) setBonusPick(prev => ({ ...prev, cost }))
  }

  function handleAddToTeam(player) {
    if (team.find(p => p.slug === player.slug)) { toast('Already in team'); return }
    if (team.length >= MAX_TEAM) { toast('Team is full (8 players max)'); return }
    if (!player.cost) { toast('Enter the 2026 cost first'); return }
    setTeam(prev => [...prev, { ...player, isBonus: false }])
    toast(`${player.name} added to team!`)
  }

  function handleAddBonus(player) {
    setBonusPick({ ...player, cost: 0, isBonus: true })
    toast(`${player.name} set as bonus pick!`)
  }

  function handleRemoveFromTeam(slug) { setTeam(prev => prev.filter(p => p.slug !== slug)) }
  function handleRemoveBonus()        { setBonusPick(null) }

  function handleSaveDb(slug, updated) {
    setDb(prev => ({ ...prev, [slug]: updated }))
    toast(`${updated.name} saved to DB`)
  }

  function handleNotesChange(updated) { setNotes(updated) }

  function handleSyncCostsFromDb() {
    let imported = 0
    setCosts(prev => {
      const merged = { ...prev }
      Object.entries(db).forEach(([slug, player]) => {
        if (player.cost2026 != null) {
          merged[slug] = player.cost2026
          imported++
        } else {
          const y2026 = player.history?.find(y => y.year === 2026)
          if (y2026?.cost != null) { merged[slug] = y2026.cost; imported++ }
        }
      })
      return merged
    })
    toast(`✓ Synced ${imported} 2026 costs from DB`)
  }
  function handleSetGistCredentials(id, tok) { setGistId(id); setGhToken(tok) }

  // Navigate to social tab for a specific player (from Compare tab)
  function handleSelectTabSocial(tabId, player) {
    if (player) {
      const dbData = db[player.slug] || {}
      setCurrentPlayer({ ...player, ...dbData, cost: costs[player.slug] ?? null })
    }
    setActiveTab(tabId)
  }

  const costsEntered = Object.values(costs).filter(Boolean).length
  const notesCount   = Object.values(notes).filter(n => n?.text).length

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>♠</span>
          <div>
            <h1 className={styles.title}>ODB Fantasy 2026</h1>
            <p className={styles.subtitle}>Draft preparation tool</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          {dbLoaded && !dbError && (
            <span className={styles.dbBadge}>✓ {Object.keys(db).length} players</span>
          )}
          {dbError && <span className={styles.dbError}>⚠ DB not found</span>}
          {costsEntered > 0 && <span className={styles.costsBadge} style={{cursor:'pointer'}} onClick={handleSyncCostsFromDb} title="Re-sync costs from DB">{costsEntered} costs ↻</span>}
          {notesCount   > 0 && <span className={styles.notesBadge}>{notesCount} notes</span>}
          <a href="https://www.25kfantasy.com/odb-fantasy/" target="_blank" rel="noreferrer" className={styles.externalLink}>
            25KFantasy ↗
          </a>
        </div>
      </header>

      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.id === 'costs'  && costsEntered > 0 && <span className={styles.tabBadge}>{costsEntered}</span>}
            {t.id === 'social' && notesCount   > 0 && <span className={styles.tabBadge}>{notesCount}</span>}
          </button>
        ))}
      </div>

      <main className={styles.main}>
        <div className={styles.leftCol}>

          {activeTab === 'search' && (
            <>
              <PlayerSearch onSelect={p => handleSelectPlayer(p)} />
              {!dbLoaded && <div className={styles.loading}>Loading player database…</div>}
              {dbLoaded && dbError && (
                <div className={styles.dbWarning}>
                  <strong>⚠ Player stats database not found.</strong><br />
                  Run <code>node scripts/scrape.mjs</code> first, then rebuild and redeploy.
                </div>
              )}
              {currentPlayer ? (
                <PlayerPanel
                  key={currentPlayer.slug}
                  player={currentPlayer}
                  savedCost={costs[currentPlayer.slug] ?? null}
                  onSaveCost={handleSaveCost}
                  onAddToTeam={handleAddToTeam}
                  onAddBonus={handleAddBonus}
                  note={notes[currentPlayer.slug] ?? null}
                  onEditNote={() => setNoteModal(currentPlayer)}
                />
              ) : (
                <div className={styles.emptyPanel}>
                  <div className={styles.emptyIcon}>♠ ♥ ♦ ♣</div>
                  <p>Search for a player above to view their stats</p>
                  <p className={styles.emptyHint}>
                    Use <strong>Rankings</strong> to sort all players by value ·
                    <strong> Compare</strong> for head-to-head ·
                    <strong> Costs</strong> to bulk-enter prices ·
                    <strong> Scouting</strong> for shared notes
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'value' && (
            <ValueBoard
              db={db} costs={costs} team={team} bonusPick={bonusPick}
              notes={notes}
              onSelectPlayer={p => handleSelectPlayer(p)}
              onAddToTeam={handleAddToTeam}
              onAddBonus={handleAddBonus}
              onViewNote={p => setNoteModal({ ...p, ...(db[p.slug] || {}) })}
            />
          )}

          {activeTab === 'compare' && (
            <ComparePanel
              db={db} costs={costs}
              notes={notes}
              onAddToTeam={handleAddToTeam}
              onAddBonus={handleAddBonus}
              onSelectTab={handleSelectTabSocial}
            />
          )}

          {activeTab === 'costs' && (
            <CostEditor db={db} costs={costs} onSaveCost={handleSaveCost} />
          )}

          {activeTab === 'social' && (
            <SocialTab
              db={db}
              notes={notes}
              onNotesChange={handleNotesChange}
              gistId={gistId}
              token={ghToken}
              onSetCredentials={handleSetGistCredentials}
            />
          )}

          {activeTab === 'db' && (
            <DbEditor db={db} onSave={handleSaveDb} />
          )}

        </div>

        <TeamSidebar
          team={team} bonusPick={bonusPick} budget={budget}
          onSetBudget={setBudget}
          onRemove={handleRemoveFromTeam}
          onRemoveBonus={handleRemoveBonus}
          onSelectPlayer={p => handleSelectPlayer(p)}
        />
      </main>

      {noteModal && (
        <NoteModal
          player={noteModal}
          notes={notes}
          onNotesChange={handleNotesChange}
          gistId={gistId}
          token={ghToken}
          onClose={() => setNoteModal(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
