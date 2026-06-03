import { Component } from 'react'

const MIN_BPM = 1
const MAX_BPM = 300
const TICK_FREQUENCY_HZ = 800
const TICK_DURATION_SECONDS = 0.05
const SCHEDULER_INTERVAL_MS = 25
const SCHEDULER_LOOKAHEAD_SECONDS = 0.1

export class UtilityMetronome extends Component {
    constructor(props) {
        super(props)
        this.state = {
            bpm: 120,
            inputValue: '120',
            playing: false,
            inputMode: 'bpm',
        }
        this.audioContext = null
        this.nextTickTime = 0
        this.schedulerInterval = null
    }

    componentWillUnmount() {
        this.stopMetronome()
    }

    getIntervalSeconds = () => {
        return 60 / this.state.bpm
    }

    startMetronome = () => {
        if (this.state.bpm < MIN_BPM || this.state.bpm > MAX_BPM) return
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
        this.nextTickTime = this.audioContext.currentTime
        this.setState({ playing: true })
        this.schedulerInterval = setInterval(() => this.scheduler(), SCHEDULER_INTERVAL_MS)
    }

    stopMetronome = () => {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval)
            this.schedulerInterval = null
        }
        if (this.audioContext) {
            this.audioContext.close()
            this.audioContext = null
        }
        this.setState({ playing: false })
    }

    scheduler = () => {
        if (!this.audioContext) return
        const interval = this.getIntervalSeconds()
        while (this.nextTickTime < this.audioContext.currentTime + SCHEDULER_LOOKAHEAD_SECONDS) {
            this.playTick(this.nextTickTime)
            this.nextTickTime += interval
        }
    }

    playTick = (time) => {
        const osc = this.audioContext.createOscillator()
        const gain = this.audioContext.createGain()
        osc.connect(gain)
        gain.connect(this.audioContext.destination)
        osc.frequency.value = TICK_FREQUENCY_HZ
        gain.gain.value = 0.5
        osc.start(time)
        osc.stop(time + TICK_DURATION_SECONDS)
    }

    onInputChange = (e) => {
        const val = e.target.value
        this.setState({ inputValue: val })
        const num = parseFloat(val)
        if (!isNaN(num) && num > 0) {
            const bpm = this.state.inputMode === 'bpm' ? num : 60 / num
            if (bpm >= MIN_BPM && bpm <= MAX_BPM) {
                this.setState({ bpm })
            }
        }
    }

    toggleInputMode = () => {
        this.setState(prev => {
            const newMode = prev.inputMode === 'bpm' ? 'interval' : 'bpm'
            const newValue = newMode === 'bpm'
                ? prev.bpm.toFixed(1)
                : (60 / prev.bpm).toFixed(3)
            return { inputMode: newMode, inputValue: newValue }
        })
    }

    render() {
        const { playing, inputValue, inputMode } = this.state

        return (
            <div className="d-flex flex-column align-items-center">
                <div className="d-flex gap-2 mb-3 align-items-center">
                    <div className="input-group" style={{ maxWidth: '200px' }}>
                        <input
                            type="number"
                            className="form-control text-center"
                            value={inputValue}
                            onChange={this.onInputChange}
                            min={inputMode === 'bpm' ? MIN_BPM : (60 / MAX_BPM).toFixed(3)}
                            max={inputMode === 'bpm' ? MAX_BPM : (60 / MIN_BPM)}
                            step={inputMode === 'bpm' ? '1' : '0.001'}
                            disabled={playing}
                        />
                        <button
                            className="btn btn-outline-secondary"
                            onClick={this.toggleInputMode}
                            disabled={playing}
                            title={`Switch to ${inputMode === 'bpm' ? 'seconds between ticks' : 'ticks per minute'}`}
                        >
                            {inputMode === 'bpm' ? 'BPM' : 'sec'}
                        </button>
                    </div>
                </div>
                <button
                    className={`btn btn-${playing ? 'danger' : 'success'} btn-lg d-flex align-items-center`}
                    onClick={playing ? this.stopMetronome : this.startMetronome}
                >
                    <i className={`bi bi-${playing ? 'stop-fill' : 'play-fill'} me-1`}></i>
                    {playing ? 'Stop' : 'Play'}
                </button>
            </div>
        )
    }
}

export default UtilityMetronome
