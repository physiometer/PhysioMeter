import { MEASUREMENT_CONFIGS } from '../components/measurements/MeasurementFactory'
import { CALCULATION_SECTION_CONFIGS } from '../components/calculations/CalculationFactory'
import { INTERPRETATION_SECTION_CONFIGS } from '../components/interpretations/InterpretationFactory'

export function downloadCSV(rows, filename) {
    const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}

export function generateMeasurementsCSVRows(formState, isDisabled) {
    const rows = [['Measurement', 'Field', 'Value', 'Status', 'Last Measured']]

    const formatDate = (isoString) => {
        if (!isoString) return ''
        const date = new Date(isoString)
        return date.toLocaleString()
    }

    Object.entries(formState).forEach(([key, measurements]) => {
        if (!measurements || measurements.length === 0) return

        const config = MEASUREMENT_CONFIGS[key]
        if (!config) return

        const label = config.defaultLabel || key
        const unit = config.unit || ''

        measurements.forEach((measurement, index) => {
            const disabled = isDisabled(key, index)
            const value = measurement.value
            const lastModified = formatDate(measurement.lastModified)

            if (disabled) {
                rows.push([label, '', '', 'Skipped', lastModified])
                return
            }

            if (config.type === 'fields' && (config.fields || config.fieldNames)) {
                const fields = config.fields || config.fieldNames?.map(fn => MEASUREMENT_CONFIGS[fn])
                fields.forEach((field, idx) => {
                    const fieldValue = Array.isArray(value) ? value[idx] : value
                    const fieldLabel = field?.defaultLabel || (config.fieldNames ? MEASUREMENT_CONFIGS[config.fieldNames[idx]]?.defaultLabel : `Field ${idx + 1}`)
                    const fieldUnit = field?.unit || MEASUREMENT_CONFIGS[config.fieldNames?.[idx]]?.unit || ''
                    const displayValue = fieldValue != null && fieldValue !== '' ? `${fieldValue}${fieldUnit ? ` ${fieldUnit}` : ''}` : ''
                    rows.push([label, fieldLabel, displayValue, displayValue ? 'Recorded' : 'Missing', lastModified])
                })
            } else if (Array.isArray(value)) {
                value.forEach((v, idx) => {
                    const displayValue = v != null && v !== '' ? `${v}${unit ? ` ${unit}` : ''}` : ''
                    rows.push([label, `Trial ${idx + 1}`, displayValue, displayValue ? 'Recorded' : 'Missing', lastModified])
                })
            } else {
                const displayValue = value != null && value !== '' ? `${value}${unit ? ` ${unit}` : ''}` : ''
                rows.push([label, '', displayValue, displayValue ? 'Recorded' : 'Missing', lastModified])
            }
        })
    })

    return rows
}

export function generateCalculationsCSVRows(formState, validations, disabledValues) {
    const rows = [['Calculation', 'Value', 'Unit']]

    Object.entries(CALCULATION_SECTION_CONFIGS).forEach(([key, config]) => {
        const value = config.valueFunction(formState, validations, disabledValues)
        if (value === null) return
        rows.push([config.label, value, config.unit || ''])
    })

    return rows
}

export function generateInterpretationsCSVRows(formState, validations, disabledValues) {
    const rows = [['Interpretation', 'Message', 'Type']]

    Object.entries(INTERPRETATION_SECTION_CONFIGS).forEach(([key, config]) => {
        const messages = config.messageFunction(formState, validations, disabledValues)
        if (!messages || messages.length === 0) return
        messages.forEach(msg => {
            rows.push([config.label, msg.text, msg.type])
        })
    })

    return rows
}
