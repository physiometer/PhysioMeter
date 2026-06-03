import { test, expect } from '@playwright/test'

const PASSWORD = 'good-password-1'
const WRONG_PASSWORD = 'wrong-password-9'
const PATIENT_NAME = 'Locked Patient'

async function clearStorage(page) {
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

async function setupPassword(page, password) {
  await page.goto('/')
  await page.evaluate(() => { window.location.hash = '#/lock' })
  const startBtn = page.getByRole('button', { name: 'Start New Session' })
  await expect(startBtn).toBeVisible()
  await startBtn.click()
  const inputs = page.locator('input[type="password"]')
  await inputs.nth(0).fill(password)
  await inputs.nth(1).fill(password)
  await page.getByRole('button', { name: 'Set Password' }).click()
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
}

async function createPatient(page, name) {
  await page.evaluate(() => { window.location.hash = '#/new-patient' })
  await page.getByPlaceholder('Enter patient name').fill(name)
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText(/created successfully/)).toBeVisible()
}

test.describe.configure({ mode: 'serial' })

test('lock flow: setup → lock → wrong-password fails → correct unlock succeeds', async ({ page }) => {
  await clearStorage(page)
  await setupPassword(page, PASSWORD)
  await createPatient(page, PATIENT_NAME)

  // Click the lock button in the nav.
  await page.getByRole('button', { name: 'Lock session' }).click()
  await expect(page).toHaveURL(/#\/lock/)
  await expect(page.getByRole('button', { name: 'Unlock Session' })).toBeVisible()

  // Patient name should not be visible while locked.
  await expect(page.locator('body')).not.toContainText(PATIENT_NAME)

  // Wrong password.
  await page.getByRole('button', { name: 'Unlock Session' }).click()
  await page.locator('input[type="password"]').fill(WRONG_PASSWORD)
  await page.getByRole('button', { name: 'Unlock', exact: true }).click()
  await expect(page.getByText('Incorrect password.')).toBeVisible()

  // Correct password.
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: 'Unlock', exact: true }).click()
  // After unlock, returns to where the user pressed Lock (the new-patient page).
  await expect(page).toHaveURL(/#\/new-patient/)

  // Patient is back.
  await page.evaluate(() => { window.location.hash = '#/existing-patient' })
  await expect(page.getByRole('link', { name: PATIENT_NAME })).toBeVisible()
})

test('clear all data: footer link on existing-patient page wipes data and returns to setup', async ({ page }) => {
  await clearStorage(page)
  await setupPassword(page, PASSWORD)
  await createPatient(page, PATIENT_NAME)

  // Visit the existing-patient page and use the Clear all data footer link.
  await page.evaluate(() => { window.location.hash = '#/existing-patient' })
  await expect(page.getByRole('link', { name: PATIENT_NAME })).toBeVisible()

  await page.getByRole('button', { name: 'Clear all data', exact: true }).click()

  const clearBtn = page.getByRole('button', { name: 'Clear All Data', exact: true })
  await expect(clearBtn).toBeDisabled()

  await page.getByPlaceholder('Type DELETE').fill('delete')
  await expect(clearBtn).toBeDisabled()

  await page.getByPlaceholder('Type DELETE').fill('DELETE')
  await expect(clearBtn).toBeEnabled()
  await clearBtn.click()

  // Back to first-time setup.
  await expect(page.getByRole('button', { name: 'Start New Session' })).toBeVisible()
})

test('reset flow: typing DELETE wipes data and returns to setup', async ({ page }) => {
  await clearStorage(page)
  await setupPassword(page, PASSWORD)
  await createPatient(page, PATIENT_NAME)

  await page.getByRole('button', { name: 'Lock session' }).click()
  await expect(page.getByRole('button', { name: 'Unlock Session' })).toBeVisible()

  await page.getByRole('button', { name: /Reset everything/ }).click()
  const resetBtn = page.getByRole('button', { name: 'Delete All Data' })
  await expect(resetBtn).toBeDisabled()

  // Typing anything other than DELETE keeps the button disabled.
  await page.getByPlaceholder('Type DELETE').fill('delete')
  await expect(resetBtn).toBeDisabled()

  await page.getByPlaceholder('Type DELETE').fill('DELETE')
  await expect(resetBtn).toBeEnabled()
  await resetBtn.click()

  // Back to first-time setup.
  await expect(page.getByRole('button', { name: 'Start New Session' })).toBeVisible()

  // Re-setup should not see the prior patient.
  await setupPassword(page, PASSWORD)
  await page.evaluate(() => { window.location.hash = '#/existing-patient' })
  await expect(page.locator('body')).not.toContainText(PATIENT_NAME)
})
