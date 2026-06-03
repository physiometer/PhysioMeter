export const MIN_DATE_YEAR = 1900
export const MAX_FUTURE_YEARS = 50
export const DOB_YOUNG_AGE_YEARS = 5

export const DOB_ERROR_MESSAGE = 'Date of birth cannot be today or in the future.'
export const DOB_TOO_OLD_MESSAGE = `Date of birth cannot be before ${MIN_DATE_YEAR}.`
export const DOB_WARNING_MESSAGE = `Warning: Patient is under ${DOB_YOUNG_AGE_YEARS} years old.`
export const DATE_TOO_OLD_MESSAGE = `Date cannot be before ${MIN_DATE_YEAR}.`
export const DATE_TOO_FUTURE_MESSAGE = `Date cannot be more than ${MAX_FUTURE_YEARS} years in the future.`

const isBeforeMinYear = (date) => date.getFullYear() < MIN_DATE_YEAR
const isPastMaxFuture = (date) => date > new Date(Date.now() + MAX_FUTURE_YEARS * 365.25 * 24 * 60 * 60 * 1000)

export const validateDob = (dateOfBirth) => {
    if (!dateOfBirth) return { dobError: false, dobErrorMessage: '', dobWarning: false }

    const dob = new Date(dateOfBirth)
    if (isBeforeMinYear(dob)) {
        return { dobError: true, dobErrorMessage: DOB_TOO_OLD_MESSAGE, dobWarning: false }
    }
    if (dob >= new Date(new Date().toDateString())) {
        return { dobError: true, dobErrorMessage: DOB_ERROR_MESSAGE, dobWarning: false }
    }

    const isYoung = dob > new Date(Date.now() - DOB_YOUNG_AGE_YEARS * 365 * 24 * 60 * 60 * 1000)
    return { dobError: false, dobErrorMessage: '', dobWarning: isYoung }
}

export const validateDate = (dateStr) => {
    if (!dateStr) return { dateError: false, dateErrorMessage: '' }

    const date = new Date(dateStr)
    if (isBeforeMinYear(date)) {
        return { dateError: true, dateErrorMessage: DATE_TOO_OLD_MESSAGE }
    }
    if (isPastMaxFuture(date)) {
        return { dateError: true, dateErrorMessage: DATE_TOO_FUTURE_MESSAGE }
    }
    return { dateError: false, dateErrorMessage: '' }
}

export const isValidDobForMeasurement = (value) => {
    return Boolean(Date.parse(value)) && !isBeforeMinYear(new Date(value)) && new Date(value) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
}
