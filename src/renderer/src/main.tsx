import './index.css'
import './i18n'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initTheme } from './theme'

initTheme()

createRoot(document.getElementById('root')!).render(<App />)
