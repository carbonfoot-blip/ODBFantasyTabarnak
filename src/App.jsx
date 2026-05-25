import { useState, useCallback } from 'react'
import { PlayerSearch } from './components/PlayerSearch'
import { PlayerPanel } from './components/PlayerPanel'
import { TeamSidebar } from './components/TeamSidebar'
import { ApiKeyPrompt } from './components/ApiKeyPrompt'
import { ToastContainer } from './components/Toast'
import { useLocalStorage } from './hooks/useLocalStorage'
import { fetchPlayerHistory } from './services/api'
import styles from './App.module.css'

const MAX_TEAM = 8

export default function App() {
  // Persistent state
  const [apiKey, setApiKey] = useLocalStorage('odb_apikey', '')
  const [team, setTeam] = useLocalStorage('odb_team_2026', [])
  const [bonusPick, setBonusPick] = useLocalStorage('odb_bonus_2026', null)
  const [budget, setBudget] = useLocalStorage('odb_budget_2026', 0)
  const [playerCache, setPlayerCache] = useLocalStorage('odb_cache_2026', {})

  // Session state
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])

  function toast(message) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message }])
  }

  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  function saveApiKey(key) {
    setApiKey(key)
    toast('API key saved!')
  }

  // Select player — merges cached data
  function handleSelectPlayer(base) {
    const cached = playerCache[base.slug] || {}
    setCurrentPlayer({ ...base, ...cached })
  }

  // Fetch stats from 25KFantasy via Anthropic API
  const handleFetchStats = useCallback(async () => {
    if (!currentPlayer) return
    if (!apiKey) { toast('Set your Anthropic API key first'); return }
    setLoading(true)
    try {
      const data = await fetchPlayerHistory(currentPlayer.slug, apiKey)
      // Add 2026 pending row
      const history2026 = [...(data.history || []), { year: 2026, pending: true, pts: 0, cashes: 0 }]
      const enriched = { ...data, history: history2026 }

      // Update cache
      setPlayerCache(prev => ({ ...prev, [currentPlayer.slug]: enriched }))

      // Update current player
      setCurrentPlayer(prev => ({ ...prev, ...enriched }))

      // Update in team if present
      setTeam(prev => prev.map(p => p.slug === currentPlayer.slug ? { ...p, ...enriched } : p))
      if (bonusPick?.slug === currentPlayer.slug) {
        setBonusPick(prev => ({ ...prev, ...enriched }))
      }

      toast(`Stats loaded for ${currentPlayer.name}!`)
    } catch (err) {
      toast(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [currentPlayer, apiKey, setPlayerCache, setTeam, bonusPick, setBonusPick])

  // Add player to team
  function handleAddToTeam(player) {
    if (team.find(p => p.slug === player.slug)) { toast('Already in team'); return }
    if (team.length >= MAX_TEAM) { toast('Team is full (8 players max)'); return }
    const entry = { ...player, ...(playerCache[player.slug] || {}), isBonus: false }
    setTeam(prev => [...prev, entry])
    toast(`${player.name} added to team!`)
  }

  // Add as bonus pick
  function handleAddBonus(player) {
    const entry = { ...player, ...(playerCache[player.slug] || {}), cost: 0, isBonus: true }
    setBonusPick(entry)
    toast(`${player.name} set as bonus pick!`)
  }

  function handleRemoveFromTeam(slug) {
    setTeam(prev => prev.filter(p => p.slug !== slug))
  }

  function handleRemoveBonus() {
    setBonusPick(null)
  }

  function handleSelectFromTeam(player) {
    handleSelectPlayer(player)
  }

  const showApiPrompt = !apiKey

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>♠</span>
          <div>
            <h1 className={styles.title}>ODB Fantasy 2026</h1>
            <p className={styles.subtitle}>Draft preparation tool</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <a
            href="https://www.25kfantasy.com/odb-fantasy/"
            target="_blank"
            rel="noreferrer"
            className={styles.externalLink}
          >
            25KFantasy ↗
          </a>
          <button
            className={styles.apiBtn}
            onClick={() => setApiKey('')}
            title="Reset API key"
          >
            🔑 {apiKey ? 'API key set' : 'No API key'}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Left column: search + player panel */}
        <div className={styles.leftCol}>
          {showApiPrompt && (
            <div className={styles.apiPromptWrap}>
              <ApiKeyPrompt onSave={saveApiKey} />
            </div>
          )}

          <PlayerSearch onSelect={handleSelectPlayer} />

          {currentPlayer ? (
            <PlayerPanel
              key={currentPlayer.slug}
              player={currentPlayer}
              onAddToTeam={handleAddToTeam}
              onAddBonus={handleAddBonus}
              onFetchStats={handleFetchStats}
              loading={loading}
            />
          ) : (
            <div className={styles.emptyPanel}>
              <div className={styles.emptyIcon}>♠ ♥ ♦ ♣</div>
              <p>Search for a player above to view their stats</p>
              <p className={styles.emptyHint}>
                Type a name to search across all 480+ players in the database.
                Select one to view their year-by-year history and add them to your team.
              </p>
            </div>
          )}
        </div>

        {/* Right column: team sidebar */}
        <TeamSidebar
          team={team}
          bonusPick={bonusPick}
          budget={budget}
          onSetBudget={setBudget}
          onRemove={handleRemoveFromTeam}
          onRemoveBonus={handleRemoveBonus}
          onSelectPlayer={handleSelectFromTeam}
        />
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
