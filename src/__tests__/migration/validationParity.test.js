import { describe, it, expect } from 'vitest'
import { MEASUREMENT_CONFIGS, MAX_LENGTH, MAX_SECONDS } from '../../components/measurements/MeasurementFactory'
import { VALIDATION_TEST_VALUES } from '../fixtures/testFormStates'

// Snapshot every validationFunction from MEASUREMENT_CONFIGS.
// After migrating to YAML + validationEngine, replace the import and
// these tests must still produce identical results.

describe('Validation Parity: MEASUREMENT_CONFIGS.validationFunction', () => {

    describe('name', () => {
        const validate = MEASUREMENT_CONFIGS.name.validationFunction

        it.each(VALIDATION_TEST_VALUES.name.valid)('accepts valid: %j', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.name.invalid)('rejects invalid: %j', (val) => {
            expect(validate(val)).toBe(false)
        })
        it('rejects string of length MAX_LENGTH+1', () => {
            expect(validate('A'.repeat(MAX_LENGTH + 1))).toBe(false)
        })
        it('accepts string of exactly MAX_LENGTH', () => {
            expect(validate('A'.repeat(MAX_LENGTH))).toBe(true)
        })
    })

    describe('dob (isValidDobForMeasurement)', () => {
        const validate = MEASUREMENT_CONFIGS.dob.validationFunction

        it('accepts a valid past date', () => {
            expect(validate('1990-06-15')).toBe(true)
        })
        it('rejects empty string', () => {
            expect(validate('')).toBe(false)
        })
        it('rejects today', () => {
            const today = new Date().toISOString().split('T')[0]
            expect(validate(today)).toBe(false)
        })
        it('rejects future date', () => {
            expect(validate('2099-01-01')).toBe(false)
        })
        it('rejects date before 1900', () => {
            expect(validate('1899-12-31')).toBe(false)
        })
        it('accepts date in 1900 (mid-year to avoid timezone edge)', () => {
            expect(validate('1900-06-15')).toBe(true)
        })
        it('rejects a date less than 1 year ago', () => {
            const recent = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            expect(validate(recent)).toBe(false)
        })
        it('accepts a date more than 1 year ago', () => {
            const old = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            expect(validate(old)).toBe(true)
        })
    })

    describe('sex', () => {
        const validate = MEASUREMENT_CONFIGS.sex.validationFunction

        it.each(VALIDATION_TEST_VALUES.sex.valid)('accepts valid: %j', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.sex.invalid)('rejects invalid: %j', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('bloodPressure', () => {
        const validate = MEASUREMENT_CONFIGS.bloodPressure.validationFunction

        it.each(VALIDATION_TEST_VALUES.bloodPressure.valid)('accepts valid: %j', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.bloodPressure.invalid)('rejects invalid: %j', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('oxygenSaturation', () => {
        const validate = MEASUREMENT_CONFIGS.oxygenSaturation.validationFunction

        it.each(VALIDATION_TEST_VALUES.oxygenSaturation.valid)('accepts valid: %d', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.oxygenSaturation.invalid)('rejects invalid: %d', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('restingPulseRate', () => {
        const validate = MEASUREMENT_CONFIGS.restingPulseRate.validationFunction

        it.each(VALIDATION_TEST_VALUES.restingPulseRate.valid)('accepts valid: %d', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.restingPulseRate.invalid)('rejects invalid: %d', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('assistiveDevices', () => {
        const validate = MEASUREMENT_CONFIGS.assistiveDevices.validationFunction

        it.each(VALIDATION_TEST_VALUES.assistiveDevices.valid)('accepts valid: %j', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.assistiveDevices.invalid)('rejects invalid: %j', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('stopwatch measurements (fiveMeterUsualWalkingSpeed)', () => {
        const validate = MEASUREMENT_CONFIGS.fiveMeterUsualWalkingSpeed.validationFunction

        it.each(VALIDATION_TEST_VALUES.stopwatch.valid)('accepts valid: %d', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.stopwatch.invalid)('rejects invalid: %d', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('stopwatch measurements (fiveMeterFastWalkingSpeed)', () => {
        const validate = MEASUREMENT_CONFIGS.fiveMeterFastWalkingSpeed.validationFunction

        it.each(VALIDATION_TEST_VALUES.stopwatch.valid)('accepts valid: %d', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.stopwatch.invalid)('rejects invalid: %d', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('stopwatch measurements (fourSquareStepTest)', () => {
        const validate = MEASUREMENT_CONFIGS.fourSquareStepTest.validationFunction

        it.each(VALIDATION_TEST_VALUES.stopwatch.valid)('accepts valid: %d', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.stopwatch.invalid)('rejects invalid: %d', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('stopwatch measurements (modifiedFourSquareStepTest)', () => {
        const validate = MEASUREMENT_CONFIGS.modifiedFourSquareStepTest.validationFunction

        it.each(VALIDATION_TEST_VALUES.stopwatch.valid)('accepts valid: %d', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.stopwatch.invalid)('rejects invalid: %d', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('stopwatch measurements (timedUpAndGo)', () => {
        const validate = MEASUREMENT_CONFIGS.timedUpAndGo.validationFunction

        it.each(VALIDATION_TEST_VALUES.stopwatch.valid)('accepts valid: %d', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.stopwatch.invalid)('rejects invalid: %d', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('thirtySecondSitToStand count field', () => {
        const validate = MEASUREMENT_CONFIGS.thirtySecondSitToStand.fields[1].validationFunction

        it.each(VALIDATION_TEST_VALUES.thirtySecondSitToStandCount.valid)('accepts valid: %d', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.thirtySecondSitToStandCount.invalid)('rejects invalid: %d', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('timedUpAndGoCognitive time field', () => {
        const validate = MEASUREMENT_CONFIGS.timedUpAndGoCognitive.fields[0].validationFunction

        it.each(VALIDATION_TEST_VALUES.stopwatch.valid)('accepts valid: %d', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.stopwatch.invalid)('rejects invalid: %d', (val) => {
            expect(validate(val)).toBe(false)
        })
    })

    describe('timedUpAndGoCognitive error count field', () => {
        const validate = MEASUREMENT_CONFIGS.timedUpAndGoCognitive.fields[1].validationFunction

        it.each(VALIDATION_TEST_VALUES.tugCognitiveErrorCount.valid)('accepts valid: %d', (val) => {
            expect(validate(val)).toBe(true)
        })
        it.each(VALIDATION_TEST_VALUES.tugCognitiveErrorCount.invalid)('rejects invalid: %d', (val) => {
            expect(validate(val)).toBe(false)
        })
    })
})

describe('Validation Parity: computedFields', () => {
    describe('fiveMeterUsualWalkingSpeed', () => {
        const compute = MEASUREMENT_CONFIGS.fiveMeterUsualWalkingSpeed.computedFields

        it('returns N/A for null value', () => {
            expect(compute(null)).toEqual({ 'Walking Speed': 'N/A' })
        })
        it('returns N/A for empty string', () => {
            expect(compute('')).toEqual({ 'Walking Speed': 'N/A' })
        })
        it('returns N/A for zero', () => {
            expect(compute(0)).toEqual({ 'Walking Speed': 'N/A' })
        })
        it('computes speed correctly for 5 seconds', () => {
            expect(compute(5)).toEqual({ 'Walking Speed': '1.00 m/s' })
        })
        it('computes speed correctly for 4.1 seconds', () => {
            expect(compute(4.1)).toEqual({ 'Walking Speed': '1.22 m/s' })
        })
        it('computes speed correctly for string value', () => {
            expect(compute('4.0')).toEqual({ 'Walking Speed': '1.25 m/s' })
        })
    })

    describe('fiveMeterFastWalkingSpeed', () => {
        const compute = MEASUREMENT_CONFIGS.fiveMeterFastWalkingSpeed.computedFields

        it('returns N/A for null', () => {
            expect(compute(null)).toEqual({ 'Walking Speed': 'N/A' })
        })
        it('computes speed correctly', () => {
            expect(compute(3.0)).toEqual({ 'Walking Speed': '1.67 m/s' })
        })
    })
})

describe('Validation Parity: disabledCasesComputed showOverride', () => {
    // These test the showOverride functions that determine if a disabled case
    // checkbox should be shown.

    describe('PHYSICAL_ACTIVITY_DISABLED_CASE', () => {
        const showOverride = MEASUREMENT_CONFIGS.fiveMeterUsualWalkingSpeed.disabledCasesComputed[0].showOverride

        it('shows override when vitals are missing', () => {
            const formState = {}
            const validations = {}
            expect(showOverride(formState, validations, {}, 'fiveMeterUsualWalkingSpeed')).toBe(true)
        })

        it('does not show override when only SpO2 is missing (SpO2 is optional)', () => {
            const formState = { vitalSigns: [{ value: ['120/80', '80', ''] }] }
            const validations = { vitalSigns: [[true, true, true]] }
            expect(showOverride(formState, validations, {}, 'fiveMeterUsualWalkingSpeed')).toBe(false)
        })

        it('shows override when vitals indicate ineligibility', () => {
            const formState = { vitalSigns: [{ value: ['120/80', '105', '98'] }] }
            const validations = { vitalSigns: [[true, true, true]] }
            expect(showOverride(formState, validations, {}, 'fiveMeterUsualWalkingSpeed')).toBe(true)
        })

        it('hides override when vitals are valid and eligible', () => {
            const formState = { vitalSigns: [{ value: ['120/80', '80', '98'] }] }
            const validations = { vitalSigns: [[true, true, true]] }
            expect(showOverride(formState, validations, {}, 'fiveMeterUsualWalkingSpeed')).toBe(false)
        })
    })

    describe('ASSISTIVE_DEVICE_FOUR_SQUARE_STEP_TEST_DISABLED_CASE', () => {
        const showOverride = MEASUREMENT_CONFIGS.fourSquareStepTest.disabledCasesComputed[1].showOverride

        it('shows override when no assistive device selected', () => {
            const formState = {}
            expect(showOverride(formState, {}, {}, 'fourSquareStepTest')).toBe(true)
        })

        it('hides override when device is None', () => {
            const formState = { assistiveDevices: [{ value: 'None' }] }
            expect(showOverride(formState, {}, {}, 'fourSquareStepTest')).toBe(false)
        })

        it('hides override when device is Straight Cane', () => {
            const formState = { assistiveDevices: [{ value: 'Straight Cane' }] }
            expect(showOverride(formState, {}, {}, 'fourSquareStepTest')).toBe(false)
        })

        it('shows override when device is Other', () => {
            const formState = { assistiveDevices: [{ value: 'Other' }] }
            expect(showOverride(formState, {}, {}, 'fourSquareStepTest')).toBe(true)
        })
    })

    describe('ASSISTIVE_DEVICE_MODIFIED_FOUR_SQUARE_STEP_TEST_DISABLED_CASE', () => {
        const showOverride = MEASUREMENT_CONFIGS.modifiedFourSquareStepTest.disabledCasesComputed[1].showOverride

        it('shows override when no assistive device selected', () => {
            const formState = {}
            expect(showOverride(formState, {}, {}, 'modifiedFourSquareStepTest')).toBe(true)
        })

        it('shows override when device is None', () => {
            const formState = { assistiveDevices: [{ value: 'None' }] }
            expect(showOverride(formState, {}, {}, 'modifiedFourSquareStepTest')).toBe(true)
        })

        it('shows override when device is Straight Cane', () => {
            const formState = { assistiveDevices: [{ value: 'Straight Cane' }] }
            expect(showOverride(formState, {}, {}, 'modifiedFourSquareStepTest')).toBe(true)
        })

        it('hides override when device is Other', () => {
            const formState = { assistiveDevices: [{ value: 'Other' }] }
            expect(showOverride(formState, {}, {}, 'modifiedFourSquareStepTest')).toBe(false)
        })
    })
})
