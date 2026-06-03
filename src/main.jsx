import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

import './scss/index.scss'
import App from './App'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <App />
)

document.addEventListener('focusin', function (e) {
  if (e.target.matches('input[type="number"]')) {
    const input = e.target
    input._disableWheel = function (ev) {
      ev.preventDefault()
    }
    input.addEventListener('wheel', input._disableWheel, { passive: false })
  }
})
document.addEventListener('focusout', function (e) {
  if (e.target.matches('input[type="number"]')) {
    const input = e.target
    if (input._disableWheel) {
      input.removeEventListener('wheel', input._disableWheel)
      delete input._disableWheel
    }
  }
})