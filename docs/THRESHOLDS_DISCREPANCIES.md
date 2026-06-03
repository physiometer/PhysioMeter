# AMA Threshold and Interpretation Discrepancies

Tracking known data-quality issues across the AMA reference documents and PhysioMeter's encoding of them. Last reviewed 2026-05-17.

**Reference documents:**
- **v2.1 Charts** — `AMA-InterpChartsFinalv2.1.pdf` (APTA Geriatrics, 2026). The authoritative published interpretation chart. Cited as `aptaama` in `references.bib`.
- **v2 Manual** — `The-Annual-Mobility-Assessment-Manual-Version-2.pdf` (APTA Geriatrics, 2026). Implementation guide for clinicians. Cited as `aptaamamanual`.
- **Summary Notes** — `Outcome_Measure_Summary_Notes.pdf`. Earlier reference compilation; predates v2.1.
- **PMC10524633** — Source paper for 30STS normative data (314 community-dwelling adults, Atlanta cohort).

**Companion documents:** `E2E_COVERAGE.md` documents the Playwright spec that exercises every zone classification end-to-end and is the place to look first when investigating a regression in rendered interpretation text. If a test there fails because the rendered output diverges from the spec encoded in `thresholds.yaml`/`interpretations.yaml`, surface it here as a new bug rather than relaxing the test.

---

## Resolved on the PhysioMeter side (2026-05-17)

### Zone-band semantics

- **Change:** `zone_defaults.yellow_sd: 0.5 → 0.0` in `src/config/thresholds.yaml`.
- **Why:** v2.1's printed bands and the figure on page 24 of the v2 Manual both place the green/yellow boundary at the mean (yellow = (mean − 1 SD, mean), green = ≥ mean). The Manual's prose on page 23 contradicts this by describing a wider green zone at ≥ mean − 0.5 SD. The Task Force has confirmed v2.1 / page-24 figure as the intended encoding.
- **Effect:** values between mean − 0.5 SD and mean are now classified yellow (previously green). 23 snapshot tests updated to reflect the new boundaries.

### Usual Walking Speed — Male 60–69 SD

- **Change:** YAML had `sd: 0.71`; v2.1 prints `.17`. Fixed to `0.17`.
- **Why:** Clear digit-transposition typo.

### TUG and TUG Cognitive — Male tables

- **Change:** Both Male tables in `thresholds.yaml` now hold the same values as the Female tables.
- **Why:** v2.1 chart prints identical Male and Female tables for both tests. The previous YAML Male values came from a deprecated source (possibly Summary Notes or earlier Winding/Shin source). Task Force confirmed v2.1's Female values apply to both sexes for now. **Flagged for Task Force review:** whether the Male=Female printing in v2.1 was intentional or a chart-construction error.

### TUG fall-risk rule structure

- **Change:** Reduced from 4 age- and sex-stratified rules to 2 rules (one per sex), both at >12.0 sec.
- **Why:** v2.1 chart prints a single >12 sec cut per sex page, with Sn .74 / Sp .52 (men's page) and Sn .74 / Sp .31 (women's page). The earlier YAML carried age stratification (Male age >80 vs ≤80, Female age >80 vs Female age ≤80 at >13.5) plus an unsourced Sn .78 / Sp .52 pair. None of those age-stratified or Sn .78 values appear in v2.1.
- **Effect:** removed the female-age-≤80 >13.5 cut and the unsourced Sn .78 values. Tests updated.
- **Flagged for Task Force review:** the Sn .74 / Sp .52 vs Sp .31 difference between v2.1's men and women pages — Sn/Sp should be a property of the test+threshold pair, not the patient sex. This is likely a copy-paste artifact when v2.1 duplicated the Female table onto the Men's page.

### TUG Cognitive fall-risk threshold

- **Change:** `>15 sec → >11 sec`.
- **Why:** v2.1 prints `>11 sec` with the same Sn/Sp pair (1.00, 0.66). The `>15` value in the earlier YAML was unsourced.

### Modified Four Square Step Test interpretation

- **Change:** Added a new `modifiedFourSquareStepTest` interpretation that emits a `severity: info` message when a value is present.
- **Why:** Neither v2.1 nor v2 Manual provides normative data for the modified variant. The v2 Manual explicitly notes that interpretation is based on whether the patient could complete the test.

### 30-Second Sit to Stand encoded with SD-derived bands only

- **Change:** Added a `thirty_second_sit_to_stand` table to `thresholds.yaml` (mean/SD per (sex, age-bracket) cell from the v2.1 chart, verified against the source paper PMC10524633), a `thirtySecondSitToStandCount` calculation, and a `thirtySecondSitToStand` interpretation with a `lookup_threshold` rule. Wired into `measurement_groups.yaml`.
- **Why:** v2.1's printed zone-band columns for 30STS are internally inconsistent with the printed means/SDs in the same rows (Men 60–69 prints mean 10.2 with green zone "20+"; Men row means are non-monotonic across age: 13.9, 10.2, 14.0, 9.1, 9.1; Women 60–69 prints mean 13.4 but yellow cap 12 and green start 13+). The means/SDs themselves are sound — PMC10524633 confirms Men 60–69 = 10.2 ± 4.9 — so we encode mean/SD and let `zone_defaults` (yellow_sd: 0.0, red_sd: 1.0) derive bands programmatically rather than transcribing v2.1's broken zone columns.
- **Note:** PhysioMeter therefore does NOT reproduce v2.1's printed 30STS zone columns. Comments in `thresholds.yaml` and `interpretations.yaml` flag this. Adverse-event fall-risk cuts printed in v2.1's 30STS header (e.g., 60–69 <11, 70–79 <10) are not encoded — only the SD-band classification is. Add explicit fall-risk cuts later if needed.
- **Flagged for Task Force review:** issuance of a corrected 30STS chart with internally consistent means/SDs/bands; meanwhile we accept the non-monotonic Men row as printed in v2.1.

---

## Pending / known gaps

### Cross-document conflict (informational)

The v2 Manual page-23 prose and the v2 Manual page-24 figure disagree:
- Page 23 prose: yellow starts at mean − 0.5 SD (yellow_sd: 0.5).
- Page 24 figure: yellow starts at mean (yellow_sd: 0.0). Matches v2.1.

Task Force has confirmed page-24 / v2.1 as intended.

### v2.1 chart-only typos (do not affect PhysioMeter encoding)

These are printing errors in v2.1's printed band columns. They don't propagate to PhysioMeter because the YAML stores mean and SD per cell and bands are derived programmatically.

- **Male FWS 90+ row:** v2.1 prints "Yellow 0.88–1.90, Green 1.91+" with mean 1.19 — impossible. Programmatic bands using mean 1.19, SD 0.32, yellow_sd: 0.0, red_sd: 1.0 give Red ≤0.87, Yellow (0.87, 1.19), Green ≥1.19 — likely the intended interpretation.
- **Female FWS 50–59 yellow:** v2.1 prints "1.17-166" (typo for 1.17–1.66). Mean 1.67, SD 0.51 — programmatic bands match the intended values.
- **Female FSST 50–59 yellow:** v2.1 prints "14.9-10.4" (reversed). Mean 10.3, SD 4.7 — programmatic bands correct.

### Flagged for Task Force review

- Whether v2.1's identical Male and Female tables for TUG and TUG Cognitive are intentional or a printing error.
- Whether v2.1's Sn/Sp difference between Men's and Women's TUG pages (Sn .74/Sp .52 vs Sn .74/Sp .31) is meaningful or a copy-paste artifact.
- Issuance of a corrected 30STS chart with internally consistent means/SDs/bands.
- Confirmation that the simplified single-cut TUG fall-risk encoding (vs the previous age-stratified scheme) is clinically acceptable.
