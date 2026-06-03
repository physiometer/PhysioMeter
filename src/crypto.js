// AES-GCM-256 + PBKDF2-SHA256 helpers around window.crypto.subtle.
// No IDB, no React — pure functions only.

const PBKDF2_ITERATIONS = 600_000
const SALT_BYTES = 16
const IV_BYTES = 12
const VERIFIER_PLAINTEXT = 'PHYSIOMETER_OK'

export class LockedError extends Error {
    constructor(message = 'Database is locked') {
        super(message)
        this.name = 'LockedError'
    }
}

export const randomBytes = (n) => {
    const buf = new Uint8Array(n)
    crypto.getRandomValues(buf)
    return buf
}

export const deriveKey = async (password, salt) => {
    const baseKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    )

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )
}

export const encrypt = async (key, plainObj) => {
    const iv = randomBytes(IV_BYTES)
    const plaintext = new TextEncoder().encode(JSON.stringify(plainObj))
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
    return { iv, ciphertext: new Uint8Array(ciphertext) }
}

export const decrypt = async (key, iv, ciphertext) => {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return JSON.parse(new TextDecoder().decode(plaintext))
}

export const generateVerifier = async (key) => {
    const { iv, ciphertext } = await encrypt(key, VERIFIER_PLAINTEXT)
    return { verifierIv: iv, verifierCiphertext: ciphertext }
}

export const checkVerifier = async (key, verifierIv, verifierCiphertext) => {
    try {
        const value = await decrypt(key, verifierIv, verifierCiphertext)
        return value === VERIFIER_PLAINTEXT
    } catch {
        return false
    }
}
