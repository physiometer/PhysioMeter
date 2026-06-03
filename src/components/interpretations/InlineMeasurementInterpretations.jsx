import { INTERPRETATION_SECTION_CONFIGS } from './InterpretationFactory'
import { getInterpretationKeysForMeasurement } from '../../utils/measurementGroupMapping'
import Interpretation from './Interpretation'

const NO_INTERPRETATION_MESSAGE = [{ text: 'No interpretation available for the current measurements.', type: 'secondary' }]

function InlineMeasurementInterpretations({ measurementKey, formState }) {
    const interpretationKeys = getInterpretationKeysForMeasurement(measurementKey)
    if (interpretationKeys.length === 0) return null

    return (
        <div className="mt-3 px-3">
            {interpretationKeys.map(key => {
                const config = INTERPRETATION_SECTION_CONFIGS[key]
                if (!config) return null
                const messages = config.messageFunction(formState)
                return (
                    <Interpretation
                        key={key}
                        label={config.label}
                        messages={messages && messages.length > 0 ? messages : NO_INTERPRETATION_MESSAGE}
                        citation={config.citation}
                    />
                )
            })}
        </div>
    )
}

export default InlineMeasurementInterpretations
