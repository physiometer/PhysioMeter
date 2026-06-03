import React, { Component } from 'react'
import { createMeasurementInstance } from './MeasurementFactory'

export class MultipleMeasurements extends Component {
    componentDidMount() {
        if (!this.props.buttonHidden && this.props.buttonDisabledAndChecked && !this.props.measurements?.length) {
            this.addMeasurement()
        }
    }

    handleMeasurementAction = () => {
        if (this.props.oneMax && this.props.measurements.length === 1) {
            this.deleteMeasurement(0) // only one measurement allowed, so delete existing measurement if it exists
            return;
        }

        this.addMeasurement()
    }

    addMeasurement = () => {
        const { entry, validation, disabledEntry } = createMeasurementInstance(this.props.measurementKey, this.props.measurements.length)
        const measurements = [...this.props.measurements, entry];
        this.props.onChange(measurements);
        if (this.props.validations) {
            const validations = [...this.props.validations[this.props.measurementKey], validation]
            this.props.onValidationChange(validations);
        }
        if (this.props.disabledValues) {
            const disabledValues = [...this.props.disabledValues[this.props.measurementKey], disabledEntry]
            this.props.onDisabledChange(disabledValues);
        }
    }

    // Note: not currently used with current form format of only one measurement
    updateMeasurement = (index, value) => {
        const measurements = [...this.props.measurements]
        measurements[index].value = value
        this.props.onChange(measurements)
    }

    updateValidation = (index, isValid) => {
        if (this.props.validations) {
            const validations = [...this.props.validations[this.props.measurementKey]]
            validations[index] = isValid
            this.props.onValidationChange(validations)
        }
    }

    updatedDisabledValues = (index, disabledValue) => {
        if (this.props.disabledValues) {
            const disabledValues = [...this.props.disabledValues[this.props.measurementKey]]
            disabledValues[index] = disabledValue
            this.props.onDisabledChange(disabledValues)
        }
    }

    updateMeasurementLabel = (index, label) => {
        const measurements = [...this.props.measurements]
        measurements[index].label = label
        this.props.onChange(measurements)
    }

    deleteMeasurement = (index) => {
        if (!confirm(`Are you sure you want to delete this measurement? This action cannot be undone.`)) {
            return
        }

        const measurements = [...this.props.measurements]
        measurements.splice(index, 1)
        this.props.onChange(measurements)
        if (this.props.validations) {
            const validations = [...this.props.validations[this.props.measurementKey]]
            validations.splice(index, 1)
            this.props.onValidationChange(validations)
        }
        if (this.props.disabledValues) {
            const disabledValues = [...this.props.disabledValues[this.props.measurementKey]]
            disabledValues.splice(index, 1)
            this.props.onDisabledChange(disabledValues)
        }
    }

    render() {
        if (this.props.buttonHidden) {
            return;
        }
        const isNonEditable = this.props.buttonDisabledAndChecked
        return (
            <div className={`multiple-measurements`}>
                <h2 className={`measurement-header text-center w-100`}>
                    {this.props.name}
                    {!isNonEditable && (
                        <i
                            className={`bi ms-3 cursor-p ${this.props.oneMax && this.props.measurements.length === 1 ? 'text-success bi-check-square-fill' : 'text-danger bi-square'}`}
                            onClick={this.handleMeasurementAction}
                            title={`${this.props.oneMax && this.props.measurements.length === 1 ? 'Remove measurement' : 'Add measurement'}`}
                        >
                        </i>
                    )}
                </h2>
            </div>
        )
    }
}

export default MultipleMeasurements