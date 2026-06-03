// Systematic interpretation-coverage e2e: for each AMA-preset measurement,
// drive the UI with values that hit the Green / Yellow / Red SD-band zones and
// the documented adverse-event flags (fall risk, frailty, multi-fall).
//
// The spec walks one full AMA session per "patient profile". A profile is a
// (sex, DOB, vitals) tuple plus a set of measurement inputs designed to land in
// specific zones for the documented age bracket (70-79 for the female profile,
// 70-79 for the male profile). Inputs are computed from thresholds.yaml's
// mean/SD values so they're tightly bracketed inside the target zone.
//
// We assert on rendered text in the inline interpretation block at the bottom
// of the measurement page (and where useful, on the AMA summary page after the
// session is finished). Every assertion encodes the *spec* value derived from
// thresholds.yaml + interpretations.yaml, not the engine's observed output.
// If a future change makes the rendered output diverge from the spec, the test
// fails — surface the bug; do not relax the assertion. Track any such
// divergence in THRESHOLDS_DISCREPANCIES.md.

import { test, expect } from '@playwright/test'
import {
    SESSION_PASSWORD,
    clearStorage,
    setupPassword,
    createPatient,
    startAMASession,
    clickNext,
    fillTrials,
    fillSingleValue,
    uncheckAllDisabledCases,
    dobForAge,
} from './helpers/session.js'

test.describe.configure({ mode: 'serial' })

// Speed in m/s -> stopwatch time in seconds for the 5-meter walking tests.
const tForSpeed = (mps) => (5 / mps).toFixed(2)

// =======================================================================
// Profile builder. One profile = one full AMA session. We pass a "values"
// map keyed by measurement so each profile can override inputs per-zone.
// =======================================================================

const VITALS_HEALTHY = { bp: '120/80', pulse: '72', spo2: '98' }
const VITALS_INELIGIBLE = { bp: '120/80', pulse: '110', spo2: '98' }

async function fillVitals(page, vitals) {
    const inputs = page.locator('.measurement-input')
    await inputs.nth(0).fill(vitals.bp)
    await inputs.nth(0).blur()
    await inputs.nth(1).fill(String(vitals.pulse))
    await inputs.nth(1).blur()
    await inputs.nth(2).fill(String(vitals.spo2))
    await inputs.nth(2).blur()
}

async function selectAssistiveDevice(page, label) {
    await expect(page.getByRole('heading', { level: 1, name: /Assistive Device/ })).toBeVisible()
    await page.getByLabel(label, { exact: true }).first().check()
}

// Walks the standard AMA measurement order, filling only the inputs requested.
// `inputs` keys: vitals, uws, fws, sts, device, fsst, mfsst, tug, tugCog.
// `checkpoints` is a map of stage -> async (page) => void that runs after
// the page for that stage has been filled (but before clickNext).
async function runAMASession(page, patientName, profile) {
    const { vitals, uws, fws, sts, device, fsst, mfsst, tug, tugCog, checkpoints = {} } = profile

    await startAMASession(page, patientName)

    // --- Vital Signs ---
    await clickNext(page)
    await expect(page.getByRole('heading', { level: 1, name: /Vital Signs/ })).toBeVisible()
    await fillVitals(page, vitals)
    if (checkpoints.vitals) await checkpoints.vitals(page)

    // --- 5m UWS ---
    await clickNext(page)
    if (vitals.pulse > 100 || vitals.spo2 < 90) {
        // Ineligibility cascades to a default-checked disabled-case on every
        // downstream measurement; uncheck so we can still type values when the
        // profile asks us to.
        await uncheckAllDisabledCases(page)
    }
    await expect(page.getByRole('heading', { level: 1, name: /5 Meter Usual Walking Speed/ })).toBeVisible()
    if (uws) await fillTrials(page, uws)
    if (checkpoints.uws) await checkpoints.uws(page)

    // --- 5m FWS ---
    await clickNext(page)
    if (vitals.pulse > 100 || vitals.spo2 < 90) await uncheckAllDisabledCases(page)
    await expect(page.getByRole('heading', { level: 1, name: /5 Meter Fast Walking Speed/ })).toBeVisible()
    if (fws) await fillTrials(page, fws)
    if (checkpoints.fws) await checkpoints.fws(page)

    // --- 30STS ---
    await clickNext(page)
    if (vitals.pulse > 100 || vitals.spo2 < 90) await uncheckAllDisabledCases(page)
    await expect(page.getByRole('heading', { level: 1, name: /30 Second Sit to Stand/ })).toBeVisible()
    if (sts) await fillSingleValue(page, sts)
    if (checkpoints.sts) await checkpoints.sts(page)

    // --- Assistive Device ---
    await clickNext(page)
    await selectAssistiveDevice(page, device || 'None')

    // --- FSST ---
    await clickNext(page)
    if (vitals.pulse > 100 || vitals.spo2 < 90) await uncheckAllDisabledCases(page)
    if (device && device !== 'None' && device !== 'Straight Cane') {
        // FSST disabled because of device recommendation; just advance.
    } else {
        await expect(page.getByRole('heading', { level: 1, name: /^Four Square Step Test/ })).toBeVisible()
        if (fsst) await fillTrials(page, fsst)
        if (checkpoints.fsst) await checkpoints.fsst(page)
    }

    // --- Modified FSST ---
    await clickNext(page)
    if (vitals.pulse > 100 || vitals.spo2 < 90) await uncheckAllDisabledCases(page)
    // The Modified FSST page is only meaningfully editable when device === 'Other'.
    // When device is None/Cane, the page renders but inputs are disabled. We still
    // want to assert that the page is reachable; only fill values when the device
    // makes it editable.
    const mfsstHeading = page.getByRole('heading', { level: 1, name: /Modified Four Square Step Test/ })
    if (await mfsstHeading.isVisible().catch(() => false)) {
        if (mfsst) {
            if (device !== 'Other') await uncheckAllDisabledCases(page)
            await fillTrials(page, mfsst)
        }
        if (checkpoints.mfsst) await checkpoints.mfsst(page)
        await clickNext(page)
    }

    // --- TUG ---
    if (vitals.pulse > 100 || vitals.spo2 < 90) await uncheckAllDisabledCases(page)
    await expect(page.getByRole('heading', { level: 1, name: /^Timed Up and Go(?! Cognitive)/ })).toBeVisible()
    if (tug) await fillTrials(page, tug)
    if (checkpoints.tug) await checkpoints.tug(page)

    // --- TUG-Cognitive ---
    await clickNext(page)
    if (vitals.pulse > 100 || vitals.spo2 < 90) await uncheckAllDisabledCases(page)
    await expect(page.getByRole('heading', { level: 1, name: /Timed Up and Go Cognitive/ })).toBeVisible()
    if (tugCog) {
        const inputs = page.locator('.measurement-input')
        await inputs.nth(0).fill(String(tugCog.time))
        await inputs.nth(0).blur()
        await inputs.nth(1).fill(String(tugCog.errors ?? '0'))
        await inputs.nth(1).blur()
    }
    if (checkpoints.tugCog) await checkpoints.tugCog(page)

    await clickNext(page)
    await expect(page).toHaveURL(/\/summary/)
    await page.waitForTimeout(400)
}

// Assert that the named measurement's interpretation block on the current
// (still-on-form) page contains every expected substring.
async function expectInterpretationContains(page, ...needles) {
    // The interpretation block has class `mt-3 px-3` and appears at the bottom
    // of the measurement form. We just match against the page body but be careful
    // when looking for zone text since the citation link is the same on every page.
    const body = page.locator('body')
    for (const needle of needles) {
        await expect(body).toContainText(needle)
    }
}

async function expectInterpretationNotContains(page, ...needles) {
    const body = page.locator('body')
    for (const needle of needles) {
        await expect(body).not.toContainText(needle)
    }
}

// =======================================================================
// Test suites. Each describe-block sets up a fresh patient and walks the
// session, asserting expected zone text mid-flow via checkpoints.
// =======================================================================

const FEMALE_75 = { name: 'F75 Test', dob: dobForAge(75), sex: 'Female' }
const MALE_75 = { name: 'M75 Test', dob: dobForAge(75), sex: 'Male' }

// 5m UWS — Female 70-79: mean=1.12, sd=0.20. Yellow boundary=1.12, Red boundary=0.92.
// 5m FWS — Female 70-79: mean=1.52, sd=0.33. Yellow boundary=1.52, Red boundary=1.19.
// FSST   — Female 70-79: mean=10.9, sd=3.6. Yellow boundary=10.9, Red boundary=14.5.
// TUG    — Female 70-79: mean=9.2,  sd=2.7. Yellow boundary=9.2, Red boundary=11.9.
// TUG-C  — Female 70-79: mean=12.9, sd=5.0. Yellow boundary=12.9, Red boundary=17.9.
// 30STS  — Female 70-79: mean=11.6, sd=5.3. Yellow boundary=11.6, Red boundary=6.3.

// 5m UWS — Male 70-79: mean=1.18, sd=0.20. Yellow=1.18, Red=0.98.
// 5m FWS — Male 70-79: mean=1.58, sd=0.51. Yellow=1.58, Red=1.07.
// FSST   — Male 70-79: mean=10.9, sd=4.2. Yellow=10.9, Red=15.1. (red boundary > 15 fall trigger!)
// TUG    — Male 70-79: mean=9.2,  sd=2.7. Yellow=9.2, Red=11.9.
// TUG-C  — Male 70-79: mean=12.9, sd=5.0. Yellow=12.9, Red=17.9.
// 30STS  — Male 70-79: mean=14.0, sd=5.8. Yellow=14, Red=8.2.

// =======================================================================
// Vital Signs: eligibility/ineligibility coverage.
// =======================================================================

test('Vital Signs: healthy values render "eligible" messages (Female 75)', async ({ page }) => {
    test.setTimeout(60_000)
    await clearStorage(page)
    await setupPassword(page)
    await createPatient(page, FEMALE_75)

    await startAMASession(page, FEMALE_75.name)
    await clickNext(page)
    await expect(page.getByRole('heading', { level: 1, name: /Vital Signs/ })).toBeVisible()
    await fillVitals(page, VITALS_HEALTHY)

    await expect(page.getByText('This patient is eligible for physical activity.')).toBeVisible()
    await expect(page.getByText('This patient is eligible for the Annual Mobility Assessment.')).toBeVisible()
})

test('Vital Signs: ineligible (high pulse) gates AMA message (Female 75)', async ({ page }) => {
    test.setTimeout(60_000)
    await clearStorage(page)
    await setupPassword(page)
    await createPatient(page, FEMALE_75)

    await startAMASession(page, FEMALE_75.name)
    await clickNext(page)
    await fillVitals(page, VITALS_INELIGIBLE)

    await expect(page.getByText('This patient is ineligible for physical activity.')).toBeVisible()
    await expect(page.getByText(/may not tolerate the intensity of functional testing/)).toBeVisible()
    // The eligibility-affirmative AMA message must not appear.
    await expectInterpretationNotContains(page, 'This patient is eligible for the Annual Mobility Assessment.')
})

test('Vital Signs: ineligible (low SpO2) renders ineligible', async ({ page }) => {
    test.setTimeout(60_000)
    await clearStorage(page)
    await setupPassword(page)
    await createPatient(page, FEMALE_75)

    await startAMASession(page, FEMALE_75.name)
    await clickNext(page)
    await fillVitals(page, { bp: '120/80', pulse: '72', spo2: '85' })
    await expect(page.getByText('This patient is ineligible for physical activity.')).toBeVisible()
})

test('Vital Signs: ineligible (high systolic BP) renders ineligible', async ({ page }) => {
    test.setTimeout(60_000)
    await clearStorage(page)
    await setupPassword(page)
    await createPatient(page, FEMALE_75)

    await startAMASession(page, FEMALE_75.name)
    await clickNext(page)
    await fillVitals(page, { bp: '185/80', pulse: '72', spo2: '98' })
    await expect(page.getByText('This patient is ineligible for physical activity.')).toBeVisible()
})

// =======================================================================
// 5m Usual Walking Speed (UWS): four zones x adverse flags for Female 75.
// =======================================================================

test.describe('5m Usual Walking Speed zones (Female 75, mean=1.12, sd=0.20)', () => {
    test('Green zone: speed >= 1.12 m/s (time 3.85s -> 1.30 m/s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            uws: [tForSpeed(1.30), tForSpeed(1.30)],
            checkpoints: {
                uws: async p => {
                    await expectInterpretationContains(p, 'Green Zone')
                    await expectInterpretationNotContains(p, 'Fall Risk', 'Frailty Risk')
                },
            },
        })
    })

    test('Yellow zone: speed in [0.92, 1.12) m/s (time 5.00s -> 1.00 m/s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            uws: ['5.00', '5.00'],
            checkpoints: {
                uws: async p => {
                    await expectInterpretationContains(p, 'Yellow Zone')
                    await expectInterpretationNotContains(p, 'Fall Risk', 'Frailty Risk')
                },
            },
        })
    })

    test('Red zone (no fall flag): 0.76 < speed < 0.92 m/s (time ~5.88s -> 0.85 m/s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            uws: ['5.88', '5.88'],
            checkpoints: {
                uws: async p => {
                    await expectInterpretationContains(p, 'Red Zone')
                    await expectInterpretationNotContains(p, 'Fall Risk', 'Frailty Risk')
                },
            },
        })
    })

    test('Fall Risk flag: 0.63 <= speed < 0.76 (time 7.14s -> 0.70 m/s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            uws: ['7.14', '7.14'],
            checkpoints: {
                uws: async p => {
                    await expectInterpretationContains(p, 'Fall Risk, <0.76m/sec', 'Red Zone')
                    await expectInterpretationNotContains(p, 'Frailty Risk')
                },
            },
        })
    })

    test('Frailty Risk flag: speed < 0.63 (time 10.00s -> 0.50 m/s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            uws: ['10.00', '10.00'],
            checkpoints: {
                uws: async p => {
                    await expectInterpretationContains(p, 'Fall Risk, <0.76m/sec', 'Frailty Risk, <0.63 m/sec')
                },
            },
        })
    })
})

// =======================================================================
// 5m Fast Walking Speed (FWS): Female 75. Yellow=1.52, Red=1.19, fall<1.10.
// =======================================================================

test.describe('5m Fast Walking Speed zones (Female 75, mean=1.52, sd=0.33)', () => {
    test('Green zone: speed >= 1.52 (time 3.00s -> 1.67 m/s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            fws: ['3.00', '3.00'],
            checkpoints: {
                fws: async p => {
                    await expectInterpretationContains(p, 'Green Zone')
                    await expectInterpretationNotContains(p, 'Fall Risk, <1.10 m/sec')
                },
            },
        })
    })

    test('Yellow zone: 1.19 <= speed < 1.52 (time 3.85s -> 1.30 m/s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            fws: ['3.85', '3.85'],
            checkpoints: {
                fws: async p => {
                    await expectInterpretationContains(p, 'Yellow Zone')
                    await expectInterpretationNotContains(p, 'Fall Risk, <1.10 m/sec')
                },
            },
        })
    })

    test('Red zone (no fall): 1.10 <= speed < 1.19 (time 4.35s -> 1.15 m/s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            fws: ['4.35', '4.35'],
            checkpoints: {
                fws: async p => {
                    await expectInterpretationContains(p, 'Red Zone')
                    await expectInterpretationNotContains(p, 'Fall Risk, <1.10 m/sec')
                },
            },
        })
    })

    test('Fall Risk: speed < 1.10 (time 5.00s -> 1.00 m/s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            fws: ['5.00', '5.00'],
            checkpoints: {
                fws: async p => {
                    await expectInterpretationContains(p, 'Fall Risk, <1.10 m/sec', 'Red Zone')
                },
            },
        })
    })
})

// =======================================================================
// FSST: Female 75. Yellow=10.9, Red=14.5, multi-fall at >=15.
// =======================================================================

test.describe('FSST zones (Female 75, mean=10.9, sd=3.6)', () => {
    test('Green zone: time <= 10.9s (9.0s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            fsst: ['9.0', '9.0'],
            checkpoints: {
                fsst: async p => {
                    await expectInterpretationContains(p, 'Green Zone')
                    await expectInterpretationNotContains(p, 'Multiple Fall risk')
                },
            },
        })
    })

    test('Yellow zone: 10.9 < time <= 14.5 (12.0s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            fsst: ['12.0', '12.0'],
            checkpoints: {
                fsst: async p => {
                    await expectInterpretationContains(p, 'Yellow Zone')
                    await expectInterpretationNotContains(p, 'Multiple Fall risk')
                },
            },
        })
    })

    test('Red zone (no multi-fall): 14.5 < time < 15.0 (14.8s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            fsst: ['14.8', '14.8'],
            checkpoints: {
                fsst: async p => {
                    await expectInterpretationContains(p, 'Red Zone')
                    await expectInterpretationNotContains(p, 'Multiple Fall risk')
                },
            },
        })
    })

    test('Multi-fall risk: time >= 15 (16.0s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            fsst: ['16.0', '16.0'],
            checkpoints: {
                fsst: async p => {
                    await expectInterpretationContains(p, 'Multiple Fall risk >=15', 'Red Zone')
                },
            },
        })
    })
})

// =======================================================================
// 30STS: Female 75. mean=11.6, sd=5.3 → yellow=11.6, red=6.3. No fall-risk cut.
// =======================================================================

test.describe('30STS zones (Female 75, mean=11.6, sd=5.3) — lookup-only', () => {
    test('Green zone: count >= 12 (14)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            sts: '14',
            checkpoints: {
                sts: async p => { await expectInterpretationContains(p, 'Green Zone') },
            },
        })
    })

    test('Yellow zone: 6.3 <= count < 11.6 (8)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            sts: '8',
            checkpoints: {
                sts: async p => { await expectInterpretationContains(p, 'Yellow Zone') },
            },
        })
    })

    test('Red zone: count < 6.3 (4)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            sts: '4',
            checkpoints: {
                sts: async p => { await expectInterpretationContains(p, 'Red Zone') },
            },
        })
    })
})

// =======================================================================
// TUG: Female 75. mean=9.2, sd=2.7 → yellow=9.2, red=11.9. fall>12.0, frailty>=17.8.
// =======================================================================

test.describe('TUG zones (Female 75, mean=9.2, sd=2.7)', () => {
    test('Green zone: time <= 9.2 (8.0s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            tug: ['8.0', '8.0'],
            checkpoints: {
                tug: async p => {
                    await expectInterpretationContains(p, 'Green Zone')
                    await expectInterpretationNotContains(p, 'Fall risk >12.0', 'Frailty')
                },
            },
        })
    })

    test('Yellow zone (no fall): 9.2 < time <= 11.9 (10.0s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            tug: ['10.0', '10.0'],
            checkpoints: {
                tug: async p => {
                    await expectInterpretationContains(p, 'Yellow Zone')
                    await expectInterpretationNotContains(p, 'Fall risk >12.0', 'Frailty')
                },
            },
        })
    })

    test('Red zone + fall risk (Female): time > 12.0 (13.0s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            tug: ['13.0', '13.0'],
            checkpoints: {
                tug: async p => {
                    await expectInterpretationContains(p, 'Red Zone', 'Fall risk >12.0 sec (Sn .74, Sp .31)')
                    await expectInterpretationNotContains(p, 'Frailty')
                },
            },
        })
    })

    test('Frailty + fall: time >= 17.8 (18.0s, Female)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            tug: ['18.0', '18.0'],
            checkpoints: {
                tug: async p => {
                    await expectInterpretationContains(p, 'Fall risk >12.0', 'Frailty >=17.8')
                },
            },
        })
    })

    test('Male-specific fall risk wording: Male profile, time 13.0s', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, MALE_75)
        await runAMASession(page, MALE_75.name, {
            vitals: VITALS_HEALTHY,
            tug: ['13.0', '13.0'],
            checkpoints: {
                tug: async p => {
                    await expectInterpretationContains(p, 'Fall risk >12.0 sec (Sn .74, Sp .52)')
                },
            },
        })
    })
})

// =======================================================================
// TUG-Cognitive: Female 75. mean=12.9, sd=5.0 → yellow=12.9, red=17.9. fall>11.
// =======================================================================

test.describe('TUG-Cognitive zones (Female 75, mean=12.9, sd=5.0)', () => {
    test('Green zone, no fall flag: time <= 11 (10.0s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            tugCog: { time: '10.0', errors: 0 },
            checkpoints: {
                tugCog: async p => {
                    await expectInterpretationContains(p, 'Green Zone')
                    await expectInterpretationNotContains(p, 'Fall risk >11')
                },
            },
        })
    })

    test('Green zone + fall flag: 11 < time <= 12.9 (12.0s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            tugCog: { time: '12.0', errors: 0 },
            checkpoints: {
                tugCog: async p => {
                    await expectInterpretationContains(p, 'Green Zone', 'Fall risk >11 sec')
                },
            },
        })
    })

    test('Yellow zone + fall flag: 12.9 < time <= 17.9 (15.0s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            tugCog: { time: '15.0', errors: 1 },
            checkpoints: {
                tugCog: async p => {
                    await expectInterpretationContains(p, 'Yellow Zone', 'Fall risk >11 sec')
                },
            },
        })
    })

    test('Red zone + fall flag: time > 17.9 (20.0s)', async ({ page }) => {
        test.setTimeout(60_000)
        await clearStorage(page)
        await setupPassword(page)
        await createPatient(page, FEMALE_75)
        await runAMASession(page, FEMALE_75.name, {
            vitals: VITALS_HEALTHY,
            tugCog: { time: '20.0', errors: 2 },
            checkpoints: {
                tugCog: async p => {
                    await expectInterpretationContains(p, 'Red Zone', 'Fall risk >11 sec')
                },
            },
        })
    })
})

// =======================================================================
// Modified FSST: info-severity message must render whenever a value is present.
// Requires assistive device = "Other" so the page is editable.
// =======================================================================

test('Modified FSST: info message renders when value is present (device=Other)', async ({ page }) => {
    test.setTimeout(60_000)
    await clearStorage(page)
    await setupPassword(page)
    await createPatient(page, FEMALE_75)

    await runAMASession(page, FEMALE_75.name, {
        vitals: VITALS_HEALTHY,
        device: 'Other',
        mfsst: ['10.0', '10.0'],
        checkpoints: {
            mfsst: async p => {
                await expectInterpretationContains(p, 'no published normative thresholds')
            },
        },
    })
})

// =======================================================================
// Cross-sex / cross-bracket sanity: Male 75, Green-zone UWS to confirm the
// engine looks up the right table column.
// =======================================================================

test('Cross-sex: Male 75 UWS green zone uses Male 70-79 mean (1.18)', async ({ page }) => {
    test.setTimeout(60_000)
    await clearStorage(page)
    await setupPassword(page)
    await createPatient(page, MALE_75)

    await runAMASession(page, MALE_75.name, {
        vitals: VITALS_HEALTHY,
        uws: [tForSpeed(1.30), tForSpeed(1.30)],
        checkpoints: {
            uws: async p => {
                // Reference Mean line should print the male 70-79 value (1.18).
                await expectInterpretationContains(p, 'Green Zone', 'Reference Mean 1.18')
            },
        },
    })
})
