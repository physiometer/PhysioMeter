// Golden-path walkthrough that also produces the screenshots for docs/user-guide.md.

import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SHOTS = path.resolve(__dirname, '..', 'docs', 'user-guide-images')

const PATIENT = { name: 'Jane Doe', dob: '1950-06-15', sex: 'Female' }
const SESSION_PASSWORD = 'walkthrough-password-1'

// "At-risk female, age ~75" values so the summary exercises both normal and concern interpretations.
const VITALS = { pulse: '80', bp: '128/82', spo2: '97' }
const TRIALS = {
  usualWalk:  { t1: '4.5', t2: '4.7' },
  fastWalk:   { t1: '3.2', t2: '3.1' },
  sitToStand: { count: '9' },
  fsst:       { t1: '12.5', t2: '13.0' },
  tug:        { t1: '13.8', t2: '14.2' },
  tugCog:     { time: '18.5', errors: '2' },
}

// Viewport-only by default; pass { fullPage: true } for below-the-fold content.
async function shot(page, name, opts = {}) {
  const fullPage = opts.fullPage === true
  if (fullPage) {
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
    await page.waitForFunction(() => window.scrollY === 0)
  }
  await page.screenshot({
    path: path.join(SHOTS, name),
    fullPage: false,
    animations: 'disabled',
    ...opts,
  })
}

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

async function fillSingleValue(page, value) {
  const input = page.locator('.measurement-input').first()
  await input.fill(String(value))
  await input.blur()
}

async function fillTrials(page, trials) {
  const inputs = page.locator('.measurement-input')
  const count = await inputs.count()
  for (let i = 0; i < trials.length && i < count; i++) {
    await inputs.nth(i).fill(String(trials[i]))
    await inputs.nth(i).blur()
  }
}

// Scrolls the first form control near the top so viewport screenshots don't cut off inputs behind long instructions.
async function scrollToInputs(page) {
  await page.evaluate(() => {
    const target = document.querySelector('.measurement-input, .form-check-input')
    if (!target) return
    const top = target.getBoundingClientRect().top + window.scrollY - 120
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
  })
}

async function clickNext(page) {
  await page.getByRole('button', { name: /Next Measurement|Proceed to Measurements|Finish/ }).click()
  await page.waitForTimeout(200)
}

async function expectNoBrokenValues(page) {
  const body = page.locator('body')
  await expect(body).not.toContainText('NaN')
  await expect(body).not.toContainText('Infinity')
  await expect(body).not.toContainText(/\bundefined\b/)
  await expect(body).not.toContainText(/\bnull\b/)
}

function collectPageErrors(page) {
  const errors = []
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  return errors
}

test.describe.configure({ mode: 'serial' })

test('user guide walkthrough: home -> AMA session -> summary', async ({ page }) => {
  test.setTimeout(180_000)

  const pageErrors = collectPageErrors(page)

  await clearStorage(page)

  // 0. Lock screen flow (first-time setup, then lock/unlock/reset previews).
  await page.goto('/')
  await page.evaluate(() => { window.location.hash = '#/lock' })
  await expect(page.getByRole('button', { name: 'Start New Session' })).toBeVisible()
  await shot(page, '00-lock-welcome-first.png')

  await page.getByRole('button', { name: 'Start New Session' }).click()
  await expect(page.getByText(/permanently unrecoverable/)).toBeVisible()
  await shot(page, '00-lock-setup-modal.png')

  const setupInputs = page.locator('input[type="password"]')
  await setupInputs.nth(0).fill(SESSION_PASSWORD)
  await setupInputs.nth(1).fill(SESSION_PASSWORD)
  await page.getByRole('button', { name: 'Set Password' }).click()
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()

  // Demonstrate the lock → returning-welcome → unlock-modal → reset-confirm states.
  await page.getByRole('button', { name: 'Lock session' }).click()
  await expect(page.getByRole('button', { name: 'Unlock Session' })).toBeVisible()
  await shot(page, '00-lock-welcome-returning.png')

  await page.getByRole('button', { name: 'Unlock Session' }).click()
  await expect(page.getByPlaceholder('Password')).toBeVisible()
  await shot(page, '00-lock-unlock-modal.png')
  await page.getByRole('button', { name: 'Cancel' }).click()

  await page.getByRole('button', { name: /Reset everything/ }).click()
  await expect(page.getByPlaceholder('Type DELETE')).toBeVisible()
  await shot(page, '00-lock-reset-confirm.png')
  await page.getByRole('button', { name: 'Cancel' }).click()

  await page.getByRole('button', { name: 'Unlock Session' }).click()
  await page.locator('input[type="password"]').fill(SESSION_PASSWORD)
  await page.getByRole('button', { name: 'Unlock', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'User Guide' })).toBeVisible()
  await shot(page, '01-home.png', { fullPage: true })

  await page.getByRole('link', { name: 'User Guide' }).click()
  await expect(page.getByRole('heading', { name: /PhysioMeter User Guide/ })).toBeVisible()
  await expect(page.locator('img[alt="Home page"]').first()).toBeVisible()
  await expect(page.locator('#user-guide table')).toBeVisible()
  await expect(page.locator('#user-guide table').getByText('Insufficient data')).toBeVisible()
  await shot(page, 'user-guide.png')
  await page.getByRole('link', { name: /Data persistence and privacy/ }).click()
  await expect(page.locator('[id="11-data-persistence-and-privacy"]')).toBeInViewport()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()

  // 2. Create New Patient form
  await page.getByRole('link', { name: 'New Patient' }).click()
  await expect(page.getByRole('heading', { name: 'Create New Patient' })).toBeVisible()
  await shot(page, '02-new-patient-empty.png')

  // 3. Fill patient form
  await page.getByPlaceholder('Enter patient name').fill(PATIENT.name)
  await page.locator('input[type="date"]').fill(PATIENT.dob)
  await page.getByLabel(PATIENT.sex).check()
  await shot(page, '03-new-patient-filled.png')

  // 4. Submit -> success message
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText(/created successfully/)).toBeVisible()
  await shot(page, '04-new-patient-created.png')

  // 5. Existing Patients list
  await page.getByRole('link', { name: 'View Existing Patients' }).click()
  await page.waitForURL('**/existing-patient')
  await expect(page.getByRole('heading', { level: 1, name: 'Existing Patients' })).toBeVisible()
  await expect(page.getByRole('link', { name: PATIENT.name })).toBeVisible()
  await shot(page, '05-existing-patients.png')

  // 6. Patient dashboard (no sessions yet)
  await page.getByRole('link', { name: PATIENT.name }).click()
  await expect(page.getByRole('heading', { name: `Patient: ${PATIENT.name}` })).toBeVisible()
  await shot(page, '06-patient-page-empty.png')

  // 7. New Session page
  await page.getByRole('link', { name: 'New Session' }).click()
  await expect(page.getByRole('heading', { name: /New Session for/ })).toBeVisible()
  await shot(page, '07-new-session.png')

  // 8. Select Annual Mobility Assessment preset + create
  await page.getByLabel('Annual Mobility Assessment').check()
  await shot(page, '08-new-session-ama-selected.png')
  await page.getByRole('button', { name: 'Create Session' }).click()

  // 9. Session home (AMA measurement list)
  await expect(page.getByRole('heading', { level: 1, name: /Annual Mobility Assessment/ })).toBeVisible()
  for (const name of [
    'Vital Signs',
    '5 Meter Usual Walking Speed',
    '5 Meter Fast Walking Speed',
    '30 Second Sit to Stand',
    'Four Square Step Test',
    'Timed Up and Go Cognitive',
  ]) {
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible()
  }
  await shot(page, '09-session-home.png')

  // 10. Proceed into measurements: Vital Signs
  await clickNext(page)
  await expect(page.getByRole('heading', { level: 1, name: /Vital Signs/ })).toBeVisible()
  // Vital Signs field order in YAML: [bloodPressure, restingPulseRate, oxygenSaturation]
  const vitalsInputs = page.locator('.measurement-input')
  await vitalsInputs.nth(0).fill(VITALS.bp)
  await vitalsInputs.nth(0).blur()
  await vitalsInputs.nth(1).fill(VITALS.pulse)
  await vitalsInputs.nth(1).blur()
  await vitalsInputs.nth(2).fill(VITALS.spo2)
  await vitalsInputs.nth(2).blur()
  await expect(page.getByText('This patient is eligible for physical activity.')).toBeVisible()
  await expect(page.getByText('This patient is eligible for the Annual Mobility Assessment.')).toBeVisible()
  await expectNoBrokenValues(page)
  await shot(page, '10-vitals-filled.png', { fullPage: true })

  // 11. 5m Usual Walking Speed
  await clickNext(page)
  await expect(page.getByRole('heading', { level: 1, name: /5 Meter Usual Walking Speed/ })).toBeVisible()
  await fillTrials(page, [TRIALS.usualWalk.t1, TRIALS.usualWalk.t2])
  await expect(page.getByText(/Walking Speed: \d+\.\d+ m\/s/).first()).toBeVisible()
  expect(await page.getByText(/Walking Speed: \d+\.\d+ m\/s/).count()).toBe(2)
  await expectNoBrokenValues(page)
  await scrollToInputs(page)
  await shot(page, '11-usual-walking-speed.png')

  // 12. 5m Fast Walking Speed
  await clickNext(page)
  await expect(page.getByRole('heading', { level: 1, name: /5 Meter Fast Walking Speed/ })).toBeVisible()
  await fillTrials(page, [TRIALS.fastWalk.t1, TRIALS.fastWalk.t2])
  expect(await page.getByText(/Walking Speed: \d+\.\d+ m\/s/).count()).toBe(2)
  await expectNoBrokenValues(page)
  await scrollToInputs(page)
  await shot(page, '12-fast-walking-speed.png')

  // 13. 30-Second Sit to Stand
  await clickNext(page)
  await expect(page.getByRole('heading', { level: 1, name: /30 Second Sit to Stand/ })).toBeVisible()
  await fillSingleValue(page, TRIALS.sitToStand.count)
  await scrollToInputs(page)
  await shot(page, '13-sit-to-stand.png')

  // 14. Assistive Device
  await clickNext(page)
  await expect(page.getByRole('heading', { level: 1, name: /Assistive Device/ })).toBeVisible()
  // Pick "None" so the standard FSST is enabled.
  const none = page.getByLabel('None', { exact: true })
  if (await none.count()) await none.first().check()
  await scrollToInputs(page)
  await shot(page, '14-assistive-device.png')

  // 15. Four Square Step Test
  await clickNext(page)
  await expect(page.getByRole('heading', { level: 1, name: /^Four Square Step Test/ })).toBeVisible()
  await fillTrials(page, [TRIALS.fsst.t1, TRIALS.fsst.t2])
  await scrollToInputs(page)
  await shot(page, '15-fsst.png')

  // 16. Modified FSST is disabled (assistive device is "None") — advance without filling.
  await clickNext(page)
  const modHeading = page.getByRole('heading', { level: 1, name: /Modified Four Square Step Test/ })
  if (await modHeading.isVisible().catch(() => false)) {
    await clickNext(page)
  }

  // 17. Timed Up and Go
  await expect(page.getByRole('heading', { level: 1, name: /^Timed Up and Go(?! Cognitive)/ })).toBeVisible()
  await fillTrials(page, [TRIALS.tug.t1, TRIALS.tug.t2])
  await expect(page.getByText(/Fall risk >12\.0 sec/)).toBeVisible()
  await expect(page.getByText(/Red Zone/)).toBeVisible()
  await expectNoBrokenValues(page)
  await scrollToInputs(page)
  await shot(page, '16-tug.png')

  // 18. TUG Cognitive
  await clickNext(page)
  await expect(page.getByRole('heading', { level: 1, name: /Timed Up and Go Cognitive/ })).toBeVisible()
  const tcInputs = page.locator('.measurement-input')
  await tcInputs.nth(0).fill(TRIALS.tugCog.time)
  await tcInputs.nth(0).blur()
  await tcInputs.nth(1).fill(TRIALS.tugCog.errors)
  await tcInputs.nth(1).blur()
  await scrollToInputs(page)
  await shot(page, '17-tug-cognitive.png')

  // 19. Finish -> summary
  await clickNext(page)
  await expect(page).toHaveURL(/\/summary/)
  // Allow summary interpretations to render.
  await page.waitForTimeout(500)

  await expect(page.getByRole('heading', { name: `Summary (${PATIENT.name})` })).toBeVisible()
  const body = page.locator('body')
  await expect(body).toContainText(PATIENT.name)
  await expect(body).toContainText('1950-06-15')
  await expect(body).toContainText(/7[4-6] years/)
  await expect(body).toContainText('Female')

  for (const label of [
    'Vital Signs',
    '5 Meter Usual Walking Speed',
    '5 Meter Fast Walking Speed',
    '30 Second Sit to Stand',
    'Four Square Step Test',
    'Timed Up and Go (TUG)',
    'Timed Up and Go Cognitive Dual Task',
  ]) {
    await expect(body.getByText(label, { exact: false }).first()).toBeVisible()
  }

  // Modified FSST is skipped when assistive device is "None"; its interpretation
  // legitimately renders "No interpretation available" in that case, so we don't
  // assert its absence across the whole body.
  await expectNoBrokenValues(page)

  await shot(page, '18-summary.png', { fullPage: true })

  // Navigate back to the patient page so we can capture it with a completed session.
  await page.evaluate(() => { window.location.hash = '#/existing-patient' })
  await expect(page.getByRole('heading', { level: 1, name: 'Existing Patients' })).toBeVisible()
  await page.getByRole('link', { name: PATIENT.name }).click()
  await expect(page.getByRole('heading', { name: `Patient: ${PATIENT.name}` })).toBeVisible()
  await shot(page, 'patient-with-session.png')

  expect(pageErrors, `Unexpected page/console errors:\n${pageErrors.join('\n')}`).toEqual([])
})
