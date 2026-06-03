import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CALCULATION_SECTION_CONFIGS } from '../../components/calculations/CalculationFactory'
import {
    EMPTY_FORM_STATE,
    NULL_MEASUREMENTS_FORM_STATE,
    HEALTHY_MALE_65,
    HEALTHY_FEMALE_75,
    AT_RISK_FEMALE_92,
    BORDERLINE_MALE_55,
    MULTI_INSTANCE_MALE_75,
    VITALS_ONLY,
    NO_DEMOGRAPHICS,
    YOUNG_PATIENT,
    VERY_SLOW_MALE_75,
    buildFormState,
    DOB_AGE_55,
    DOB_AGE_65,
    DOB_AGE_75,
    DOB_AGE_85,
    DOB_AGE_92,
} from '../fixtures/testFormStates'

// Freeze time for age calculations
const FROZEN_DATE = new Date('2025-06-15T12:00:00Z')

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN_DATE)
})

afterEach(() => {
    vi.useRealTimers()
})

describe('Calculation Parity: CALCULATION_SECTION_CONFIGS.valueFunction', () => {

    // ==================== Age Calculation ====================

    describe('age', () => {
        const calc = CALCULATION_SECTION_CONFIGS.age.valueFunction

        it('returns null for empty formState', () => {
            expect(calc(EMPTY_FORM_STATE)).toBe(null)
        })

        it('returns null for empty dob value', () => {
            expect(calc(NULL_MEASUREMENTS_FORM_STATE)).toBe(null)
        })

        it('calculates age 55 from DOB_AGE_55', () => {
            const fs = buildFormState({ dob: DOB_AGE_55 })
            expect(calc(fs)).toBe(55)
        })

        it('calculates age 65 from DOB_AGE_65', () => {
            const fs = buildFormState({ dob: DOB_AGE_65 })
            expect(calc(fs)).toBe(65)
        })

        it('calculates age 75 from DOB_AGE_75', () => {
            const fs = buildFormState({ dob: DOB_AGE_75 })
            expect(calc(fs)).toBe(75)
        })

        it('calculates age 85 from DOB_AGE_85', () => {
            const fs = buildFormState({ dob: DOB_AGE_85 })
            expect(calc(fs)).toBe(85)
        })

        it('calculates age 92 from DOB_AGE_92', () => {
            const fs = buildFormState({ dob: DOB_AGE_92 })
            expect(calc(fs)).toBe(92)
        })

        it('handles birthday not yet passed this year', () => {
            // DOB is Dec 15, frozen time is June 15 → birthday passed
            const fs = buildFormState({ dob: '1960-12-20' })
            expect(calc(fs)).toBe(64) // not yet 65
        })

        it('handles birthday on exact frozen date', () => {
            const fs = buildFormState({ dob: '1960-06-15' })
            expect(calc(fs)).toBe(65)
        })

        it('returns null for invalid date string', () => {
            const fs = buildFormState({ dob: 'not-a-date' })
            expect(calc(fs)).toBe(null)
        })

        it('returns correct age from full scenario fixtures', () => {
            expect(calc(HEALTHY_MALE_65)).toBe(65)
            expect(calc(HEALTHY_FEMALE_75)).toBe(75)
            expect(calc(AT_RISK_FEMALE_92)).toBe(92)
            expect(calc(BORDERLINE_MALE_55)).toBe(55)
        })
    })

    // ==================== Trial Mean ====================

    describe('fiveMeterUsualWalkingSpeedMean (trialMean)', () => {
        const calc = CALCULATION_SECTION_CONFIGS.fiveMeterUsualWalkingSpeedMean.valueFunction

        it('returns null for empty formState', () => {
            expect(calc(EMPTY_FORM_STATE)).toBe(null)
        })

        it('returns null for missing measurement', () => {
            expect(calc(VITALS_ONLY)).toBe(null)
        })

        it('returns null for empty value', () => {
            expect(calc(NULL_MEASUREMENTS_FORM_STATE)).toBe(null)
        })

        it('calculates mean of two trials', () => {
            // HEALTHY_MALE_65: trials [4.0, 4.2] → mean = 4.1
            const result = calc(HEALTHY_MALE_65)
            expect(result).toBe('4.10')
        })

        it('calculates mean of two trials (second fixture)', () => {
            // HEALTHY_FEMALE_75: trials [5.0, 4.8] → mean = 4.9
            expect(calc(HEALTHY_FEMALE_75)).toBe('4.90')
        })

        it('calculates mean across multiple measurement instances', () => {
            // MULTI_INSTANCE_MALE_75: instance 1 [5.0, 5.2], instance 2 [4.8, 5.0]
            // all trials: [5.0, 5.2, 4.8, 5.0] → mean = 5.0
            expect(calc(MULTI_INSTANCE_MALE_75)).toBe('5.00')
        })

        it('handles single trial', () => {
            const fs = buildFormState({ usualWalkTrials: [4.5] })
            expect(calc(fs)).toBe('4.50')
        })

        it('skips null/empty trials in mean', () => {
            const fs = buildFormState({ usualWalkTrials: [4.0, null, '', 4.2] })
            expect(calc(fs)).toBe('4.10')
        })
    })

    // ==================== Trial Best ====================

    describe('fiveMeterFastWalkingSpeedBest (trialBest)', () => {
        const calc = CALCULATION_SECTION_CONFIGS.fiveMeterFastWalkingSpeedBest.valueFunction

        it('returns null for empty formState', () => {
            expect(calc(EMPTY_FORM_STATE)).toBe(null)
        })

        it('finds best (minimum) of trials', () => {
            // HEALTHY_MALE_65: trials [3.2, 3.0] → best = 3.0
            expect(calc(HEALTHY_MALE_65)).toBe('3.00')
        })

        it('finds best across different values', () => {
            // AT_RISK_FEMALE_92: trials [6.0, 5.5] → best = 5.5
            expect(calc(AT_RISK_FEMALE_92)).toBe('5.50')
        })

        it('handles single trial', () => {
            const fs = buildFormState({ fastWalkTrials: [3.5] })
            expect(calc(fs)).toBe('3.50')
        })

        it('skips null/empty in best calculation', () => {
            const fs = buildFormState({ fastWalkTrials: [null, '', 3.5, 4.0] })
            expect(calc(fs)).toBe('3.50')
        })
    })

    describe('fourSquareStepTestBest (trialBest)', () => {
        const calc = CALCULATION_SECTION_CONFIGS.fourSquareStepTestBest.valueFunction

        it('returns null for empty formState', () => {
            expect(calc(EMPTY_FORM_STATE)).toBe(null)
        })

        it('finds best', () => {
            // HEALTHY_MALE_65: [9.0, 8.5] → 8.5
            expect(calc(HEALTHY_MALE_65)).toBe('8.50')
        })
    })

    describe('modifiedFourSquareStepTestBest (trialBest)', () => {
        const calc = CALCULATION_SECTION_CONFIGS.modifiedFourSquareStepTestBest.valueFunction

        it('returns null for empty formState', () => {
            expect(calc(EMPTY_FORM_STATE)).toBe(null)
        })

        it('finds best', () => {
            const fs = buildFormState({ mfsstTrials: [12.0, 11.5] })
            expect(calc(fs)).toBe('11.50')
        })
    })

    describe('timedUpAndGoBest (trialBest)', () => {
        const calc = CALCULATION_SECTION_CONFIGS.timedUpAndGoBest.valueFunction

        it('returns null for empty formState', () => {
            expect(calc(EMPTY_FORM_STATE)).toBe(null)
        })

        it('finds best', () => {
            // HEALTHY_MALE_65: [8.0, 7.5] → 7.5
            expect(calc(HEALTHY_MALE_65)).toBe('7.50')
        })
    })

    // ==================== Field Best ====================

    describe('timedUpAndGoCognitiveBest (fieldBest, index 0)', () => {
        const calc = CALCULATION_SECTION_CONFIGS.timedUpAndGoCognitiveBest.valueFunction

        it('returns null for empty formState', () => {
            expect(calc(EMPTY_FORM_STATE)).toBe(null)
        })

        it('returns the time field (index 0) best', () => {
            // HEALTHY_MALE_65: [[10.0, 1]] → field[0] = 10.0
            expect(calc(HEALTHY_MALE_65)).toBe('10.00')
        })

        it('finds best across multiple instances', () => {
            const fs = {
                timedUpAndGoCognitive: [
                    { label: 'TUG-C 1', value: [12.0, 2], lastModified: '' },
                    { label: 'TUG-C 2', value: [10.5, 1], lastModified: '' },
                ]
            }
            expect(calc(fs)).toBe('10.50')
        })

        it('skips null field values', () => {
            const fs = {
                timedUpAndGoCognitive: [
                    { label: 'TUG-C 1', value: [null, 2], lastModified: '' },
                    { label: 'TUG-C 2', value: [10.5, 1], lastModified: '' },
                ]
            }
            expect(calc(fs)).toBe('10.50')
        })
    })

    // ==================== Metadata ====================

    describe('config metadata (labels and units)', () => {
        it('has correct labels', () => {
            expect(CALCULATION_SECTION_CONFIGS.age.label).toBe('Age')
            expect(CALCULATION_SECTION_CONFIGS.fiveMeterUsualWalkingSpeedMean.label).toBe('5 Meter Usual Walking Speed - Mean')
            expect(CALCULATION_SECTION_CONFIGS.fiveMeterFastWalkingSpeedBest.label).toBe('5 Meter Fast Walking Speed - Best')
            expect(CALCULATION_SECTION_CONFIGS.fourSquareStepTestBest.label).toBe('Four Square Step Test - Best')
            expect(CALCULATION_SECTION_CONFIGS.modifiedFourSquareStepTestBest.label).toBe('Modified Four Square Step Test - Best')
            expect(CALCULATION_SECTION_CONFIGS.timedUpAndGoBest.label).toBe('Timed Up and Go (TUG) - Best')
            expect(CALCULATION_SECTION_CONFIGS.timedUpAndGoCognitiveBest.label).toBe('Timed Up and Go Cognitive Dual Task - Best')
        })

        it('has correct units', () => {
            expect(CALCULATION_SECTION_CONFIGS.age.unit).toBe('years')
            expect(CALCULATION_SECTION_CONFIGS.fiveMeterUsualWalkingSpeedMean.unit).toBe('s')
            expect(CALCULATION_SECTION_CONFIGS.fiveMeterFastWalkingSpeedBest.unit).toBe('s')
            expect(CALCULATION_SECTION_CONFIGS.fourSquareStepTestBest.unit).toBe('s')
            expect(CALCULATION_SECTION_CONFIGS.timedUpAndGoBest.unit).toBe('s')
            expect(CALCULATION_SECTION_CONFIGS.timedUpAndGoCognitiveBest.unit).toBe('s')
        })
    })

    // ==================== Full Scenario Snapshots ====================

    describe('full scenario snapshots', () => {
        const allCalcKeys = Object.keys(CALCULATION_SECTION_CONFIGS)

        function computeAll(formState) {
            const results = {}
            for (const key of allCalcKeys) {
                results[key] = CALCULATION_SECTION_CONFIGS[key].valueFunction(formState)
            }
            return results
        }

        it('empty form state', () => {
            expect(computeAll(EMPTY_FORM_STATE)).toMatchSnapshot()
        })

        it('null measurements', () => {
            expect(computeAll(NULL_MEASUREMENTS_FORM_STATE)).toMatchSnapshot()
        })

        it('healthy male 65', () => {
            expect(computeAll(HEALTHY_MALE_65)).toMatchSnapshot()
        })

        it('healthy female 75', () => {
            expect(computeAll(HEALTHY_FEMALE_75)).toMatchSnapshot()
        })

        it('at risk female 92', () => {
            expect(computeAll(AT_RISK_FEMALE_92)).toMatchSnapshot()
        })

        it('borderline male 55', () => {
            expect(computeAll(BORDERLINE_MALE_55)).toMatchSnapshot()
        })

        it('multi instance male 75', () => {
            expect(computeAll(MULTI_INSTANCE_MALE_75)).toMatchSnapshot()
        })

        it('vitals only', () => {
            expect(computeAll(VITALS_ONLY)).toMatchSnapshot()
        })

        it('no demographics', () => {
            expect(computeAll(NO_DEMOGRAPHICS)).toMatchSnapshot()
        })

        it('young patient', () => {
            expect(computeAll(YOUNG_PATIENT)).toMatchSnapshot()
        })

        it('very slow male 75', () => {
            expect(computeAll(VERY_SLOW_MALE_75)).toMatchSnapshot()
        })
    })
})
