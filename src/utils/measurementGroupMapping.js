import measurementGroupsConfig from '../config/measurement_groups.yaml'

// Transform YAML config into the runtime shape expected by consumers.
// YAML uses readable field names; runtime uses the legacy shape for compatibility.
export const MEASUREMENT_GROUP_MAP = measurementGroupsConfig.map(g => ({
    stateKey: g.key,
    name: g.name || null,
    calculationKeys: g.calculations || [],
    interpretationKeys: g.interpretations || [],
    patientLevel: g.patient_level || false,
}))

export const getInterpretationKeysForMeasurement = (stateKey) => {
    return MEASUREMENT_GROUP_MAP.find(m => m.stateKey === stateKey)?.interpretationKeys || []
}
