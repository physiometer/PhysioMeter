import { Component } from 'react'
import { Navigate } from 'react-router-dom'

import { getCurrentUser, createSession } from '../DB'
import { PT_TEST_CONFIG } from './physical-therapy-tests/PhysicalTherapyTestFactory'
import { PT_TEST_MEASUREMENT_CONFIG } from './physical-therapy-tests/PhysicalTherapyTest'
import Title from './form/Title'

const MEASUREMENT_NAME_MAP = Object.fromEntries(PT_TEST_MEASUREMENT_CONFIG.map(m => [m.stateKey, m.name]))
import Text from './form/Text'
import Submit from './form/Submit'
import LoadingPage from './LoadingPage'
import { validateDate } from '../utils/dateValidation'

const SESSION_TEST_OPTIONS = PT_TEST_CONFIG

export class NewSession extends Component {
    constructor(props) {
        super(props)

        // Default session timestamp to current local datetime in the format for datetime-local input
        const now = new Date()
        const defaultTimestamp = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16)

        this.state = {
            patient: null,
            loaded: false,
            sessionTimestamp: defaultTimestamp,
            selectedTestKey: SESSION_TEST_OPTIONS[0]?.testKey || '',
            dateError: false,
            dateErrorMessage: '',
            submitText: '',
            submitTextType: '',
            redirectTo: null,
        }
    }

    componentDidMount = async () => {
        const patient = await getCurrentUser()
        this.setState({ patient, loaded: true })
    }

    onTimestampChange = (sessionTimestamp) => {
        const result = validateDate(sessionTimestamp)
        this.setState({ sessionTimestamp, ...result })
    }

    handleSubmit = async () => {
        if (!this.state.selectedTestKey) {
            this.setState({ submitText: 'Please select a test type.', submitTextType: 'danger' })
            return
        }

        const result = validateDate(this.state.sessionTimestamp)
        this.setState(result)
        if (result.dateError) return

        const timestamp = this.state.sessionTimestamp
            ? new Date(this.state.sessionTimestamp).toISOString()
            : new Date().toISOString()

        try {
            const sessionUUID = await createSession(
                this.state.patient.uuid,
                this.state.selectedTestKey,
                timestamp
            )
            this.setState({
                redirectTo: `/${this.state.selectedTestKey}/home?uuid=${this.state.patient.uuid}&sessionUUID=${sessionUUID}`
            })
        } catch (e) {
            this.setState({
                submitText: `Error creating session: ${e}`,
                submitTextType: 'danger'
            })
        }
    }

    render() {
        if (this.state.redirectTo) {
            return <Navigate to={this.state.redirectTo} replace />
        }

        if (!this.state.patient) {
            if (this.state.loaded) {
                return <Navigate to="/existing-patient" replace={true} />
            }
            return <LoadingPage />
        }

        return (
            <div id="new-session">
                <Title>New Session for {this.state.patient.name}</Title>

                <div className="d-flex flex-column align-items-center">
                    <div className="mb-4 w-75" style={{ maxWidth: '500px' }}>
                        <label className="form-label"><h5>Session Date & Time</h5></label>
                        <input
                            type="datetime-local"
                            className={`form-control ${this.state.dateError ? 'is-invalid' : ''}`}
                            value={this.state.sessionTimestamp}
                            onChange={(e) => this.onTimestampChange(e.target.value)}
                        />
                        {this.state.dateError
                            ? <div className="invalid-feedback">{this.state.dateErrorMessage}</div>
                            : <small className="text-muted">Defaults to now. Can be set to a past or future date/time.</small>
                        }
                    </div>

                    <div className="mb-4 w-75" style={{ maxWidth: '500px' }}>
                        <label className="form-label"><h5>Test Type</h5></label>
                        {SESSION_TEST_OPTIONS.map(config => (
                            <div key={config.testKey} className="form-check mb-2">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="testType"
                                    id={`test-${config.testKey}`}
                                    value={config.testKey}
                                    checked={this.state.selectedTestKey === config.testKey}
                                    onChange={(e) => this.setState({ selectedTestKey: e.target.value })}
                                />
                                <label className="form-check-label" htmlFor={`test-${config.testKey}`}>
                                    {config.defaultTestName}
                                    {config.permittedMeasurements && (
                                        <small className="text-muted d-block">
                                            Includes: {config.permittedMeasurements.map(k => MEASUREMENT_NAME_MAP[k] || k).join(', ')}
                                        </small>
                                    )}
                                </label>
                            </div>
                        ))}
                    </div>

                    <Submit onClick={this.handleSubmit} label="Create Session" />
                    {this.state.submitText && (
                        <Text value={this.state.submitText} type={this.state.submitTextType} />
                    )}
                </div>
            </div>
        )
    }
}

export default NewSession
