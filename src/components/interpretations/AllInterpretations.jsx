import { INTERPRETATION_SECTION_CONFIGS } from './InterpretationFactory'
import Interpretation from './Interpretation'
import Submit from '../form/Submit'
import Title from '../form/Title'
import { downloadCSV, generateInterpretationsCSVRows } from '../../utils/csvExport'
import { confirmUnencryptedExport } from '../../utils/exportConfirm'

function AllInterpretations({ formState, validations, disabledValues, patientName }) {
    const interpretations = Object.entries(INTERPRETATION_SECTION_CONFIGS).map(([key, config]) => {
        const messages = config.messageFunction(formState, validations, disabledValues)
        if (messages === null || messages.length === 0) return null
        return <Interpretation key={key} label={config.label} messages={messages} citation={config.citation} />
    }).filter(Boolean)

    const exportInterpretations = () => {
        if (!confirmUnencryptedExport()) return
        const date = new Date().toISOString().split('T')[0]
        const rows = generateInterpretationsCSVRows(formState, validations, disabledValues)
        downloadCSV(rows, `interpretations_${patientName || 'guest'}_${date}.csv`)
    }

    return (
        <div className="interpretations-summary">
            <Title>Interpretations</Title>
            {interpretations.length === 0 ? (
                <p className="text-center text-muted">No interpretations available.</p>
            ) : (<>
                <div className="mt-4 px-3">{interpretations}</div>
                <div className="d-flex justify-content-center">
                    <Submit label="Export Interpretations to CSV" onClick={exportInterpretations} />
                </div>
            </>)}
        </div>
    )
}

export default AllInterpretations
