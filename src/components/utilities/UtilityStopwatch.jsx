import { Component } from 'react'

export class UtilityStopwatch extends Component {
    constructor(props) {
        super(props)
        this.state = {
            running: false,
            startTime: null,
            elapsed: 0,
            manualSeconds: '',
        }
        this.interval = null
    }

    componentWillUnmount() {
        if (this.interval) clearInterval(this.interval)
    }

    formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        const centiseconds = Math.floor((ms % 1000) / 10)
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
    }

    start = () => {
        this.setState(prev => ({
            running: true,
            startTime: Date.now() - prev.elapsed,
        }))
        this.interval = setInterval(() => {
            this.setState({ elapsed: Date.now() - this.state.startTime })
        }, 10)
    }

    stop = () => {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
        this.setState(prev => ({
            running: false,
            manualSeconds: (prev.elapsed / 1000).toFixed(2),
        }))
    }

    reset = () => {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
        this.setState({ running: false, startTime: null, elapsed: 0, manualSeconds: '' })
    }

    onManualChange = (e) => {
        const val = e.target.value
        this.setState({ manualSeconds: val })
        const seconds = parseFloat(val)
        if (!isNaN(seconds) && seconds >= 0) {
            this.setState({ elapsed: Math.round(seconds * 1000) })
        }
    }

    render() {
        const { running, elapsed, manualSeconds } = this.state

        return (
            <div className="d-flex flex-column align-items-center">
                <div className="font-monospace display-4 mb-3 user-select-none">
                    {this.formatTime(elapsed)}
                </div>
                <div className="d-flex gap-2 mb-3">
                    {!running ? (
                        <button className="btn btn-success d-flex align-items-center" onClick={this.start}>
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
                <div className="input-group" style={{ maxWidth: '200px' }}>
                    <input
                        type="number"
                        className="form-control text-center"
                        value={manualSeconds}
                        onChange={this.onManualChange}
                        placeholder="Seconds"
                        step="0.01"
                        min="0"
                        disabled={running}
                    />
                    <span className="input-group-text">sec</span>
                </div>
            </div>
        )
    }
}

export default UtilityStopwatch
