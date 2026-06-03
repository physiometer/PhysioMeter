import React from 'react'
import { useState } from 'react'
import { HashRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'

import Home from './components/Home'
import PatientPage from './components/PatientPage'
import PatientEdit from './components/PatientEdit'
import NewSession from './components/NewSession'
import Presets from './components/Presets'
import { PT_TEST_MEASUREMENT_CONFIG, PT_TEST_HOME_PAGE, PT_TEST_FINAL_PAGE } from './components/physical-therapy-tests/PhysicalTherapyTest'
import { PT_TEST_CONFIG } from './components/physical-therapy-tests/PhysicalTherapyTestFactory'
import NewUser from './components/NewUser'
import ExistingUser from './components/ExistingUser'
import NotFound from './components/NotFound'
import UtilitiesPage from './components/utilities/UtilitiesPage'
import UserGuide from './components/UserGuide'
import Lock from './components/Lock'
import LoadingPage from './components/LoadingPage'
import { LockProvider, useLock } from './LockContext'
import { useAutoLock } from './hooks/useAutoLock'

function HomeIcon() {
  const navigate = useNavigate()
  return (
    <div
      id="home-icon"
      className="nav-icon p-2"
      role="button"
      tabIndex={0}
      aria-label="Home"
      title="Home"
      onClick={() => navigate('/')}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/')}
    >
      <h1>
        <i className="bi bi-house-fill text-primary"></i>
      </h1>
    </div>
  )
}

function LockButton() {
  const { lock } = useLock()
  const navigate = useNavigate()
  const location = useLocation()
  const handleLock = () => {
    const from = location
    lock()
    navigate('/lock', { state: { from }, replace: true })
  }
  return (
    <div
      id="lock-icon"
      className="nav-icon p-2"
      role="button"
      tabIndex={0}
      aria-label="Lock session"
      title="Lock session"
      onClick={handleLock}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLock()}
    >
      <h1>
        <i className="bi bi-lock-fill text-primary"></i>
      </h1>
    </div>
  )
}

function RequireUnlocked({ children }) {
  const { ready, isLocked } = useLock()
  const location = useLocation()
  if (!ready) return <LoadingPage />
  if (isLocked) return <Navigate to="/lock" replace state={{ from: location }} />
  return children
}

function AppContent() {
  const [navIcons, setNavIcons] = useState([])
  const [nav, setNav] = useState(null)
  const { isLocked, lock } = useLock()
  const location = useLocation()
  const navigate = useNavigate()

  useAutoLock({ isLocked, lock })

  return (
    <div id="app">
      <div id="nav-overlay" className={`position-fixed start-0 top-0 ${nav ? "nav-overlay-active" : "pe-none"}`}>
        <div id="nav-icons-container" className="d-flex flex-row align-items-center mt-3">
          <HomeIcon key="home" />
          {!isLocked && location.pathname !== '/lock' && <LockButton key="lock" />}
          {!isLocked && navIcons}
        </div>
        {nav}
      </div>

      <div id="app-content" style={{ opacity: nav ? 0.5 : 1 }}>
        <Routes>
          <Route path="/lock" element={<Lock />} />
          <Route path="/" element={<Home />} />
          <Route path="/patient" element={<RequireUnlocked><PatientPage /></RequireUnlocked>} />
          <Route path="/patient/edit" element={<RequireUnlocked><PatientEdit /></RequireUnlocked>} />
          <Route path="/new-session" element={<RequireUnlocked><NewSession /></RequireUnlocked>} />
          <Route path="/presets" element={<Presets />} />
          <Route path="/utilities" element={<UtilitiesPage />} />
          <Route path="/user-guide" element={<UserGuide />} />
          {PT_TEST_CONFIG.map(({ testKey, component, permittedMeasurements }) => {
            const permittedMeasurementConfigs = permittedMeasurements ? PT_TEST_MEASUREMENT_CONFIG.filter(m => permittedMeasurements.includes(m.stateKey)) : PT_TEST_MEASUREMENT_CONFIG;
            return (
              <>
                <Route path={`/${testKey}/home`} element={<RequireUnlocked>{React.createElement(component, { setNavIcons, setNav, shownMeasurement: PT_TEST_HOME_PAGE, location, navigate })}</RequireUnlocked>} />
                <Route path={`/${testKey}/`} element={<RequireUnlocked>{React.createElement(component, { setNavIcons, setNav, shownMeasurement: PT_TEST_HOME_PAGE, location, navigate })}</RequireUnlocked>} />
                <Route path={`/${testKey}/summary`} element={<RequireUnlocked>{React.createElement(component, { setNavIcons, setNav, shownMeasurement: PT_TEST_FINAL_PAGE, location, navigate })}</RequireUnlocked>} />
                {permittedMeasurementConfigs.map(({ stateKey }) => (
                  <Route
                    key={stateKey}
                    path={`/${testKey}/${stateKey}`}
                    element={<RequireUnlocked>{React.createElement(component, { setNavIcons, setNav, shownMeasurement: stateKey, location, navigate })}</RequireUnlocked>}
                  />
                ))}
              </>
            )
          })}
          <Route path="/new-patient" element={<RequireUnlocked><NewUser /></RequireUnlocked>} />
          <Route path="/existing-patient" element={<RequireUnlocked><ExistingUser /></RequireUnlocked>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <LockProvider>
        <AppContent />
      </LockProvider>
    </HashRouter>
  )
}
