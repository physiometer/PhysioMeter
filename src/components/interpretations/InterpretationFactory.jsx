import interpretationsConfig from '../../config/interpretations.yaml'
import thresholdsConfig from '../../config/thresholds.yaml'
import { CALCULATION_SECTION_CONFIGS } from '../calculations/CalculationFactory'
import { FIELD_MAPPINGS } from '../measurements/MeasurementFactory'
import { buildInterpretationConfigs } from '../../engines/interpretationEngine'

export const INTERPRETATION_SECTION_CONFIGS = buildInterpretationConfigs(
    interpretationsConfig,
    thresholdsConfig,
    CALCULATION_SECTION_CONFIGS,
    FIELD_MAPPINGS,
)
