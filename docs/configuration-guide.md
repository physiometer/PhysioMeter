# PhysioMeter Configuration Guide

This guide explains how to add or modify measurements, calculations, interpretations, and test presets **without writing code**. All configuration lives in YAML files inside `src/config/`.

## Table of Contents

- [Overview](#overview)
- [Measurements](#measurements)
- [Validation Rules](#validation-rules)
- [Calculations](#calculations)
- [Interpretations](#interpretations)
- [Threshold Tables](#threshold-tables)
- [Measurement Groups](#measurement-groups)
- [Test Presets](#test-presets)
- [Condition Reference](#condition-reference)
- [Severity Levels](#severity-levels)
- [Disabled Cases](#disabled-cases)
- [YAML Anchors](#yaml-anchors)
- [Validating Your Changes](#validating-your-changes)
- [Common Pitfalls](#common-pitfalls)

---

## Overview

PhysioMeter's clinical logic is defined in 6 YAML files:

| File | Purpose |
|------|---------|
| `measurements.yaml` | Defines each data input field (type, label, validation rules) |
| `calculations.yaml` | Defines computed values from measurement data (mean, min, max, age) |
| `interpretations.yaml` | Defines clinical interpretation rules (fall risk, frailty, mobility) |
| `thresholds.yaml` | Defines age/sex-specific threshold tables for mobility classification |
| `measurement_groups.yaml` | Links measurements to their calculations and interpretations |
| `tests.yaml` | Defines test presets (which measurements to include) |

When you edit these files, the app automatically picks up the changes (no code changes needed).

---

## Measurements

`src/config/measurements.yaml` defines every data input in the app. Each entry specifies its type, label, validation rules, and optional features like instructions or disabled cases.

### Structure

```yaml
oxygenSaturation:
  type: decimal                          # Input type (see below)
  label: "Oxygen Saturation"             # Display name
  placeholder: "oxygen saturation (%)"   # Input placeholder text
  min: 0                                 # Minimum value (for UI display)
  max: 100                               # Maximum value (for UI display)
  unit: "%"                              # Unit shown next to the value
  instructions: OxygenSaturation         # Filename (without .md) of a markdown file in instructions/
  validation:                            # Rules that determine if the input is valid (see Validation Rules)
    is_between: [0, 100]
```

### Input types

- `text` -- Free text input
- `date` -- Date picker
- `radio` -- Multiple choice (requires `options`)
- `integer` -- Whole number input
- `decimal` -- Decimal number input
- `stopwatch` -- Timed trial (requires `num_trials`; optionally `trial_names` to label each trial)
- `countdown` -- Countdown timer (requires `duration` in seconds)
- `fields` -- Composite type that groups multiple inputs together. Use `field_names` to reference other measurement keys (each renders as its own input), or `fields` to define inline sub-inputs with their own type/label/validation.

### Additional measurement properties

- `computed_display` -- Show derived values next to the input. Each entry defines a formula applied to the input value:

  ```yaml
  computed_display:
    - label: "Walking Speed"
      unit: "m/s"
      formula: divide
      numerator: 5
      denominator_from: value
      decimal_places: 3
  ```

- `action_button` -- Show a navigation button on the measurement page:

  ```yaml
  action_button:
    text: "Navigate to modified protocol"
    navigate_to: modifiedFourSquareStepTest    # Measurement key to navigate to
    bypass_disabled_indices: [1]               # Optional: indices of disabled_cases to bypass on the target
  ```

- `counter_buttons: true` -- On inline `integer` fields, show increment/decrement buttons.

- `display_only: true` -- On inline fields, marks the field as a UI utility (e.g., a countdown timer). Display-only fields still render in the measurement input but are hidden from summaries and exports.

### Adding a new measurement

**Example: Adding a "Berg Balance Scale" measurement**

**Step 1:** Add the measurement to `measurements.yaml`:

```yaml
bergBalanceScale:
  type: integer
  label: "Berg Balance Scale"
  placeholder: "Score (0-56)"
  min: 0
  max: 56
  unit: "points"
  instructions: BergBalanceScale      # Optional: create a markdown file for instructions
  validation:
    is_between: [0, 56]
    is_integer: true
```

**Step 2 (optional):** Add an instruction markdown file.

Create `src/components/measurements/instructions/BergBalanceScale.md` with instructions for administering the test. The file is auto-discovered -- no code changes needed. The `instructions:` value in the YAML must match the filename without the `.md` extension.

**Step 3:** Add the measurement group in `measurement_groups.yaml` (see [Measurement Groups](#measurement-groups)).

**Step 4:** Add it to test presets if applicable (see [Test Presets](#test-presets)).

---

## Validation Rules

The `validation:` block on a measurement defines rules that determine whether the user's input is valid. These are separate from [conditions](#condition-reference) (which are used in `when`/`show_when` blocks).

### Basic rules

| Rule | Meaning | Example |
|------|---------|---------|
| `required: true` | Value must not be empty | Name field |
| `max_length: 1000` | Maximum string length | Free text cap |
| `is_between: [0, 100]` | Value >= min and <= max (inclusive) | Oxygen saturation |
| `is_between_exclusive: [0, 3600]` | Value > min and < max (exclusive) | Stopwatch time |
| `is_integer: true` | Value must be a whole number | Pulse rate |
| `is_one_of: ["A", "B"]` | Value must be in the list | Dropdown |
| `rule: valid_date_of_birth` | Named built-in rule | Date of birth |

Multiple rules can be combined in the same `validation:` block -- all must pass:

```yaml
validation:
  is_between: [0, 300]
  is_integer: true
```

### Pattern matching with extracted values

For structured text inputs (e.g., blood pressure as "120/80"), use `matches_pattern` with `extracted_values` to validate the parts individually:

```yaml
validation:
  matches_pattern: "^(\\d{1,3})/(\\d{1,3})$"    # Must match this regex
  extracted_values:                                # Name the capture groups
    systolic:
      group: 1                                     # First capture group
      type: integer
      is_between: [0, 200]
    diastolic:
      group: 2                                     # Second capture group
      type: integer
      is_between: [0, 200]
  rules:                                           # Inter-field rules
    - field: systolic
      is_greater_than_field: diastolic             # Systolic must be > diastolic
```

---

## Calculations

`src/config/calculations.yaml` defines computed values derived from measurement data. Each calculation specifies an operation, its source measurement, and formatting options.

### Structure

```yaml
timedUpAndGoBest:
  label: "Timed Up and Go (TUG) - Best"
  unit: "s"
  operation: trial_min                   # Finds the minimum (fastest) trial
  from_measurement: timedUpAndGo         # Which measurement to pull data from
  decimal_places: 2                      # Round to 2 decimal places
```

### Operations

| Operation | Description |
|-----------|-------------|
| `trial_mean` | Averages all trial values across all instances |
| `trial_min` | Finds the minimum (lowest) trial value across all instances |
| `trial_max` | Finds the maximum (highest) trial value across all instances |
| `field_min` | Finds the minimum value of a specific field (use with `field_label`) |
| `field_max` | Finds the maximum value of a specific field (use with `field_label`) |
| `age_from_date_of_birth` | Computes age in years from a date field |

For `field_min` and `field_max`, use `field_label` to specify which field to extract by its label. The label must match one of the `fields[].label` values in the measurement definition:

```yaml
timedUpAndGoCognitiveBest:
  label: "Timed Up and Go Cognitive Dual Task - Best"
  unit: "s"
  operation: field_min
  from_measurement: timedUpAndGoCognitive
  field_label: "Time"                    # Must match a label in the measurement's fields
  decimal_places: 2
```

### Adding a new calculation

**Step 1:** Add the calculation to `calculations.yaml`:

```yaml
bergBalanceScaleTotal:
  label: "Berg Balance Scale - Total"
  unit: "points"
  operation: trial_min
  from_measurement: bergBalanceScale
  decimal_places: 0
```

**Step 2:** Link it to a measurement group in `measurement_groups.yaml` (see [Measurement Groups](#measurement-groups)).

---

## Interpretations

`src/config/interpretations.yaml` defines clinical interpretation rules. Each interpretation uses a **rule chain** that is evaluated top-to-bottom, checking conditions and producing messages with severity levels.

### Structure

```yaml
bergBalanceScale:
  label: "Berg Balance Scale"
  citation: '<a href="https://example.com" target="_blank">Reference</a>'
  rules:
    # If no data available, skip
    - when:
        from_calculation: bergBalanceScaleTotal
        is_missing: true
      then: skip

    # High fall risk
    - when:
        from_calculation: bergBalanceScaleTotal
        is_less_than: 36
      show_message:
        text: "High fall risk (score < 36)"
        severity: concern

    # Medium fall risk
    - when:
        from_calculation: bergBalanceScaleTotal
        is_between: [36, 44]
      show_message:
        text: "Medium fall risk (score 36-44)"
        severity: caution

    # Low fall risk
    - when:
        from_calculation: bergBalanceScaleTotal
        is_greater_than: 44
      show_message:
        text: "Low fall risk (score > 44)"
        severity: normal
```

### Rule types

| Rule | Purpose | Example |
|------|---------|---------|
| `when` + `then: skip` | Stop processing and return no interpretation | Missing data check |
| `when` + `show_message` | Add a message if condition is true | Fall risk alert |
| `let` | Compute a variable for use in later rules | Convert time to speed |
| `lookup_threshold` | Generate mobility classification messages from a threshold table | Age/sex classification |
| `otherwise` | Fires only if no messages have been added yet; must be the last rule | Default "normal" message |
| `check_interpretation` | Check the result of another interpretation | Annual screening checking vitals |

### Using variables with `let`

You can compute intermediate values and reference them in later rules. A `let` variable can read from `from_calculation`, `from_measurement`, or `from_variable`, and optionally apply a conversion:

```yaml
    # Convert time (seconds) to speed (m/s)
    - let:
        walking_speed:
          from_calculation: fiveMeterUsualWalkingSpeedMean
          convert: time_to_speed
          distance_meters: 5

    # Now use the variable
    - when:
        from_variable: walking_speed
        is_less_than: 0.76
      show_message:
        text: "Fall risk"
        severity: concern
```

### Default messages with `otherwise`

`otherwise` fires only if no messages have been added by earlier rules. It must be the **last rule** in the chain. Useful for a default "all clear" message:

```yaml
    - otherwise:
        show_message:
          text: "This patient is eligible for physical activity."
          severity: normal
```

### Threshold table lookups

To generate age/sex-specific mobility classification messages:

```yaml
    - lookup_threshold:
        value_from_calculation: timedUpAndGoBest  # Or value_from_variable
        table: timed_up_and_go                    # Table name in thresholds.yaml
        patient_sex_from: measurement.sex
        patient_age_from: calculation.age
```

This emits a single Green / Yellow / Red Zone message based on where the patient's value falls relative to the age/sex normative mean and standard deviation in `thresholds.yaml`. Zone boundaries are derived as `mean ± yellow_sd × sd` (yellow) and `mean ± red_sd × sd` (red) using the SD-multipliers in `zone_defaults`, with the direction set by `compare_as` (see [Threshold Tables](#threshold-tables)).

### Checking another interpretation with `check_interpretation`

You can evaluate another interpretation and act on its result:

```yaml
    - check_interpretation:
        interpretation: vitalSigns                              # Key of the interpretation to check
        when_null: skip                                         # If that interpretation returns null, skip
        when_message_includes: "ineligible for physical activity."  # Check if any message contains this text
        show_message:                                           # If the text matched, show this message
          text: "Refer to primary care provider."
          severity: caution
        otherwise: skip                                         # If the text did NOT match, skip
```

### Adding a new interpretation

**Step 1:** Add the interpretation to `interpretations.yaml` (see the structure above).

**Step 2:** Link it to a measurement group in `measurement_groups.yaml` (see [Measurement Groups](#measurement-groups)).

---

## Threshold Tables

`src/config/thresholds.yaml` contains age/sex-specific clinical thresholds used by `lookup_threshold` rules in interpretations.

### Structure

```yaml
# Required top-level block: SD-band coefficients and zone descriptions.
zone_defaults:
  yellow_sd: 0.5                     # yellow boundary at mean ± yellow_sd × sd
  red_sd: 1.0                        # red boundary at mean ± red_sd × sd
  descriptions:
    green: "The participant's performance is similar to others..."
    yellow: "The participant is performing below normative data..."
    red: "The participant likely has mobility issues..."

# One block per measure. Every other top-level key is a threshold table.
usual_walking_speed:
  compare_as: "higher_is_better"    # or "lower_is_better"
  unit: "m/s"                        # rendered in the cutoff line
  decimals: 2                        # precision for the rendered cutoff
  Male:
    "50-59": { mean: 1.31, sd: 0.16 }
    "60-69": { mean: 1.27, sd: 0.71 }
    # ...
  Female:
    "50-59": { mean: 1.26, sd: 0.17 }
    # ...
```

### `zone_defaults` fields

- `yellow_sd` -- SD-multiplier for the yellow zone boundary. Must be smaller than `red_sd`.
- `red_sd` -- SD-multiplier for the red zone boundary.
- `descriptions.{green,yellow,red}` -- Final-line text rendered after the cutoff and reference lines for each zone.

### Table-level fields

- `compare_as` -- How to interpret the values:
  - `higher_is_better` -- Lower scores are worse (e.g., walking speed). Yellow boundary is `mean − yellow_sd × sd`; red is `mean − red_sd × sd`.
  - `lower_is_better` -- Higher scores are worse (e.g., completion time). Yellow boundary is `mean + yellow_sd × sd`; red is `mean + red_sd × sd`.
- `unit` -- Display unit appended to the cutoff value in the rendered message (e.g., `m/s`, `sec`).
- `decimals` -- Number of decimal places to render for the cutoff value.

### Entry-level fields (per age/sex bracket)

- `mean` -- Reference mean for the age/sex group
- `sd` -- Standard deviation

**Age brackets:** `50-59`, `60-69`, `70-79`, `80-89`, `90+`

### Output

A single Green/Yellow/Red Zone message is emitted using the description text from `zone_defaults`. Severity maps: green → success, yellow → warning, red → danger.

---

## Measurement Groups

`src/config/measurement_groups.yaml` links measurements to their calculations and interpretations, and determines how they are grouped in the summary view.

### Structure

```yaml
# Patient-level entries (shown read-only in summary)
- key: name
  name: "Name"
  patient_level: true

- key: dob
  name: "Date of Birth"
  patient_level: true
  calculations:
    - age

- key: sex
  name: "Sex"
  patient_level: true

# Test groups
- key: fiveMeterUsualWalkingSpeed
  name: "5 Meter Usual Walking Speed"
  calculations:
    - fiveMeterUsualWalkingSpeedMean
  interpretations:
    - usualWalkingSpeed
```

Every measurement must belong to exactly one group. Every calculation and interpretation must also be assigned to exactly one group. Run `npm run validate:config` to verify this.

### Adding a measurement group

Add an entry to `measurement_groups.yaml`:

```yaml
- key: bergBalanceScale
  name: "Berg Balance Scale"
  calculations:
    - bergBalanceScaleTotal
  interpretations:
    - bergBalanceScale
```

---

## Test Presets

`src/config/tests.yaml` defines which measurements are available in each test preset.

### Structure

```yaml
- key: measurements                       # URL-friendly identifier
  name: "Measurements"                    # Display name
  # No permitted_measurements → all measurements available

- key: annualMobilityAssessment
  name: "Annual Mobility Assessment"
  permitted_measurements:
    - vitalSigns
    - fiveMeterUsualWalkingSpeed
    - timedUpAndGo
    # ...
```

If `permitted_measurements` is omitted, all measurements are available. The keys in `permitted_measurements` must match the `key` field of a measurement group.

### Adding a new test preset

```yaml
- key: fallRiskScreening
  name: "Fall Risk Screening"
  permitted_measurements:
    - vitalSigns
    - timedUpAndGo
    - fourSquareStepTest
```

---

## Condition Reference

Conditions are used in `when` blocks to check values. They read naturally as English.

### Value sources

| Syntax | Meaning |
|--------|---------|
| `from_measurement: sex` | Read the value of the "sex" measurement |
| `from_measurement: vitalSigns.bloodPressure` | Read a field within a composite measurement |
| `from_measurement: vitalSigns.bloodPressure.systolic` | Read a sub-field (e.g., systolic from "120/80") |
| `from_calculation: age` | Read a calculated value |
| `from_variable: walking_speed` | Read a variable set by a `let` rule |

### Comparison operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `is_missing: true` | Value is null, undefined, or empty | Missing data check |
| `exists: true` | Value is present and not empty | Has data check |
| `is_less_than: 0.76` | Value < 0.76 | `speed < 0.76` |
| `is_at_most: 100` | Value <= 100 | `value <= 100` |
| `is_greater_than: 12.0` | Value > 12.0 | `time > 12.0` |
| `is_at_least: 17.8` | Value >= 17.8 | `value >= 17.8` |
| `is_between: [36, 44]` | 36 <= value <= 44 | Range check |
| `equals: "Male"` | Value exactly equals "Male" | Exact match |
| `is_one_of: ["None", "Straight Cane"]` | Value is in the list | Multiple options |
| `matches_pattern: "^\\d+$"` | Value matches the regex pattern | Pattern check |

### Special conditions (for disabled cases)

These conditions are available in `disabled_cases.show_when` blocks:

| Condition | Meaning |
|-----------|---------|
| `validations_incomplete: vitalSigns` | True if the measurement's form validation is not fully passing |
| `every_instance_of: assistiveDevices` + comparison | True only if every instance of the measurement passes the comparison |

See [Disabled Cases](#disabled-cases) for usage examples.

### Combining conditions

| Combinator | Meaning | Usage |
|------------|---------|-------|
| `all_of: [...]` | ALL conditions must be true (AND) | Check sex AND age AND value |
| `any_of: [...]` | ANY condition can be true (OR) | Check pulse OR blood pressure |
| `not: { ... }` | Negate a condition | Not ineligible |

**Example: Complex condition**

```yaml
    - when:
        all_of:
          - from_measurement: sex
            equals: "Female"
          - from_calculation: age
            is_greater_than: 80
          - from_calculation: timedUpAndGoBest
            is_greater_than: 12.0
      show_message:
        text: "Fall risk >12.0 sec"
        severity: concern
```

---

## Severity Levels

Messages use severity levels to indicate clinical significance:

| Severity | Color | Meaning | Use For |
|----------|-------|---------|---------|
| `concern` | Red | Clinical risk or ineligibility | Fall risk, ineligible for testing |
| `caution` | Yellow | Clinical warning | Frailty risk, screening referrals |
| `normal` | Green | Normal/positive result | Eligible for testing, Green Zone |
| `info` | Gray | Informational | Reference data, notes |

---

## Disabled Cases

Disabled cases prevent a measurement from being performed under certain conditions (e.g., the patient is ineligible for physical activity). The user sees a checkbox they can uncheck to override the restriction.

Each `disabled_cases` entry defines:
- `text` -- The explanation shown next to the override checkbox
- `default_checked` -- If `true`, the measurement starts disabled (checkbox is checked)
- `show_when` -- A condition that determines when to show the override checkbox

**Example: Disable when patient is ineligible for physical activity**

```yaml
disabled_cases:
  - text: "This patient is ineligible for physical activity."
    default_checked: true
    show_when:
      any_of:
        - validations_incomplete: vitalSigns
        - from_measurement: vitalSigns.restingPulseRate
          is_greater_than: 100
        - from_measurement: vitalSigns.oxygenSaturation
          is_less_than: 90
        - from_measurement: vitalSigns.bloodPressure.systolic
          is_greater_than: 180
```

**Example: Disable when assistive device is incompatible**

```yaml
disabled_cases:
  - text: "Selected assistive device is not compatible with this test."
    default_checked: true
    show_when:
      not:
        every_instance_of: assistiveDevices
        is_one_of: ["None", "Straight Cane"]
```

**Static disabled cases** are simple toggleable checkboxes with no conditions:

```yaml
static_disabled_cases:
  - "Participant cannot stand without using their hands"
```

You can reuse common disabled case definitions across measurements using [YAML anchors](#yaml-anchors).

---

## YAML Anchors

YAML anchors let you define a value once and reuse it in multiple places. This is useful for disabled case conditions that apply to many measurements.

Define an anchor with `&name` and reference it with `*name`:

```yaml
# Define once (keys starting with _ are ignored by the engine)
_physical_activity_disabled_case: &physical_activity_disabled_case
  text: "This patient is ineligible for physical activity."
  default_checked: true
  show_when:
    any_of:
      - validations_incomplete: vitalSigns
      - from_measurement: vitalSigns.restingPulseRate
        is_greater_than: 100
      # ... other conditions

# Reuse in multiple measurements
fiveMeterUsualWalkingSpeed:
  type: stopwatch
  # ...
  disabled_cases:
    - *physical_activity_disabled_case

timedUpAndGo:
  type: stopwatch
  # ...
  disabled_cases:
    - *physical_activity_disabled_case
```

Keys starting with `_` are treated as anchor definitions and are ignored by the engine. They are only used to store reusable snippets.

---

## Validating Your Changes

After editing any YAML file:

1. **Run config validation** (schema checks + cross-file reference checks):
   ```bash
   npm run validate:config
   ```
   This validates that:
   - Each YAML file matches its JSON schema (correct structure and types)
   - Every calculation and interpretation is assigned to exactly one measurement group
   - Every key referenced across files actually exists
   - Calculation `field_label` values match actual field labels in measurements
   - Threshold table references in interpretations point to real tables
   - Test preset measurement names match group names

2. **Run the tests:**
   ```bash
   npm test
   ```

3. **Check the build:**
   ```bash
   npm run build
   ```
   If there's a YAML syntax error, the build will fail with a descriptive error.

4. **Run the dev server and test manually:**
   ```bash
   npm run dev
   ```

These checks also run automatically in CI on every push to `main` and every pull request.

---

## Common Pitfalls

### YAML Syntax

- **Indentation matters.** Use spaces (not tabs), and be consistent (2 spaces recommended).
- **Strings with special characters** need quotes: `"50-59"`, `">=15"`, `"Score (0-56)"`.
- **Backslashes in patterns** need double-escaping: `"^(\\d{1,3})/(\\d{1,3})$"`.
- **Lists** use dashes: `- item1`

### Common Mistakes

- **Forgetting to add the measurement group** in `measurement_groups.yaml`. The measurement won't appear in the summary. Run `npm run validate:config` to catch this.
- **Using the wrong key** in `from_measurement` or `from_calculation`. Keys must match exactly (they are case-sensitive).
- **Missing `then: skip`** on a null check. Without this, the interpretation will return an empty result instead of null.
- **Threshold table name mismatch.** The `table` value in `lookup_threshold` must exactly match a key in `thresholds.yaml`.
- **Wrong severity name.** Use `concern`, `caution`, `normal`, or `info`.
- **Assigning a calculation or interpretation to multiple groups.** Each must appear in exactly one group. Run `npm run validate:config` to catch this.
- **Using `field_index` instead of `field_label`.** Field references use the field's label string, not a numeric index.
