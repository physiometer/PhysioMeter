import { describe, it, expect } from 'vitest'
import { MEASUREMENT_GROUP_MAP, getInterpretationKeysForMeasurement } from '../../utils/measurementGroupMapping'
import { PT_TEST_CONFIG } from '../../components/physical-therapy-tests/PhysicalTherapyTestFactory'

// These tests verify the YAML-loaded configs match the expected runtime shapes.
// They serve as a safety net during and after migration.

describe('YAML Config Parity: MEASUREMENT_GROUP_MAP', () => {
    it('has the correct number of entries', () => {
        expect(MEASUREMENT_GROUP_MAP).toHaveLength(12)
    })

    it('has the correct shape for each entry', () => {
        for (const entry of MEASUREMENT_GROUP_MAP) {
            expect(entry).toHaveProperty('stateKey')
            expect(entry).toHaveProperty('name')
            expect(typeof entry.name).toBe('string')
            expect(entry).toHaveProperty('calculationKeys')
            expect(entry).toHaveProperty('interpretationKeys')
            expect(Array.isArray(entry.calculationKeys)).toBe(true)
            expect(Array.isArray(entry.interpretationKeys)).toBe(true)
        }
    })

    it('has correct patient-level entries', () => {
        const patientLevel = MEASUREMENT_GROUP_MAP.filter(e => e.patientLevel)
        expect(patientLevel).toHaveLength(3)
        expect(patientLevel.map(e => e.stateKey)).toEqual(['name', 'dob', 'sex'])
    })

    it('maps dob to age calculation', () => {
        const dob = MEASUREMENT_GROUP_MAP.find(e => e.stateKey === 'dob')
        expect(dob.calculationKeys).toEqual(['age'])
        expect(dob.interpretationKeys).toEqual([])
    })

    it('maps vitalSigns to correct interpretations', () => {
        const vs = MEASUREMENT_GROUP_MAP.find(e => e.stateKey === 'vitalSigns')
        expect(vs.calculationKeys).toEqual([])
        expect(vs.interpretationKeys).toEqual(['vitalSigns', 'annualMobilityAssessment'])
    })

    it('maps fiveMeterUsualWalkingSpeed correctly', () => {
        const m = MEASUREMENT_GROUP_MAP.find(e => e.stateKey === 'fiveMeterUsualWalkingSpeed')
        expect(m.calculationKeys).toEqual(['fiveMeterUsualWalkingSpeedMean'])
        expect(m.interpretationKeys).toEqual(['usualWalkingSpeed'])
    })

    it('maps fiveMeterFastWalkingSpeed correctly', () => {
        const m = MEASUREMENT_GROUP_MAP.find(e => e.stateKey === 'fiveMeterFastWalkingSpeed')
        expect(m.calculationKeys).toEqual(['fiveMeterFastWalkingSpeedBest'])
        expect(m.interpretationKeys).toEqual(['fastWalkingSpeed'])
    })

    it('maps thirtySecondSitToStand correctly', () => {
        const m = MEASUREMENT_GROUP_MAP.find(e => e.stateKey === 'thirtySecondSitToStand')
        expect(m.calculationKeys).toEqual(['thirtySecondSitToStandCount'])
        expect(m.interpretationKeys).toEqual(['thirtySecondSitToStand'])
    })

    it('maps fourSquareStepTest correctly', () => {
        const m = MEASUREMENT_GROUP_MAP.find(e => e.stateKey === 'fourSquareStepTest')
        expect(m.calculationKeys).toEqual(['fourSquareStepTestBest'])
        expect(m.interpretationKeys).toEqual(['fourSquareStepTest'])
    })

    it('maps timedUpAndGo correctly', () => {
        const m = MEASUREMENT_GROUP_MAP.find(e => e.stateKey === 'timedUpAndGo')
        expect(m.calculationKeys).toEqual(['timedUpAndGoBest'])
        expect(m.interpretationKeys).toEqual(['timedUpAndGo'])
    })

    it('maps timedUpAndGoCognitive correctly', () => {
        const m = MEASUREMENT_GROUP_MAP.find(e => e.stateKey === 'timedUpAndGoCognitive')
        expect(m.calculationKeys).toEqual(['timedUpAndGoCognitiveBest'])
        expect(m.interpretationKeys).toEqual(['timedUpAndGoCognitive'])
    })

    it('getInterpretationKeysForMeasurement works correctly', () => {
        expect(getInterpretationKeysForMeasurement('vitalSigns')).toEqual(['vitalSigns', 'annualMobilityAssessment'])
        expect(getInterpretationKeysForMeasurement('fiveMeterUsualWalkingSpeed')).toEqual(['usualWalkingSpeed'])
        expect(getInterpretationKeysForMeasurement('thirtySecondSitToStand')).toEqual(['thirtySecondSitToStand'])
        expect(getInterpretationKeysForMeasurement('nonexistent')).toEqual([])
    })

    it('preserves correct ordering', () => {
        const keys = MEASUREMENT_GROUP_MAP.map(e => e.stateKey)
        expect(keys).toEqual([
            'name', 'dob', 'sex', 'vitalSigns',
            'fiveMeterUsualWalkingSpeed', 'fiveMeterFastWalkingSpeed',
            'thirtySecondSitToStand', 'assistiveDevices',
            'fourSquareStepTest', 'modifiedFourSquareStepTest',
            'timedUpAndGo', 'timedUpAndGoCognitive',
        ])
    })
})

describe('YAML Config Parity: PT_TEST_CONFIG', () => {
    it('has the correct number of test configs', () => {
        expect(PT_TEST_CONFIG).toHaveLength(2)
    })

    it('has correct shape for each entry', () => {
        for (const entry of PT_TEST_CONFIG) {
            expect(entry).toHaveProperty('testKey')
            expect(entry).toHaveProperty('defaultTestName')
            expect(entry).toHaveProperty('component')
            expect(entry).not.toHaveProperty('homePageComponent')
        }
    })

    it('measurements test has no restrictions', () => {
        const m = PT_TEST_CONFIG.find(c => c.testKey === 'measurements')
        expect(m.defaultTestName).toBe('Measurements')
        expect(m.permittedMeasurements).toBe(null)
    })

    it('annualMobilityAssessment test has correct restrictions', () => {
        const m = PT_TEST_CONFIG.find(c => c.testKey === 'annualMobilityAssessment')
        expect(m.defaultTestName).toBe('Annual Mobility Assessment')
        expect(m.permittedMeasurements).toEqual([
            'vitalSigns',
            'fiveMeterUsualWalkingSpeed',
            'fiveMeterFastWalkingSpeed',
            'thirtySecondSitToStand',
            'assistiveDevices',
            'fourSquareStepTest',
            'modifiedFourSquareStepTest',
            'timedUpAndGo',
            'timedUpAndGoCognitive',
        ])
    })
})
