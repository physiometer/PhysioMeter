import { useEffect, useRef } from 'react'

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'touchstart', 'click']

export function useAutoLock({ isLocked, lock, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    const timerRef = useRef(null)

    useEffect(() => {
        if (isLocked) {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
            return
        }

        const reset = () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => lock(), timeoutMs)
        }

        reset()
        for (const evt of ACTIVITY_EVENTS) {
            document.addEventListener(evt, reset, { passive: true })
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            for (const evt of ACTIVITY_EVENTS) {
                document.removeEventListener(evt, reset)
            }
        }
    }, [isLocked, lock, timeoutMs])
}
