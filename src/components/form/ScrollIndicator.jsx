import { useEffect, useState } from 'react'

export default function ScrollIndicator() {
    const [show, setShow] = useState(false)

    useEffect(() => {
        const update = () => {
            const hasOverflow = document.documentElement.scrollHeight - 1 > window.innerHeight
            const scrolled = window.scrollY > 50
            setShow(hasOverflow && !scrolled)
        }
        update()
        window.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)
        return () => {
            window.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
        }
    }, [])

    if (!show) return null

    return (
        <svg className="scroll-indicator" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M1.646 6.646a.5.5 0 0 1 .708 0L8 12.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708" />
            <path fillRule="evenodd" d="M1.646 2.646a.5.5 0 0 1 .708 0L8 8.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708" />
        </svg>
    )
}
