import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLock } from '../LockContext'

export default function ClearAllData() {
    const { wipeEverything } = useLock()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const close = () => {
        setOpen(false)
        setConfirmText('')
        setError('')
    }

    const handleWipe = async () => {
        setBusy(true)
        setError('')
        try {
            await wipeEverything()
            navigate('/lock', { replace: true })
        } catch (e) {
            setError(`Failed to clear data: ${e.message || e}`)
            setBusy(false)
        }
    }

    return (
        <>
            <div className="d-flex justify-content-center my-5">
                <button
                    type="button"
                    className="btn btn-link text-muted small text-decoration-underline"
                    onClick={() => setOpen(true)}
                >
                    Clear all data
                </button>
            </div>

            {open && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ background: 'rgba(0,0,0,0.5)', zIndex: 2000 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="clear-all-title"
                >
                    <div className="bg-white p-4 rounded shadow" style={{ maxWidth: 500, width: '90%' }}>
                        <h4 id="clear-all-title" className="text-center mb-3">Clear all data?</h4>
                        <div className="alert alert-danger text-center" role="alert">
                            This will permanently delete <strong>all patient data on this device</strong>, including every patient, session, and your session password. This cannot be undone. Type <code>DELETE</code> to confirm.
                        </div>
                        <input
                            type="text"
                            className="form-control mb-3"
                            placeholder="Type DELETE"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            autoFocus
                        />
                        <div className="d-flex justify-content-center gap-2">
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleWipe}
                                disabled={busy || confirmText !== 'DELETE'}
                            >
                                {busy ? 'Clearing...' : 'Clear All Data'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={close}
                                disabled={busy}
                            >
                                Cancel
                            </button>
                        </div>
                        {error && <div className="text-danger text-center mt-3">{error}</div>}
                    </div>
                </div>
            )}
        </>
    )
}
