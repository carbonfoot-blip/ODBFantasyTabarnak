import { useEffect, useState } from 'react'
import styles from './Toast.module.css'

export function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 200) }, 2500)
    return () => clearTimeout(t)
  }, [message, onDone])

  return (
    <div className={`${styles.toast} ${visible ? styles.show : styles.hide}`}>
      {message}
    </div>
  )
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className={styles.container}>
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} onDone={() => onRemove(t.id)} />
      ))}
    </div>
  )
}
