import { useState, useEffect, useRef } from 'react'
import { BONUS_SLUGS } from '../data/players'
import { PlayerSearch } from './PlayerSearch'
import { fetchNotes, saveNotes } from '../services/notesService'
import styles from './SocialTab.module.css'

export function SocialTab({ db, notes, onNotesChange, binId, apiKey, onSetCredentials }) {
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [draft, setDraft]                 = useState('')
  const [saving, setSaving]               = useState(false)
  const [syncing, setSyncing]             = useState(false)
  const [lastSync, setLastSync]           = useState(null)
  const [error, setError]                 = useState(null)
  const [showSetup, setShowSetup]         = useState(!binId || !apiKey)
  const [setupBinId, setSetupBinId]       = useState(binId || '')
  const [setupApiKey, setSetupApiKey]     = useState(apiKey || '')
  const autoSaveRef = useRef(null)

  // When player changes, load their current note into the draft
  useEffect(() => {
    if (!currentPlayer) return
    setDraft(notes[currentPlayer.slug]?.text || '')
  }, [currentPlayer?.slug])

  // Auto-save draft 2s after user stops typing
  useEffect(() => {
    if (!currentPlayer) return
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => {
      handleSave(draft)
    }, 2000)
    return () => clearTimeout(autoSaveRef.current)
  }, [draft])

  function handleSelectPlayer(base) {
    const dbData = db[base.slug] || {}
    setCurrentPlayer({ ...base, ...dbData })
  }

  async function handleSave(text) {
    if (!currentPlayer) return
    const updated = {
      ...notes,
      [currentPlayer.slug]: {
        text,
        playerName: currentPlayer.name,
        updatedAt: new Date().toISOString(),
      }
    }
    // Remove if empty
    if (!text.trim()) delete updated[currentPlayer.slug]

    onNotesChange(updated)

    // Push to JSONBin if configured
    if (binId && apiKey) {
      setSaving(true)
      setError(null)
      try {
        await saveNotes(binId, apiKey, updated)
      } catch (e) {
        setError(`Save failed: ${e.message}`)
      } finally {
        setSaving(false)
      }
    }
  }

  async function handleSync() {
    if (!binId || !apiKey) { setShowSetup(true); return }
    setSyncing(true)
    setError(null)
    try {
      const remote = await fetchNotes(binId, apiKey)
      onNotesChange(remote)
      setLastSync(new Date())
      if (currentPlayer) {
        setDraft(remote[currentPlayer.slug]?.text || '')
      }
    } catch (e) {
      setError(`Sync failed: ${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  function handleSaveCredentials() {
    onSetCredentials(setupBinId.trim(), setupApiKey.trim())
    setShowSetup(false)
  }

  const playerNotes = Object.entries(notes)
    .filter(([, v]) => v?.text)
    .sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt))

  return (
    <div className={styles.wrap}>
      {/* Setup panel */}
      {showSetup && (
        <div className={styles.setupBox}>
          <div className={styles.setupTitle}>⚙️ Setup shared notes (JSONBin.io)</div>
          <ol className={styles.setupSteps}>
            <li>Go to <a href="https://jsonbin.io" target="_blank" rel="noreferrer">jsonbin.io</a> → create a free account</li>
            <li>API Keys → Create Access Key → copy it</li>
            <li>Click <strong>+ New Bin</strong> → paste <code>{"{}"}</code> → Save → copy the Bin ID from the URL</li>
            <li>Share the same Bin ID + API Key with your partner</li>
          </ol>
          <div className={styles.setupFields}>
            <label>
              Bin ID
              <input type="text" placeholder="e.g. 6650ab1234..." value={setupBinId} onChange={e => setSetupBinId(e.target.value)} />
            </label>
            <label>
              API Key (Master Key)
              <input type="password" placeholder="$2a$10$..." value={setupApiKey} onChange={e => setSetupApiKey(e.target.value)} />
            </label>
          </div>
          <div className={styles.setupActions}>
            <button className="primary" onClick={handleSaveCredentials} disabled={!setupBinId || !setupApiKey}>
              Save credentials
            </button>
            {binId && <button onClick={() => setShowSetup(false)}>Cancel</button>}
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <span className={styles.headerTitle}>📌 Scouting Notes</span>
          <span className={styles.headerSub}>
            {binId ? '☁ Shared (JSONBin)' : '⚠ Local only — set up sharing above'}
          </span>
        </div>
        <div className={styles.headerRight}>
          {lastSync && (
            <span className={styles.syncTime}>Synced {lastSync.toLocaleTimeString()}</span>
          )}
          <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
            {syncing ? '⟳ Syncing…' : '⟳ Sync'}
          </button>
          <button className={styles.setupBtn} onClick={() => setShowSetup(s => !s)}>
            ⚙ Setup
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.layout}>
        {/* Left: player search + note editor */}
        <div className={styles.editorCol}>
          <PlayerSearch onSelect={handleSelectPlayer} />

          {currentPlayer ? (
            <div className={styles.editor}>
              <div className={styles.editorHeader}>
                <div className={styles.editorName}>{currentPlayer.name}</div>
                <div className={styles.editorMeta}>
                  #{currentPlayer.rank} · {currentPlayer.allTimeScore?.toLocaleString()} pts all-time
                  {BONUS_SLUGS.has(currentPlayer.slug) && <span className="tag bonus" style={{ marginLeft: 8 }}>Bonus eligible</span>}
                </div>
              </div>

              <textarea
                className={styles.textarea}
                placeholder={`Add scouting notes for ${currentPlayer.name}…\n\nE.g.:\n- Tweeted he's skipping several events in June\n- Playing full WSOP schedule according to PokerNews\n- Won a bracelet last week, might be in peak form`}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={10}
              />

              <div className={styles.editorFooter}>
                <span className={styles.autoSaveNote}>
                  {saving ? '💾 Saving…' : draft !== (notes[currentPlayer.slug]?.text || '') ? '✏ Unsaved changes' : '✓ Saved'}
                </span>
                <button
                  className="primary"
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={() => { clearTimeout(autoSaveRef.current); handleSave(draft) }}
                  disabled={saving}
                >
                  Save note
                </button>
              </div>

              {notes[currentPlayer.slug]?.updatedAt && (
                <div className={styles.lastUpdated}>
                  Last updated: {new Date(notes[currentPlayer.slug].updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyEditor}>
              <div className={styles.emptyIcon}>📌</div>
              <p>Search for a player above to add or view scouting notes</p>
              <p className={styles.emptyHint}>Notes are shared with your partner in real time via JSONBin</p>
            </div>
          )}
        </div>

        {/* Right: all notes feed */}
        <div className={styles.feedCol}>
          <div className={styles.feedTitle}>All notes ({playerNotes.length})</div>
          {playerNotes.length === 0 ? (
            <div className={styles.feedEmpty}>No notes yet — add your first one!</div>
          ) : (
            <div className={styles.feed}>
              {playerNotes.map(([slug, note]) => (
                <div
                  key={slug}
                  className={`${styles.feedItem} ${currentPlayer?.slug === slug ? styles.feedItemActive : ''}`}
                  onClick={() => handleSelectPlayer({ name: note.playerName, slug, rank: db[slug]?.rank || 999, allTimeScore: db[slug]?.allTimeScore || 0 })}
                >
                  <div className={styles.feedItemName}>{note.playerName}</div>
                  <div className={styles.feedItemText}>{note.text}</div>
                  <div className={styles.feedItemTime}>
                    {new Date(note.updatedAt).toLocaleDateString()} {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
