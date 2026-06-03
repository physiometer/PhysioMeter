import { Component } from 'react'

export class UtilityTally extends Component {
    constructor(props) {
        super(props)
        this.state = {
            count: 0,
            inputValue: '0',
        }
    }

    increment = () => {
        this.setState(prev => {
            const count = prev.count + 1
            return { count, inputValue: count.toString() }
        })
    }

    decrement = () => {
        this.setState(prev => {
            const count = prev.count - 1
            return { count, inputValue: count.toString() }
        })
    }

    reset = () => {
        this.setState({ count: 0, inputValue: '0' })
    }

    onManualChange = (e) => {
        const val = e.target.value
        this.setState({ inputValue: val })
        const num = parseInt(val)
        if (!isNaN(num)) {
            this.setState({ count: num })
        }
    }

    render() {
        const { count, inputValue } = this.state

        return (
            <div className="d-flex flex-column align-items-center">
                <div className="font-monospace display-4 mb-3 user-select-none">
                    {count}
                </div>
                <div className="d-flex gap-2 mb-3">
                    <button className="btn btn-danger btn-lg d-flex align-items-center" onClick={this.decrement}>
                        <i className="bi bi-dash-lg"></i>
                    </button>
                    <button className="btn btn-success btn-lg d-flex align-items-center" onClick={this.increment}>
                        <i className="bi bi-plus-lg"></i>
                    </button>
                    <button className="btn btn-warning d-flex align-items-center" onClick={this.reset}>
                        <i className="bi bi-arrow-counterclockwise me-1"></i>Reset
                    </button>
                </div>
                <div className="input-group" style={{ maxWidth: '150px' }}>
                    <input
                        type="number"
                        className="form-control text-center"
                        value={inputValue}
                        onChange={this.onManualChange}
                        placeholder="Count"
                    />
                </div>
            </div>
        )
    }
}

export default UtilityTally
