import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { MEASUREMENT_CONFIGS } from '../components/measurements/MeasurementFactory'
import { CALCULATION_SECTION_CONFIGS } from '../components/calculations/CalculationFactory'
import { INTERPRETATION_SECTION_CONFIGS } from '../components/interpretations/InterpretationFactory'
import { MEASUREMENT_GROUP_MAP } from './measurementGroupMapping'
import { hasData } from '../components/measurements/MeasurementSummary'

const COLORS = {
    success: [25, 135, 84],
    danger: [220, 53, 69],
    warning: [255, 193, 7],
    info: [13, 202, 240],
    primary: [13, 110, 253],
    muted: [108, 117, 125],
    white: [255, 255, 255],
    dark: [33, 37, 41],
    lightBg: [248, 249, 250],
    alertSuccess: [209, 231, 221],
    alertDanger: [248, 215, 218],
    alertWarning: [255, 243, 205],
    alertInfo: [207, 244, 252],
    alertSecondary: [226, 227, 229],
    alertSuccessText: [10, 54, 34],
    alertDangerText: [88, 21, 28],
    alertWarningText: [102, 77, 3],
    alertInfoText: [5, 81, 96],
    alertSecondaryText: [43, 47, 50],
}

const ALERT_STYLES = {
    success: { fill: COLORS.alertSuccess, text: COLORS.alertSuccessText },
    danger: { fill: COLORS.alertDanger, text: COLORS.alertDangerText },
    warning: { fill: COLORS.alertWarning, text: COLORS.alertWarningText },
    info: { fill: COLORS.alertInfo, text: COLORS.alertInfoText },
    secondary: { fill: COLORS.alertSecondary, text: COLORS.alertSecondaryText },
}

const PAGE_MARGIN = 20
const CARD_SPACING = 4
const TABLE_STYLES = { lineColor: [220, 220, 220], lineWidth: 0.3, cellPadding: 4 }

function getLastY(doc) {
    return doc.lastAutoTable?.finalY ?? PAGE_MARGIN
}

function extractHtmlLink(html) {
    const hrefMatch = html.match(/href="([^"]*)"/)
    const text = html.replace(/<[^>]*>/g, '')
    return { text, url: hrefMatch ? hrefMatch[1] : null }
}

function addMeasurementCard(doc, startY, measurementKey, measurement, index, config, validations, isDisabled) {
    const disabled = isDisabled(measurementKey, index)
    const validation = validations[measurementKey]?.[index]
    const isValid = Array.isArray(validation) ? validation.every(v => v === true) : validation === true
    const value = measurement.value
    const label = config.defaultLabel || measurementKey
    const unit = config.unit || ''

    const headerColor = disabled ? COLORS.warning : (isValid ? COLORS.success : COLORS.danger)
    const headerTextColor = disabled ? COLORS.dark : COLORS.white

    let badge = ''
    if (disabled) badge = '  [Skipped]'
    else if (!isValid) badge = '  [Incomplete]'

    // Build body content
    let contentRow = []
    let numCols = 1

    if (disabled) {
        contentRow = [{ content: '(Measurement skipped)', styles: { halign: 'center', textColor: COLORS.muted, fontStyle: 'italic' } }]
    } else if (config.type === 'fields' && (config.fields || config.fieldNames)) {
        const fields = config.fields || config.fieldNames?.map(fn => MEASUREMENT_CONFIGS[fn])
        contentRow = fields.map((field, idx) => {
            if (field?.displayOnly) return null
            const fieldValue = Array.isArray(value) ? value[idx] : value
            const fieldLabel = field?.defaultLabel || (config.fieldNames ? MEASUREMENT_CONFIGS[config.fieldNames[idx]]?.defaultLabel : `Field ${idx + 1}`)
            const fieldUnit = field?.unit || MEASUREMENT_CONFIGS[config.fieldNames?.[idx]]?.unit || ''
            const display = fieldValue != null && fieldValue !== '' ? `${fieldValue}${fieldUnit ? ` ${fieldUnit}` : ''}` : 'Not recorded'
            return { content: `${fieldLabel}\n${display}`, styles: { halign: 'center' } }
        }).filter(Boolean)
        numCols = contentRow.length
    } else if (Array.isArray(value)) {
        contentRow = value.map((v, idx) => {
            const display = v != null && v !== '' ? `${v}${unit ? ` ${unit}` : ''}` : 'Not recorded'
            return { content: `Trial ${idx + 1}\n${display}`, styles: { halign: 'center' } }
        })
        numCols = contentRow.length
    } else {
        const display = value != null && value !== '' ? `${value}${unit ? ` ${unit}` : ''}` : 'Not recorded'
        contentRow = [{ content: display, styles: { halign: 'center', fontSize: 13 } }]
    }

    const head = [[{
        content: `Measurement: ${label}${badge}`,
        colSpan: numCols,
        styles: { fillColor: headerColor, textColor: headerTextColor, fontStyle: 'bold' },
    }]]

    const body = [contentRow]

    if (measurement.lastModified) {
        body.push([{
            content: `Last measured: ${new Date(measurement.lastModified).toLocaleString()}`,
            colSpan: numCols,
            styles: { textColor: COLORS.muted, fontSize: 8, fillColor: COLORS.lightBg },
        }])
    }

    autoTable(doc, { startY, margin: { left: PAGE_MARGIN, right: PAGE_MARGIN }, head, body, theme: 'grid', styles: TABLE_STYLES })
    return getLastY(doc) + CARD_SPACING
}

function addPatientLevelCard(doc, startY, label, measurement) {
    autoTable(doc, {
        startY,
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        head: [[{ content: `${label} (Patient Info)`, styles: { fillColor: COLORS.info, textColor: COLORS.white, fontStyle: 'bold' } }]],
        body: [[{ content: String(measurement.value || 'Not set'), styles: { halign: 'center', fontSize: 13 } }]],
        theme: 'grid',
        styles: TABLE_STYLES,
    })
    return getLastY(doc) + CARD_SPACING
}

function addCalculationCard(doc, startY, label, value, unit) {
    autoTable(doc, {
        startY,
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        head: [[{ content: `Calculation: ${label}`, styles: { fillColor: COLORS.info, textColor: COLORS.white, fontStyle: 'bold' } }]],
        body: [[{ content: `${value}${unit ? ` ${unit}` : ''}`, styles: { halign: 'center', fontSize: 13 } }]],
        theme: 'grid',
        styles: TABLE_STYLES,
    })
    return getLastY(doc) + CARD_SPACING
}

function addInterpretationCard(doc, startY, label, messages, citation) {
    const body = messages.map(msg => {
        const style = ALERT_STYLES[msg.type] || ALERT_STYLES.secondary
        return [{ content: msg.text, styles: { fillColor: style.fill, textColor: style.text } }]
    })

    autoTable(doc, {
        startY,
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        head: [[{ content: `Interpretation: ${label}`, styles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' } }]],
        body,
        theme: 'grid',
        styles: TABLE_STYLES,
    })

    let y = getLastY(doc)

    if (citation) {
        const { text, url } = extractHtmlLink(citation)
        const linkText = `Reference: ${text}`
        doc.setFontSize(8)
        doc.setTextColor(...COLORS.muted)
        if (url) {
            doc.textWithLink(linkText, PAGE_MARGIN + 2, y + 4, { url })
        } else {
            doc.text(linkText, PAGE_MARGIN + 2, y + 4)
        }
        y += 8
    }

    return y + CARD_SPACING
}

function addPageNumbers(doc) {
    const pageCount = doc.internal.getNumberOfPages()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(...COLORS.muted)
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    }
}

export function generateAndDownloadPDF(formState, validations, disabledValues, isDisabled, patientName) {
    if (!hasData(formState)) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const date = new Date().toISOString().split('T')[0]

    // Header
    doc.setFontSize(20)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...COLORS.dark)
    doc.text('Summary Report', pageWidth / 2, 25, { align: 'center' })

    doc.setFontSize(12)
    doc.setFont(undefined, 'normal')
    let headerY = 33
    if (patientName) {
        doc.text(`Patient: ${patientName}`, pageWidth / 2, headerY, { align: 'center' })
        headerY += 7
    }
    doc.text(`Date: ${date}`, pageWidth / 2, headerY, { align: 'center' })
    headerY += 5

    doc.setDrawColor(...COLORS.muted)
    doc.line(PAGE_MARGIN, headerY, pageWidth - PAGE_MARGIN, headerY)
    headerY += 8

    let isFirstGroup = true

    MEASUREMENT_GROUP_MAP.forEach(({ stateKey, name: groupName, calculationKeys, interpretationKeys, patientLevel }) => {
        const measurements = formState[stateKey]
        if (!measurements || measurements.length === 0) return

        const config = MEASUREMENT_CONFIGS[stateKey]
        if (!config && !patientLevel) return

        const label = groupName || config?.defaultLabel || stateKey

        const groupCalculations = calculationKeys.map(calcKey => {
            const calcConfig = CALCULATION_SECTION_CONFIGS[calcKey]
            if (!calcConfig) return null
            const value = calcConfig.valueFunction(formState)
            if (value === null) return null
            return { label: calcConfig.label, value, unit: calcConfig.unit }
        }).filter(Boolean)

        const groupInterpretations = interpretationKeys.map(interpKey => {
            const interpConfig = INTERPRETATION_SECTION_CONFIGS[interpKey]
            if (!interpConfig) return null
            const messages = interpConfig.messageFunction(formState)
            const defaultMessage = [{ text: 'No interpretation available for the current measurements.', type: 'secondary' }]
            return {
                label: interpConfig.label,
                messages: messages && messages.length > 0 ? messages : defaultMessage,
                citation: interpConfig.citation,
            }
        }).filter(Boolean)

        if (!isFirstGroup) {
            doc.addPage()
        }

        let y = isFirstGroup ? headerY : PAGE_MARGIN

        isFirstGroup = false

        // Group title
        doc.setFontSize(16)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(...COLORS.dark)
        doc.text(label, pageWidth / 2, y + 6, { align: 'center' })
        y += 14

        // Measurement cards
        measurements.forEach((measurement, index) => {
            if (patientLevel) {
                y = addPatientLevelCard(doc, y, label, measurement)
            } else {
                y = addMeasurementCard(doc, y, stateKey, measurement, index, config, validations, isDisabled)
            }
        })

        // Calculation cards
        groupCalculations.forEach(calc => {
            y = addCalculationCard(doc, y, calc.label, calc.value, calc.unit)
        })

        // Interpretation cards
        groupInterpretations.forEach(interp => {
            y = addInterpretationCard(doc, y, interp.label, interp.messages, interp.citation)
        })
    })

    addPageNumbers(doc)
    doc.save(`summary_${patientName || 'guest'}_${date}.pdf`)
}
