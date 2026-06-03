#!/usr/bin/env node

// Cross-file config reference validation.
// Checks referential integrity across all YAML config files.
// Modular: each check is an independent function. Add new checks at the bottom.
//
// Usage: node scripts/validate-config-refs.js

import { readFileSync, existsSync } from 'fs'
import { load } from 'js-yaml'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const configDir = resolve(__dirname, '../src/config')

function loadYaml(filename) {
    return load(readFileSync(resolve(configDir, filename), 'utf8'))
}

// ========== Load all configs ==========

const measurements = loadYaml('measurements.yaml')
const calculations = loadYaml('calculations.yaml')
const interpretations = loadYaml('interpretations.yaml')
const thresholds = loadYaml('thresholds.yaml')
const groups = loadYaml('measurement_groups.yaml')
const tests = loadYaml('tests.yaml')

// Filter out YAML anchor keys (prefixed with _)
const measurementKeys = Object.keys(measurements).filter(k => !k.startsWith('_'))
const calculationKeys = Object.keys(calculations)
const interpretationKeys = Object.keys(interpretations)
const thresholdKeys = Object.keys(thresholds)

const errors = []

// ========== Validation checks ==========

function checkGroupMeasurementKeysExist() {
    for (const group of groups) {
        if (!measurementKeys.includes(group.key)) {
            errors.push(`measurement_groups.yaml: group key "${group.key}" does not exist in measurements.yaml`)
        }
    }
}

function checkEveryMeasurementHasGroup() {
    const groupedKeys = new Set(groups.map(g => g.key))
    // Measurements that are sub-fields (referenced by field_names) don't need groups
    const subFieldKeys = new Set()
    for (const key of measurementKeys) {
        const m = measurements[key]
        if (m.field_names) {
            for (const fn of m.field_names) subFieldKeys.add(fn)
        }
    }
    const exemptKeys = new Set(subFieldKeys)

    for (const key of measurementKeys) {
        if (!groupedKeys.has(key) && !exemptKeys.has(key)) {
            errors.push(`measurement_groups.yaml: measurement "${key}" from measurements.yaml has no group entry`)
        }
    }
}

function checkCalculationsInExactlyOneGroup() {
    const calcToGroups = {}
    for (const group of groups) {
        for (const ck of (group.calculations || [])) {
            if (!calcToGroups[ck]) calcToGroups[ck] = []
            calcToGroups[ck].push(group.key)
        }
    }

    for (const key of calculationKeys) {
        if (!calcToGroups[key]) {
            errors.push(`measurement_groups.yaml: calculation "${key}" is not assigned to any group`)
        } else if (calcToGroups[key].length > 1) {
            errors.push(`measurement_groups.yaml: calculation "${key}" is assigned to multiple groups: ${calcToGroups[key].join(', ')}`)
        }
    }

    // Check for group references to non-existent calculations
    for (const group of groups) {
        for (const ck of (group.calculations || [])) {
            if (!calculationKeys.includes(ck)) {
                errors.push(`measurement_groups.yaml: group "${group.key}" references non-existent calculation "${ck}"`)
            }
        }
    }
}

function checkInterpretationsInExactlyOneGroup() {
    const interpToGroups = {}
    for (const group of groups) {
        for (const ik of (group.interpretations || [])) {
            if (!interpToGroups[ik]) interpToGroups[ik] = []
            interpToGroups[ik].push(group.key)
        }
    }

    for (const key of interpretationKeys) {
        if (!interpToGroups[key]) {
            errors.push(`measurement_groups.yaml: interpretation "${key}" is not assigned to any group`)
        } else if (interpToGroups[key].length > 1) {
            errors.push(`measurement_groups.yaml: interpretation "${key}" is assigned to multiple groups: ${interpToGroups[key].join(', ')}`)
        }
    }

    // Check for group references to non-existent interpretations
    for (const group of groups) {
        for (const ik of (group.interpretations || [])) {
            if (!interpretationKeys.includes(ik)) {
                errors.push(`measurement_groups.yaml: group "${group.key}" references non-existent interpretation "${ik}"`)
            }
        }
    }
}

function checkCalculationMeasurementRefs() {
    for (const [key, calc] of Object.entries(calculations)) {
        if (!measurementKeys.includes(calc.from_measurement)) {
            errors.push(`calculations.yaml: "${key}" references non-existent measurement "${calc.from_measurement}"`)
        }
    }
}

function checkCalculationFieldLabels() {
    for (const [key, calc] of Object.entries(calculations)) {
        if (calc.field_label) {
            const measurement = measurements[calc.from_measurement]
            if (!measurement?.fields) {
                errors.push(`calculations.yaml: "${key}" uses field_label but measurement "${calc.from_measurement}" has no inline fields`)
            } else {
                const labels = measurement.fields.map(f => f.label).filter(Boolean)
                if (!labels.includes(calc.field_label)) {
                    errors.push(`calculations.yaml: "${key}" references field_label "${calc.field_label}" not found in "${calc.from_measurement}". Available: ${labels.join(', ')}`)
                }
            }
        }
    }
}

function checkTestPermittedMeasurements() {
    // Permitted measurements reference group keys
    const groupKeys = new Set(groups.map(g => g.key))
    for (const test of tests) {
        if (!test.permitted_measurements) continue
        for (const key of test.permitted_measurements) {
            if (!groupKeys.has(key)) {
                errors.push(`tests.yaml: test "${test.key}" references measurement key "${key}" not found in any measurement group`)
            }
        }
    }
}

function checkTestKeysUnique() {
    const keys = tests.map(t => t.key)
    const seen = new Set()
    for (const key of keys) {
        if (seen.has(key)) {
            errors.push(`tests.yaml: duplicate test key "${key}"`)
        }
        seen.add(key)
    }
}

function checkGroupKeysUnique() {
    const keys = groups.map(g => g.key)
    const seen = new Set()
    for (const key of keys) {
        if (seen.has(key)) {
            errors.push(`measurement_groups.yaml: duplicate group key "${key}"`)
        }
        seen.add(key)
    }
}

function checkGroupsHaveNames() {
    for (const group of groups) {
        if (!group.name) {
            errors.push(`measurement_groups.yaml: group "${group.key}" is missing a "name" field`)
        }
    }
}

function checkInterpretationRuleRefs() {
    for (const [key, interp] of Object.entries(interpretations)) {
        if (!interp.rules) continue
        for (const rule of interp.rules) {
            // Check condition references in "when" blocks
            checkConditionRefs(rule.when, key)
            // Check lookup_threshold references
            if (rule.lookup_threshold) {
                const lt = rule.lookup_threshold
                if (lt.table && !thresholdKeys.includes(lt.table)) {
                    errors.push(`interpretations.yaml: "${key}" references non-existent threshold table "${lt.table}"`)
                }
                if (lt.value_from_calculation && !calculationKeys.includes(lt.value_from_calculation)) {
                    errors.push(`interpretations.yaml: "${key}" lookup_threshold references non-existent calculation "${lt.value_from_calculation}"`)
                }
            }
            // Check cross-interpretation references
            if (rule.check_interpretation) {
                const ref = rule.check_interpretation.interpretation
                if (ref && !interpretationKeys.includes(ref)) {
                    errors.push(`interpretations.yaml: "${key}" references non-existent interpretation "${ref}"`)
                }
            }
            // Check "let" sources
            if (rule.let) {
                for (const [varName, letConfig] of Object.entries(rule.let)) {
                    if (letConfig.from_calculation && !calculationKeys.includes(letConfig.from_calculation)) {
                        errors.push(`interpretations.yaml: "${key}" let.${varName} references non-existent calculation "${letConfig.from_calculation}"`)
                    }
                    if (letConfig.from_measurement) {
                        const topKey = letConfig.from_measurement.split('.')[0]
                        if (!measurementKeys.includes(topKey)) {
                            errors.push(`interpretations.yaml: "${key}" let.${varName} references non-existent measurement "${topKey}"`)
                        }
                    }
                }
            }
        }
    }
}

function checkConditionRefs(condition, interpKey) {
    if (!condition || typeof condition !== 'object') return
    if (condition.all_of) condition.all_of.forEach(c => checkConditionRefs(c, interpKey))
    if (condition.any_of) condition.any_of.forEach(c => checkConditionRefs(c, interpKey))
    if (condition.not) checkConditionRefs(condition.not, interpKey)
    if (condition.from_calculation && !calculationKeys.includes(condition.from_calculation)) {
        errors.push(`interpretations.yaml: "${interpKey}" condition references non-existent calculation "${condition.from_calculation}"`)
    }
    if (condition.from_measurement) {
        const topKey = condition.from_measurement.split('.')[0]
        if (!measurementKeys.includes(topKey)) {
            errors.push(`interpretations.yaml: "${interpKey}" condition references non-existent measurement "${topKey}"`)
        }
    }
}

function checkOtherwiseIsLastRule() {
    for (const [key, interp] of Object.entries(interpretations)) {
        if (!interp.rules) continue
        const otherwiseIndex = interp.rules.findIndex(r => r.otherwise)
        if (otherwiseIndex !== -1 && otherwiseIndex !== interp.rules.length - 1) {
            errors.push(`interpretations.yaml: "${key}" has an "otherwise" rule at position ${otherwiseIndex + 1} of ${interp.rules.length}. "otherwise" must be the last rule.`)
        }
    }
}

function checkInstructionFilesExist() {
    const instructionsDir = resolve(__dirname, '../src/components/measurements/instructions')
    for (const [key, m] of Object.entries(measurements)) {
        if (key.startsWith('_')) continue
        if (m.instructions) {
            const filePath = resolve(instructionsDir, `${m.instructions}.md`)
            if (!existsSync(filePath)) {
                errors.push(`measurements.yaml: "${key}" references instruction file "${m.instructions}" but ${m.instructions}.md does not exist in instructions/`)
            }
        }
    }
}

// ========== Run all checks ==========

const checks = [
    checkGroupMeasurementKeysExist,
    checkEveryMeasurementHasGroup,
    checkCalculationsInExactlyOneGroup,
    checkInterpretationsInExactlyOneGroup,
    checkCalculationMeasurementRefs,
    checkCalculationFieldLabels,
    checkTestPermittedMeasurements,
    checkTestKeysUnique,
    checkGroupKeysUnique,
    checkGroupsHaveNames,
    checkInterpretationRuleRefs,
    checkOtherwiseIsLastRule,
    checkInstructionFilesExist,
]

for (const check of checks) {
    check()
}

if (errors.length > 0) {
    console.error(`\nConfig validation failed with ${errors.length} error(s):\n`)
    for (const err of errors) {
        console.error(`  - ${err}`)
    }
    console.error('')
    process.exit(1)
} else {
    console.log('All cross-file config references are valid.')
}
