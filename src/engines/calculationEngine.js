// Evaluates calculation configs from calculations.yaml against formState.

function collectTrials(formState, measurementKey) {
    const measurements = formState[measurementKey]
    if (!measurements || measurements.length === 0) return []

    const allTrials = []
    for (const measurement of measurements) {
        const value = measurement.value
        if (Array.isArray(value)) {
            for (const trial of value) {
                if (trial !== null && trial !== undefined && trial !== '') {
                    const num = parseFloat(trial)
                    if (!isNaN(num)) allTrials.push(num)
                }
            }
        }
    }
    return allTrials
}

function computeTrialMean(formState, measurementKey, decimalPlaces) {
    const allTrials = collectTrials(formState, measurementKey)
    if (allTrials.length === 0) return null
    const sum = allTrials.reduce((a, b) => a + b, 0)
    return (sum / allTrials.length).toFixed(decimalPlaces)
}

function computeTrialMin(formState, measurementKey, decimalPlaces) {
    const allTrials = collectTrials(formState, measurementKey)
    if (allTrials.length === 0) return null
    return Math.min(...allTrials).toFixed(decimalPlaces)
}

function computeTrialMax(formState, measurementKey, decimalPlaces) {
    const allTrials = collectTrials(formState, measurementKey)
    if (allTrials.length === 0) return null
    return Math.max(...allTrials).toFixed(decimalPlaces)
}

function collectFieldValues(formState, measurementKey, fieldIndex) {
    const measurements = formState[measurementKey]
    if (!measurements || measurements.length === 0) return []

    const values = []
    for (const measurement of measurements) {
        const value = measurement.value
        if (Array.isArray(value) && value[fieldIndex] !== null && value[fieldIndex] !== undefined && value[fieldIndex] !== '') {
            const num = parseFloat(value[fieldIndex])
            if (!isNaN(num)) values.push(num)
        }
    }
    return values
}

function computeFieldMin(formState, measurementKey, fieldIndex, decimalPlaces) {
    const values = collectFieldValues(formState, measurementKey, fieldIndex)
    if (values.length === 0) return null
    return Math.min(...values).toFixed(decimalPlaces)
}

function computeFieldMax(formState, measurementKey, fieldIndex, decimalPlaces) {
    const values = collectFieldValues(formState, measurementKey, fieldIndex)
    if (values.length === 0) return null
    return Math.max(...values).toFixed(decimalPlaces)
}

function computeAgeFromDob(formState, measurementKey) {
    const dob = formState[measurementKey]?.[0]?.value
    if (!dob || !Date.parse(dob)) return null
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }
    return age
}

function resolveFieldIndex(config, measurementsConfig) {
    if (config.field_index !== undefined) return config.field_index
    if (!config.field_label) return undefined

    const measurement = measurementsConfig?.[config.from_measurement]
    if (!measurement?.fields) {
        throw new Error(
            `Calculation references field_label "${config.field_label}" but measurement "${config.from_measurement}" has no inline fields.`
        )
    }

    const matches = measurement.fields.map((f, i) => ({ ...f, index: i })).filter(f => f.label === config.field_label)
    if (matches.length === 0) {
        throw new Error(
            `field_label "${config.field_label}" not found in measurement "${config.from_measurement}". ` +
            `Available labels: ${measurement.fields.map(f => f.label).filter(Boolean).join(', ')}`
        )
    }
    if (matches.length > 1) {
        throw new Error(
            `field_label "${config.field_label}" is ambiguous in measurement "${config.from_measurement}" because multiple fields share the same label. ` +
            `Matching field indices: ${matches.map(m => m.index).join(', ')}.`
        )
    }
    return matches[0].index
}

const OPERATIONS = {
    age_from_date_of_birth: (formState, config) =>
        computeAgeFromDob(formState, config.from_measurement),

    trial_mean: (formState, config) =>
        computeTrialMean(formState, config.from_measurement, config.decimal_places ?? 2),

    trial_min: (formState, config) =>
        computeTrialMin(formState, config.from_measurement, config.decimal_places ?? 2),

    trial_max: (formState, config) =>
        computeTrialMax(formState, config.from_measurement, config.decimal_places ?? 2),

    field_min: (formState, config) =>
        computeFieldMin(formState, config.from_measurement, config._resolvedFieldIndex, config.decimal_places ?? 2),

    field_max: (formState, config) =>
        computeFieldMax(formState, config.from_measurement, config._resolvedFieldIndex, config.decimal_places ?? 2),
}

export function buildCalculationConfigs(yamlConfig, measurementsConfig) {
    const configs = {}
    for (const [key, config] of Object.entries(yamlConfig)) {
        const operation = OPERATIONS[config.operation]
        if (!operation) {
            throw new Error(`Unknown calculation operation: "${config.operation}" for key "${key}"`)
        }

        if (config.operation === 'field_min' || config.operation === 'field_max') {
            config._resolvedFieldIndex = resolveFieldIndex(config, measurementsConfig)
        }

        configs[key] = {
            label: config.label,
            unit: config.unit,
            valueFunction: (formState) => operation(formState, config),
        }
    }
    return configs
}
