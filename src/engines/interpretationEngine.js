// Walks rule chains from interpretations.yaml top-to-bottom, accumulating messages.

import { evaluate } from './conditionEngine'

const SEVERITY_MAP = {
    normal: 'success',
    caution: 'warning',
    concern: 'danger',
    info: 'secondary',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    secondary: 'secondary',
}

function mapSeverity(severity) {
    return SEVERITY_MAP[severity] || severity
}

// Parses bracket keys like "50-59" or "90+" to match an age.
function getAgeBracket(age, table) {
    if (age === null || age === undefined) return null

    const sexKey = table.Male ? 'Male' : table.Female ? 'Female' : null
    if (!sexKey) return null
    const brackets = Object.keys(table[sexKey])

    for (const bracket of brackets) {
        if (bracket.endsWith('+')) {
            const min = parseInt(bracket, 10)
            if (age >= min) return bracket
        } else {
            const [min, max] = bracket.split('-').map(Number)
            if (age >= min && age <= max) return bracket
        }
    }
    return null
}

function resolveLetValue(letConfig, context) {
    let value = null

    if (letConfig.from_calculation) {
        const calcConfigs = context.calculationConfigs
        if (calcConfigs?.[letConfig.from_calculation]) {
            const result = calcConfigs[letConfig.from_calculation].valueFunction(context.formState)
            if (result !== null) {
                value = parseFloat(result)
                if (isNaN(value)) value = null
            }
        }
    } else if (letConfig.from_measurement) {
        const measurement = context.formState?.[letConfig.from_measurement]
        if (measurement?.[0]?.value != null && measurement[0].value !== '') {
            value = parseFloat(measurement[0].value)
            if (isNaN(value)) value = null
        }
    } else if (letConfig.from_variable) {
        value = context.variables?.[letConfig.from_variable] ?? null
    }

    // TODO: time_to_speed is the only conversion. If more are needed, make conversions declarative.
    if (value !== null && letConfig.convert === 'time_to_speed' && letConfig.distance_meters) {
        if (value > 0) {
            value = letConfig.distance_meters / value
        } else {
            value = null
        }
    }

    return value
}

function lookupThreshold(config, context) {
    let value = null
    if (config.value_from_variable) {
        value = context.variables?.[config.value_from_variable] ?? null
    } else if (config.value_from_calculation) {
        const calcConfigs = context.calculationConfigs
        const key = config.value_from_calculation
        if (calcConfigs?.[key]) {
            const result = calcConfigs[key].valueFunction(context.formState)
            if (result !== null) {
                value = parseFloat(result)
                if (isNaN(value)) value = null
            }
        }
    }
    if (value === null) return []

    let sex = null
    if (config.patient_sex_from) {
        const parts = config.patient_sex_from.split('.')
        if (parts[0] === 'measurement') {
            sex = context.formState?.[parts[1]]?.[0]?.value || null
        }
    }

    let age = null
    if (config.patient_age_from) {
        const parts = config.patient_age_from.split('.')
        if (parts[0] === 'calculation') {
            const calcConfigs = context.calculationConfigs
            if (calcConfigs?.[parts[1]]) {
                age = calcConfigs[parts[1]].valueFunction(context.formState)
            }
        }
    }

    if (!sex || age === null) return []

    const table = context.thresholds?.[config.table]
    if (!table) return []

    const ageBracket = getAgeBracket(age, table)
    if (!ageBracket) return []

    const entry = table[sex]?.[ageBracket]
    if (!entry) return []

    const compareAs = table.compare_as
    const unit = table.unit ? ` ${table.unit}` : ''
    const decimals = Number.isInteger(table.decimals) ? table.decimals : 2
    const fmt = (n) => n.toFixed(decimals)

    const zoneDefaults = context.thresholds.zone_defaults
    const yellowBoundary = compareAs === 'higher_is_better'
        ? entry.mean - zoneDefaults.yellow_sd * entry.sd
        : entry.mean + zoneDefaults.yellow_sd * entry.sd
    const redBoundary = compareAs === 'higher_is_better'
        ? entry.mean - zoneDefaults.red_sd * entry.sd
        : entry.mean + zoneDefaults.red_sd * entry.sd

    let zone
    if (compareAs === 'higher_is_better') {
        if (value >= yellowBoundary) zone = 'green'
        else if (value >= redBoundary) zone = 'yellow'
        else zone = 'red'
    } else {
        if (value <= yellowBoundary) zone = 'green'
        else if (value <= redBoundary) zone = 'yellow'
        else zone = 'red'
    }

    const cutoffLine = (() => {
        if (compareAs === 'higher_is_better') {
            if (zone === 'green') return `Green Zone (>= ${fmt(yellowBoundary)}${unit})`
            if (zone === 'yellow') return `Yellow Zone (< ${fmt(yellowBoundary)}${unit})`
            return `Red Zone (< ${fmt(redBoundary)}${unit})`
        }
        if (zone === 'green') return `Green Zone (<= ${fmt(yellowBoundary)}${unit})`
        if (zone === 'yellow') return `Yellow Zone (> ${fmt(yellowBoundary)}${unit})`
        return `Red Zone (> ${fmt(redBoundary)}${unit})`
    })()

    const severityByZone = { green: 'success', yellow: 'warning', red: 'danger' }
    const refLine = `Reference Mean ${entry.mean} (Ages ${ageBracket}) Standard Deviation ${entry.sd}`
    const text = `${cutoffLine}\n${refLine}\n${zoneDefaults.descriptions[zone]}`

    return [{ text, type: severityByZone[zone] }]
}

export function executeInterpretation(interpConfig, context) {
    if (!interpConfig.rules) return null

    const messages = []
    const localContext = { ...context, variables: { ...(context.variables || {}) } }

    for (const rule of interpConfig.rules) {
        if (rule.when && rule.then === 'skip') {
            if (evaluate(rule.when, localContext)) {
                return null
            }
            continue
        }

        if (rule.when && rule.show_message) {
            if (evaluate(rule.when, localContext)) {
                messages.push({
                    text: rule.show_message.text,
                    type: mapSeverity(rule.show_message.severity),
                })
            }
            continue
        }

        if (rule.let) {
            for (const [varName, letConfig] of Object.entries(rule.let)) {
                localContext.variables[varName] = resolveLetValue(letConfig, localContext)
            }
            continue
        }

        if (rule.lookup_threshold) {
            const thresholdMessages = lookupThreshold(rule.lookup_threshold, localContext)
            messages.push(...thresholdMessages)
            continue
        }

        // "otherwise" fires only if no messages accumulated yet
        if (rule.otherwise) {
            if (messages.length === 0) {
                if (rule.otherwise.show_message) {
                    messages.push({
                        text: rule.otherwise.show_message.text,
                        type: mapSeverity(rule.otherwise.show_message.severity),
                    })
                }
            }
            continue
        }

        if (rule.check_interpretation) {
            const otherKey = rule.check_interpretation.interpretation
            const otherConfig = context.allInterpretations?.[otherKey]
            if (otherConfig) {
                const otherResult = executeInterpretation({ rules: otherConfig._rules || otherConfig.rules }, localContext)
                if (!otherResult) {
                    if (rule.check_interpretation.when_null === 'skip') {
                        return null
                    }
                    continue
                }

                if (rule.check_interpretation.when_message_includes) {
                    const hasMatch = otherResult.some(msg =>
                        msg.text.includes(rule.check_interpretation.when_message_includes)
                    )
                    if (hasMatch && rule.check_interpretation.show_message) {
                        messages.push({
                            text: rule.check_interpretation.show_message.text,
                            type: mapSeverity(rule.check_interpretation.show_message.severity),
                        })
                    }
                    if (!hasMatch && rule.check_interpretation.otherwise === 'skip') {
                        return null
                    }
                }
            }
            continue
        }
    }

    return messages.length > 0 ? messages : null
}

export function buildInterpretationConfigs(yamlConfig, thresholds, calculationConfigs, fieldMappings) {
    const configs = {}

    // First pass builds configs without messageFunction so cross-references resolve.
    for (const [key, config] of Object.entries(yamlConfig)) {
        if (config.rules) {
            const otherwiseIndex = config.rules.findIndex(r => r.otherwise)
            if (otherwiseIndex !== -1 && otherwiseIndex !== config.rules.length - 1) {
                throw new Error(`interpretations.yaml: "${key}" has an "otherwise" rule at position ${otherwiseIndex + 1} of ${config.rules.length}. "otherwise" must be the last rule in the chain.`)
            }
        }

        configs[key] = {
            label: config.label,
            citation: config.citation,
            _rules: config.rules,
        }
    }

    for (const [key, config] of Object.entries(configs)) {
        configs[key].messageFunction = (formState) => {
            const context = {
                formState,
                calculationConfigs,
                thresholds,
                fieldMappings,
                variables: {},
                allInterpretations: configs,
            }
            return executeInterpretation({ rules: config._rules }, context)
        }
    }

    return configs
}
