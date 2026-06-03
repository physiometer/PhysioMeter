import { Component } from 'react'

import Title from '../form/Title'
import UtilityStopwatch from './UtilityStopwatch'
import UtilityTimer from './UtilityTimer'
import UtilityTally from './UtilityTally'
import UtilityCalculator from './UtilityCalculator'
import UtilityMetronome from './UtilityMetronome'

const UTILITY_CONFIG = [
    { key: 'stopwatch', name: 'Stopwatch', icon: 'bi-stopwatch', component: UtilityStopwatch },
    { key: 'timer', name: 'Timer', icon: 'bi-hourglass-split', component: UtilityTimer },
    { key: 'tally', name: 'Tally', icon: 'bi-hash', component: UtilityTally },
    { key: 'calculator', name: 'Calculator', icon: 'bi-calculator', component: UtilityCalculator },
    { key: 'metronome', name: 'Metronome', icon: 'bi-music-note-beamed', component: UtilityMetronome },
]

export class UtilitiesPage extends Component {
    constructor(props) {
        super(props)
        this.state = {
            expanded: {},
        }
    }

    toggleExpanded = (key) => {
        this.setState(prev => ({
            expanded: { ...prev.expanded, [key]: !prev.expanded[key] }
        }))
    }

    render() {
        return (
            <div id="utilities-page">
                <Title>Utilities</Title>
                <div className="d-flex flex-column align-items-center mb-5">
                    <h5 className="text-center text-danger w-75">No information is saved. If you close or reload the page, all data will be lost.</h5>
                </div>
                <div className="d-flex flex-column align-items-center px-3">
                    {UTILITY_CONFIG.map(({ key, name, icon, component: UtilityComponent }) => (
                        <div key={key} className="card mb-3 w-100" style={{ maxWidth: '500px' }}>
                            <div
                                className="card-header cursor-p d-flex justify-content-between align-items-center"
                                onClick={() => this.toggleExpanded(key)}
                            >
                                <h5 className="m-0"><i className={`bi ${icon} me-2`}></i>{name}</h5>
                                <i className={`bi bi-chevron-${this.state.expanded[key] ? 'up' : 'down'}`}></i>
                            </div>
                            {this.state.expanded[key] && (
                                <div className="card-body">
                                    <UtilityComponent />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )
    }
}

export default UtilitiesPage
