import React, { Component } from 'react'
import Markdown from 'react-markdown'

import Stopwatch from './custom/Stopwatch'
import CountdownTimer from './custom/CountdownTimer'
import { MEASUREMENT_CONFIGS, MAX_LENGTH } from './MeasurementFactory'


export class Measurement extends Component {
    constructor(props) {
        super(props)
        this.uuid = crypto.randomUUID()

        const numFields = this.props.fields?.length || this.props.fieldNames?.length || this.props.numTrials || 0

        let multipleValues = []
        if (this.props.type === "fields" && this.props.value?.length === numFields) {
            multipleValues = this.props.value
        } else if (this.props.numTrials && this.props.value?.length === this.props.numTrials) {
            multipleValues = this.props.value
        } else if (numFields > 0) {
            multipleValues = Array(numFields).fill(null)
        }

        this.state = {
            multipleValues,
        }
    }

    componentDidMount() {
        const numFields = this.state.multipleValues.length

        if (numFields > 0) {
            this.props.onChange(this.state.multipleValues)
            if ((!Array.isArray(this.props.valid) || this.props.valid.length !== numFields) && this.props.onValidationChange) {
                this.props.onValidationChange(Array(numFields).fill(false))
            }
        }
    }

    renderLabel = () => {
        const label = this.props.label ?? this.props.defaultLabel
        const { onLabelChange } = this.props

        if (!label && !onLabelChange) return null

        return (
            <div className="measurement-label d-block">
                {onLabelChange ? (
                    <div className="d-flex align-items-center">
                        <label className="me-2">Label:</label>
                        <input
                            type="text"
                            className={`measurement-label-input form-control ${label ? '' : 'is-invalid'}`}
                            value={label}
                            onChange={(e) => onLabelChange(e.target.value)}
                            placeholder="Enter label"
                            maxLength={MAX_LENGTH}
                        />
                    </div>
                ) : (
                    <h4>{label}</h4>
                )}
            </div>
        )
    }

    renderInstructions = (instructions) => {
        if (!instructions) return null

        return (
            <>
                <div className="measurement-instructions my-3 p-3">
                    <h5>Instructions:</h5>
                    <Markdown>{instructions}</Markdown>
                </div>
            </>
        )
    }

    renderDeleteButton = () => {
        if (!this.props.onDelete) return null

        return (
            <div className="measurement-delete ms-4 d-flex align-items-center cursor-p">
                <i className="bi bi-trash-fill text-danger cursor-p" onClick={this.props.onDelete} aria-label={`Delete this measurement`} title={`Delete this measurement`}></i>
            </div>
        )
    }

    renderLabelAndDelete = () => {
        return (
            <div className="d-flex align-items-center my-3">
                {this.renderLabel()}
                {/* {this.renderDeleteButton()} */} {/* Disabled for one measurement setup, because the title has a delete button */}
            </div>
        )
    }

    renderDisabledToggles = () => {
        const disabledCasesComputed = this.props.getDisableCaseComputedText ? this.props.getDisableCaseComputedText() : []
        const allDisabledCases = [...disabledCasesComputed, ...(this.props.disabledCases || [])]
        if (allDisabledCases.length === 0 || allDisabledCases.every(text => text === null)) {
            return null
        }

        return (
            <div className={`disabled-cases d-flex flex-column align-items-center justify-content-center mt-3 mb-4 p-3`}>
                {allDisabledCases.map((caseText, index) => {
                    if (!caseText) {
                        return null
                    }
                    const checked = this.props.disabledValues?.[index] || false
                    return (
                        <div key={caseText} className="d-flex form-check mb-3">
                            <input
                                className={`form-check-input me-2 bg-${checked ? 'warning' : 'secondary'} border-${checked ? 'warning' : 'secondary'} cursor-p`}
                                type="checkbox"
                                id={`disabled-case-${index}-${this.uuid}`}
                                checked={checked}
                                onChange={() => this.updateDisabledValues(index)}
                            />
                            <label className={`form-check-label text-center ${checked ? 'text-warning-emphasis' : ''}`} htmlFor={`disabled-case-${index}-${this.uuid}`}>
                                <strong>{caseText}</strong>
                            </label>
                        </div>
                    )
                })}
            </div>
        )
    }

    isDisabled = () => {
        if (this.props.disabled) {
            return true
        }

        if (this.props.isDisabled) {
            return this.props.isDisabled()
        }

        return false
    }

    updateDisabledValues = (index) => {
        const disabledValues = [...this.props.disabledValues]
        disabledValues[index] = !disabledValues[index]
        this.props.onDisabledChange(disabledValues)
    }

    onChangeAndValidate = (newValue, parameters) => {
        if (!parameters.onChange) return
        parameters.onChange(newValue)
        if (parameters.onValidationChange !== undefined && parameters.onValidationChange !== null) {
            parameters.onValidationChange(parameters.validationFunction(newValue))
        }
    }

    renderTextOrDate = (parameters) => {
        const { type, value, valid, placeholder, min, max } = parameters
        const disabled = this.isDisabled()

        return (
            <div className="d-flex align-items-center justify-content-center">
                <input
                    name={`measurement-${type}`}
                    type={(type === 'date' && value) ? 'date' : 'text'}
                    className={`measurement-input form-control ${valid === false && !disabled ? 'is-invalid' : ''}`}
                    value={value ?? ''}
                    onChange={(e) => this.onChangeAndValidate(e.target.value, parameters)}
                    placeholder={placeholder}
                    onFocus={(e) => type === 'date' && (e.target.type = 'date')}
                    onTouchStart={(e) => type === 'date' && (e.target.type = 'date')}
                    onBlur={(e) => type === 'date' && !e.target.value && (e.target.type = 'text')}
                    min={min}
                    max={max}
                    disabled={disabled}
                />
            </div>
        )
    }

    renderRadioOrCheckbox = (parameters) => {
        const { type, value, valid, options = [] } = parameters
        const disabled = this.isDisabled()

        return (
            <div>
                {options.map((option) => {
                    const optionId = `${type}-${option}-${this.uuid}`
                    return (
                        <div key={optionId} className="form-check mt-3 cursor-p">
                            <input
                                type={type}
                                className={`form-check-input  cursor-p ${valid === false && !disabled ? 'is-invalid' : ''}`}
                                name={`measurement-${type}-${this.uuid}`}
                                id={optionId}
                                value={option}
                                checked={(type === 'radio' ? value === option : Array.isArray(value) && value.includes(option))}
                                onChange={(e) => this.onChangeAndValidate(e.target.value, parameters)}
                                disabled={disabled}
                            />
                            <label className="form-check-label cursor-p" htmlFor={optionId}>{option}</label>
                        </div>
                    )
                })}
            </div>
        )
    }

    renderNumber = (parameters) => {
        const { type, value, valid, placeholder, min, max, unit, counterButtons } = parameters
        const disabled = this.isDisabled()

        const step = type === 'decimal' ? 'any' : '1'
        const inputMode = type === 'decimal' ? 'decimal' : 'numeric'
        const currentValue = value ? parseFloat(value) : 0

        const decrement = () => {
            const newValue = currentValue - 1
            if (min !== undefined && newValue < min) return
            this.onChangeAndValidate(newValue, parameters)
        }

        const increment = () => {
            const newValue = currentValue + 1
            if (max !== undefined && newValue > max) return
            this.onChangeAndValidate(newValue, parameters)
        }

        const canDecrement = !disabled && (min === undefined || currentValue > min)
        const canIncrement = !disabled && (max === undefined || currentValue < max)

        return (
            <div className="d-flex align-items-center justify-content-center">
                <div className={unit || (type === 'integer' && counterButtons) ? 'input-group' : ''}>
                    {type === 'integer' && counterButtons && (
                        <button
                            type="button"
                            className={`btn btn-${disabled ? 'secondary' : 'primary'}`}
                            onClick={decrement}
                            disabled={!canDecrement}
                        >
                            <i className="bi bi-dash"></i>
                        </button>
                    )}
                    <input
                        name={`measurement-${type}`}
                        type="number"
                        step={step}
                        inputMode={inputMode}
                        className={`measurement-input form-control ${valid === false && !disabled ? 'is-invalid' : ''}`}
                        value={value ?? ''}
                        onChange={(e) => this.onChangeAndValidate(parseFloat(e.target.value), parameters)}
                        placeholder={placeholder}
                        min={min}
                        max={max}
                        disabled={disabled}
                    />
                    {type === 'integer' && counterButtons && (
                        <button
                            type="button"
                            className={`btn btn-${disabled ? 'secondary' : 'primary'}`}
                            onClick={increment}
                            disabled={!canIncrement}
                        >
                            <i className="bi bi-plus"></i>
                        </button>
                    )}
                    {unit && <span className="input-group-text">{unit}</span>}
                </div>
            </div>
        )
    }

    renderStopwatch = (parameters) => {
        return (
            <Stopwatch
                {...parameters}
                onChange={(seconds) => this.state.multipleValues.length > 0 ? this.multipleValuesOnChangeAndValidate(parameters.index, seconds, parameters) : this.onChangeAndValidate(seconds, parameters)}
            />
        )
    }

    renderCountdownTimer = (parameters) => {
        return (
            <CountdownTimer
                {...parameters}
                onChange={(seconds) => this.state.multipleValues.length > 0 ? this.multipleValuesOnChangeAndValidate(parameters.index, seconds, parameters) : this.onChangeAndValidate(seconds, parameters)}
            />
        )
    }

    renderContent = (parameters) => {
        const renderFunc = this.renderFunction(parameters)
        if (!renderFunc) return null

        if (parameters.numTrials && parameters.numTrials > 1) {
            return this.renderMultipleTrials(parameters, renderFunc)
        } else {
            return renderFunc(parameters)
        }
    }

    renderFunction = (parameters) => {
        const { type } = parameters

        if (type === "text" || type === "date") {
            return this.renderTextOrDate
        } else if (type === "radio" || type === "checkbox") {
            return this.renderRadioOrCheckbox
        } else if (type === "integer" || type === "decimal") {
            return this.renderNumber
        } else if (type === "stopwatch") {
            return this.renderStopwatch
        } else if (type === "countdown") {
            return this.renderCountdownTimer
        } else if (type === "fields") {
            return this.renderMultipleFields
        }

        console.error(`Measurement: Unknown measurement type "${type}"`)
        return null
    }

    renderMultipleFields = (parameters) => {
        const { fields, fieldNames } = parameters
        if (fields && fields.length > 0 && fieldNames && fieldNames.length > 0) {
            console.error('Measurement: Both "fields" and "fieldNames" params provided for fields type. Please provide only one of these.')
            return null
        }

        const mappedFields = fields && fields.length > 0 ? fields : fieldNames?.map(name => MEASUREMENT_CONFIGS[name]) || []

        if (mappedFields.length === 0) {
            return null
        }

        return (
            <div>
                {mappedFields.map((field, i) => {
                    const newParameters = {
                        ...field,
                        index: i,
                        value: this.state.multipleValues[i],
                        valid: parameters.valid[i],
                        disabled: this.isDisabled(),
                        onChange: (value) => this.multipleValuesOnChangeAndValidate(i, value, field),
                    }
                    return <div key={`field-${i}`} className="d-flex flex-column align-items-center mb-4">
                        {this.renderInstructions(field.instructions)}
                        {this.renderContent(newParameters)}
                    </div>
                })}
            </div>
        )
    }

    renderMultipleTrials = (parameters, renderFunction) => {
        let { numTrials = 1, trialNames } = parameters

        if (numTrials <= 1) {
            return null
        }

        if (trialNames && trialNames.length !== numTrials) {
            console.error(`Measurement: trialNames length (${trialNames.length}) does not match numTrials (${numTrials}). Ignoring trialNames.`)
            trialNames = null
        }

        const trials = []
        for (let i = 0; i < numTrials; i++) {
            const newParameters = {
                ...parameters,
                index: i,
                value: this.state.multipleValues[i],
                valid: parameters.valid[i],
                disabled: this.isDisabled(),
                onChange: (value) => this.multipleValuesOnChangeAndValidate(i, value, parameters),
            }
            trials.push(
                <div key={`trial-${i}`} className="mb-4">
                    <h5>{trialNames ? trialNames[i] : `Trial ${i + 1}`}</h5>
                    {renderFunction(newParameters)}
                </div>
            )
        }

        return <div>{trials}</div>
    }

    multipleValuesOnChangeAndValidate = (index, value, parameters) => {
        const updatedValues = [...(this.state.multipleValues)]
        updatedValues[index] = value
        this.setState({ multipleValues: updatedValues })
        this.props.onChange(updatedValues)
        if (this.props.onValidationChange !== undefined && this.props.onValidationChange !== null) {
            const isValid = parameters.validationFunction ? parameters.validationFunction(value) : true
            const updatedValids = [...(this.props.valid)]
            updatedValids[index] = isValid
            this.props.onValidationChange(updatedValids)
        }
    }

    render() {
        const content = this.renderContent(this.props)

        if (!content) return null

        return (
            <div className="measurement px-3 py-3">
                {this.renderInstructions(this.props.instructions)}
                {this.renderLabelAndDelete()}
                {this.renderDisabledToggles()}
                {content}
            </div>
        )
    }
}

export default Measurement
