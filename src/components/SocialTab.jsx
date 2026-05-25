import { useState, useEffect, useRef } from 'react'
import { BONUS_SLUGS } from '../data/players'
import { PlayerSearch } from './PlayerSearch'
import { fetchNotes, saveNotes, createBlob } from '../services/notesService'
import styles from './SocialTab.module.css'

export function SocialTab({ db, notes, onNotesChange, blobId, onSetBlobId }) {
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [draft, setDraft]                 = useState('')
  const [saving, setSaving]               = useState(false)
  const [syncing, setSyncing]             = useState(false)
  const [creating, setCreating]           = useState(false)
  const [lastSync, setLastSync]           = useState(null)
  const [error, setError]                 = useState(null)
  const [showSetup, setShowSetup]         = useState(!blobId)
  const [setupBlobId, setSetupBlobId]     = useState(blobId || '')
  const autoSaveRef = useRef(null)

  useEffect(() => {
    if (!currentPlayer) return
    setDraft(notes[currentPlayer.slug]?.text || '')
  }, [currentPlayer?.slug])

  // Auto-save 2s after typing stops
  useEffect(() => {
    if (!currentPlayer) return
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => handleSave(draft), 2000)
    return () => clearTimeout(autoSaveRef.current)
  }, [draft])

  function handleSelectPlayer(base) {
    const dbData = db[base.slug] || {}
    setCurrentPlayer({ ...base, ...dbData })
  }

  async function handleSave(text) {
    if (!currentPlayer) return
    const updated = { ...notes }
    if (text.trim()) {
      updated[currentPlayer.slug] = {
        text,
        playerName: currentPlayer.name,
        updatedAt: new Date().toISOString(),
      }
    } else {
      delete updated[currentPlayer.slug]
    }
    onNotesChange(updated)

    if (blobId) {
      setSaving(true)
      setError(null)
      try {
        await saveNotes(blobId, updated)
      } catch (e) {
        setError(`Save failed: ${e.message}`)
      } finally {
        setSaving(false)
      }
    }
  }

  async function handleSync() {
    if (!blobId) { setShowSetup(true); return }
    setSyncing(true)
    setError(null)
    try {
      const remote = await fetchNotes(blobId)
      onNotesChange(remote)
      setLastSync(new Date())
      if (currentPlayer) setDraft(remote[currentPlayer.slug]?.text || '')
    } catch (e) {
      setError(`Sync failed: ${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleCreateBlob() {
    setCreating(true)
    setError(null)
    try {
      const id = await createBlob()
      setSetupBlobId(id)
      onSetBlobId(id)
      setShowSetup(false)
    } catch (e) {
      setError(`Could not create blob: ${e.message}`)
    } finally {
      setCreating(false)
    }
  }

  function handleSaveCredentials() {
    onSetBlobId(setupBlobId.trim())
    setShowSetup(false)
  }

  const playerNotes = Object.entries(notes)
    .filter(([, v]) => v?.text)
    .sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt))

  const isSaved = !currentPlayer || draft === (notes[currentPlayer.slug]?.text || '')

  return (
    <div className={styles.wrap}>

      {/* Setup panel */}
      {showSetup && (
        <div className={styles.setupBox}>
          <div className={styles.setupTitle}>⚙️ Setup shared notes</div>
          <p className={styles.setupDesc}>
            Notes are stored on <strong>JSONBlob.com</strong> — free, no account needed.
            Create a blob once, share the ID with your partner.
          </p>

          <div className={styles.setupOptions}>
            {/* Option A: create new */}
            <div className={styles.setupOption}>
              <div className={styles.setupOptionTitle}>Option A — Create new (first time)</div>
              <button className="primary" onClick={handleCreateBlob} disabled={creating}>
                {creating ? '⟳ Creating…' : '✦ Create a new shared blob'}
              </button>
              <p className={styles.setupHint}>Automatically generates a blob ID for you and your partner to share.</p>
            </div>

            <div className={styles.setupOr}>— or —</div>

            {/* Option B: enter existing ID */}
            <div className={styles.setupOption}>
              <div className={styles.setupOptionTitle}>Option B — Enter existing Blob ID</div>
              <div className={styles.setupRow}>
                <input
                  type="text"
                  placeholder="e.g. 1234567890123456789"
                  value={setupBlobId}
                  onChange={e => setSetupBlobId(e.target.value)}
                  className={styles.setupInput}
                />
                <button onClick={handleSaveCredentials} disabled={!setupBlobId}>Use this ID</button>
              </div>
              <p className={styles.setupHint}>Your partner already created a blob? Enter their ID here.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <span className={styles.headerTitle}>📌 Scouting Notes</span>
          <span className={styles.headerSub}>
            {blobId
              ? <span className={styles.blobId}>☁ Blob: <code>{blobId}</code></span>
              : <span className={styles.noBlob}>⚠ Local only — set up sharing above</span>}
          </span>
        </div>
        <div className={styles.headerRight}>
          {lastSync && <span className={styles.syncTime}>Synced {lastSync.toLocaleTimeString()}</span>}
          <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
            {syncing ? '⟳ Syncing…' : '⟳ Sync'}
          </button>
          <button className={styles.setupBtn} onClick={() => setShowSetup(s => !s)}>⚙ Setup</button>
        </div>
      </div>

      {/* Blob ID share reminder */}
      {blobId && !showSetup && (
        <div className={styles.shareReminder}>
          📋 Share this Blob ID with your partner: <code className={styles.blobCode}>{blobId}</code>
          <button className={styles.copyBtn} onClick={() => { navigator.clipboard.writeText(blobId); }}>Copy</button>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.layout}>
        {/* Left: editor */}
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
                placeholder={`Scouting notes for ${currentPlayer.name}…\n\nEx.:\n- Posted on X that he's skipping first 2 weeks of WSOP\n- PokerNews article: playing full schedule this year\n- Won a bracelet last week — in peak form`}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={10}
              />

              <div className={styles.editorFooter}>
                <span className={styles.autoSaveNote}>
                  {saving ? '💾 Saving…' : isSaved ? '✓ Saved' : '✏ Unsaved…'}
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
              <p>Search for a player above to add scouting notes</p>
              <p className={styles.emptyHint}>Notes sync in real time with your partner via JSONBlob</p>
            </div>
          )}
        </div>

        {/* Right: notes feed */}
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
