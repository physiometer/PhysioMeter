import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useLock } from '../LockContext'
import Title from './form/Title'
import Text from './form/Text'
import Submit from './form/Submit'
import LoadingPage from './LoadingPage'

const APP_NAME = 'PhysioMeter'
const MIN_PASSWORD_LENGTH = 8

export default function Lock() {
    const { ready, isLocked, isInitialized, setupPassword, unlock, wipeEverything } = useLock()
    const location = useLocation()
    const from = location.state?.from
    const redirectTo = from ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '/'
    const [mode, setMode] = useState(null) // null | 'setup' | 'unlock' | 'reset'
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [resetConfirm, setResetConfirm] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    if (!ready) return <LoadingPage />
    if (!isLocked) return <Navigate to={redirectTo} replace />

    const reset = () => {
        setMode(null)
        setPassword('')
        setConfirmPassword('')
        setResetConfirm('')
        setError('')
    }

    const handleSetup = async () => {
        setError('')
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }
        setBusy(true)
        try {
            await setupPassword(password)
        } catch (e) {
            setError(`Failed to set password: ${e.message || e}`)
        } finally {
            setBusy(false)
        }
    }

    const handleUnlock = async () => {
        setError('')
        setBusy(true)
        try {
            const ok = await unlock(password)
            if (!ok) setError('Incorrect password.')
        } catch (e) {
            setError(`Failed to unlock: ${e.message || e}`)
        } finally {
            setBusy(false)
        }
    }

    const handleReset = async () => {
        setError('')
        setBusy(true)
        try {
            await wipeEverything()
            reset()
        } catch (e) {
            setError(`Failed to reset: ${e.message || e}`)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div id="lock-screen">
            <Title>{APP_NAME}</Title>

            {mode === null && (
                <div className="d-flex flex-column align-items-center">
                    {isInitialized ? (
                        <>
                            <Submit label="Unlock Session" onClick={() => setMode('unlock')} />
                            <button
                                type="button"
                                className="btn btn-link text-danger mt-4"
                                onClick={() => setMode('reset')}
                            >
                                Reset everything (forgot password)
                            </button>
                        </>
                    ) : (
                        <Submit label="Start New Session" onClick={() => setMode('setup')} />
                    )}
                </div>
            )}

            {mode === 'setup' && (
                <div className="d-flex flex-column align-items-center mx-auto" style={{ maxWidth: 500 }}>
                    <h4 className="text-center mb-3">Set a session password (at least {MIN_PASSWORD_LENGTH} characters)</h4>
                    <div className="alert alert-warning text-center" role="alert">
                        If you forget this password, your patient data is permanently
                        unrecoverable. We cannot reset it.
                    </div>
                    <input
                        type="password"
                        className="form-control mb-2"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                    />
                    <input
                        type="password"
                        className="form-control mb-3"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSetup()}
                    />
                    <div className="d-flex gap-2">
                        <button className="btn btn-primary" onClick={handleSetup} disabled={busy}>
                            {busy ? 'Setting...' : 'Set Password'}
                        </button>
                        <button className="btn btn-secondary" onClick={reset} disabled={busy}>
                            Cancel
                        </button>
                    </div>
                    {error && <Text value={error} type="danger" />}
                </div>
            )}

            {mode === 'unlock' && (
                <div className="d-flex flex-column align-items-center mx-auto" style={{ maxWidth: 500 }}>
                    <h4 className="text-center mb-3">Enter session password</h4>
                    <input
                        type="password"
                        className="form-control mb-3"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                        autoFocus
                    />
                    <div className="d-flex gap-2">
                        <button className="btn btn-primary" onClick={handleUnlock} disabled={busy}>
                            {busy ? 'Unlocking...' : 'Unlock'}
                        </button>
                        <button className="btn btn-secondary" onClick={reset} disabled={busy}>
                            Cancel
                        </button>
                    </div>
                    {error && <Text value={error} type="danger" />}
                </div>
            )}

            {mode === 'reset' && (
                <div className="d-flex flex-column align-items-center mx-auto" style={{ maxWidth: 500 }}>
                    <h4 className="text-center mb-3">Reset everything?</h4>
                    <div className="alert alert-danger text-center" role="alert">
                        This will permanently delete <strong>all patient data on this device</strong>. This cannot be undone. Type <code>DELETE</code> to confirm.
                    </div>
                    <input
                        type="text"
                        className="form-control mb-3"
                        placeholder="Type DELETE"
                        value={resetConfirm}
                        onChange={(e) => setResetConfirm(e.target.value)}
                        autoFocus
                    />
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-danger"
                            onClick={handleReset}
                            disabled={busy || resetConfirm !== 'DELETE'}
                        >
                            {busy ? 'Deleting...' : 'Delete All Data'}
                        </button>
                        <button className="btn btn-secondary" onClick={reset} disabled={busy}>
                            Cancel
                        </button>
                    </div>
                    {error && <Text value={error} type="danger" />}
                </div>
            )}
        </div>
    )
}
