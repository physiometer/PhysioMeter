import { MEASUREMENT_GROUP_MAP } from '../utils/measurementGroupMapping'
import { MEASUREMENT_CONFIGS } from './measurements/MeasurementFactory'
import { CALCULATION_SECTION_CONFIGS } from './calculations/CalculationFactory'
import { INTERPRETATION_SECTION_CONFIGS } from './interpretations/InterpretationFactory'
import Calculation from './calculations/Calculation'
import Interpretation from './interpretations/Interpretation'
import Submit from './form/Submit'
import Title from './form/Title'
import { hasData } from './measurements/MeasurementSummary'
import { downloadCSV, generateMeasurementsCSVRows, generateCalculationsCSVRows, generateInterpretationsCSVRows } from '../utils/csvExport'
import { generateAndDownloadPDF } from '../utils/pdfExport'
import { confirmUnencryptedExport } from '../utils/exportConfirm'

function MeasurementCard({ measurementKey, measurement, index, config, validations, isDisabled }) {
    const label = config.defaultLabel || measurementKey
    const unit = config.unit || ''
    const disabled = isDisabled(measurementKey, index)
    const validation = validations[measurementKey]?.[index]
    const isValid = Array.isArray(validation) ? validation.every(v => v === true) : validation === true
    const value = measurement.value

    const borderColor = disabled ? 'border-warning' : (isValid ? 'border-success' : 'border-danger')
    const headerBg = disabled ? 'bg-warning' : (isValid ? 'bg-success' : 'bg-danger')

    const formatValue = (val, u) => {
        if (val === null || val === undefined || val === '') {
            return <span className="text-danger">Not recorded</span>
        }
        return <span>{val}{u ? ` ${u}` : ''}</span>
    }

    return (
        <div className={`card mb-3 ${borderColor}`} style={{ borderWidth: '2px' }}>
            <div className={`card-header ${headerBg} text-white d-flex justify-content-between align-items-center`}>
                <h5 className="mb-0">Measurement: {label}</h5>
                {disabled && <span className="badge bg-light text-dark">Skipped</span>}
                {!disabled && !isValid && <span className="badge bg-light text-danger">Incomplete</span>}
            </div>
            {!disabled && (
                <div className="card-body">
                    {config.type === 'fields' && (config.fields || config.fieldNames) ? (
                        <div className="d-flex flex-wrap justify-content-evenly gap-3">
                            {(config.fields || config.fieldNames?.map(fn => MEASUREMENT_CONFIGS[fn])).map((field, idx) => {
                                if (field?.displayOnly) return null
                                const fieldValue = Array.isArray(value) ? value[idx] : value
                                const fieldLabel = field?.defaultLabel || (config.fieldNames ? MEASUREMENT_CONFIGS[config.fieldNames[idx]]?.defaultLabel : `Field ${idx + 1}`)
                                const fieldUnit = field?.unit || MEASUREMENT_CONFIGS[config.fieldNames?.[idx]]?.unit || ''
                                const fieldValidation = Array.isArray(validations[measurementKey]?.[index]) ? validations[measurementKey][index][idx] : true
                                return (
                                    <div key={idx} className="d-flex flex-column text-center">
                                        <small className="text-muted">{fieldLabel}</small>
                                        <span className={`fs-5 ${fieldValidation ? '' : 'text-danger'}`}>
                                            {formatValue(fieldValue, fieldUnit)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    ) : Array.isArray(value) ? (
                        <div className="d-flex flex-wrap justify-content-evenly gap-3">
                            {value.map((v, idx) => {
                                const trialValid = v !== null && v !== undefined && v !== ''
                                return (
                                    <div key={idx} className="d-flex flex-column text-center">
                                        <small className="text-muted">Trial {idx + 1}</small>
                                        <span className={`fs-5 ${trialValid ? '' : 'text-danger'}`}>
                                            {formatValue(v, unit)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <h4 className={`mb-0 ${isValid ? '' : 'text-danger'} text-center`}>
                            {formatValue(value, unit)}
                        </h4>
                    )}
                </div>
            )}
            {measurement.lastModified && (
                <div className="card-footer text-muted small">
                    Last measured: {new Date(measurement.lastModified).toLocaleString()}
                </div>
            )}
        </div>
    )
}

function GroupedSummary({ formState, validations, disabledValues, isDisabled, patientName }) {
    const date = new Date().toISOString().split('T')[0]

    const exportMeasurements = () => {
        if (!confirmUnencryptedExport()) return
        const rows = generateMeasurementsCSVRows(formState, isDisabled)
        downloadCSV(rows, `measurements_${patientName || 'guest'}_${date}.csv`)
    }

    const exportCalculations = () => {
        if (!confirmUnencryptedExport()) return
        const rows = generateCalculationsCSVRows(formState, validations, disabledValues)
        downloadCSV(rows, `calculations_${patientName || 'guest'}_${date}.csv`)
    }

    const exportInterpretations = () => {
        if (!confirmUnencryptedExport()) return
        const rows = generateInterpretationsCSVRows(formState, validations, disabledValues)
        downloadCSV(rows, `interpretations_${patientName || 'guest'}_${date}.csv`)
    }

    const exportPDF = () => {
        if (!confirmUnencryptedExport()) return
        generateAndDownloadPDF(formState, validations, disabledValues, isDisabled, patientName)
    }

    if (!hasData(formState)) {
        return (
            <div className="grouped-summary">
                <Title>Results</Title>
                <p className="text-center text-muted">No measurements recorded.</p>
            </div>
        )
    }

    return (
        <div className="grouped-summary">
            <Title>Results</Title>
            <div className="mt-4 px-3">
                {MEASUREMENT_GROUP_MAP.map(({ stateKey, calculationKeys, interpretationKeys, patientLevel }) => {
                    const measurements = formState[stateKey]
                    if (!measurements || measurements.length === 0) return null

                    const config = MEASUREMENT_CONFIGS[stateKey]
                    if (!config && !patientLevel) return null

                    const label = config.defaultLabel || stateKey

                    // Compute calculations for this group
                    const groupCalculations = calculationKeys.map(calcKey => {
                        const calcConfig = CALCULATION_SECTION_CONFIGS[calcKey]
                        if (!calcConfig) return null
                        const value = calcConfig.valueFunction(formState)
                        if (value === null) return null
                        return { key: calcKey, label: calcConfig.label, value, unit: calcConfig.unit }
                    }).filter(Boolean)

                    // Compute interpretations for this group
                    const groupInterpretations = interpretationKeys.map(interpKey => {
                        const interpConfig = INTERPRETATION_SECTION_CONFIGS[interpKey]
                        if (!interpConfig) return null
                        const messages = interpConfig.messageFunction(formState)
                        const defaultMessage = [{ text: 'No interpretation available for the current measurements.', type: 'secondary' }]
                        return { key: interpKey, label: interpConfig.label, messages: messages && messages.length > 0 ? messages : defaultMessage, citation: interpConfig.citation }
                    }).filter(Boolean)

                    return (
                        <div key={stateKey} className="measurement-group mb-4">
                            <h4 className="text-center mb-3">{label}</h4>
                            {/* Patient-level attributes (dob, sex) are injected via merge — show value as read-only instead of MeasurementCard */}
                            {patientLevel ? (
                                measurements.map((measurement, index) => (
                                    <div key={`${stateKey}-${index}`} className="card mb-3 border-info" style={{ borderWidth: '2px' }}>
                                        <div className="card-header bg-info text-white">
                                            <h5 className="mb-0">{label} (Patient Info)</h5>
                                        </div>
                                        <div className="card-body">
                                            <h4 className="mb-0 text-center">{measurement.value || <span className="text-muted">Not set</span>}</h4>
                                        </div>
                                    </div>
                                ))
                            ) :
                                measurements.map((measurement, index) => (
                                    <MeasurementCard
                                        key={`${stateKey}-${index}`}
                                        measurementKey={stateKey}
                                        measurement={measurement}
                                        index={index}
                                        config={config}
                                        validations={validations}
                                        isDisabled={isDisabled}
                                    />
                                ))
                            }
                            {groupCalculations.map(calc => (
                                <Calculation key={calc.key} label={calc.label} value={calc.value} unit={calc.unit} />
                            ))}
                            {groupInterpretations.map(interp => (
                                <Interpretation key={interp.key} label={interp.label} messages={interp.messages} citation={interp.citation} />
                            ))}
                        </div>
                    )
                })}
            </div>
            <div className="d-flex flex-wrap justify-content-center gap-2">
                <Submit label="Export Measurements to CSV" onClick={exportMeasurements} />
                <Submit label="Export Calculations to CSV" onClick={exportCalculations} />
                <Submit label="Export Interpretations to CSV" onClick={exportInterpretations} />
                <Submit label="Export All Data to PDF" onClick={exportPDF} />
            </div>
        </div>
    )
}

export default GroupedSummary
