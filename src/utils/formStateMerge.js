// Merges patient attributes into formState shape so calculations/interpretations can read them.
export function mergePatientDataIntoFormState(patient, sessionFormState) {
    const merged = { ...sessionFormState }

    if (patient?.name) {
        merged.name = [{ label: 'Name', value: patient.name, lastModified: patient.createdAt }]
    }
    if (patient?.dateOfBirth) {
        merged.dob = [{ label: 'Date of Birth', value: patient.dateOfBirth, lastModified: patient.createdAt }]
    }
    if (patient?.sex) {
        merged.sex = [{ label: 'Sex', value: patient.sex, lastModified: patient.createdAt }]
    }

    return merged
}
