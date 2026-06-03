import calculationsConfig from '../../config/calculations.yaml'
import measurementsConfig from '../../config/measurements.yaml'
import { buildCalculationConfigs } from '../../engines/calculationEngine'

export const CALCULATION_SECTION_CONFIGS = buildCalculationConfigs(calculationsConfig, measurementsConfig)
