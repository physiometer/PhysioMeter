import React, { Component } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { getCurrentUser, deleteSession } from '../DB'
import Title from './form/Title'
import Text from './form/Text'
import LoadingPage from './LoadingPage'
import ClearAllData from './ClearAllData'

export class PatientPage extends Component {
    constructor(props) {
        super(props)

        this.state = {
            patient: null,
            loaded: false,
            submitText: '',
            submitTextType: ''
        }
    }

    componentDidMount = async () => {
        const patient = await getCurrentUser()
        this.setState({ patient, loaded: true })
    }

    handleDeleteSession = async (session) => {
        if (!window.confirm(`Are you sure you want to delete this session (${session.testName} - ${new Date(session.sessionTimestamp).toLocaleString()})? This action cannot be undone.`)) {
            return
        }

        try {
            const updatedPatient = await deleteSession(this.state.patient.uuid, session.uuid)
            this.setState({
                patient: updatedPatient,
                submitText: 'Session deleted successfully.',
                submitTextType: 'success'
            })
        } catch (e) {
            this.setState({
                submitText: `Error deleting session: ${e}`,
                submitTextType: 'error'
            })
        }
    }

    render() {
        if (!this.state.patient) {
            if (this.state.loaded) {
                return <Navigate to="/existing-patient" replace={true} />
            }
            return <LoadingPage />
        }

        const { patient } = this.state
        const sortedSessions = [...(patient.sessions || [])].sort(
            (a, b) => new Date(b.sessionTimestamp) - new Date(a.sessionTimestamp)
        )

        return (
            <div id="patient-page">
                <Title>Patient: {patient.name}</Title>

                <div className="d-flex flex-column align-items-center mb-4">
                    {patient.dateOfBirth && (
                        <h5 className="mt-3 mb-2"><strong>Date of Birth:</strong> {new Date(patient.dateOfBirth + 'T00:00:00').toLocaleDateString()}</h5>
                    )}
                    {patient.sex && (
                        <h5 className="mb-3"><strong>Sex:</strong> {patient.sex}</h5>
                    )}
                    <Link to={`/patient/edit?uuid=${patient.uuid}`} className="link text-decoration-underline mt-2">
                        <h2>Edit Patient Info</h2>
                    </Link>
                </div>

                {this.state.submitText && (
                    <Text value={this.state.submitText} type={this.state.submitTextType} />
                )}

                <div className="d-flex flex-column align-items-center mb-3">
                    <Link to={`/new-session?uuid=${patient.uuid}`} className="btn btn-primary btn-lg">
                        New Session
                    </Link>
                </div>

                <Title>Sessions ({sortedSessions.length})</Title>
                <div className="mx-5">
                    <table className="table table-bordered table-striped table-hover">
                        <thead>
                            <tr>
                                <th><h5>Session Date</h5></th>
                                <th><h5>Test Type</h5></th>
                                <th><h5>Last Modified</h5></th>
                                <th><h5>Delete</h5></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedSessions.map(session => (
                                <tr key={session.uuid}>
                                    <td className="align-middle">
                                        <h5 className="m-0">
                                            <Link to={`/${session.testKey}/home?uuid=${patient.uuid}&sessionUUID=${session.uuid}`}>
                                                {new Date(session.sessionTimestamp).toLocaleString()}
                                            </Link>
                                        </h5>
                                    </td>
                                    <td className="align-middle">{session.testName}</td>
                                    <td className="align-middle">{new Date(session.lastModified).toLocaleString()}</td>
                                    <td className="align-middle">
                                        <i
                                            className="bi bi-trash-fill text-danger cursor-p"
                                            onClick={() => this.handleDeleteSession(session)}
                                            aria-label={`Delete session`}
                                        ></i>
                                    </td>
                                </tr>
                            ))}
                            {sortedSessions.length === 0 && (
                                <tr><td colSpan="4" className="text-center text-muted">No sessions yet. Click "New Session" to create one.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <ClearAllData />
            </div>
        )
    }
}

export default PatientPage
