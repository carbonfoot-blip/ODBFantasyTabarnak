import { useState, useEffect, useRef } from 'react'
import { BONUS_SLUGS } from '../data/players'
import { PlayerSearch } from './PlayerSearch'
import { fetchNotes, saveNotes, createGist } from '../services/notesService'
import styles from './SocialTab.module.css'

export function SocialTab({ db, notes, onNotesChange, gistId, token, onSetCredentials }) {
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [draft, setDraft]                 = useState('')
  const [saving, setSaving]               = useState(false)
  const [syncing, setSyncing]             = useState(false)
  const [creating, setCreating]           = useState(false)
  const [lastSync, setLastSync]           = useState(null)
  const [error, setError]                 = useState(null)
  const [showSetup, setShowSetup]         = useState(!gistId || !token)
  const [setupToken, setSetupToken]       = useState(token || '')
  const [setupGistId, setSetupGistId]     = useState(gistId || '')
  const [showToken, setShowToken]         = useState(false)
  const autoSaveRef = useRef(null)

  useEffect(() => {
    if (!currentPlayer) return
    setDraft(notes[currentPlayer.slug]?.text || '')
  }, [currentPlayer?.slug])

  useEffect(() => {
    if (!currentPlayer) return
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => handleSave(draft), 2000)
    return () => clearTimeout(autoSaveRef.current)
  }, [draft])

  function handleSelectPlayer(base) {
    setCurrentPlayer({ ...base, ...(db[base.slug] || {}) })
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
    if (gistId && token) {
      setSaving(true); setError(null)
      try { await saveNotes(gistId, token, updated) }
      catch (e) { setError(`Save failed: ${e.message}`) }
      finally { setSaving(false) }
    }
  }

  async function handleSync() {
    if (!gistId) { setShowSetup(true); return }
    setSyncing(true); setError(null)
    try {
      const remote = await fetchNotes(gistId, token)
      onNotesChange(remote)
      setLastSync(new Date())
      if (currentPlayer) setDraft(remote[currentPlayer.slug]?.text || '')
    } catch (e) { setError(`Sync failed: ${e.message}`) }
    finally { setSyncing(false) }
  }

  async function handleCreate() {
    if (!setupToken) { setError('Enter your GitHub token first'); return }
    setCreating(true); setError(null)
    try {
      const id = await createGist(setupToken)
      onSetCredentials(id, setupToken)
      setSetupGistId(id)
      setShowSetup(false)
    } catch (e) { setError(e.message) }
    finally { setCreating(false) }
  }

  function handleSaveExisting() {
    if (!setupToken || !setupGistId) return
    onSetCredentials(setupGistId.trim(), setupToken.trim())
    setShowSetup(false)
  }

  const playerNotes = Object.entries(notes)
    .filter(([, v]) => v?.text)
    .sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt))

  const isSaved = !currentPlayer || draft === (notes[currentPlayer.slug]?.text || '')

  return (
    <div className={styles.wrap}>

      {showSetup && (
        <div className={styles.setupBox}>
          <div className={styles.setupTitle}>⚙️ Setup shared notes via GitHub Gist</div>
          <p className={styles.setupDesc}>
            You already have a GitHub account — just create a token with "gist" access. Takes 1 minute.
          </p>

          <div className={styles.setupStepBox}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepContent}>
              <div className={styles.stepTitle}>Create a GitHub token</div>
              <a
                href="https://github.com/settings/tokens/new?description=ODB+Fantasy+Notes&scopes=gist"
                target="_blank" rel="noreferrer"
                className={styles.stepLink}
              >
                → Click here to open GitHub token page ↗
              </a>
              <div className={styles.stepHint}>Set expiration to "No expiration", check only <strong>gist</strong> scope, click Generate.</div>
            </div>
          </div>

          <div className={styles.setupStepBox}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepContent}>
              <div className={styles.stepTitle}>Paste your token</div>
              <div className={styles.tokenRow}>
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={setupToken}
                  onChange={e => setSetupToken(e.target.value)}
                  className={styles.tokenInput}
                />
                <button className={styles.showBtn} onClick={() => setShowToken(s => !s)}>
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.setupStepBox}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepContent}>
              <div className={styles.stepTitle}>Create the shared Gist</div>
              <div className={styles.setupActions}>
                <button className="primary" onClick={handleCreate} disabled={creating || !setupToken}>
                  {creating ? '⟳ Creating…' : '✦ Create shared Gist'}
                </button>
                <span className={styles.setupOr}>— or, if partner already created one —</span>
                <div className={styles.existingRow}>
                  <input
                    type="text"
                    placeholder="Gist ID (e.g. a1b2c3d4e5f6...)"
                    value={setupGistId}
                    onChange={e => setSetupGistId(e.target.value)}
                    className={styles.gistInput}
                  />
                  <button onClick={handleSaveExisting} disabled={!setupGistId || !setupToken}>
                    Use this Gist
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <span className={styles.headerTitle}>📌 Scouting Notes</span>
          <span className={styles.headerSub}>
            {gistId
              ? <span className={styles.connected}>☁ GitHub Gist connected · <code className={styles.gistCode}>{gistId.substring(0, 12)}…</code></span>
              : <span className={styles.noBlob}>⚠ Not configured — set up sharing above</span>}
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

      {/* Gist ID share banner */}
      {gistId && !showSetup && (
        <div className={styles.shareReminder}>
          📋 Share this Gist ID with your partner (they need their own GitHub token):
          <code className={styles.blobCode}>{gistId}</code>
          <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(gistId)}>Copy</button>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.layout}>
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
                placeholder={`Scouting notes for ${currentPlayer.name}…\n\nEx.:\n- Tweeted il skip les 2 premières semaines du WSOP\n- PokerNews: playing full schedule this year\n- Won a bracelet last week — peak form`}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={10}
              />
              <div className={styles.editorFooter}>
                <span className={styles.autoSaveNote}>
                  {saving ? '💾 Saving…' : isSaved ? '✓ Saved' : '✏ Unsaved…'}
                </span>
                <button className="primary" style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={() => { clearTimeout(autoSaveRef.current); handleSave(draft) }}
                  disabled={saving}>
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
              <p>Search a player to add scouting notes</p>
              <p className={styles.emptyHint}>Notes are shared with your partner via GitHub Gist</p>
            </div>
          )}
        </div>

        <div className={styles.feedCol}>
          <div className={styles.feedTitle}>All notes ({playerNotes.length})</div>
          {playerNotes.length === 0 ? (
            <div className={styles.feedEmpty}>No notes yet!</div>
          ) : (
            <div className={styles.feed}>
              {playerNotes.map(([slug, note]) => (
                <div key={slug}
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
