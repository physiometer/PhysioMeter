import { Component } from 'react'
import { validateDob, DOB_WARNING_MESSAGE } from '../../utils/dateValidation'
import { MAX_LENGTH } from '../measurements/MeasurementFactory'

const SEX_OPTIONS = ['Male', 'Female']

export class PatientForm extends Component {
    constructor(props) {
        super(props)

        this.state = {
            name: props.initialName || '',
            dateOfBirth: props.initialDateOfBirth || '',
            sex: props.initialSex || '',
            nameValid: true,
            dobError: false,
            dobErrorMessage: '',
            dobWarning: false,
        }
    }

    onDobChange = (dateOfBirth) => {
        const dob = validateDob(dateOfBirth)
        this.setState({ dateOfBirth, ...dob })
    }

    validate = () => {
        let valid = true
        if (!this.state.name || this.state.name.trim() === '') {
            this.setState({ nameValid: false })
            valid = false
        } else {
            this.setState({ nameValid: true })
        }
        const dob = validateDob(this.state.dateOfBirth)
        this.setState(dob)
        if (dob.dobError) valid = false
        return valid
    }

    getValues = () => ({
        name: this.state.name.trim(),
        dateOfBirth: this.state.dateOfBirth || null,
        sex: this.state.sex || null,
    })

    render() {
        return (
            <>
                <div className="mb-3 w-75" style={{ maxWidth: '500px' }}>
                    <label className="form-label"><h5>Name <span className="text-danger">*</span></h5></label>
                    <input
                        type="text"
                        className={`form-control ${!this.state.nameValid ? 'is-invalid' : ''}`}
                        value={this.state.name}
                        onChange={(e) => this.setState({ name: e.target.value, nameValid: e.target.value.trim() !== '' })}
                        placeholder="Enter patient name"
                        maxLength={MAX_LENGTH}
                    />
                    {!this.state.nameValid && (
                        <div className="invalid-feedback">Name is required.</div>
                    )}
                </div>

                <div className="mb-3 w-75" style={{ maxWidth: '500px' }}>
                    <label className="form-label"><h5>Date of Birth <span className="text-muted">(optional)</span></h5></label>
                    <input
                        type="date"
                        className={`form-control ${this.state.dobError ? 'is-invalid' : this.state.dobWarning ? 'border-warning' : ''}`}
                        value={this.state.dateOfBirth}
                        onChange={(e) => this.onDobChange(e.target.value)}
                    />
                    {this.state.dobError && (
                        <div className="invalid-feedback">{this.state.dobErrorMessage}</div>
                    )}
                    {this.state.dobWarning && (
                        <small className="text-warning">{DOB_WARNING_MESSAGE}</small>
                    )}
                </div>

                <div className="mb-3 w-75" style={{ maxWidth: '500px' }}>
                    <label className="form-label"><h5>Sex <span className="text-muted">(optional)</span></h5></label>
                    {SEX_OPTIONS.map(option => (
                        <div key={option} className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="sex"
                                id={`sex-${option}`}
                                value={option}
                                checked={this.state.sex === option}
                                onChange={(e) => this.setState({ sex: e.target.value })}
                            />
                            <label className="form-check-label" htmlFor={`sex-${option}`}>
                                {option}
                            </label>
                        </div>
                    ))}
                    {this.state.sex && (
                        <button
                            className="btn btn-sm btn-outline-secondary mt-2"
                            onClick={() => this.setState({ sex: '' })}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </>
        )
    }
}

export default PatientForm
