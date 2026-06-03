import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { INTERPRETATION_SECTION_CONFIGS } from '../../components/interpretations/InterpretationFactory'
import {
    EMPTY_FORM_STATE,
    NULL_MEASUREMENTS_FORM_STATE,
    HEALTHY_MALE_65,
    HEALTHY_FEMALE_75,
    AT_RISK_FEMALE_92,
    BORDERLINE_MALE_55,
    INELIGIBLE_MALE_85,
    FEMALE_75_TUG_FALL_RISK,
    FEMALE_85_TUG_FALL_RISK,
    MULTI_INSTANCE_MALE_75,
    VITALS_ONLY,
    NO_DEMOGRAPHICS,
    YOUNG_PATIENT,
    VERY_SLOW_MALE_75,
    INELIGIBLE_HIGH_SYSTOLIC,
    INELIGIBLE_HIGH_DIASTOLIC,
    INELIGIBLE_LOW_SYSTOLIC,
    INELIGIBLE_LOW_DIASTOLIC,
    INELIGIBLE_LOW_SPO2,
    INELIGIBLE_HIGH_PULSE,
    AGE_SEX_MATRIX,
    buildFormState,
    DOB_AGE_55,
    DOB_AGE_65,
    DOB_AGE_75,
    DOB_AGE_85,
    DOB_AGE_92,
} from '../fixtures/testFormStates'

const FROZEN_DATE = new Date('2025-06-15T12:00:00Z')

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN_DATE)
})

afterEach(() => {
    vi.useRealTimers()
})

// ==================== Vital Signs Interpretation ====================

describe('Interpretation: vitalSigns', () => {
    const interpret = INTERPRETATION_SECTION_CONFIGS.vitalSigns.messageFunction

    it('returns null for empty formState', () => {
        expect(interpret(EMPTY_FORM_STATE)).toBe(null)
    })

    it('returns null for incomplete vitals', () => {
        const fs = buildFormState({ vitals: ['80', '', '98'] })
        expect(interpret(fs)).toBe(null)
    })

    it('returns eligible for valid vitals', () => {
        const fs = buildFormState({ vitals: ['80', '120/80', '98'] })
        expect(interpret(fs)).toEqual([
            { text: 'This patient is eligible for physical activity.', type: 'success' }
        ])
    })

    it('returns ineligible for high pulse', () => {
        expect(interpret(INELIGIBLE_HIGH_PULSE)).toEqual([
            { text: 'This patient is ineligible for physical activity.', type: 'danger' }
        ])
    })

    it('returns ineligible for low SpO2', () => {
        expect(interpret(INELIGIBLE_LOW_SPO2)).toEqual([
            { text: 'This patient is ineligible for physical activity.', type: 'danger' }
        ])
    })

    it('returns ineligible for high systolic', () => {
        expect(interpret(INELIGIBLE_HIGH_SYSTOLIC)).toEqual([
            { text: 'This patient is ineligible for physical activity.', type: 'danger' }
        ])
    })

    it('returns ineligible for high diastolic', () => {
        expect(interpret(INELIGIBLE_HIGH_DIASTOLIC)).toEqual([
            { text: 'This patient is ineligible for physical activity.', type: 'danger' }
        ])
    })

    it('returns ineligible for low systolic', () => {
        expect(interpret(INELIGIBLE_LOW_SYSTOLIC)).toEqual([
            { text: 'This patient is ineligible for physical activity.', type: 'danger' }
        ])
    })

    it('returns ineligible for low diastolic', () => {
        expect(interpret(INELIGIBLE_LOW_DIASTOLIC)).toEqual([
            { text: 'This patient is ineligible for physical activity.', type: 'danger' }
        ])
    })
})

// ==================== Usual Walking Speed Interpretation ====================

describe('Interpretation: usualWalkingSpeed', () => {
    const interpret = INTERPRETATION_SECTION_CONFIGS.usualWalkingSpeed.messageFunction

    it('returns null when no walking speed data', () => {
        expect(interpret(EMPTY_FORM_STATE)).toBe(null)
        expect(interpret(VITALS_ONLY)).toBe(null)
    })

    it('returns fall risk for speed < 0.76', () => {
        // AT_RISK_FEMALE_92: mean=7.75s → speed=0.645 m/s
        const result = interpret(AT_RISK_FEMALE_92)
        expect(result).not.toBe(null)
        expect(result.some(m => m.text.includes('Fall Risk') && m.text.includes('0.76'))).toBe(true)
    })

    it('returns frailty risk for speed < 0.63', () => {
        // AT_RISK_FEMALE_92: speed=0.645 → NOT < 0.63, so no frailty
        const result = interpret(AT_RISK_FEMALE_92)
        expect(result.some(m => m.text.includes('Frailty Risk'))).toBe(false)
    })

    it('returns frailty risk when speed is below 0.63', () => {
        // Very slow: mean=9.75s → speed=0.513 m/s
        const result = interpret(VERY_SLOW_MALE_75)
        expect(result.some(m => m.text.includes('Frailty Risk'))).toBe(true)
    })

    it('does NOT return fall risk when speed >= 0.76', () => {
        // HEALTHY_MALE_65: mean=4.1s → speed=1.22 m/s
        const result = interpret(HEALTHY_MALE_65)
        expect(result).not.toBe(null)
        expect(result.some(m => m.text.includes('Fall Risk'))).toBe(false)
    })

    it('includes mobility classification when sex and age available', () => {
        const result = interpret(HEALTHY_MALE_65)
        expect(result.some(m => /(Green|Yellow|Red) Zone/.test(m.text))).toBe(true)
    })

    it('returns only fall/frailty risk when no demographics', () => {
        // NO_DEMOGRAPHICS: has walking data but no sex/dob → no threshold lookup
        const result = interpret(NO_DEMOGRAPHICS)
        if (result) {
            expect(result.every(m =>
                m.text.includes('Fall Risk') ||
                m.text.includes('Frailty Risk')
            )).toBe(true)
        }
    })

    it('returns null when speed >= 0.76 and no demographics', () => {
        // NO_DEMOGRAPHICS: mean=4.1s → speed=1.22 m/s, no fall/frailty risk, no thresholds → null
        expect(interpret(NO_DEMOGRAPHICS)).toBe(null)
    })

    it('handles age below 50 (no age bracket)', () => {
        const result = interpret(YOUNG_PATIENT)
        // Speed is fast (mean=3.45s → 1.449 m/s), no fall risk, and no age bracket for thresholds
        expect(result).toBe(null)
    })

    it('borderline speed exactly at 0.76 is NOT fall risk', () => {
        // BORDERLINE_MALE_55: mean=6.58s → speed ≈ 0.76 m/s (not < 0.76)
        const result = interpret(BORDERLINE_MALE_55)
        if (result) {
            expect(result.some(m => m.text.includes('Fall Risk') && m.text.includes('0.76'))).toBe(false)
        }
    })
})

// ==================== Fast Walking Speed Interpretation ====================

describe('Interpretation: fastWalkingSpeed', () => {
    const interpret = INTERPRETATION_SECTION_CONFIGS.fastWalkingSpeed.messageFunction

    it('returns null when no data', () => {
        expect(interpret(EMPTY_FORM_STATE)).toBe(null)
        expect(interpret(VITALS_ONLY)).toBe(null)
    })

    it('returns fall risk for speed < 1.10', () => {
        // AT_RISK_FEMALE_92: best=5.5s → speed=0.909 m/s
        const result = interpret(AT_RISK_FEMALE_92)
        expect(result.some(m => m.text.includes('Fall Risk') && m.text.includes('1.10'))).toBe(true)
    })

    it('does NOT return fall risk for speed >= 1.10', () => {
        // HEALTHY_MALE_65: best=3.0s → speed=1.67 m/s
        const result = interpret(HEALTHY_MALE_65)
        expect(result).not.toBe(null)
        expect(result.some(m => m.text.includes('Fall Risk'))).toBe(false)
    })

    it('includes mobility classification with demographics', () => {
        const result = interpret(HEALTHY_MALE_65)
        expect(result.some(m => /(Green|Yellow|Red) Zone/.test(m.text))).toBe(true)
    })

    it('borderline speed just below 1.10 triggers fall risk', () => {
        // BORDERLINE_MALE_55: best=4.55s → speed=1.099 m/s (< 1.10)
        const result = interpret(BORDERLINE_MALE_55)
        expect(result.some(m => m.text.includes('Fall Risk'))).toBe(true)
    })
})

// ==================== Four Square Step Test Interpretation ====================

describe('Interpretation: fourSquareStepTest', () => {
    const interpret = INTERPRETATION_SECTION_CONFIGS.fourSquareStepTest.messageFunction

    it('returns null when no data', () => {
        expect(interpret(EMPTY_FORM_STATE)).toBe(null)
    })

    it('returns multiple fall risk for value >= 15', () => {
        // AT_RISK_FEMALE_92: best=18.0s
        const result = interpret(AT_RISK_FEMALE_92)
        expect(result.some(m => m.text.includes('Multiple Fall risk') && m.text.includes('15'))).toBe(true)
    })

    it('does NOT return multiple fall risk for value < 15', () => {
        // HEALTHY_MALE_65: best=8.5s
        const result = interpret(HEALTHY_MALE_65)
        expect(result).not.toBe(null)
        expect(result.some(m => m.text.includes('Multiple Fall risk'))).toBe(false)
    })

    it('borderline value exactly 15 triggers fall risk (>= 15)', () => {
        const fs = buildFormState({
            sex: 'Male',
            dob: DOB_AGE_65,
            fsstTrials: [15.0, 16.0],  // best=15.0
        })
        const result = interpret(fs)
        expect(result.some(m => m.text.includes('Multiple Fall risk'))).toBe(true)
    })

    it('borderline value 14.5 does NOT trigger fall risk', () => {
        // BORDERLINE_MALE_55: best=14.5s
        const result = interpret(BORDERLINE_MALE_55)
        if (result) {
            expect(result.some(m => m.text.includes('Multiple Fall risk'))).toBe(false)
        }
    })

    it('includes time-based mobility classification with demographics', () => {
        const result = interpret(HEALTHY_MALE_65)
        expect(result.some(m => /(Green|Yellow|Red) Zone/.test(m.text))).toBe(true)
    })
})

// ==================== Timed Up and Go Interpretation ====================

describe('Interpretation: timedUpAndGo', () => {
    const interpret = INTERPRETATION_SECTION_CONFIGS.timedUpAndGo.messageFunction

    it('returns null when no data', () => {
        expect(interpret(EMPTY_FORM_STATE)).toBe(null)
    })

    // Male fall risk: always > 12.0
    it('male fall risk when > 12.0 (age <= 80)', () => {
        const fs = buildFormState({
            sex: 'Male',
            dob: DOB_AGE_65,
            tugTrials: [13.0, 12.5],  // best=12.5 > 12.0
        })
        const result = interpret(fs)
        expect(result.some(m => m.text.includes('Fall risk') && m.text.includes('12.0'))).toBe(true)
    })

    it('male fall risk when > 12.0 (age > 80)', () => {
        const fs = buildFormState({
            sex: 'Male',
            dob: DOB_AGE_85,
            tugTrials: [13.0, 12.5],  // best=12.5 > 12.0
        })
        const result = interpret(fs)
        expect(result.some(m => m.text.includes('Fall risk') && m.text.includes('12.0'))).toBe(true)
    })

    it('male NO fall risk at exactly 12.0', () => {
        const fs = buildFormState({
            sex: 'Male',
            dob: DOB_AGE_65,
            tugTrials: [12.0, 12.0],  // best=12.0, NOT > 12.0
        })
        const result = interpret(fs)
        if (result) {
            expect(result.some(m => m.text.includes('Fall risk') && m.text.includes('12.0'))).toBe(false)
        }
    })

    // Female fall risk: > 12.0 if age > 80, else > 13.5
    it('female age > 80: fall risk when > 12.0', () => {
        // FEMALE_85_TUG_FALL_RISK: best=12.5 > 12.0, age 85
        const result = interpret(FEMALE_85_TUG_FALL_RISK)
        expect(result.some(m => m.text.includes('Fall risk') && m.text.includes('12.0'))).toBe(true)
    })

    it('female age <= 80: fall risk when > 12.0', () => {
        // FEMALE_75_TUG_FALL_RISK: best=13.6 > 12.0, age 75
        const result = interpret(FEMALE_75_TUG_FALL_RISK)
        expect(result.some(m => m.text.includes('Fall risk') && m.text.includes('12.0'))).toBe(true)
    })

    it('female age <= 80: NO fall risk at 12.0', () => {
        const fs = buildFormState({
            sex: 'Female',
            dob: DOB_AGE_75,
            tugTrials: [12.0, 13.0],  // best=12.0, NOT > 12.0
        })
        const result = interpret(fs)
        if (result) {
            expect(result.some(m => m.text.includes('Fall risk') && m.text.includes('12.0'))).toBe(false)
        }
    })

    it('female age > 80: NO fall risk at 12.0', () => {
        const fs = buildFormState({
            sex: 'Female',
            dob: DOB_AGE_85,
            tugTrials: [12.0, 13.0],  // best=12.0, NOT > 12.0
        })
        const result = interpret(fs)
        if (result) {
            expect(result.some(m => m.text.includes('Fall risk') && m.text.includes('12.0'))).toBe(false)
        }
    })

    // Frailty: >= 17.8
    it('frailty when >= 17.8', () => {
        // AT_RISK_FEMALE_92: best=18.0 >= 17.8
        const result = interpret(AT_RISK_FEMALE_92)
        expect(result.some(m => m.text.includes('Frailty') && m.text.includes('17.8'))).toBe(true)
    })

    it('frailty at exactly 17.8', () => {
        const fs = buildFormState({
            sex: 'Male',
            dob: DOB_AGE_75,
            tugTrials: [17.8, 18.0],  // best=17.8
        })
        const result = interpret(fs)
        expect(result.some(m => m.text.includes('Frailty'))).toBe(true)
    })

    it('no frailty at 17.7', () => {
        const fs = buildFormState({
            sex: 'Male',
            dob: DOB_AGE_75,
            tugTrials: [17.7, 18.0],  // best=17.7
        })
        const result = interpret(fs)
        expect(result.some(m => m.text.includes('Frailty'))).toBe(false)
    })

    // No sex → no sex-specific fall risk
    it('no fall risk interpretation without sex', () => {
        const fs = buildFormState({
            dob: DOB_AGE_65,
            tugTrials: [14.0, 13.0],  // best=13.0
        })
        const result = interpret(fs)
        if (result) {
            expect(result.some(m => m.text.includes('Fall risk'))).toBe(false)
        }
    })
})

// ==================== TUG Cognitive Interpretation ====================

describe('Interpretation: timedUpAndGoCognitive', () => {
    const interpret = INTERPRETATION_SECTION_CONFIGS.timedUpAndGoCognitive.messageFunction

    it('returns null when no data', () => {
        expect(interpret(EMPTY_FORM_STATE)).toBe(null)
    })

    it('fall risk when > 11', () => {
        // AT_RISK_FEMALE_92: best=22.0 > 11
        const result = interpret(AT_RISK_FEMALE_92)
        expect(result.some(m => m.text.includes('Fall risk') && m.text.includes('11'))).toBe(true)
    })

    it('no fall risk at exactly 11', () => {
        const fs = buildFormState({
            sex: 'Female',
            dob: DOB_AGE_65,
            tugCogTrials: [[11.0, 1]],  // best time=11.0, NOT > 11
        })
        const result = interpret(fs)
        if (result) {
            expect(result.some(m => m.text.includes('Fall risk') && m.text.includes('>11'))).toBe(false)
        }
    })

    it('no fall risk below 11', () => {
        // HEALTHY_MALE_65: best=10.0
        const result = interpret(HEALTHY_MALE_65)
        expect(result).not.toBe(null)
        expect(result.some(m => m.text.includes('Fall risk'))).toBe(false)
    })
})

// ==================== Annual Mobility Assessment Interpretation ====================

describe('Interpretation: annualMobilityAssessment', () => {
    const interpret = INTERPRETATION_SECTION_CONFIGS.annualMobilityAssessment.messageFunction

    it('returns null when no vitals', () => {
        expect(interpret(EMPTY_FORM_STATE)).toBe(null)
    })

    it('returns null when vitals incomplete', () => {
        const fs = buildFormState({ vitals: ['80', '', '98'] })
        expect(interpret(fs)).toBe(null)
    })

    it('returns warning when patient is ineligible', () => {
        const result = interpret(INELIGIBLE_HIGH_PULSE)
        expect(result).not.toBe(null)
        expect(result[0].type).toBe('warning')
        expect(result[0].text).toContain('vital sign findings')
    })

    it('returns eligibility message when patient is eligible', () => {
        const fs = buildFormState({ vitals: ['80', '120/80', '98'] })
        const result = interpret(fs)
        expect(result).not.toBe(null)
        expect(result[0].type).toBe('success')
        expect(result[0].text).toBe('This patient is eligible for the Annual Mobility Assessment.')
    })

    it('triggers for all ineligibility reasons', () => {
        for (const fs of [
            INELIGIBLE_HIGH_PULSE,
            INELIGIBLE_LOW_SPO2,
            INELIGIBLE_HIGH_SYSTOLIC,
            INELIGIBLE_HIGH_DIASTOLIC,
            INELIGIBLE_LOW_SYSTOLIC,
            INELIGIBLE_LOW_DIASTOLIC,
        ]) {
            const result = interpret(fs)
            expect(result).not.toBe(null)
            expect(result[0].type).toBe('warning')
        }
    })
})

// ==================== Full Scenario Snapshots ====================
// These capture the exact output for every interpretation across every scenario.
// After migration, these snapshots must remain identical.

describe('Full interpretation scenario snapshots', () => {
    const allInterpKeys = Object.keys(INTERPRETATION_SECTION_CONFIGS)

    function interpretAll(formState) {
        const results = {}
        for (const key of allInterpKeys) {
            results[key] = INTERPRETATION_SECTION_CONFIGS[key].messageFunction(formState)
        }
        return results
    }

    it('empty form state', () => {
        expect(interpretAll(EMPTY_FORM_STATE)).toMatchSnapshot()
    })

    it('null measurements', () => {
        expect(interpretAll(NULL_MEASUREMENTS_FORM_STATE)).toMatchSnapshot()
    })

    it('healthy male 65', () => {
        expect(interpretAll(HEALTHY_MALE_65)).toMatchSnapshot()
    })

    it('healthy female 75', () => {
        expect(interpretAll(HEALTHY_FEMALE_75)).toMatchSnapshot()
    })

    it('at risk female 92', () => {
        expect(interpretAll(AT_RISK_FEMALE_92)).toMatchSnapshot()
    })

    it('borderline male 55', () => {
        expect(interpretAll(BORDERLINE_MALE_55)).toMatchSnapshot()
    })

    it('ineligible male 85', () => {
        expect(interpretAll(INELIGIBLE_MALE_85)).toMatchSnapshot()
    })

    it('female 75 TUG fall risk', () => {
        expect(interpretAll(FEMALE_75_TUG_FALL_RISK)).toMatchSnapshot()
    })

    it('female 85 TUG fall risk', () => {
        expect(interpretAll(FEMALE_85_TUG_FALL_RISK)).toMatchSnapshot()
    })

    it('vitals only', () => {
        expect(interpretAll(VITALS_ONLY)).toMatchSnapshot()
    })

    it('no demographics', () => {
        expect(interpretAll(NO_DEMOGRAPHICS)).toMatchSnapshot()
    })

    it('young patient', () => {
        expect(interpretAll(YOUNG_PATIENT)).toMatchSnapshot()
    })

    it('very slow male 75', () => {
        expect(interpretAll(VERY_SLOW_MALE_75)).toMatchSnapshot()
    })

    // Test every sex × age bracket combination
    describe('age/sex matrix', () => {
        const sexes = ['Male', 'Female']
        const dobs = [DOB_AGE_55, DOB_AGE_65, DOB_AGE_75, DOB_AGE_85, DOB_AGE_92]
        let idx = 0
        for (const sex of sexes) {
            for (const dob of dobs) {
                const capturedIdx = idx
                const label = `${sex} dob=${dob}`
                it(label, () => {
                    expect(interpretAll(AGE_SEX_MATRIX[capturedIdx])).toMatchSnapshot()
                })
                idx++
            }
        }
    })
})

// ==================== Metadata Parity ====================

describe('Interpretation metadata', () => {
    it('has correct labels', () => {
        expect(INTERPRETATION_SECTION_CONFIGS.vitalSigns.label).toBe('Vital Signs')
        expect(INTERPRETATION_SECTION_CONFIGS.usualWalkingSpeed.label).toBe('5 Meter Usual Walking Speed')
        expect(INTERPRETATION_SECTION_CONFIGS.fastWalkingSpeed.label).toBe('5 Meter Fast Walking Speed')
        expect(INTERPRETATION_SECTION_CONFIGS.fourSquareStepTest.label).toBe('Four Square Step Test')
        expect(INTERPRETATION_SECTION_CONFIGS.timedUpAndGo.label).toBe('Timed Up and Go (TUG)')
        expect(INTERPRETATION_SECTION_CONFIGS.timedUpAndGoCognitive.label).toBe('Timed Up and Go Cognitive Dual Task')
        expect(INTERPRETATION_SECTION_CONFIGS.annualMobilityAssessment.label).toBe('Annual Mobility Assessment')
    })

    it('all have citations', () => {
        for (const [key, config] of Object.entries(INTERPRETATION_SECTION_CONFIGS)) {
            expect(config.citation).toBeTruthy()
            expect(config.citation).toContain('Annual Mobility Assessment')
        }
    })
})
