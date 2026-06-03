export default function HIPAANote() {
    return (
        <div className="alert alert-info mx-5 mt-3" role="note">
            <strong>HIPAA notice.</strong>{' '}
            PhysioMeter stores patient data only on this device, encrypted under
            your session password. HIPAA compliance is a property of your
            organization's overall protocols, not of any single application —
            work with your Privacy Officer and Security Officer before using
            PhysioMeter in a clinical setting.{' '}
            <a
                href="https://github.com/physiometer/PhysioMeter/blob/main/SECURITY.md"
                target="_blank"
                rel="noopener noreferrer"
            >
                Read the full security and HIPAA guidance →
            </a>
        </div>
    )
}
