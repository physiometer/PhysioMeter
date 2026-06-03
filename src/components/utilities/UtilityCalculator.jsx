import { Component } from 'react'

export class UtilityCalculator extends Component {
    constructor(props) {
        super(props)
        this.state = {
            display: '0',
            firstOperand: null,
            operator: null,
            waitingForSecondOperand: false,
        }
    }

    inputDigit = (digit) => {
        this.setState(prev => {
            if (prev.waitingForSecondOperand) {
                return { display: String(digit), waitingForSecondOperand: false }
            }
            return { display: prev.display === '0' ? String(digit) : prev.display + digit }
        })
    }

    inputDecimal = () => {
        this.setState(prev => {
            if (prev.waitingForSecondOperand) {
                return { display: '0.', waitingForSecondOperand: false }
            }
            if (!prev.display.includes('.')) {
                return { display: prev.display + '.' }
            }
            return null
        })
    }

    handleOperator = (nextOperator) => {
        this.setState(prev => {
            const inputValue = parseFloat(prev.display)

            if (prev.firstOperand === null) {
                return {
                    firstOperand: inputValue,
                    operator: nextOperator,
                    waitingForSecondOperand: true,
                }
            }

            if (prev.operator && !prev.waitingForSecondOperand) {
                const result = this.calculate(prev.firstOperand, inputValue, prev.operator)
                return {
                    display: String(result),
                    firstOperand: result,
                    operator: nextOperator,
                    waitingForSecondOperand: true,
                }
            }

            return { operator: nextOperator, waitingForSecondOperand: true }
        })
    }

    calculate = (first, second, operator) => {
        switch (operator) {
            case '+': return first + second
            case '-': return first - second
            case '*': return first * second
            case '/': return second !== 0 ? first / second : 'Error'
            default: return second
        }
    }

    performCalculation = () => {
        this.setState(prev => {
            if (prev.operator === null || prev.waitingForSecondOperand) return null

            const inputValue = parseFloat(prev.display)
            const result = this.calculate(prev.firstOperand, inputValue, prev.operator)
            return {
                display: String(result),
                firstOperand: null,
                operator: null,
                waitingForSecondOperand: false,
            }
        })
    }

    clear = () => {
        this.setState({
            display: '0',
            firstOperand: null,
            operator: null,
            waitingForSecondOperand: false,
        })
    }

    backspace = () => {
        this.setState(prev => {
            if (prev.waitingForSecondOperand) return null
            const newDisplay = prev.display.length > 1 ? prev.display.slice(0, -1) : '0'
            return { display: newDisplay }
        })
    }

    onDisplayChange = (e) => {
        const val = e.target.value
        if (val === '' || val === '-' || !isNaN(parseFloat(val))) {
            this.setState({ display: val || '0', waitingForSecondOperand: false })
        }
    }

    render() {
        const { display, operator } = this.state

        const buttons = [
            { label: 'C', onClick: this.clear, className: 'btn-secondary' },
            { label: '\u232B', onClick: this.backspace, className: 'btn-secondary' },
            { label: '/', onClick: () => this.handleOperator('/'), className: `btn-${operator === '/' ? 'primary' : 'outline-primary'}` },
            { label: '*', onClick: () => this.handleOperator('*'), className: `btn-${operator === '*' ? 'primary' : 'outline-primary'}` },
            { label: '7', onClick: () => this.inputDigit('7'), className: 'btn-outline-dark' },
            { label: '8', onClick: () => this.inputDigit('8'), className: 'btn-outline-dark' },
            { label: '9', onClick: () => this.inputDigit('9'), className: 'btn-outline-dark' },
            { label: '-', onClick: () => this.handleOperator('-'), className: `btn-${operator === '-' ? 'primary' : 'outline-primary'}` },
            { label: '4', onClick: () => this.inputDigit('4'), className: 'btn-outline-dark' },
            { label: '5', onClick: () => this.inputDigit('5'), className: 'btn-outline-dark' },
            { label: '6', onClick: () => this.inputDigit('6'), className: 'btn-outline-dark' },
            { label: '+', onClick: () => this.handleOperator('+'), className: `btn-${operator === '+' ? 'primary' : 'outline-primary'}` },
            { label: '1', onClick: () => this.inputDigit('1'), className: 'btn-outline-dark' },
            { label: '2', onClick: () => this.inputDigit('2'), className: 'btn-outline-dark' },
            { label: '3', onClick: () => this.inputDigit('3'), className: 'btn-outline-dark' },
            { label: '=', onClick: this.performCalculation, className: 'btn-success' },
            { label: '0', onClick: () => this.inputDigit('0'), className: 'btn-outline-dark', span: 2 },
            { label: '.', onClick: this.inputDecimal, className: 'btn-outline-dark' },
        ]

        return (
            <div className="d-flex flex-column align-items-center">
                <div style={{ maxWidth: '280px', width: '100%' }}>
                    <input
                        type="text"
                        className="form-control form-control-lg text-end font-monospace mb-2"
                        value={display}
                        onChange={this.onDisplayChange}
                    />
                    <div className="d-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                        {buttons.map(({ label, onClick, className, span }) => (
                            <button
                                key={label}
                                className={`btn ${className} py-2`}
                                onClick={onClick}
                                style={span ? { gridColumn: `span ${span}` } : {}}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }
}

export default UtilityCalculator
