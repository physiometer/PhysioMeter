// Shared helpers used by the e2e specs. Kept side-effect free so individual
// specs can compose them without pulling in screenshot machinery.

import { expect } from '@playwright/test'

export const SESSION_PASSWORD = 'walkthrough-password-1'

export async function clearStorage(page) {
    await page.goto('/')
    await page.evaluate(async () => {
        const dbs = await indexedDB.databases?.() ?? []
        await Promise.all(dbs.map(({ name }) => name && new Promise(res => {
            const req = indexedDB.deleteDatabase(name)
            req.onsuccess = req.onerror = req.onblocked = () => res()
        })))
        localStorage.clear()
        sessionStorage.clear()
    })
}

export async function setupPassword(page, password = SESSION_PASSWORD) {
    await page.goto('/')
    await page.evaluate(() => { window.location.hash = '#/lock' })
    await page.getByRole('button', { name: 'Start New Session' }).click()
    const inputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill(password)
    await inputs.nth(1).fill(password)
    await page.getByRole('button', { name: 'Set Password' }).click()
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
}

export async function createPatient(page, { name, dob, sex }) {
    await page.evaluate(() => { window.location.hash = '#/new-patient' })
    await expect(page.getByRole('heading', { name: 'Create New Patient' })).toBeVisible()
    await page.getByPlaceholder('Enter patient name').fill(name)
    await page.locator('input[type="date"]').fill(dob)
    await page.getByLabel(sex, { exact: true }).check()
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByText(/created successfully/)).toBeVisible()
}

export async function startAMASession(page, patientName) {
    await page.evaluate(() => { window.location.hash = '#/existing-patient' })
    await page.getByRole('link', { name: patientName }).click()
    await expect(page.getByRole('heading', { name: `Patient: ${patientName}` })).toBeVisible()
    await page.getByRole('link', { name: 'New Session' }).click()
    await page.getByLabel('Annual Mobility Assessment').check()
    await page.getByRole('button', { name: 'Create Session' }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Annual Mobility Assessment/ })).toBeVisible()
}

export async function clickNext(page) {
    await page.getByRole('button', { name: /Next Measurement|Proceed to Measurements|Finish/ }).click()
    await page.waitForTimeout(150)
}

export async function fillTrials(page, trials) {
    const inputs = page.locator('.measurement-input')
    const count = await inputs.count()
    for (let i = 0; i < trials.length && i < count; i++) {
        await inputs.nth(i).fill(String(trials[i]))
        await inputs.nth(i).blur()
    }
}

export async function fillSingleValue(page, value) {
    const input = page.locator('.measurement-input').first()
    await input.fill(String(value))
    await input.blur()
}

// Uncheck every "default_checked" disabled-case toggle on the current measurement
// page so the inputs become editable (e.g. AMS recommends MFSST vs FSST based on
// the assistive device).
export async function uncheckAllDisabledCases(page) {
    const boxes = page.locator('.disabled-cases input[type="checkbox"]:checked')
    const n = await boxes.count()
    for (let i = 0; i < n; i++) {
        await boxes.nth(0).uncheck()
    }
}

// Pick a DOB string yielding `targetAge` as of *today* in local time.
// Uses January 15th to stay clear of birthday boundaries.
export function dobForAge(targetAge) {
    const today = new Date()
    const year = today.getFullYear() - targetAge
    return `${year}-01-15`
}
