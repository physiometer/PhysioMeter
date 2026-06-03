import { Component } from 'react'

export class UtilityTimer extends Component {
    constructor(props) {
        super(props)
        this.state = {
            running: false,
            startTime: null,
            durationMs: 60 * 1000,
            remaining: 60 * 1000,
            inputMinutes: '1',
            inputSeconds: '00',
        }
        this.interval = null
    }

    componentWillUnmount() {
        if (this.interval) clearInterval(this.interval)
    }

    formatTime = (ms) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000))
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        const centiseconds = Math.floor((Math.max(0, ms) % 1000) / 10)
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
    }

    parseDuration = (minutes, seconds) => {
        const m = parseInt(minutes) || 0
        const s = parseInt(seconds) || 0
        return (m * 60 + s) * 1000
    }

    onMinutesChange = (e) => {
        const val = e.target.value
        this.setState({ inputMinutes: val })
        const durationMs = this.parseDuration(val, this.state.inputSeconds)
        this.setState({ durationMs, remaining: durationMs })
    }

    onSecondsChange = (e) => {
        const val = e.target.value
        this.setState({ inputSeconds: val })
        const durationMs = this.parseDuration(this.state.inputMinutes, val)
        this.setState({ durationMs, remaining: durationMs })
    }

    start = () => {
        if (this.state.remaining <= 0) return
        const now = Date.now()
        this.setState({
            running: true,
            startTime: now,
        })
        this.interval = setInterval(() => {
            const elapsed = Date.now() - this.state.startTime
            const remaining = Math.max(0, this.state.durationMs - elapsed)
            this.setState({ remaining })
            if (remaining <= 0) {
                this.stop()
            }
        }, 10)
    }

    stop = () => {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
        this.setState(prev => ({
            running: false,
            durationMs: prev.remaining,
        }))
    }

    reset = () => {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
        const durationMs = this.parseDuration(this.state.inputMinutes, this.state.inputSeconds)
        this.setState({ running: false, startTime: null, durationMs, remaining: durationMs })
    }

    render() {
        const { running, remaining, inputMinutes, inputSeconds } = this.state
        const expired = remaining <= 0

        return (
            <div className="d-flex flex-column align-items-center">
                <div className={`font-monospace display-4 mb-3 user-select-none ${expired ? 'text-danger' : ''}`}>
                    {this.formatTime(remaining)}
                </div>
                <div className="d-flex gap-2 mb-3">
                    {!running ? (
                        <button className="btn btn-success d-flex align-items-center" onClick={this.start} disabled={expired}>
                            <i className="bi bi-play-fill me-1"></i>Start
                        </button>
                    ) : (
                        <button className="btn btn-danger d-flex align-items-center" onClick={this.stop}>
                            <i className="bi bi-stop-fill me-1"></i>Stop
                        </button>
                    )}
                    <button className="btn btn-warning d-flex align-items-center" onClick={this.reset}>
                        <i className="bi bi-arrow-counterclockwise me-1"></i>Reset
                    </button>
                </div>
                <div className="d-flex align-items-center gap-1" style={{ maxWidth: '250px' }}>
                    <input
                        type="number"
                        className="form-control text-center"
                        value={inputMinutes}
                        onChange={this.onMinutesChange}
                        placeholder="Min"
                        min="0"
                        disabled={running}
                    />
                    <span className="fw-bold">:</span>
                    <input
                        type="number"
                        className="form-control text-center"
                        value={inputSeconds}
                        onChange={this.onSecondsChange}
                        placeholder="Sec"
                        min="0"
                        max="59"
                        disabled={running}
                    />
                </div>
            </div>
        )
    }
}

export default UtilityTimer
