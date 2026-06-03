import { Component } from 'react'
import Measurement from './Measurement'
import measurementsConfig from '../../config/measurements.yaml'
import { buildMeasurementConfigs } from '../../engines/measurementEngine'

// Drop a new .md in ./instructions/ and reference it by filename (no .md) in measurements.yaml.
const instructionFiles = import.meta.glob('./instructions/*.md', { eager: true, query: '?raw', import: 'default' })
const INSTRUCTIONS_MAP = {}
for (const [path, content] of Object.entries(instructionFiles)) {
    const key = path.split('/').pop().replace('.md', '')
    INSTRUCTIONS_MAP[key] = content
}

export const MAX_LENGTH = 1000
export const MAX_SECONDS = 3600

// Resolves dotted measurement paths (e.g. "vitalSigns.bloodPressure") to their field index.
export const FIELD_MAPPINGS = {}
for (const [key, config] of Object.entries(measurementsConfig)) {
    if (key.startsWith('_')) continue
    if (config.field_names) {
        FIELD_MAPPINGS[key] = config.field_names
    }
}

export const MEASUREMENT_CONFIGS = buildMeasurementConfigs(measurementsConfig, INSTRUCTIONS_MAP, FIELD_MAPPINGS)

export function createMeasurementInstance(measurementKey, existingCount = 0) {
    const config = MEASUREMENT_CONFIGS[measurementKey]
    const label = `${config?.defaultLabel || measurementKey} ${existingCount === 0 ? '' : existingCount + 1}`
    const entry = { label, value: '', lastModified: new Date().toISOString() }
    const validation = false
    const disabledEntry = [
        ...(new Array(config?.disabledCasesComputed?.length ?? 0).fill(true)),
        ...(new Array(config?.disabledCases?.length ?? 0).fill(false)),
    ]
    return { entry, validation, disabledEntry }
}

export const createMeasurement = (configKey) => {
    const config = MEASUREMENT_CONFIGS[configKey]

    if (!config) {
        console.error(`Measurement configuration for key "${configKey}" not found.`)
        return null
    }

    return class extends Component {
        render() {
            return <Measurement {...config} {...this.props} />
        }
    }
}
