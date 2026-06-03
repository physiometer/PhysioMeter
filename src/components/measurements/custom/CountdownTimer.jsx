import React, { Component } from 'react'

export class CountdownTimer extends Component {
    constructor(props) {
        super(props)
        this.state = {
            running: false,
            startTime: null,
            remaining: this.getDurationMs(),
        }
        this.interval = null
    }

    getDurationMs = () => {
        return (this.props.duration || 60) * 1000
    }

    componentDidUpdate(prevProps) {
        if (this.props.disabled && !prevProps.disabled && this.state.running) {
            this.reset()
        }
        // hacky way to ensure validation passes
        if (this.props.valid === false) {
            this.props.onChange(null)
        }
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
        const durationMs = this.getDurationMs()
        this.setState({
            running: true,
            startTime: now,
            remaining: durationMs,
        })
        this.interval = setInterval(() => {
            const elapsed = Date.now() - this.state.startTime
            const remaining = Math.max(0, this.getDurationMs() - elapsed)
            this.setState({ remaining })

            if (remaining <= 0) {
                this.stop()
            }
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
        const elapsed = Date.now() - this.state.startTime
        this.props.onChange(elapsed)
    }

    reset = () => {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
        this.setState({
            running: false,
            startTime: null,
            remaining: this.getDurationMs(),
        })
    }

    isTimerExpired = () => {
        return this.state.remaining <= 0
    }

    render() {
        const { disabled } = this.props
        const { running, remaining } = this.state

        const displayTime = this.formatTime(remaining)
        const timerExpired = this.isTimerExpired()

        return (
            <div className="d-flex flex-column countdown-measurement">
                <div className="d-flex align-items-center">
                    <i className={`bi bi-hourglass-split me-3 ${timerExpired ? 'text-danger' : ''}`}></i>
                    <span className={`font-monospace me-4 ${timerExpired ? 'text-danger' : ''}`}>
                        {displayTime}
                    </span>
                    {!running ? (
                        <button
                            type="button"
                            className={`btn btn-${disabled ? 'secondary' : 'success'} d-flex align-items-center`}
                            onClick={this.start}
                            disabled={timerExpired || disabled}
                        >
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
            </div>
        )
    }
}

export default CountdownTimer
