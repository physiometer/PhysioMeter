# Security and Privacy

PhysioMeter is a client-side web application. No patient data is transmitted
off the device or stored on any server. Patient records are encrypted on
disk (in the browser's IndexedDB) under a password that only the clinician
using the app ever knows. The encryption gate is scoped to patient-data
routes only — the Home page, Utilities, Presets, and User Guide do not read
or write patient data and remain accessible without a password. This
document describes how that protection works, what it does and does not
protect against, and how PhysioMeter fits into a broader HIPAA-compliance
program.

## Threat model

PhysioMeter is designed to protect against:

- Another user of the same browser profile inspecting stored patient data
  via DevTools or developer tooling.
- A lost or stolen device whose disk is *not* encrypted at the OS level.
- A casual attacker with brief physical access to an unlocked browser
  profile.

PhysioMeter does **not** protect against:

- An attacker who knows the password.
- Malware running in the same browser context (a malicious extension, a
  compromised browser, an injected script).
- Weak passwords. Brute-forcing is slowed by the key derivation function
  described below, but a short or guessable password is still recoverable.
- The clinician's own device-level controls (disk encryption, screen lock,
  MDM, OS user accounts) — those are outside PhysioMeter's scope and
  remain the adopter's responsibility.

A forgotten password results in **permanent, unrecoverable data loss**.
This is intentional: there is no recovery link and no back-channel by which
the authors or anyone else can decrypt your data. That property is what allows 
PhysioMeter to make the privacy claims above.

## Cryptographic design

All cryptography uses the browser's standard `window.crypto.subtle`
implementation. No third-party crypto library is bundled.

### Key derivation: PBKDF2-SHA256

Passwords are not used directly as encryption keys. Instead, the password
is run through PBKDF2 (Password-Based Key Derivation Function 2) using
SHA-256 as the underlying hash function, with a random 16-byte salt and
**600,000 iterations**. The 600,000-iteration count is the [OWASP-recommended](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2)
value for PBKDF2-SHA256 and is intended to make brute-force guessing
prohibitively expensive: deriving a key takes roughly half a second on a
modern laptop, which is invisible to a clinician unlocking the session but
imposes a heavy per-guess cost on an attacker.

The salt is randomly generated at first-time setup, stored alongside the
verifier in IndexedDB in plaintext, and never reused. The salt is not
secret; its role is to ensure two users with the same password derive
different keys and to defeat precomputed rainbow tables.

### Encryption: AES-GCM-256

Each patient record is encrypted with AES-GCM (Galois/Counter Mode) using
a 256-bit key. AES-GCM provides confidentiality plus an authentication tag
that detects any tampering with the stored ciphertext — if a record is
modified or corrupted, decryption fails loudly rather than producing
silently-incorrect plaintext.

A fresh 12-byte initialization vector (IV) is generated for every single
encryption operation. The IV is stored alongside the ciphertext and is not
secret, but reusing an IV with the same key in AES-GCM is catastrophic, so
the encryption helper generates the IV internally rather than accepting it
from callers.

### Password verification

A short, well-known plaintext token (the "verifier") is encrypted once at
setup time and stored in IndexedDB. On unlock, PhysioMeter derives the key
from the entered password and attempts to decrypt the verifier. If the
decryption succeeds and matches the expected value, the password is
correct; otherwise the user sees an "Incorrect password" error. The
password itself is never written anywhere.

### Key lifetime in memory

The derived key lives only in a module-level JavaScript variable inside
the running tab. It is **not** written to `localStorage`, `sessionStorage`,
cookies, IndexedDB, the URL, the window object, or any persistent surface.
Any of the following clears it and forces re-authentication:

- Clicking the **Lock** button in the navigation bar.
- 30 minutes of user inactivity (auto-lock).
- Reloading the page.
- Closing the tab or opening a new tab.

Re-authentication is enforced lazily, at the patient-route boundary: once
the key is cleared, the next attempt to visit New Patient, Existing Patient,
the patient dashboard, a session, or any measurement page redirects the
clinician to the lock screen. After a successful unlock the clinician is
returned to the route they were attempting. Non-patient routes (Home,
Utilities, Presets, User Guide) remain reachable while locked.

Opening a new tab requires re-entering the password before patient data
becomes visible; this is intentional and not a bug.

## Operational considerations

### Reset / forgotten password

The **Reset everything** option on the lock screen, confirmed by typing
the word `DELETE`, performs an unconditional, irrecoverable wipe of the
entire IndexedDB database. After reset, PhysioMeter returns to the
first-time-setup flow with no patient data and no password set.

### Exports are not encrypted

The CSV and PDF export buttons on the summary page produce **unencrypted**
files containing patient information. Each export shows a confirmation
dialog before downloading. Exported files become regular files on the
host filesystem and are subject only to that filesystem's protections —
they should be treated as PHI and saved only to secure locations.

### Device-level controls

PhysioMeter's encryption protects data at rest within the browser, but it
does not substitute for normal device hygiene. Adopting organizations
should ensure:

- Full-disk encryption is enabled on devices used for clinical work.
- Devices auto-lock after a short idle period at the OS level.
- Browser profiles are not shared between staff.
- Lost or stolen devices are reported and, where applicable, remotely
  wiped via mobile device management.

## HIPAA compliance

PhysioMeter is designed with HIPAA's privacy principles in mind: patient
data never leaves the device, the application has no backend, no analytics,
and no third-party network calls, and local storage is encrypted under a
password only the clinician knows. This architecture removes the
centralized-server tier that is the most common source of large healthcare
data breaches, and the corresponding HIPAA administrative and technical
safeguards that would otherwise be required for that tier.

However, **HIPAA compliance is a property of an organization's overall
protocols, not of any individual software application.** Compliance
depends on device-level controls, workforce training, access controls,
audit logging, breach response procedures, business associate agreements
where applicable, and many other safeguards that sit outside any single
application. PhysioMeter is one component within a broader compliance
program — not a self-contained guarantee of compliance.

**If you are considering using PhysioMeter in a clinical setting, work
with your organization's Privacy Officer and Security Officer** to
determine whether and how it fits into your HIPAA-compliant workflow.
PhysioMeter is provided as-is under the GNU GPLv3 license (see
`LICENSE`); the authors make no representation that any particular
deployment is HIPAA-compliant.

## Reporting a vulnerability

If you believe you've found a security issue in PhysioMeter, please open a
private security advisory on the GitHub repository rather than filing a
public issue.
