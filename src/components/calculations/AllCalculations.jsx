import { CALCULATION_SECTION_CONFIGS } from './CalculationFactory'
import Calculation from './Calculation'
import Submit from '../form/Submit'
import Title from '../form/Title'
import { downloadCSV, generateCalculationsCSVRows } from '../../utils/csvExport'
import { confirmUnencryptedExport } from '../../utils/exportConfirm'

function AllCalculations({ formState, validations, disabledValues, patientName }) {
    const calculations = Object.entries(CALCULATION_SECTION_CONFIGS).map(([key, config]) => {
        const value = config.valueFunction(formState, validations, disabledValues)
        if (value === null) return null
        return <Calculation key={key} label={config.label} value={value} unit={config.unit} />
    }).filter(Boolean)

    const exportCalculations = () => {
        if (!confirmUnencryptedExport()) return
        const date = new Date().toISOString().split('T')[0]
        const rows = generateCalculationsCSVRows(formState, validations, disabledValues)
        downloadCSV(rows, `calculations_${patientName || 'guest'}_${date}.csv`)
    }

    return (
        <div className="calculations-summary">
            <Title>Calculations</Title>
            {calculations.length === 0 ? (
                <p className="text-center text-muted">No calculations available.</p>
            ) : (<>
                <div className="mt-4 px-3">{calculations}</div>
                <div className="d-flex justify-content-center">
                    <Submit label="Export Calculations to CSV" onClick={exportCalculations} />
                </div>
            </>)}
        </div>
    )
}

export default AllCalculations
