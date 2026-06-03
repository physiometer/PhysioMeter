import { PT_TEST_CONFIG } from './physical-therapy-tests/PhysicalTherapyTestFactory'
import { PT_TEST_MEASUREMENT_CONFIG } from './physical-therapy-tests/PhysicalTherapyTest'
import Title from './form/Title'

const MEASUREMENT_NAME_MAP = Object.fromEntries(PT_TEST_MEASUREMENT_CONFIG.map(m => [m.stateKey, m.name]))

function Presets() {
    const presets = PT_TEST_CONFIG.filter(c => c.testKey !== 'utilities' && c.testKey !== 'measurements')

    return (
        <div id="presets">
            <Title>Available Preset Protocols</Title>
            <div className="d-flex flex-column align-items-center">
                {presets.map(preset => (
                    <div key={preset.testKey} className="card mb-3 w-75">
                        <div className="card-body text-center">
                            <h4>{preset.defaultTestName}</h4>
                            {preset.permittedMeasurements && (
                                <p>
                                    Includes: {preset.permittedMeasurements.map(k => MEASUREMENT_NAME_MAP[k] || k).join(', ')}
                                </p>
                            )}
                            <p className="fw-bold">
                                To use this preset, go to a patient page and create a new session.
                            </p>
                        </div>
                    </div>
                ))}
                {presets.length === 0 && (
                    <p className="text-muted">No preset protocols available.</p>
                )}
            </div>
        </div>
    )
}

export default Presets
