# PhysioMeter User Guide

PhysioMeter is a free, open-source, client-side web application for scoring
and interpreting physical therapy outcome measures. All computation and data
storage happen in your browser; no patient information is transmitted to a
server, and everything written to the local database is AES-encrypted under a
password only you know.

This guide walks through the complete workflow on the Annual Mobility
Assessment (AMA) preset: creating a patient, starting a session, administering
measurements, and reviewing the summary. The screenshots below are produced
by the end-to-end walkthrough test at `e2e/user-guide-walkthrough.spec.js`,
so they stay in sync with the deployed UI.

> **Safety notice.** PhysioMeter is a workflow and scoring aid, not a
> diagnostic device. Interpretations are computed from published thresholds
> and normative data — clinical judgment is required. Do not use PhysioMeter
> for decisions outside a licensed therapist's scope of practice.

> **HIPAA notice.** PhysioMeter stores patient data only on the device it
> runs on, encrypted under your session password. HIPAA compliance is a
> property of your organization's overall protocols, not of any single
> application — work with your organization's Privacy Officer and Security
> Officer before using PhysioMeter in a clinical setting. See
> [`SECURITY.md`](https://github.com/physiometer/PhysioMeter/blob/main/SECURITY.md) for the threat model, cryptographic
> design, and adopter guidance.

## Contents

1. [Accessing PhysioMeter](#1-accessing-physiometer)
2. [Installing as an app (optional, offline-capable)](#2-installing-as-an-app-optional-offline-capable)
3. [Setting your session password](#3-setting-your-session-password)
4. [Creating a patient](#4-creating-a-patient)
5. [The patient dashboard](#5-the-patient-dashboard)
6. [Starting a session](#6-starting-a-session)
7. [Administering the Annual Mobility Assessment](#7-administering-the-annual-mobility-assessment)
8. [Reading the summary](#8-reading-the-summary)
9. [Interpretation severities](#9-interpretation-severities)
10. [Exporting results](#10-exporting-results)
11. [Data persistence and privacy](#11-data-persistence-and-privacy)

---

## 1. Accessing PhysioMeter

PhysioMeter is deployed as a static site at
<https://physiometer.github.io/PhysioMeter/>. No account, login, or
installation is required. Any modern evergreen browser (Chrome, Edge,
Firefox, Safari) with IndexedDB and JavaScript enabled is supported. If
you want it to behave like a native app and work fully offline, see
[section 2](#2-installing-as-an-app-optional-offline-capable).

The landing page exposes four entry points: **New Patient**, **Existing
Patient**, **Presets** (reference list of available protocols), and
**Utilities** (stopwatches, countdown timers, and tallies available without a
session).

<p align="center"><img src="user-guide-images/01-home.png" alt="Home page" width="720"></p>

## 2. Installing as an app (optional, offline-capable)

PhysioMeter is a Progressive Web App. You can install it onto your device's
home screen or applications menu and run it without a browser window —
after the first load it also works fully offline, which is useful for home
visits, community screenings, or clinics with unreliable networks. All
scoring, interpretation, and data storage already happen on-device, so the
offline experience is identical to the online one.

- **iOS (Safari):** tap the **Share** button, then **Add to Home Screen**.
- **Android (Chrome):** tap the **⋮** menu, then **Install app** (or
  **Add to Home screen**).
- **Desktop (Chrome, Edge):** click the install icon in the address bar
  (a small monitor-with-arrow icon), or open the **⋮** / **…** menu and
  select **Install PhysioMeter**.

Once installed, launching PhysioMeter opens it in a standalone window.
Updates are fetched automatically the next time the device is online; no
action is needed.

## 3. Setting your session password

PhysioMeter encrypts every patient record on this device with a password you
choose. The password never leaves your browser and is never recoverable. The
Home page, Utilities, and User Guide are always accessible; the password is
only required to view or save patient data.

The first time you click **New Patient** or **Existing Patient** you'll be
redirected to a welcome screen with **Start New Session**.

<p align="center"><img src="user-guide-images/00-lock-welcome-first.png" alt="Welcome screen — first visit" width="720"></p>

Click it and enter the password twice to confirm.

<p align="center"><img src="user-guide-images/00-lock-setup-modal.png" alt="Set session password modal" width="720"></p>

> **Important.** If you forget this password, your patient data is
> permanently unrecoverable. There is no reset link, no escrow, and no
> support recovery — that's what keeps the data private.

**Locking and unlocking.** Use the lock icon at the top-left of the screen
to manually lock at any time; the app also auto-locks after **30 minutes
of inactivity**. The next time you visit a patient route you'll see an
**Unlock Session** button.

<p align="center"><img src="user-guide-images/00-lock-welcome-returning.png" alt="Welcome screen — returning visit" width="720"></p>

<p align="center"><img src="user-guide-images/00-lock-unlock-modal.png" alt="Unlock session modal" width="720"></p>

After unlocking you're returned to the route you were trying to reach.

**Forgotten password.** Use the **Reset everything** link on the welcome
screen; you'll be asked to type `DELETE` to confirm. This permanently wipes
all stored patient data.

<p align="center"><img src="user-guide-images/00-lock-reset-confirm.png" alt="Reset everything confirmation" width="720"></p>

## 4. Creating a patient

From the home page, click **New Patient**. Name is required; date of birth
and sex are optional but enable age- and sex-stratified interpretations
(Green/Yellow/Red mobility zones) to be computed.

<p align="center"><img src="user-guide-images/02-new-patient-empty.png" alt="Empty New Patient form" width="720"></p>

Fill the patient's identifying information and click **Submit**.

<p align="center"><img src="user-guide-images/03-new-patient-filled.png" alt="Filled New Patient form" width="720"></p>

A confirmation message appears once the record is written to IndexedDB.

<p align="center"><img src="user-guide-images/04-new-patient-created.png" alt="Patient created confirmation" width="720"></p>

Follow the **View Existing Patients** link to see all patients stored in
this browser.

<p align="center"><img src="user-guide-images/05-existing-patients.png" alt="Existing patients list" width="720"></p>

## 5. The patient dashboard

Clicking a patient opens their dashboard: identifying info, an **Edit
Patient Info** link, a **New Session** button, and the table of existing
sessions. Each session row links into the measurement workflow at the
point it was last saved.

<p align="center"><img src="user-guide-images/06-patient-page-empty.png" alt="Patient dashboard (no sessions yet)" width="720"></p>

## 6. Starting a session

**New Session** prompts for a session timestamp (defaults to now; can be
backdated) and a test type. Selecting the **Annual Mobility Assessment**
preset restricts the measurement list to the nine measures that make up
that protocol in the order they should be administered. Selecting
**Measurements** gives access to every configured measurement.

<p align="center"><img src="user-guide-images/07-new-session.png" alt="New Session form" width="720"></p>

<p align="center"><img src="user-guide-images/08-new-session-ama-selected.png" alt="Annual Mobility Assessment selected" width="720"></p>

Click **Create Session** to land on the session home.

## 7. Administering the Annual Mobility Assessment

The session home shows the full ordered list of measurements for the
preset. Click **Proceed to Measurements** to step into the workflow; the
**Next Measurement** / **Previous Measurement** buttons (or the side-nav
icon) move between pages. Your session auto-saves to IndexedDB as you go.

<p align="center"><img src="user-guide-images/09-session-home.png" alt="AMA session home" width="720"></p>

### Vital Signs (safety screen)

Resting pulse, blood pressure (`systolic/diastolic`), and oxygen saturation
are administered first. If any value crosses an ineligibility threshold
(pulse > 100, SpO₂ < 90%, systolic > 180 or < 90, diastolic > 110 or < 60)
the vital signs interpretation flags the patient as ineligible for physical
activity and all downstream mobility tests are disabled with an override
checkbox.

<p align="center"><img src="user-guide-images/10-vitals-filled.png" alt="Vital Signs with inline interpretation" width="720"></p>

Each measurement page shows the administration script (verbal instructions
and tester setup) above its input row, and renders interpretations inline
as soon as enough data is present.

### 5-Meter Walking Speed — usual and fast

Two trials per condition. Each trial row has a stopwatch with
**Start** / **Stop** / **Reset** controls and a manual `sec` input for
entering a previously timed value. Usual walking speed interpretation
uses the mean of the two trials; fast walking speed uses the best (fastest)
of the two.

<p align="center"><img src="user-guide-images/11-usual-walking-speed.png" alt="5-meter usual walking speed" width="720"></p>
<p align="center"><img src="user-guide-images/12-fast-walking-speed.png" alt="5-meter fast walking speed" width="720"></p>

### 30-Second Sit to Stand

Tap **Start** to begin the integrated 30-second countdown, then use the
`+` / `−` buttons (or type directly) to tally completed repetitions.

<p align="center"><img src="user-guide-images/13-sit-to-stand.png" alt="30-Second Sit to Stand" width="720"></p>

### Assistive Device → Four Square Step Test routing

The assistive-device answer routes the FSST branch: **None** or
**Straight Cane** enables the standard FSST; any other device enables the
Modified FSST. Only the applicable variant is required.

<p align="center"><img src="user-guide-images/14-assistive-device.png" alt="Assistive device selector" width="720"></p>
<p align="center"><img src="user-guide-images/15-fsst.png" alt="Four Square Step Test" width="720"></p>

### Timed Up and Go (TUG) and TUG Cognitive

Two trials for the standard TUG (best trial is used); a single trial with a
separate error count for the cognitive dual-task variant.

<p align="center"><img src="user-guide-images/16-tug.png" alt="Timed Up and Go" width="720"></p>
<p align="center"><img src="user-guide-images/17-tug-cognitive.png" alt="TUG Cognitive" width="720"></p>

## 8. Reading the summary

Click **Finish** on the last measurement (or **Summary** in the side-nav)
to open the summary page. It lists patient info, the raw measurements,
every calculation, and every interpretation for the session.

<p align="center"><img src="user-guide-images/18-summary.png" alt="Summary page" width="720"></p>

## 9. Interpretation severities

Interpretations are color-coded:

| Color  | Meaning                                                                                  |
| ------ | ---------------------------------------------------------------------------------------- |
| Green  | At or near the age/sex normative mean, or eligibility confirmed                          |
| Yellow | Below the age/sex normative mean, but not by a large amount                              |
| Red    | Substantially below the age/sex normative mean, or a published risk/ineligibility cutoff was crossed |
| Gray   | Insufficient data or not applicable (e.g. missing DOB/sex)                               |

Each per-test interpretation card may contain two kinds of messages:

- A **zone classification** — `Green Zone`, `Yellow Zone`, or `Red Zone` —
  with the cutoff value, the age/sex reference mean and standard deviation,
  and a plain-language description of what the zone means. Zone boundaries
  are derived from age/sex normative data and the SD-band coefficients
  configured in `thresholds.yaml`, per the AMA v2.1 Interpretation Charts.
- Optional **adverse-event flags** (e.g., "Fall risk >12.0 sec",
  "Frailty >=17.8") drawn from published cut-scores. These appear in
  addition to the zone classification when the value crosses a known
  risk threshold.

Each interpretation includes a literature citation link. If demographics
(age, sex) are missing, age- and sex-stratified zone classifications are
omitted; any adverse-event flags that don't depend on demographics still
appear.

## 10. Exporting results

The summary page provides export buttons for **CSV** (raw data for
spreadsheets and EHR paste) and **PDF** (a printable report). Exports happen
entirely in the browser; nothing is uploaded.

> **The exported file is NOT encrypted.** It contains patient information in
> plain text. Each export prompts for confirmation before downloading. Save
> exports only to a secure location — they are PHI once they leave the app.

## 11. Data persistence and privacy

- All patient records, sessions, and measurements live in the browser's
  **IndexedDB** on this device, **encrypted under your session password**.
  The password is never stored, never transmitted, and never recoverable.
- No data is transmitted off the device. The app has no backend, no
  authentication server, and no analytics.
- The encryption key only ever lives in browser memory. Reloading the
  page, opening a new tab, manually clicking **Lock**, or being idle for
  **30 minutes** all clear the key, and re-entry is prompted the next time
  you visit a patient route.
- **There is no password recovery.** If you forget the password, the only
  option is **Reset everything** from the lock screen, which permanently
  wipes all stored data.
- Because the application bundle is precached by the service worker (see
  [section 2](#2-installing-as-an-app-optional-offline-capable)), scoring
  and interpretation continue to work offline. New sessions entered while
  offline persist to IndexedDB normally.
- Data is tied to the browser profile on the device. Clearing browser
  storage, using a different browser, or switching devices will not carry
  the data over. Use the **Export CSV/PDF** buttons on the summary if you
  need to preserve results outside the app.
- Each patient's sessions can be deleted from the patient dashboard; each
  patient can be deleted from the Existing Patients list.

> **For privacy officers, IT, and security reviewers.** The threat model,
> cryptographic design (key derivation, cipher, key lifetime), and
> HIPAA-adopter guidance are documented in [`SECURITY.md`](https://github.com/physiometer/PhysioMeter/blob/main/SECURITY.md).
> HIPAA compliance is a property of your organization's overall protocols,
> not of any single application — please review `SECURITY.md` with your
> Privacy Officer and Security Officer before deploying PhysioMeter in a
> clinical setting.
