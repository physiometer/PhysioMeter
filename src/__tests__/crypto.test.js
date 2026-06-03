import { describe, it, expect } from 'vitest'
import {
    deriveKey,
    encrypt,
    decrypt,
    randomBytes,
    generateVerifier,
    checkVerifier,
} from '../crypto'

const PASSWORD = 'test-password-123'
const OTHER_PASSWORD = 'different-password'

describe('crypto', () => {
    it('roundtrips encrypt/decrypt of an object', async () => {
        const salt = randomBytes(16)
        const key = await deriveKey(PASSWORD, salt)
        const plain = { uuid: 'abc', name: 'Jane Doe', sessions: [{ id: 1 }] }
        const { iv, ciphertext } = await encrypt(key, plain)
        const out = await decrypt(key, iv, ciphertext)
        expect(out).toEqual(plain)
    })

    it('decrypt with wrong key rejects', async () => {
        const salt = randomBytes(16)
        const goodKey = await deriveKey(PASSWORD, salt)
        const badKey = await deriveKey(OTHER_PASSWORD, salt)
        const { iv, ciphertext } = await encrypt(goodKey, { secret: 'hi' })
        await expect(decrypt(badKey, iv, ciphertext)).rejects.toThrow()
    })

    it('decrypt with wrong salt-derived key rejects', async () => {
        const saltA = randomBytes(16)
        const saltB = randomBytes(16)
        const keyA = await deriveKey(PASSWORD, saltA)
        const keyB = await deriveKey(PASSWORD, saltB)
        const { iv, ciphertext } = await encrypt(keyA, { secret: 'hi' })
        await expect(decrypt(keyB, iv, ciphertext)).rejects.toThrow()
    })

    it('verifier matches with correct key', async () => {
        const salt = randomBytes(16)
        const key = await deriveKey(PASSWORD, salt)
        const { verifierIv, verifierCiphertext } = await generateVerifier(key)
        expect(await checkVerifier(key, verifierIv, verifierCiphertext)).toBe(true)
    })

    it('verifier rejects wrong key', async () => {
        const salt = randomBytes(16)
        const key = await deriveKey(PASSWORD, salt)
        const wrongKey = await deriveKey(OTHER_PASSWORD, salt)
        const { verifierIv, verifierCiphertext } = await generateVerifier(key)
        expect(await checkVerifier(wrongKey, verifierIv, verifierCiphertext)).toBe(false)
    })

    it('produces a unique IV on every encrypt call', async () => {
        const salt = randomBytes(16)
        const key = await deriveKey(PASSWORD, salt)
        const ivs = new Set()
        for (let i = 0; i < 20; i++) {
            const { iv } = await encrypt(key, { i })
            ivs.add(Buffer.from(iv).toString('hex'))
        }
        expect(ivs.size).toBe(20)
    })

    it('randomBytes returns the requested length and varies', () => {
        const a = randomBytes(16)
        const b = randomBytes(16)
        expect(a).toHaveLength(16)
        expect(b).toHaveLength(16)
        expect(Buffer.from(a).toString('hex')).not.toBe(Buffer.from(b).toString('hex'))
    })
})
