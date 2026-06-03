// Test fixture factory for formState objects.
// Each helper builds a realistic formState matching the shape used by PhysicalTherapyTest.
//
// formState structure:
//   { [stateKey]: [{ label, value, lastModified }] }
//
// Value shapes by measurement type:
//   text/date/radio: string
//   integer/decimal: number (stored as string in some paths, parsed by consumers)
//   fields (vitalSigns): array [bloodPressure, restingPulseRate, oxygenSaturation] (matches YAML field_names order)
//   fields (timedUpAndGoCognitive): array [time, errorCount]
//   stopwatch: array of trial values (numbers or strings)

const ISO = '2025-01-01T00:00:00.000Z'

function entry(label, value) {
    return { label, value, lastModified: ISO }
}

// ==================== Empty / Null States ====================

export const EMPTY_FORM_STATE = {}

export const NULL_MEASUREMENTS_FORM_STATE = {
    dob: [entry('Date of Birth', '')],
    sex: [entry('Sex', '')],
    vitalSigns: [entry('Vital Signs', '')],
    fiveMeterUsualWalkingSpeed: [entry('5MUWS', '')],
    fiveMeterFastWalkingSpeed: [entry('5MFWS', '')],
    fourSquareStepTest: [entry('FSST', '')],
    modifiedFourSquareStepTest: [entry('MFSST', '')],
    timedUpAndGo: [entry('TUG', '')],
    timedUpAndGoCognitive: [entry('TUG-C', '')],
    thirtySecondSitToStand: [entry('30STS', '')],
    assistiveDevices: [entry('AD', '')],
}

// ==================== Patient Info ====================

// DOB yielding specific ages (tested against a frozen clock at 2025-06-15)
export const DOB_AGE_55 = '1970-01-15'   // age 55
export const DOB_AGE_65 = '1960-01-15'   // age 65
export const DOB_AGE_75 = '1950-01-15'   // age 75
export const DOB_AGE_85 = '1940-01-15'   // age 85
export const DOB_AGE_92 = '1933-01-15'   // age 92

// ==================== Vital Signs ====================

function makeVitals(pulse, bp, spo2) {
    // YAML field_names order is [bloodPressure, restingPulseRate, oxygenSaturation];
    // helper signature stays pulse-first for readability at call sites.
    return [entry('Vital Signs', [bp, pulse, spo2])]
}

export const VALID_VITALS = makeVitals('80', '120/80', '98')
export const VITALS_HIGH_PULSE = makeVitals('105', '120/80', '98')
export const VITALS_LOW_SPO2 = makeVitals('80', '120/80', '85')
export const VITALS_HIGH_SYSTOLIC = makeVitals('80', '185/80', '98')
export const VITALS_HIGH_DIASTOLIC = makeVitals('80', '120/115', '98')
export const VITALS_LOW_SYSTOLIC = makeVitals('80', '85/60', '98')
export const VITALS_LOW_DIASTOLIC = makeVitals('80', '120/55', '98')
export const VITALS_INCOMPLETE = makeVitals('80', '', '98')
export const VITALS_ALL_NULL = makeVitals('', '', '')

// ==================== Stopwatch Trial Helpers ====================

function makeTrials(label, values) {
    return [entry(label, values)]
}

function makeMultipleTrials(label, ...valueSets) {
    return valueSets.map((values, i) =>
        entry(`${label} ${i + 1}`, values)
    )
}

// ==================== Full FormState Builders ====================

/**
 * Build a complete formState for interpretation testing.
 * @param {Object} opts
 * @param {string} opts.sex - 'Male' or 'Female'
 * @param {string} opts.dob - date string
 * @param {Array} opts.vitals - [pulse, bp, spo2] or null (rearranged internally to YAML order)
 * @param {Array} opts.usualWalkTrials - array of trial times or null
 * @param {Array} opts.fastWalkTrials - array of trial times or null
 * @param {Array} opts.fsstTrials - array of trial times or null
 * @param {Array} opts.mfsstTrials - array of trial times or null
 * @param {Array} opts.tugTrials - array of trial times or null
 * @param {Array} opts.tugCogTrials - array of [time, errorCount] or null
 * @param {string} opts.assistiveDevice - device string or null
 */
export function buildFormState(opts = {}) {
    const fs = {}

    if (opts.dob !== undefined) {
        fs.dob = [entry('Date of Birth', opts.dob)]
    }
    if (opts.sex !== undefined) {
        fs.sex = [entry('Sex', opts.sex)]
    }
    if (opts.vitals !== undefined) {
        fs.vitalSigns = opts.vitals === null
            ? [entry('Vital Signs', '')]
            : [entry('Vital Signs', [opts.vitals[1], opts.vitals[0], opts.vitals[2]])]
    }
    if (opts.usualWalkTrials !== undefined) {
        fs.fiveMeterUsualWalkingSpeed = opts.usualWalkTrials === null
            ? [entry('5MUWS', '')]
            : makeTrials('5MUWS', opts.usualWalkTrials)
    }
    if (opts.fastWalkTrials !== undefined) {
        fs.fiveMeterFastWalkingSpeed = opts.fastWalkTrials === null
            ? [entry('5MFWS', '')]
            : makeTrials('5MFWS', opts.fastWalkTrials)
    }
    if (opts.fsstTrials !== undefined) {
        fs.fourSquareStepTest = opts.fsstTrials === null
            ? [entry('FSST', '')]
            : makeTrials('FSST', opts.fsstTrials)
    }
    if (opts.mfsstTrials !== undefined) {
        fs.modifiedFourSquareStepTest = opts.mfsstTrials === null
            ? [entry('MFSST', '')]
            : makeTrials('MFSST', opts.mfsstTrials)
    }
    if (opts.tugTrials !== undefined) {
        fs.timedUpAndGo = opts.tugTrials === null
            ? [entry('TUG', '')]
            : makeTrials('TUG', opts.tugTrials)
    }
    if (opts.tugCogTrials !== undefined) {
        fs.timedUpAndGoCognitive = opts.tugCogTrials === null
            ? [entry('TUG-C', '')]
            : makeTrials('TUG-C', opts.tugCogTrials)
    }
    if (opts.assistiveDevice !== undefined) {
        fs.assistiveDevices = [entry('Assistive Device', opts.assistiveDevice)]
    }
    if (opts.sitToStand !== undefined) {
        fs.thirtySecondSitToStand = opts.sitToStand === null
            ? [entry('30STS', '')]
            : makeTrials('30STS', opts.sitToStand)
    }

    return fs
}

// ==================== Pre-built Scenarios ====================

// Healthy male, age 65, all tests completed with good values
export const HEALTHY_MALE_65 = buildFormState({
    sex: 'Male',
    dob: DOB_AGE_65,
    vitals: ['80', '120/80', '98'],
    usualWalkTrials: [4.0, 4.2],           // mean=4.1s → speed=1.22 m/s
    fastWalkTrials: [3.2, 3.0],            // best=3.0s → speed=1.67 m/s
    fsstTrials: [9.0, 8.5],                // best=8.5s
    tugTrials: [8.0, 7.5],                 // best=7.5s
    tugCogTrials: [[10.0, 1]],             // best time=10.0s
    assistiveDevice: 'None',
})

// Healthy female, age 75
export const HEALTHY_FEMALE_75 = buildFormState({
    sex: 'Female',
    dob: DOB_AGE_75,
    vitals: ['72', '118/76', '97'],
    usualWalkTrials: [5.0, 4.8],           // mean=4.9s → speed=1.02 m/s
    fastWalkTrials: [3.8, 3.5],            // best=3.5s → speed=1.43 m/s
    fsstTrials: [11.0, 10.5],              // best=10.5s
    tugTrials: [9.0, 8.5],                 // best=8.5s
    tugCogTrials: [[12.0, 0]],             // best time=12.0s
    assistiveDevice: 'None',
})

// Male, age 85, ineligible vitals (high pulse)
export const INELIGIBLE_MALE_85 = buildFormState({
    sex: 'Male',
    dob: DOB_AGE_85,
    vitals: ['105', '120/80', '98'],
})

// Female, age 92, at risk for falls (slow walking speed)
export const AT_RISK_FEMALE_92 = buildFormState({
    sex: 'Female',
    dob: DOB_AGE_92,
    vitals: ['78', '130/70', '96'],
    usualWalkTrials: [7.5, 8.0],           // mean=7.75s → speed=0.645 m/s (< 0.76 fall risk, < 0.63 frailty)
    fastWalkTrials: [6.0, 5.5],            // best=5.5s → speed=0.91 m/s (< 1.10 fall risk)
    fsstTrials: [20.0, 18.0],              // best=18.0s (>= 15 multiple fall risk)
    tugTrials: [18.0, 19.0],               // best=18.0s (> 12.0 fall risk for F>80, >= 17.8 frailty)
    tugCogTrials: [[22.0, 3]],             // best=22.0s (> 15 fall risk)
    assistiveDevice: 'None',
})

// Male, age 55, borderline values
export const BORDERLINE_MALE_55 = buildFormState({
    sex: 'Male',
    dob: DOB_AGE_55,
    vitals: ['80', '120/80', '98'],
    usualWalkTrials: [6.57, 6.57],         // mean=6.57s → toFixed(2)="6.57" → speed=5/6.57=0.761... (NOT < 0.76)
    fastWalkTrials: [4.55, 4.55],          // best=4.55s → speed=1.099 m/s (just below 1.10 fall risk)
    fsstTrials: [15.0, 14.5],              // best=14.5s (just below 15 FSST cutoff)
    tugTrials: [12.0, 11.5],              // best=11.5s (at 12.0 for male - not > 12.0)
    tugCogTrials: [[15.0, 1]],             // best=15.0s (exactly at 15 TUG-C cutoff - not > 15)
    assistiveDevice: 'None',
})

// Female, age 75, TUG fall risk at female-specific threshold
export const FEMALE_75_TUG_FALL_RISK = buildFormState({
    sex: 'Female',
    dob: DOB_AGE_75,
    vitals: ['72', '118/76', '97'],
    tugTrials: [14.0, 13.6],              // best=13.6s (> 13.5 for female <= 80)
})

// Female, age 85, TUG fall risk at >80 threshold
export const FEMALE_85_TUG_FALL_RISK = buildFormState({
    sex: 'Female',
    dob: DOB_AGE_85,
    vitals: ['72', '118/76', '97'],
    tugTrials: [13.0, 12.5],              // best=12.5s (> 12.0 for female > 80)
})

// Male, age 75, multiple measurements (testing multi-instance aggregation)
export const MULTI_INSTANCE_MALE_75 = buildFormState({
    sex: 'Male',
    dob: DOB_AGE_75,
    vitals: ['80', '120/80', '98'],
})
// Override with multiple measurement instances
MULTI_INSTANCE_MALE_75.fiveMeterUsualWalkingSpeed = makeMultipleTrials(
    '5MUWS',
    [5.0, 5.2],   // instance 1: trials
    [4.8, 5.0],   // instance 2: trials
)

// Only vitals provided (no walking tests)
export const VITALS_ONLY = buildFormState({
    sex: 'Male',
    dob: DOB_AGE_65,
    vitals: ['80', '120/80', '98'],
})

// All ineligibility reasons
export const INELIGIBLE_HIGH_SYSTOLIC = buildFormState({
    vitals: ['80', '185/80', '98'],
})
export const INELIGIBLE_HIGH_DIASTOLIC = buildFormState({
    vitals: ['80', '120/115', '98'],
})
export const INELIGIBLE_LOW_SYSTOLIC = buildFormState({
    vitals: ['80', '85/60', '98'],
})
export const INELIGIBLE_LOW_DIASTOLIC = buildFormState({
    vitals: ['80', '120/55', '98'],
})
export const INELIGIBLE_LOW_SPO2 = buildFormState({
    vitals: ['80', '120/80', '85'],
})
export const INELIGIBLE_HIGH_PULSE = buildFormState({
    vitals: ['105', '120/80', '98'],
})

// No sex or DOB (should skip age-dependent interpretations)
export const NO_DEMOGRAPHICS = buildFormState({
    vitals: ['80', '120/80', '98'],
    usualWalkTrials: [4.0, 4.2],
    fastWalkTrials: [3.2, 3.0],
    fsstTrials: [9.0, 8.5],
    tugTrials: [8.0, 7.5],
    tugCogTrials: [[10.0, 1]],
})

// Age below 50 (no age bracket - thresholds should not apply)
export const YOUNG_PATIENT = buildFormState({
    sex: 'Male',
    dob: '1985-06-15',  // age 40
    vitals: ['70', '115/75', '99'],
    usualWalkTrials: [3.5, 3.4],
    fastWalkTrials: [2.8, 2.6],
    fsstTrials: [7.0, 6.5],
    tugTrials: [6.0, 5.5],
    tugCogTrials: [[8.0, 0]],
})

// Very slow patient triggering all risk flags
export const VERY_SLOW_MALE_75 = buildFormState({
    sex: 'Male',
    dob: DOB_AGE_75,
    vitals: ['80', '120/80', '98'],
    usualWalkTrials: [10.0, 9.5],          // mean=9.75s → speed=0.513 m/s (fall + frailty)
    fastWalkTrials: [8.0, 7.5],            // best=7.5s → speed=0.667 m/s (< 1.10 fall risk)
    fsstTrials: [25.0, 22.0],              // best=22.0s (>= 15 multiple fall risk)
    tugTrials: [20.0, 22.0],               // best=20.0s (> 12.0 fall risk, >= 17.8 frailty)
    tugCogTrials: [[25.0, 4]],             // best=25.0s (> 15 fall risk)
})

// Assistive device scenarios
export const DEVICE_STRAIGHT_CANE = buildFormState({
    assistiveDevice: 'Straight Cane',
})
export const DEVICE_OTHER = buildFormState({
    assistiveDevice: 'Other',
})
export const DEVICE_NONE = buildFormState({
    assistiveDevice: 'None',
})

// ==================== Validation Test Values ====================

export const VALIDATION_TEST_VALUES = {
    name: {
        valid: ['John', 'A', 'A'.repeat(1000)],
        invalid: ['', '   ', 'A'.repeat(1001)],
    },
    bloodPressure: {
        valid: ['120/80', '150/90', '1/0', '200/199'],
        invalid: ['', '120', '/80', '120/', 'abc', '120/80/90', '200/201', '80/120', '100/100', '1234/80', '0/0', '200/200'],
    },
    oxygenSaturation: {
        valid: [0, 50, 100, 0.5, 99.9],
        invalid: [-1, 101, -0.1, 100.1],
    },
    restingPulseRate: {
        valid: [0, 60, 150, 300],
        invalid: [-1, 301, 60.5, 0.1],
    },
    sex: {
        valid: ['Male', 'Female'],
        invalid: ['', 'male', 'Other', 'M', 'F', null],
    },
    assistiveDevices: {
        valid: ['None', 'Straight Cane', 'Other'],
        invalid: ['', 'none', 'Walker', null],
    },
    stopwatch: {
        valid: [0.01, 1, 30, 59.99, 3599.99],
        invalid: [0, -1, 3600, 3601],
    },
    thirtySecondSitToStandCount: {
        valid: [0, 1, 50, 100],
        invalid: [-1, 101, 0.5, 50.1],
    },
    tugCognitiveErrorCount: {
        valid: [0, 1, 25, 50],
        invalid: [-1, 51, 0.5, 25.1],
    },
}

// ==================== Comprehensive Scenario Matrix ====================
// Every combination of sex × age bracket for threshold testing

export const AGE_SEX_MATRIX = []
for (const sex of ['Male', 'Female']) {
    for (const dob of [DOB_AGE_55, DOB_AGE_65, DOB_AGE_75, DOB_AGE_85, DOB_AGE_92]) {
        AGE_SEX_MATRIX.push(
            buildFormState({
                sex,
                dob,
                vitals: ['80', '120/80', '98'],
                usualWalkTrials: [4.5, 4.3],       // mean=4.4s → speed≈1.136 m/s
                fastWalkTrials: [3.5, 3.2],         // best=3.2s → speed≈1.5625 m/s
                fsstTrials: [10.0, 9.5],            // best=9.5s
                tugTrials: [9.0, 8.5],              // best=8.5s
                tugCogTrials: [[11.0, 1]],          // best time=11.0s
            })
        )
    }
}
