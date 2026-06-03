import { PT_TEST_CONFIG } from './components/physical-therapy-tests/PhysicalTherapyTestFactory'
import {
    deriveKey,
    encrypt,
    decrypt,
    randomBytes,
    generateVerifier,
    checkVerifier,
    LockedError,
} from './crypto'

// NOTE: every time the DB schema is updated, this must be incremented. NOTE THAT THIS WILL DELETE ALL EXISTING USERS IN THE DB.
const CURRENT_DB_VERSION = 5
const DB_NAME = 'PTAppDB'
const META_KEY = 'auth'

let dbPromise = null
let cryptoKey = null

const LOCKED_EVENT = 'physiometer:locked'
const UNLOCKED_EVENT = 'physiometer:unlocked'

const emit = (name) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(name))
    }
}

const openDB = () => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, CURRENT_DB_VERSION)

            request.onupgradeneeded = (event) => {
                const db = event.target.result

                if (db.objectStoreNames.contains('users')) {
                    db.deleteObjectStore('users')
                }
                db.createObjectStore('users', { keyPath: 'uuid' })

                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta', { keyPath: 'id' })
                }
            }

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
            request.onblocked = () =>
                console.warn('Database blocked by another tab')
        })
    }

    return dbPromise
}

const readMeta = async () => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction('meta', 'readonly')
        const store = tx.objectStore('meta')
        const req = store.get(META_KEY)
        req.onsuccess = () => resolve(req.result || null)
        req.onerror = (e) => reject(e.target.error)
    })
}

const writeMeta = async (record) => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction('meta', 'readwrite')
        const store = tx.objectStore('meta')
        const req = store.put(record)
        req.onsuccess = () => resolve()
        req.onerror = (e) => reject(e.target.error)
    })
}

// Schema for patient (encrypted before persisting):
// Persisted row: { uuid, iv: Uint8Array, ciphertext: Uint8Array }
// Decrypted body:
// {
//     uuid: string,
//     name: string,              // required
//     dateOfBirth: string|null,  // optional, ISO date string (YYYY-MM-DD)
//     sex: string|null,          // optional, 'Male' or 'Female'
//     createdAt: string,         // ISO 8601 timestamp
//     sessions: [
//         {
//             uuid: string,
//             sessionTimestamp: string,  // ISO 8601, user-selectable (defaults to creation time)
//             createdAt: string,         // ISO 8601
//             testKey: string,           // e.g. 'annualMobilityAssessment' or 'measurements'
//             testName: string,          // e.g. 'Annual Mobility Assessment'
//             lastModified: string,      // ISO 8601
//             lastSaved: string|null,    // ISO 8601, null until manually saved
//             data: {
//                 formState: object,
//                 validations: object,
//                 disabledValues: object
//             }
//         }
//     ]
// }

const requireKey = () => {
    if (!cryptoKey) throw new LockedError()
    return cryptoKey
}

const encryptUser = async (user) => {
    const key = requireKey()
    const { uuid, ...body } = user
    const { iv, ciphertext } = await encrypt(key, { uuid, ...body })
    return { uuid, iv, ciphertext }
}

const decryptUser = async (row) => {
    if (!row) return null
    const key = requireKey()
    return decrypt(key, row.iv, row.ciphertext)
}

const hasKey = () => cryptoKey !== null

const clearKey = () => {
    cryptoKey = null
    emit(LOCKED_EVENT)
}

const isInitialized = async () => {
    const meta = await readMeta()
    return !!meta
}

const setupPassword = async (password) => {
    if (await isInitialized()) {
        throw new Error('Password already set; use unlock() instead')
    }
    const salt = randomBytes(16)
    const key = await deriveKey(password, salt)
    const { verifierIv, verifierCiphertext } = await generateVerifier(key)
    await writeMeta({ id: META_KEY, salt, verifierIv, verifierCiphertext })
    cryptoKey = key
    emit(UNLOCKED_EVENT)
}

const unlock = async (password) => {
    const meta = await readMeta()
    if (!meta) throw new Error('Not initialized')
    const key = await deriveKey(password, meta.salt)
    const ok = await checkVerifier(key, meta.verifierIv, meta.verifierCiphertext)
    if (!ok) return false
    cryptoKey = key
    emit(UNLOCKED_EVENT)
    return true
}

const wipeEverything = async () => {
    cryptoKey = null
    if (dbPromise) {
        try {
            const db = await dbPromise
            db.close()
        } catch {
            // ignore
        }
        dbPromise = null
    }
    await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_NAME)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
        req.onblocked = () => resolve() // best-effort; reload typically frees blockers
    })
    emit(LOCKED_EVENT)
}

const getUserRow = async (uuid) => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readonly')
        const store = tx.objectStore('users')
        const req = store.get(uuid)
        req.onsuccess = () => resolve(req.result || null)
        req.onerror = (e) => reject(e.target.error)
    })
}

const putUser = async (user) => {
    const row = await encryptUser(user)
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readwrite')
        const store = tx.objectStore('users')
        const req = store.put(row)
        req.onsuccess = () => resolve()
        req.onerror = (e) => reject(e.target.error)
    })
}

const getUser = async (uuid) => {
    requireKey()
    const row = await getUserRow(uuid)
    return decryptUser(row)
}

const getCurrentUser = async () => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1])
    const uuid = urlParams.get('uuid')
    if (!uuid) return null
    return getUser(uuid)
}

const getCurrentSessionUUID = () => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1])
    return urlParams.get('sessionUUID')
}

const getAllUsers = async () => {
    requireKey()
    const db = await openDB()
    const rows = await new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readonly')
        const store = tx.objectStore('users')
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = (e) => reject(e.target.error)
    })
    return Promise.all(rows.map(decryptUser))
}

const createDBUser = async (name, uuid, { dateOfBirth, sex } = {}) => {
    requireKey()
    const newUser = {
        uuid,
        name,
        dateOfBirth: dateOfBirth || null,
        sex: sex || null,
        createdAt: new Date().toISOString(),
        sessions: [],
    }
    await putUser(newUser)
    return newUser
}

const updatePatient = async (uuid, updates) => {
    requireKey()
    const patient = await getUser(uuid)
    if (!patient) throw new Error(`Patient with uuid ${uuid} not found`)

    if (updates.name !== undefined) patient.name = updates.name
    if (updates.dateOfBirth !== undefined) patient.dateOfBirth = updates.dateOfBirth
    if (updates.sex !== undefined) patient.sex = updates.sex

    await putUser(patient)
    return patient
}

const deleteUser = async (uuid) => {
    requireKey()
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readwrite')
        const store = tx.objectStore('users')
        const req = store.delete(uuid)
        req.onsuccess = () => resolve()
        req.onerror = (e) => reject(e.target.error)
    })
}

const createSession = async (patientUUID, testKey, sessionTimestamp) => {
    requireKey()
    const config = PT_TEST_CONFIG.find(c => c.testKey === testKey)
    if (!config) throw new Error(`Invalid test key: ${testKey}`)

    const patient = await getUser(patientUUID)
    if (!patient) throw new Error(`Patient with uuid ${patientUUID} not found`)

    const sessionUUID = crypto.randomUUID()
    const now = new Date().toISOString()

    patient.sessions.push({
        uuid: sessionUUID,
        sessionTimestamp: sessionTimestamp || now,
        createdAt: now,
        testKey: config.testKey,
        testName: config.defaultTestName,
        lastModified: now,
        lastSaved: null,
        data: {
            formState: {},
            validations: {},
            disabledValues: {},
        },
    })

    await putUser(patient)
    return sessionUUID
}

const deleteSession = async (patientUUID, sessionUUID) => {
    requireKey()
    const patient = await getUser(patientUUID)
    if (!patient) throw new Error(`Patient with uuid ${patientUUID} not found`)

    patient.sessions = patient.sessions.filter(s => s.uuid !== sessionUUID)
    await putUser(patient)
    return patient
}

const saveSessionData = async (patientUUID, sessionUUID, { formState, validations, disabledValues, markSaved = false }) => {
    requireKey()
    const patient = await getUser(patientUUID)
    if (!patient) throw new Error(`Patient with uuid ${patientUUID} not found`)

    const session = patient.sessions.find(s => s.uuid === sessionUUID)
    if (!session) throw new Error(`Session with uuid ${sessionUUID} not found`)

    session.data = {
        formState: JSON.parse(JSON.stringify(formState)),
        validations: JSON.parse(JSON.stringify(validations)),
        disabledValues: JSON.parse(JSON.stringify(disabledValues)),
    }

    const nowISO = new Date().toISOString()
    session.lastModified = nowISO
    if (markSaved) session.lastSaved = nowISO

    await putUser(patient)
    return session
}

export {
    LockedError,
    LOCKED_EVENT,
    UNLOCKED_EVENT,
    hasKey,
    clearKey,
    isInitialized,
    setupPassword,
    unlock,
    wipeEverything,
    getCurrentUser,
    getCurrentSessionUUID,
    getAllUsers,
    createDBUser,
    updatePatient,
    deleteUser,
    createSession,
    deleteSession,
    saveSessionData,
}
