import { useState, useEffect, useRef } from 'react'
import { saveNotes } from '../services/notesService'
import styles from './NoteModal.module.css'

export function NoteModal({ player, notes, onNotesChange, gistId, token, onClose }) {
  const [draft, setDraft]   = useState(notes[player.slug]?.text || '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const autoSaveRef = useRef(null)
  const textareaRef = useRef(null)

  // Focus textarea on open
  useEffect(() => { textareaRef.current?.focus() }, [])

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Auto-save 1.5s after typing stops
  useEffect(() => {
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => handleSave(draft, false), 1500)
    return () => clearTimeout(autoSaveRef.current)
  }, [draft])

  async function handleSave(text, showFeedback = true) {
    const updated = { ...notes }
    if (text.trim()) {
      updated[player.slug] = {
        text,
        playerName: player.name,
        updatedAt: new Date().toISOString(),
      }
    } else {
      delete updated[player.slug]
    }
    onNotesChange(updated)

    if (gistId && token) {
      setSaving(true)
      try {
        await saveNotes(gistId, token, updated)
        if (showFeedback) { setSaved(true); setTimeout(() => setSaved(false), 1500) }
      } catch {}
      finally { setSaving(false) }
    }
  }

  const lastUpdated = notes[player.slug]?.updatedAt

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.playerName}>{player.name}</div>
            <div className={styles.playerMeta}>
              #{player.rank} all-time · {player.allTimeScore?.toLocaleString()} pts
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.label}>📌 Scouting note</div>

        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={`Notes for ${player.name}…\n\nEx.:\n- Tweeted il skip les 2 premières semaines du WSOP\n- Full schedule selon PokerNews\n- En grande forme après un bracelet récent`}
          rows={8}
        />

        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {saving ? (
              <span className={styles.statusSaving}>💾 Saving…</span>
            ) : saved ? (
              <span className={styles.statusSaved}>✓ Saved</span>
            ) : lastUpdated ? (
              <span className={styles.statusTime}>
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </span>
            ) : (
              <span className={styles.statusNone}>
                {gistId ? 'Auto-saves to shared Gist' : '⚠ Setup Gist to share notes'}
              </span>
            )}
          </div>
          <div className={styles.footerRight}>
            <button onClick={onClose}>Close</button>
            <button
              className="primary"
              onClick={() => { clearTimeout(autoSaveRef.current); handleSave(draft, true) }}
              disabled={saving}
            >
              Save note
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
