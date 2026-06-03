// Converts measurements.yaml into the runtime MEASUREMENT_CONFIGS shape.

import { buildValidationFunction } from './validationEngine'
import { evaluate } from './conditionEngine'

function buildComputedFields(computedDisplayConfig) {
    if (!computedDisplayConfig || computedDisplayConfig.length === 0) return undefined

    return (value) => {
        const results = {}
        for (const display of computedDisplayConfig) {
            if (!value) {
                results[display.label] = 'N/A'
                continue
            }
            if (display.formula === 'divide' && display.denominator_from === 'value') {
                const denominator = parseFloat(value)
                if (!denominator || isNaN(denominator)) {
                    results[display.label] = 'N/A'
                } else {
                    results[display.label] = `${(display.numerator / denominator).toFixed(display.decimal_places)} ${display.unit}`
                }
            }
        }
        return results
    }
}

function buildDisabledCases(yamlConfig, fieldMappings) {
    const disabledCasesComputed = []
    const disabledCases = []

    if (yamlConfig.disabled_cases) {
        for (const dc of yamlConfig.disabled_cases) {
            if (!dc.show_when) {
                throw new Error(`disabled_cases entry missing "show_when" conditions: "${dc.text}"`)
            }
            disabledCasesComputed.push({
                text: dc.text,
                showOverride: (formState, validations) => {
                    const context = { formState, validations, fieldMappings }
                    return evaluate(dc.show_when, context)
                }
            })
        }
    }

    if (yamlConfig.static_disabled_cases) {
        disabledCases.push(...yamlConfig.static_disabled_cases)
    }

    return { disabledCasesComputed, disabledCases }
}

function buildInlineField(fieldYaml) {
    const field = {
        type: fieldYaml.type,
    }
    if (fieldYaml.label) field.defaultLabel = fieldYaml.label
    if (fieldYaml.placeholder) field.placeholder = fieldYaml.placeholder
    if (fieldYaml.min !== undefined) field.min = fieldYaml.min
    if (fieldYaml.max !== undefined) field.max = fieldYaml.max
    if (fieldYaml.unit) field.unit = fieldYaml.unit
    if (fieldYaml.counter_buttons) field.counterButtons = fieldYaml.counter_buttons
    if (fieldYaml.duration) field.duration = fieldYaml.duration
    if (fieldYaml.display_only) field.displayOnly = true

    const validationFn = buildValidationFunction(fieldYaml.validation)
    if (validationFn) field.validationFunction = validationFn

    return field
}

export function buildMeasurementConfigs(yamlConfig, instructionsMap, fieldMappings) {
    const configs = {}

    for (const [key, yaml] of Object.entries(yamlConfig)) {
        // Keys starting with _ are YAML anchor definitions, not measurements.
        if (key.startsWith('_')) continue
        const config = {
            type: yaml.type,
            defaultLabel: yaml.label,
        }

        if (yaml.placeholder) config.placeholder = yaml.placeholder
        if (yaml.min !== undefined) config.min = yaml.min
        if (yaml.max !== undefined) config.max = yaml.max
        if (yaml.unit) config.unit = yaml.unit
        if (yaml.options) config.options = yaml.options
        if (yaml.num_trials) config.numTrials = yaml.num_trials
        if (yaml.trial_names) config.trialNames = yaml.trial_names

        if (yaml.instructions && instructionsMap[yaml.instructions]) {
            config.instructions = instructionsMap[yaml.instructions]
        }

        if (yaml.validation) {
            const validationFn = buildValidationFunction(yaml.validation)
            if (validationFn) config.validationFunction = validationFn
        } else if (yaml.options) {
            config.validationFunction = (value) => yaml.options.includes(value)
        }

        if (yaml.field_names) {
            config.fieldNames = yaml.field_names
        }

        if (yaml.fields) {
            config.fields = yaml.fields.map(buildInlineField)
        }

        const computedFields = buildComputedFields(yaml.computed_display)
        if (computedFields) config.computedFields = computedFields

        const { disabledCasesComputed, disabledCases } = buildDisabledCases(yaml, fieldMappings)
        if (disabledCasesComputed.length > 0) config.disabledCasesComputed = disabledCasesComputed
        if (disabledCases.length > 0) config.disabledCases = disabledCases

        if (yaml.action_button) {
            config.actionButton = {
                text: yaml.action_button.text,
                targetMeasurement: yaml.action_button.navigate_to,
                bypassDisabledCaseIndices: yaml.action_button.bypass_disabled_indices,
            }
        }

        configs[key] = config
    }

    return configs
}
