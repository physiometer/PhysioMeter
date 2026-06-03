import { MEASUREMENT_CONFIGS } from './MeasurementFactory'
import Submit from '../form/Submit'
import Title from '../form/Title'
import { downloadCSV, generateMeasurementsCSVRows } from '../../utils/csvExport'
import { confirmUnencryptedExport } from '../../utils/exportConfirm'

export const hasData = (formState) => Object.entries(formState).some(([key, measurements]) =>
    measurements && measurements.length > 0 && MEASUREMENT_CONFIGS[key]
)

function MeasurementSummary({ formState, validations, isDisabled, patientName }) {
    const exportMeasurements = () => {
        if (!confirmUnencryptedExport()) return
        const date = new Date().toISOString().split('T')[0]
        const rows = generateMeasurementsCSVRows(formState, isDisabled)
        downloadCSV(rows, `measurements_${patientName || 'guest'}_${date}.csv`)
    }

    const formatValue = (value, unit) => {
        if (value === null || value === undefined || value === '') {
            return <span className="text-danger">Not recorded</span>
        }
        return <span>{value}{unit ? ` ${unit}` : ''}</span>
    }

    const getValidationStatus = (key, index) => {
        const validation = validations[key]?.[index]
        if (Array.isArray(validation)) {
            return validation.every(v => v === true)
        }
        return validation === true
    }

    return (
        <div className="measurement-summary">
            <Title>Measurements</Title>
            {!hasData(formState) ? (
                <p className="text-center text-muted">No measurements recorded.</p>
            ) : (<>
            <div className="mt-4 px-3">
            {Object.entries(formState).map(([key, measurements]) => {
                if (!measurements || measurements.length === 0) return null

                const config = MEASUREMENT_CONFIGS[key]
                if (!config) return null

                const label = config.defaultLabel || key
                const unit = config.unit || ''

                return measurements.map((measurement, index) => {
                    const disabled = isDisabled(key, index)
                    const isValid = getValidationStatus(key, index)
                    const value = measurement.value

                    const borderColor = disabled ? 'border-warning' : (isValid ? 'border-success' : 'border-danger')
                    const headerBg = disabled ? 'bg-warning' : (isValid ? 'bg-success' : 'bg-danger')

                    return (
                        <div key={`${key}-${index}`} className={`card mb-3 ${borderColor}`} style={{ borderWidth: '2px' }}>
                            <div className={`card-header ${headerBg} text-white d-flex justify-content-between align-items-center`}>
                                <h5 className="mb-0">{label}</h5>
                                {disabled && <span className="badge bg-light text-dark">Skipped</span>}
                                {!disabled && !isValid && <span className="badge bg-light text-danger">Incomplete</span>}
                            </div>
                            {!disabled && (
                                <div className="card-body">
                                    {/* Handle fields type (composite measurements like vitalSigns, thirtySecondSitToStand) */}
                                    {config.type === 'fields' && (config.fields || config.fieldNames) ? (
                                        <div className="d-flex flex-wrap justify-content-evenly gap-3">
                                            {(config.fields || config.fieldNames?.map(fn => MEASUREMENT_CONFIGS[fn])).map((field, idx) => {
                                                if (field?.displayOnly) return null
                                                const fieldValue = Array.isArray(value) ? value[idx] : value
                                                const fieldLabel = field?.defaultLabel || (config.fieldNames ? MEASUREMENT_CONFIGS[config.fieldNames[idx]]?.defaultLabel : `Field ${idx + 1}`)
                                                const fieldUnit = field?.unit || MEASUREMENT_CONFIGS[config.fieldNames?.[idx]]?.unit || ''
                                                const fieldValidation = Array.isArray(validations[key]?.[index]) ? validations[key][index][idx] : true
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
                                        /* Handle multi-trial measurements (stopwatch with numTrials) */
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
                                        /* Simple single value */
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
                })
            })}
            </div>
            <div className="d-flex justify-content-center">
                <Submit label="Export Measurements to CSV" onClick={exportMeasurements} />
            </div>
            </>)}
        </div>
    )
}

export default MeasurementSummary
