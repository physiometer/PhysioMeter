import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
    hasKey,
    clearKey,
    isInitialized as dbIsInitialized,
    setupPassword as dbSetupPassword,
    unlock as dbUnlock,
    wipeEverything as dbWipeEverything,
    LOCKED_EVENT,
    UNLOCKED_EVENT,
} from './DB'

const LockContext = createContext(null)

export function LockProvider({ children }) {
    const [isLocked, setIsLocked] = useState(!hasKey())
    const [isInitialized, setIsInitialized] = useState(null) // null = loading
    const [ready, setReady] = useState(false)

    const refreshInitialized = useCallback(async () => {
        const init = await dbIsInitialized()
        setIsInitialized(init)
        setReady(true)
    }, [])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refreshInitialized()
    }, [refreshInitialized])

    useEffect(() => {
        const onLocked = () => setIsLocked(true)
        const onUnlocked = () => setIsLocked(false)
        window.addEventListener(LOCKED_EVENT, onLocked)
        window.addEventListener(UNLOCKED_EVENT, onUnlocked)
        return () => {
            window.removeEventListener(LOCKED_EVENT, onLocked)
            window.removeEventListener(UNLOCKED_EVENT, onUnlocked)
        }
    }, [])

    const setupPassword = useCallback(async (password) => {
        await dbSetupPassword(password)
        setIsInitialized(true)
        setIsLocked(false)
    }, [])

    const unlock = useCallback(async (password) => {
        const ok = await dbUnlock(password)
        if (ok) setIsLocked(false)
        return ok
    }, [])

    const lock = useCallback(() => {
        clearKey()
        setIsLocked(true)
    }, [])

    const wipeEverything = useCallback(async () => {
        await dbWipeEverything()
        setIsInitialized(false)
        setIsLocked(true)
    }, [])

    return (
        <LockContext.Provider value={{
            ready,
            isLocked,
            isInitialized,
            setupPassword,
            unlock,
            lock,
            wipeEverything,
        }}>
            {children}
        </LockContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLock = () => {
    const ctx = useContext(LockContext)
    if (!ctx) throw new Error('useLock must be used within a LockProvider')
    return ctx
}
