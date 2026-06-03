import React, { Component } from 'react'
import { MAX_SECONDS } from '../MeasurementFactory'

export class Stopwatch extends Component {
    constructor(props) {
        super(props)
        this.state = {
            running: false,
            startTime: null,
            elapsed: 0,
        }
        this.interval = null
    }

    componentWillUnmount() {
        if (this.interval) {
            clearInterval(this.interval)
        }
    }

    formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        const centiseconds = Math.floor((ms % 1000) / 10)
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
    }

    start = () => {
        const now = Date.now()
        this.setState({
            running: true,
            startTime: now - this.state.elapsed,
        })
        this.interval = setInterval(() => {
            const elapsed = Date.now() - this.state.startTime
            this.setState({ elapsed })
        }, 10)
        // TODO: not implemented for now, currently not timestamping start time
        // this.props.onStart(new Date().toISOString())
    }

    stop = () => {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
        this.setState({ running: false })
        const seconds = Math.floor(this.state.elapsed / 10) / 100
        this.props.onChange(seconds)
    }

    reset = () => {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
        this.setState({
            running: false,
            startTime: null,
            elapsed: 0,
        })
    }

    render() {
        const { value, onChange, valid, placeholder, computedFields, disabled } = this.props
        const { running, elapsed } = this.state

        const displayTime = this.formatTime(elapsed)
        const computedValues = computedFields ? computedFields(value) : null

        return (
            <div className="d-flex flex-column stopwatch-measurement">
                <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-stopwatch me-3"></i>
                    <span className="font-monospace me-4">
                        {displayTime}
                    </span>
                    {!running ? (
                        <button type="button" className={`btn btn-${disabled ? 'secondary' : 'success'} d-flex align-items-center`} onClick={this.start} disabled={disabled}>
                            <i className="bi bi-play-fill me-1"></i>Start
                        </button>
                    ) : (
                        <button type="button" className={`btn btn-${disabled ? 'secondary' : 'danger'} d-flex align-items-center`} onClick={this.stop} disabled={disabled}>
                            <i className="bi bi-stop-fill me-1"></i>Stop
                        </button>
                    )}
                    <button type="button" className={`btn btn-${disabled ? 'secondary' : 'warning'} d-flex align-items-center ms-3`} onClick={this.reset} disabled={disabled}>
                        <i className="bi bi-arrow-counterclockwise me-1"></i>Reset
                    </button>
                </div>
                <div className="d-flex align-items-center">
                    <div className="input-group">
                        <input
                            name="measurement-stopwatch"
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            className={`measurement-input form-control ${valid === false && !disabled ? 'is-invalid' : ''}`}
                            value={value ?? ''}
                            onChange={(e) => onChange(parseFloat(e.target.value))}
                            placeholder={placeholder || 'Seconds'}
                            min="0"
                            max={MAX_SECONDS}
                            disabled={disabled}
                        />
                        <span className="input-group-text">sec</span>
                    </div>
                </div>
                {computedValues &&
                    <div className="d-flex mt-3">
                        <ul>
                            {Object.keys(computedValues).map((fieldKey) => (
                                <li key={fieldKey}>
                                    {fieldKey}: {computedValues[fieldKey]}
                                </li>
                            ))}
                        </ul>
                    </div>
                }
            </div>
        )
    }
}

export default Stopwatch
