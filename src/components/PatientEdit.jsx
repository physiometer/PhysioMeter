import { Component, createRef } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { getCurrentUser, updatePatient } from '../DB'
import Title from './form/Title'
import Text from './form/Text'
import Submit from './form/Submit'
import PatientForm from './form/PatientForm'
import LoadingPage from './LoadingPage'
import ClearAllData from './ClearAllData'

export class PatientEdit extends Component {
    constructor(props) {
        super(props)

        this.state = {
            patient: null,
            loaded: false,
            submitText: '',
            submitTextType: '',
            redirectTo: null,
        }

        this.formRef = createRef()
    }

    componentDidMount = async () => {
        const patient = await getCurrentUser()
        if (patient) {
            this.setState({ patient, loaded: true })
        } else {
            this.setState({ loaded: true })
        }
    }

    handleSave = async () => {
        if (!this.formRef.current.validate()) return

        try {
            await updatePatient(this.state.patient.uuid, this.formRef.current.getValues())
            this.setState({ redirectTo: `/patient?uuid=${this.state.patient.uuid}` })
        } catch (e) {
            this.setState({
                submitText: `Error saving patient: ${e}`,
                submitTextType: 'error'
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
            <div id="patient-edit">
                <Title>Edit Patient</Title>

                <div className="d-flex flex-column align-items-center">
                    <PatientForm
                        ref={this.formRef}
                        initialName={this.state.patient.name}
                        initialDateOfBirth={this.state.patient.dateOfBirth}
                        initialSex={this.state.patient.sex}
                    />

                    <div className="d-flex gap-3 justify-content-center">
                        <Submit onClick={this.handleSave} label="Save" />
                        <Submit onClick={() => this.setState({ redirectTo: `/patient?uuid=${this.state.patient.uuid}` })} label="Cancel" color="secondary" />
                    </div>
                    {this.state.submitText && (
                        <Text value={this.state.submitText} type={this.state.submitTextType} />
                    )}
                </div>

                <ClearAllData />
            </div>
        )
    }
}

export default PatientEdit
