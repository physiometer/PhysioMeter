import { Component, createRef } from 'react'
import { Link, Navigate } from 'react-router-dom'

import Title from './form/Title'
import Text from './form/Text'
import Submit from './form/Submit'
import PatientForm from './form/PatientForm'
import ClearAllData from './ClearAllData'
import HIPAANote from './HIPAANote'
import { createDBUser } from '../DB'

export class NewUser extends Component {
    constructor(props) {
        super(props)

        this.state = {
            submitText: '',
            submitTextType: '',
            redirectTo: null,
        }

        this.formRef = createRef()
    }

    createUser = async () => {
        if (!this.formRef.current.validate()) return

        const { name, dateOfBirth, sex } = this.formRef.current.getValues()
        const uuid = crypto.randomUUID()

        try {
            await createDBUser(name, uuid, {
                dateOfBirth: dateOfBirth || undefined,
                sex: sex || undefined,
            })
        } catch (e) {
            this.setState({
                submitText: `Error creating patient: ${e}`,
                submitTextType: 'error'
            })
            return
        }

        this.setState({
            submitText: `Patient ${name} created successfully. Click View Existing Patients to see the new patient.`,
            submitTextType: 'success',
        })
    }

    render() {
        if (this.state.redirectTo) {
            return <Navigate to={this.state.redirectTo} replace />
        }

        return (
            <div id="new-patient">
                <Title>Create New Patient</Title>
                <HIPAANote />
                <Link to="/existing-patient" className="link text-decoration-underline"><h2>View Existing Patients</h2></Link>

                <div className="d-flex flex-column align-items-center">
                    <PatientForm ref={this.formRef} />

                    <Submit onClick={this.createUser} />
                    {this.state.submitText &&
                        <Text value={this.state.submitText} type={this.state.submitTextType} />
                    }
                </div>

                <ClearAllData />
            </div>
        )
    }
}

export default NewUser
