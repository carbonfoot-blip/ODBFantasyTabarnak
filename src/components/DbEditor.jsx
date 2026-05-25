import { useState, useMemo } from 'react'
import { PLAYERS } from '../data/players'
import styles from './DbEditor.module.css'

export function DbEditor({ db, onSave }) {
  const [filter, setFilter]     = useState('missing') // 'all' | 'missing' | 'ok'
  const [search, setSearch]     = useState('')
  const [editing, setEditing]   = useState(null)  // slug being edited
  const [form, setForm]         = useState({})
  const [saved, setSaved]       = useState(null)

  const rows = useMemo(() => {
    return PLAYERS
      .map(([name, slug, rank, allTimeScore]) => {
        const entry   = db[slug]
        const hasData = entry && entry.history && entry.history.filter(y => y.pts).length > 0
        const yearCount = entry?.history?.filter(y => y.pts).length ?? 0
        return { name, slug, rank, allTimeScore, entry, hasData, yearCount }
      })
      .filter(r => {
        if (filter === 'missing' && r.hasData) return false
        if (filter === 'ok' && !r.hasData) return false
        if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
  }, [db, filter, search])

  const totalOk      = PLAYERS.filter(([,slug]) => {
    const e = db[slug]; return e && e.history && e.history.filter(y=>y.pts).length > 0
  }).length
  const totalMissing = PLAYERS.length - totalOk

  function startEdit(row) {
    const entry = row.entry || {}
    const history = entry.history || []
    // Build a simple form: one row per year (from existing data or blank)
    const years = history.length ? history : []
    setForm({
      allTimeScore: row.allTimeScore,
      totalCashes:  entry.totalCashes ?? '',
      timesDrafted: entry.timesDrafted ?? '',
      avgSalary:    entry.avgSalary ?? '',
      history:      years.map(y => ({ year: y.year, pts: y.pts ?? '', cost: y.cost ?? '', cashes: y.cashes ?? '' })),
      newYear: '', newPts: '', newCost: '', newCashes: '',
    })
    setEditing(row.slug)
  }

  function addHistoryRow() {
    const yr = parseInt(form.newYear)
    if (!yr || yr < 2010 || yr > 2026) return
    if (form.history.find(h => h.year === yr)) return
    setForm(prev => ({
      ...prev,
      history: [...prev.history, { year: yr, pts: prev.newPts, cost: prev.newCost, cashes: prev.newCashes }].sort((a,b)=>a.year-b.year),
      newYear: '', newPts: '', newCost: '', newCashes: '',
    }))
  }

  function removeHistoryRow(year) {
    setForm(prev => ({ ...prev, history: prev.history.filter(h => h.year !== year) }))
  }

  function updateHistoryRow(year, field, value) {
    setForm(prev => ({
      ...prev,
      history: prev.history.map(h => h.year === year ? { ...h, [field]: value } : h)
    }))
  }

  function handleSave() {
    const player = PLAYERS.find(([,s]) => s === editing)
    if (!player) return
    const [name, slug, rank, allTimeScore] = player

    const history = form.history
      .map(h => ({
        year:   parseInt(h.year),
        pts:    parseFloat(h.pts) || null,
        cost:   parseFloat(h.cost) || null,
        cashes: parseInt(h.cashes) || null,
      }))
      .filter(h => h.year >= 2010)
      .sort((a,b) => a.year - b.year)

    const updated = {
      ...(db[slug] || {}),
      name, slug, rank, allTimeScore,
      totalCashes:  parseFloat(form.totalCashes) || db[slug]?.totalCashes || null,
      timesDrafted: parseFloat(form.timesDrafted) || db[slug]?.timesDrafted || null,
      avgSalary:    parseFloat(form.avgSalary) || db[slug]?.avgSalary || null,
      history,
      manuallyEdited: true,
      editedAt: new Date().toISOString(),
    }

    onSave(slug, updated)
    setSaved(slug)
    setEditing(null)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div className={styles.wrap}>
      {/* Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum} style={{ color: 'var(--green)' }}>{totalOk}</span>
          <span className={styles.summaryLabel}>scraped OK</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum} style={{ color: totalMissing > 0 ? 'var(--red)' : 'var(--text3)' }}>{totalMissing}</span>
          <span className={styles.summaryLabel}>missing / failed</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum}>{PLAYERS.length}</span>
          <span className={styles.summaryLabel}>total players</span>
        </div>
      </div>

      {/* Fix instructions */}
      {totalMissing > 0 && (
        <div className={styles.fixBox}>
          <strong>To fix failed players via scraper:</strong>
          <ol className={styles.fixSteps}>
            <li>Go to <a href="https://www.25kfantasy.com/players/player-database" target="_blank" rel="noreferrer">25kfantasy.com/players/player-database</a> and click the player's name</li>
            <li>Copy the slug from the URL (e.g. <code>/player-profile/chino-rheem-jr/</code> → <code>chino-rheem-jr</code>)</li>
            <li>Run: <code>node scripts/fix-player.mjs &lt;original-slug&gt; &lt;correct-slug&gt;</code></li>
            <li>Or edit manually below by clicking <strong>Edit</strong></li>
          </ol>
        </div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        <input
          className={styles.search}
          type="text"
          placeholder="Search players…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className={styles.filterBtns}>
          {[['missing','⚠ Missing'], ['ok','✓ OK'], ['all','All']].map(([v,l]) => (
            <button key={v} className={`${styles.filterBtn} ${filter===v?styles.active:''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Player list */}
      <div className={styles.list}>
        {rows.map(row => (
          <div key={row.slug} className={`${styles.row} ${saved===row.slug ? styles.justSaved : ''}`}>
            <div className={styles.rowLeft}>
              <span className={`${styles.statusDot} ${row.hasData ? styles.ok : styles.missing}`} />
              <div>
                <div className={styles.rowName}>{row.name}</div>
                <div className={styles.rowMeta}>
                  #{row.rank} · {row.yearCount > 0 ? `${row.yearCount} years` : 'no history data'}
                  {row.entry?.manuallyEdited && <span className={styles.manualTag}>manual</span>}
                </div>
              </div>
            </div>
            <div className={styles.rowRight}>
              {!row.hasData && (
                <code className={styles.fixCmd}>
                  npm run fix {row.slug}
                </code>
              )}
              <button
                className={styles.editBtn}
                onClick={() => editing === row.slug ? setEditing(null) : startEdit(row)}
              >
                {editing === row.slug ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {/* Edit form */}
            {editing === row.slug && (
              <div className={styles.editForm}>
                <div className={styles.editMeta}>
                  <label>Total cashes <input type="number" value={form.totalCashes} onChange={e=>setForm(p=>({...p,totalCashes:e.target.value}))} /></label>
                  <label>Times drafted <input type="number" value={form.timesDrafted} onChange={e=>setForm(p=>({...p,timesDrafted:e.target.value}))} /></label>
                  <label>Avg salary <input type="number" value={form.avgSalary} onChange={e=>setForm(p=>({...p,avgSalary:e.target.value}))} /></label>
                </div>

                <div className={styles.historyTitle}>Year-by-year history</div>
                <table className={styles.histTable}>
                  <thead>
                    <tr><th>Year</th><th>Pts</th><th>Cost</th><th>Cashes</th><th></th></tr>
                  </thead>
                  <tbody>
                    {form.history.map(h => (
                      <tr key={h.year}>
                        <td className={styles.yrCell}>{h.year}</td>
                        <td><input type="number" value={h.pts} onChange={e=>updateHistoryRow(h.year,'pts',e.target.value)} /></td>
                        <td><input type="number" value={h.cost} onChange={e=>updateHistoryRow(h.year,'cost',e.target.value)} /></td>
                        <td><input type="number" value={h.cashes} onChange={e=>updateHistoryRow(h.year,'cashes',e.target.value)} /></td>
                        <td><button className={styles.removeRow} onClick={()=>removeHistoryRow(h.year)}>✕</button></td>
                      </tr>
                    ))}
                    {/* Add new row */}
                    <tr className={styles.addRow}>
                      <td><input type="number" placeholder="Year" value={form.newYear} onChange={e=>setForm(p=>({...p,newYear:e.target.value}))} /></td>
                      <td><input type="number" placeholder="Pts" value={form.newPts} onChange={e=>setForm(p=>({...p,newPts:e.target.value}))} /></td>
                      <td><input type="number" placeholder="Cost" value={form.newCost} onChange={e=>setForm(p=>({...p,newCost:e.target.value}))} /></td>
                      <td><input type="number" placeholder="Cashes" value={form.newCashes} onChange={e=>setForm(p=>({...p,newCashes:e.target.value}))} /></td>
                      <td><button className={styles.addRowBtn} onClick={addHistoryRow}>+ Add</button></td>
                    </tr>
                  </tbody>
                </table>

                <div className={styles.editActions}>
                  <button className="primary" onClick={handleSave}>Save to DB</button>
                  <button onClick={() => setEditing(null)}>Cancel</button>
                  <span className={styles.editNote}>Saved locally — rebuild &amp; deploy to publish</span>
                </div>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className={styles.empty}>No players match your filter.</div>
        )}
      </div>
    </div>
  )
}
