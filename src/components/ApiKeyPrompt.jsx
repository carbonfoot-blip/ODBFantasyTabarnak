import { useState } from 'react'
import styles from './ApiKeyPrompt.module.css'

export function ApiKeyPrompt({ onSave }) {
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)

  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>🔑</div>
      <h3 className={styles.title}>Anthropic API key required</h3>
      <p className={styles.desc}>
        This app uses Claude to fetch player stats directly from 25KFantasy.
        Your key is stored only in your browser (localStorage) and never sent anywhere else.
      </p>
      <div className={styles.inputRow}>
        <input
          type={show ? 'text' : 'password'}
          className={styles.input}
          placeholder="sk-ant-..."
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && key.startsWith('sk-') && onSave(key)}
          autoComplete="off"
          spellCheck={false}
        />
        <button className={styles.toggle} onClick={() => setShow(s => !s)}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <button
        className={`primary ${styles.saveBtn}`}
        onClick={() => onSave(key)}
        disabled={!key.startsWith('sk-')}
      >
        Save & continue
      </button>
      <p className={styles.hint}>
        Get a key at{' '}
        <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
          console.anthropic.com
        </a>
        . Sonnet 4 is used — typically &lt;$0.10 per player fetch.
      </p>
    </div>
  )
}
