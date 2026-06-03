# E2E interpretation coverage

This document summarizes the end-to-end (Playwright) tests that exercise
PhysioMeter's interpretation engine through the real UI. The spec at
`/Users/dji/PhysioMeter/e2e/interpretation-coverage.spec.js` walks the Annual
Mobility Assessment (AMA) preset for each of multiple synthetic patient
profiles and asserts on the rendered text in the inline interpretation block
at the bottom of each measurement page.

Companion specs (unchanged):

- `e2e/user-guide-walkthrough.spec.js` — golden-path AMA session that also
  produces the screenshots wired into `docs/user-guide.md` and the thesis.
- `e2e/lock-flow.spec.js` — password setup, lock, unlock, wrong-password
  rejection, "Clear all data", and "Reset everything" coverage.

Shared helpers live in `e2e/helpers/session.js` so the interpretation spec
can compose patient creation, session start, and form navigation without
duplicating the walkthrough's screenshot machinery.

## Test plan (Female 75 unless noted; DOB chosen so age-bracket lookup hits 70-79)

| Measurement | Zone / Flag | Input | Expected rendered text |
|---|---|---|---|
| Vital Signs | Eligible | BP 120/80, pulse 72, SpO2 98 | "This patient is eligible for physical activity." + AMA eligibility line |
| Vital Signs | Ineligible (high pulse) | pulse 110 | "This patient is ineligible for physical activity." + cautionary AMA gate; no AMA-eligible line |
| Vital Signs | Ineligible (low SpO2) | SpO2 85 | "This patient is ineligible for physical activity." |
| Vital Signs | Ineligible (high systolic) | BP 185/80 | "This patient is ineligible for physical activity." |
| 5m UWS (mean 1.12, SD 0.20) | Green | t=3.85s -> 1.30 m/s | "Green Zone" |
| 5m UWS | Yellow | t=5.00s -> 1.00 m/s | "Yellow Zone" |
| 5m UWS | Red (no flag) | t=5.88s -> 0.85 m/s | "Red Zone" |
| 5m UWS | Fall risk | t=7.14s -> 0.70 m/s | "Fall Risk, <0.76m/sec" + "Red Zone" |
| 5m UWS | Frailty risk | t=10.0s -> 0.50 m/s | "Fall Risk" + "Frailty Risk, <0.63 m/sec" |
| 5m FWS (mean 1.52, SD 0.33) | Green | t=3.00s -> 1.67 m/s | "Green Zone" |
| 5m FWS | Yellow | t=3.85s -> 1.30 m/s | "Yellow Zone" |
| 5m FWS | Red (no flag) | t=4.35s -> 1.15 m/s | "Red Zone" |
| 5m FWS | Fall risk | t=5.00s -> 1.00 m/s | "Fall Risk, <1.10 m/sec" + "Red Zone" |
| FSST (mean 10.9, SD 3.6) | Green | 9.0s | "Green Zone" |
| FSST | Yellow | 12.0s | "Yellow Zone" |
| FSST | Red (no multi-fall) | 14.8s | "Red Zone" |
| FSST | Multi-fall | 16.0s | "Multiple Fall risk >=15" + "Red Zone" |
| 30STS (mean 11.6, SD 5.3) | Green | count=14 | "Green Zone" |
| 30STS | Yellow | count=8 | "Yellow Zone" |
| 30STS | Red | count=4 | "Red Zone" |
| TUG (mean 9.2, SD 2.7) | Green | 8.0s | "Green Zone" |
| TUG | Yellow (no fall) | 10.0s | "Yellow Zone" |
| TUG | Red + Fall risk (Female) | 13.0s | "Red Zone" + "Fall risk >12.0 sec (Sn .74, Sp .31)" |
| TUG | Frailty + Fall | 18.0s | "Fall risk >12.0" + "Frailty >=17.8" |
| TUG | Male fall-risk wording | Male 75, 13.0s | "Fall risk >12.0 sec (Sn .74, Sp .52)" |
| TUG-Cog (mean 12.9, SD 5.0) | Green, no flag | 10.0s | "Green Zone" |
| TUG-Cog | Green + fall flag | 12.0s | "Green Zone" + "Fall risk >11 sec" |
| TUG-Cog | Yellow + fall flag | 15.0s | "Yellow Zone" + "Fall risk >11 sec" |
| TUG-Cog | Red + fall flag | 20.0s | "Red Zone" + "Fall risk >11 sec" |
| Modified FSST | Info severity | device=Other, 10.0s | "no published normative thresholds" |
| Cross-sex sanity | Male 75 UWS green | 3.85s | "Green Zone" + "Reference Mean 1.18" |

The boundaries are computed from `src/config/thresholds.yaml` using the v2.1
encoding `yellow_sd: 0.0, red_sd: 1.0`. The yellow boundary equals the mean
for that (sex, age-bracket) cell; the red boundary equals mean ± 1 SD in the
direction indicated by `compare_as`. Inputs are deliberately bracketed inside
each zone so that small rounding differences in the conversion between
stopwatch time and walking speed do not push them across a boundary.

## Coverage summary by measurement

| Measurement | Zones covered | Adverse-event flags covered | Tests added |
|---|---|---|---|
| Vital Signs | n/a (eligibility branch) | Ineligible (pulse, SpO2, BP) + Eligible | 4 |
| 5m Usual Walking Speed | Green / Yellow / Red | Fall risk (<0.76), Frailty (<0.63) | 5 |
| 5m Fast Walking Speed | Green / Yellow / Red | Fall risk (<1.10) | 4 |
| 30STS | Green / Yellow / Red | n/a — no explicit adverse-event cuts in YAML | 3 |
| FSST | Green / Yellow / Red | Multiple-fall (>=15) | 4 |
| Modified FSST | n/a — info severity only | n/a | 1 |
| TUG | Green / Yellow / Red | Fall risk >12.0 (Female and Male wording), Frailty >=17.8 | 5 |
| TUG Cognitive | Green / Yellow / Red | Fall risk >11 | 4 |
| Cross-sex sanity (UWS) | Green | (verifies engine looks up Male row) | 1 |
| **Total new tests** | | | **31** |

## Special cases covered

- **Vital Signs gates the AMA-eligibility message.** When Vital Signs are
  filled with values that trigger ineligibility, the affirmative
  "eligible for the Annual Mobility Assessment" line must not render and
  the cautionary referral message must render in its place. The spec
  asserts both directions.
- **Modified FSST `severity: info` message** renders only when the
  assistive device is `Other` (which makes the Modified FSST page
  editable) and a value is entered. The spec checks that the
  "no published normative thresholds" sentence is shown verbatim.
- **30STS** has no explicit adverse-event cuts in `interpretations.yaml`;
  it is exercised purely via the SD-derived `lookup_threshold` rule.
- **TUG fall-risk wording is sex-specific** (Sn .74 / Sp .31 for Female,
  Sn .74 / Sp .52 for Male). The Male wording is verified by a Male-75
  profile asserting the Sp .52 string.

## Zones / thresholds that we deliberately did NOT cover

- **Below-50 age bracket.** The threshold tables only define brackets from
  50-59 through 90+. PhysioMeter's behavior for under-50 patients is
  already exercised by the `YOUNG_PATIENT` unit-test fixture; reproducing
  it through the UI would add no new evidence.
- **TUG Cognitive "yellow zone without fall flag".** The TUG-Cog
  mean for the Female 70-79 bracket (12.9 s) is greater than the fall-risk
  cut (11 s), so any value in the yellow band [11, 12.9] inevitably
  triggers the >11 s fall flag. Documented in the test description rather
  than worked around.
- **30STS adverse-event flag.** No `show_message` rule exists for 30STS in
  the current YAML — only the SD-derived band lookup. The spec mirrors
  that by asserting zones only.
- **The 90+ bracket for the 30STS Female cell** is not specifically
  exercised. The cross-sex sanity test demonstrates that the engine looks
  up the correct row for a non-Female profile; the unit-test
  `AGE_SEX_MATRIX` fixture already covers the full age-by-sex grid through
  the calculation engine.

## Caveats and notes

- **Real time vs. fake time.** Unit tests freeze time at 2025-06-15 and use
  the `DOB_AGE_*` constants directly. Playwright runs in real time, so the
  spec computes a DOB via `dobForAge(targetAge)` (`(today.getFullYear() -
  age)-01-15`) to keep the age stable across runs. Using January 15th
  keeps the patient comfortably inside the target age for the rest of the
  year.
- **Ineligible vitals cascade.** When Vital Signs are ineligible, every
  downstream measurement renders a default-checked "Uncheck this box to
  bypass..." override. The helper `uncheckAllDisabledCases` clears those
  overrides so values can still be typed in tests that care about
  downstream behavior. In tests that only assert on vitals (the four
  Vital-Signs tests), the cascade is harmless and is not unchecked.
- **No discrepancies between expected and rendered text were observed.**
  All 31 new assertions pass against the current build of the engine. If
  a future config change produces a divergence, the tests will fail and
  the discrepancy should be tracked in `THRESHOLDS_DISCREPANCIES.md`
  rather than relaxed in the test.

## Final test counts (current run)

- `npm test` — **301 passed** (Vitest unit tests; unchanged).
- `npm run test:e2e` — **35 passed** (Playwright):
  - 1 user-guide walkthrough
  - 3 lock-flow tests
  - 31 new interpretation-coverage tests

Total test count rose from 305 to 336 with this change.
