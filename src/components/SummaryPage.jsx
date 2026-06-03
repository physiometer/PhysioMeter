import GroupedSummary from './GroupedSummary'
import Text from './form/Text'
import Title from './form/Title'
import Submit from './form/Submit'
import { hasData } from './measurements/MeasurementSummary'
import { downloadCSV, generateMeasurementsCSVRows, generateCalculationsCSVRows, generateInterpretationsCSVRows } from '../utils/csvExport'
import { generateAndDownloadPDF } from '../utils/pdfExport'
import { confirmUnencryptedExport } from '../utils/exportConfirm'

function SummaryPage({ name, patientName, submitText, submitTextType, formState, validations, disabledValues, isDisabled }) {
    const date = new Date().toISOString().split('T')[0]

    const exportAll = () => {
        if (!confirmUnencryptedExport()) return
        const measurementRows = generateMeasurementsCSVRows(formState, isDisabled)
        downloadCSV(measurementRows, `measurements_${patientName}_${date}.csv`)

        setTimeout(() => {
            const calculationsRows = generateCalculationsCSVRows(formState, validations, disabledValues)
            downloadCSV(calculationsRows, `calculations_${patientName}_${date}.csv`)
        }, 100)

        setTimeout(() => {
            const interpretationRows = generateInterpretationsCSVRows(formState, validations, disabledValues)
            downloadCSV(interpretationRows, `interpretations_${patientName}_${date}.csv`)
        }, 200)
    }

    const exportPDF = () => {
        if (!confirmUnencryptedExport()) return
        generateAndDownloadPDF(formState, validations, disabledValues, isDisabled, patientName)
    }

    return (
        <>
            <Title>Summary {name}</Title>
            {hasData(formState) &&
                <div className="d-flex flex-wrap justify-content-center gap-2">
                    <Submit label="Export All Data to CSV" onClick={exportAll} />
                    <Submit label="Export All Data to PDF" onClick={exportPDF} />
                </div>
            }
            {submitText &&
                <Text value={submitText} type={submitTextType} />
            }
            <GroupedSummary
                formState={formState}
                validations={validations}
                disabledValues={disabledValues}
                isDisabled={isDisabled}
                patientName={patientName}
            />
        </>
    )
}

export default SummaryPage
