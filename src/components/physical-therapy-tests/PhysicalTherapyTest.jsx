import React, { Component } from 'react'

import { Navigate } from "react-router-dom"
import { MEASUREMENT_CONFIGS, createMeasurementInstance, createMeasurement } from '../measurements/MeasurementFactory'
import measurementGroupsConfig from '../../config/measurement_groups.yaml'
import MultipleMeasurements from '../measurements/MultipleMeasurements'
import { hasData } from '../measurements/MeasurementSummary'
import InlineMeasurementInterpretations from '../interpretations/InlineMeasurementInterpretations'
import SummaryPage from '../SummaryPage'
import { getCurrentUser, getCurrentSessionUUID, saveSessionData } from '../../DB'
import { mergePatientDataIntoFormState } from '../../utils/formStateMerge'
import Title from '../form/Title'
import ScrollIndicator from '../form/ScrollIndicator'
import LoadingPage from '../LoadingPage'

const THROTTLE_TIMEOUT = 250;
export const PT_TEST_HOME_PAGE = 'home';
export const PT_TEST_FINAL_PAGE = 'summary';

export class PhysicalTherapyTest extends Component {
    constructor(props) {
        super(props)

        const STATE_OBJECT = PT_TEST_MEASUREMENT_CONFIG.reduce((acc, curr) => {
            acc[curr.stateKey] = []
            return acc
        }, {})

        this.state = {
            loaded: false,
            user: null,
            sessionUUID: null,
            submitText: '',
            submitTextType: '',
            formState: JSON.parse(JSON.stringify(STATE_OBJECT)), // the form state but just the labels, values, lastModified, lastStarted (for timer-based measurements)
            validations: JSON.parse(JSON.stringify(STATE_OBJECT)), // the form state but just the validation info
            disabledValues: JSON.parse(JSON.stringify(STATE_OBJECT)), // the form state but just the disabled cases info
            navShown: false,
        }

        this.lastSaved = 0;
        this.saveQueued = false;
    }

    componentDidMount = async () => {
        const user = await getCurrentUser()
        const sessionUUID = getCurrentSessionUUID();

        const updateNav = () => {
            this.props.setNavIcons([this.renderPatientIcon(), this.renderNavIcon()])
            this.props.setNav(this.renderNav())
        }

        if (!user || !sessionUUID) {
            // utilities page — no data to load
            this.setState({ user, sessionUUID, loaded: true }, updateNav)
        } else {
            const session = user.sessions?.find(s => s.uuid === sessionUUID);
            const measurementData = session?.data;
            if (measurementData?.formState && Object.keys(measurementData.formState).length > 0) {
                const formState = JSON.parse(JSON.stringify(measurementData.formState))
                const needsRedirectToHome = this.props.shownMeasurement !== PT_TEST_FINAL_PAGE && (formState[this.props.shownMeasurement] === undefined || formState[this.props.shownMeasurement].length === 0)
                this.setState({
                    user,
                    sessionUUID,
                    loaded: true,
                    formState,
                    validations: JSON.parse(JSON.stringify(measurementData.validations)),
                    disabledValues: JSON.parse(JSON.stringify(measurementData.disabledValues)),
                }, () => {
                    updateNav()
                    if (needsRedirectToHome) {
                        this.setMeasurementShown(PT_TEST_HOME_PAGE)
                    }
                })
            } else {
                this.setState({ user, sessionUUID, loaded: true }, updateNav)
            }
        }
    }

    componentWillUnmount = () => {
        this.props.setNavIcons([])
        this.props.setNav(null)
    }

    // Returns formState with patient-level data (name, dob, sex) merged in.
    // Used for calculations and interpretations that depend on patient attributes.
    getMergedFormState = () => {
        return mergePatientDataIntoFormState(this.state.user, this.state.formState)
    }

    toggleNav = (forcedState = undefined) => {
        this.setState(prevState => ({ navShown: forcedState !== undefined ? forcedState : !prevState.navShown }), () => {
            this.props.setNavIcons([this.renderPatientIcon(), this.renderNavIcon()])
            this.props.setNav(this.renderNav())
        })
    }

    setMeasurementShown = (measurementKey) => {
        const uuid = this.state.user?.uuid;
        let params = "";
        // no params if it's the utilities page (no user)
        if (uuid) {
            params = `?sessionUUID=${this.state.sessionUUID}&uuid=${uuid}`;
        }

        window.scrollTo(0, 0);
        this.props.navigate(`/${this.props.testKey}/${measurementKey}${params}`, { replace: false });
        this.toggleNav(false);
    }

    getMeasurementIndexByKey = (measurementKey) => {
        return measurementKey === PT_TEST_HOME_PAGE ? 0 : (measurementKey === PT_TEST_FINAL_PAGE ? PT_TEST_MEASUREMENT_CONFIG.length + 1 : PT_TEST_MEASUREMENT_CONFIG.findIndex(m => m.stateKey === measurementKey) + 1);
    }

    // similar to getMeasurementIndexByKey but removes any measurements that have not been selected
    getRelativeMeasurementIndexByKey = (measurementKey) => {
        let filteredMeasurements = [...PT_TEST_MEASUREMENT_CONFIG].filter(m => this.state.formState[m.stateKey].length > 0);
        if (measurementKey === PT_TEST_HOME_PAGE) {
            return [0, filteredMeasurements.length + 1];
        } else if (measurementKey === PT_TEST_FINAL_PAGE) {
            return [filteredMeasurements.length + 1, filteredMeasurements.length + 1];
        } else {
            return [filteredMeasurements.findIndex(m => m.stateKey === measurementKey) + 1, filteredMeasurements.length + 1];
        }
    }

    previousMeasurement = () => {
        const measurementIndex = this.getMeasurementIndexByKey(this.props.shownMeasurement);
        if (measurementIndex === 0) {
            return;
        }

        let filteredMeasurements = [...PT_TEST_MEASUREMENT_CONFIG];
        filteredMeasurements = filteredMeasurements.splice(0, measurementIndex - 1);
        filteredMeasurements = filteredMeasurements.filter(m => this.state.formState[m.stateKey].length > 0);

        if (filteredMeasurements.length === 0) {
            this.setMeasurementShown(PT_TEST_HOME_PAGE);
        } else {
            this.setMeasurementShown(filteredMeasurements[filteredMeasurements.length - 1].stateKey);
        }
    }

    nextMeasurement = () => {
        const measurementIndex = this.getMeasurementIndexByKey(this.props.shownMeasurement);
        if (measurementIndex >= PT_TEST_MEASUREMENT_CONFIG.length + 1) {
            return;
        }

        let filteredMeasurements = [...PT_TEST_MEASUREMENT_CONFIG];
        filteredMeasurements.splice(0, measurementIndex);
        filteredMeasurements = filteredMeasurements.filter(m => this.state.formState[m.stateKey].length > 0);

        if (filteredMeasurements.length === 0) {
            this.setMeasurementShown(PT_TEST_FINAL_PAGE);
        } else {
            this.setMeasurementShown(filteredMeasurements[0].stateKey);
        }
    }

    updateIndividualMeasurement = (index, value, additionalValues) => {
        const measurementKey = this.props.shownMeasurement;
        const measurements = [...this.state.formState[measurementKey]]
        const originalMeasurement = JSON.stringify(measurements[index])
        measurements[index].value = value
        Object.entries(additionalValues ?? {}).map(([key, value]) => {
            measurements[index][key] = value;
        })
        const updatedMeasurement = JSON.stringify(measurements[index])
        if (originalMeasurement !== updatedMeasurement) {
            measurements[index].lastModified = new Date().toISOString();
        }

        this.updateValues(measurementKey, measurements)
    }

    updateIndividualValidation = (index, isValid) => {
        const measurementKey = this.props.shownMeasurement;
        const validations = [...this.state.validations[measurementKey]]
        validations[index] = isValid
        this.updateValidations(measurementKey, validations)
    }

    updatedIndividualDisabledValues = (index, disabledValue) => {
        const measurementKey = this.props.shownMeasurement;
        const disabledValues = [...this.state.disabledValues[measurementKey]]
        disabledValues[index] = disabledValue
        this.updateDisabled(measurementKey, disabledValues)
    }

    updateIndividualMeasurementLabel = (index, label) => {
        const measurementKey = this.props.shownMeasurement;
        const measurements = [...this.state.formState[measurementKey]]
        measurements[index].label = label
        this.updateValues(measurementKey, measurements)
    }

    deleteIndividualMeasurement = (index) => {
        if (!confirm(`Are you sure you want to delete this measurement? This action cannot be undone.`)) {
            return
        }

        const measurementKey = this.props.shownMeasurement;
        const measurements = [...this.state.formState[measurementKey]]
        measurements.splice(index, 1)
        this.updateValues(measurementKey, measurements)

        const validations = [...this.state.validations[measurementKey]]
        validations.splice(index, 1)
        this.updateValidations(measurementKey, validations)

        const disabledValues = [...this.state.disabledValues[measurementKey]]
        disabledValues.splice(index, 1)
        this.updateDisabled(measurementKey, disabledValues)

        this.setMeasurementShown(PT_TEST_HOME_PAGE)
    }

    // Generic handler for actionButton configs on measurements (e.g., "does not clear apparatus" to Modified FSST).
    // Reads actionButton config from MEASUREMENT_CONFIGS, creates target measurement if needed,
    // bypasses specified disabled cases, and navigates to the target.
    handleActionButton = (sourceMeasurementKey) => {
        const actionButton = MEASUREMENT_CONFIGS[sourceMeasurementKey]?.actionButton
        if (!actionButton) return

        const { targetMeasurement, bypassDisabledCaseIndices = [] } = actionButton

        const applyBypasses = (disabledEntries) => {
            if (bypassDisabledCaseIndices.length === 0) return disabledEntries
            return disabledEntries.map(entry => {
                if (!entry) return entry
                const updated = [...entry]
                for (const idx of bypassDisabledCaseIndices) {
                    if (idx < updated.length) updated[idx] = false
                }
                return updated
            })
        }

        // Create target measurement instance if it doesn't exist
        if (!this.state.formState[targetMeasurement] || this.state.formState[targetMeasurement].length === 0) {
            const { entry, validation, disabledEntry } = createMeasurementInstance(targetMeasurement)
            const disabledValues = applyBypasses([disabledEntry])

            this.setState(prevState => ({
                formState: { ...prevState.formState, [targetMeasurement]: [entry] },
                validations: { ...prevState.validations, [targetMeasurement]: [validation] },
                disabledValues: { ...prevState.disabledValues, [targetMeasurement]: disabledValues },
            }), () => {
                this.savePTTest()
                this.setMeasurementShown(targetMeasurement)
            })
        } else {
            const disabledValues = applyBypasses([...this.state.disabledValues[targetMeasurement]])
            this.updateDisabled(targetMeasurement, disabledValues)
            this.setMeasurementShown(targetMeasurement)
        }
    }

    updateValues = (key, value) => {
        this.setState(prevState => ({
            formState: {
                ...prevState.formState,
                [key]: value
            }
        }), () => {
            this.savePTTest()
        })
    }

    updateValidations = (key, validations) => {
        this.setState(prevState => ({
            validations: {
                ...prevState.validations,
                [key]: validations
            }
        }), () => {
            this.savePTTest()
        })
    }

    isDisabled = (measurementKey, index) => {
        const { formState, validations, disabledValues } = this.state;
        if (!disabledValues[measurementKey] || !disabledValues[measurementKey][index]) return false;
        const disabledVals = [...disabledValues[measurementKey][index]];
        for (let i = 0; i < MEASUREMENT_CONFIGS[measurementKey]?.disabledCasesComputed?.length ?? 0; i++) {
            const disabledCaseComputed = MEASUREMENT_CONFIGS[measurementKey].disabledCasesComputed[i]
            // if the disabled case is not shown, set the disabled value to false
            if (!disabledCaseComputed.showOverride(formState, validations, disabledValues, measurementKey)) {
                disabledVals[i] = false
            }
        }
        return (disabledVals.some(val => val) || false)
    }

    // if the disabled case shouldn't be shown, return null for the text
    getDisableCaseComputedText = (measurementKey) => {
        const { formState, validations, disabledValues } = this.state;
        const result = []
        for (let i = 0; i < MEASUREMENT_CONFIGS[measurementKey]?.disabledCasesComputed?.length ?? 0; i++) {
            const disabledCaseComputed = MEASUREMENT_CONFIGS[measurementKey].disabledCasesComputed[i]
            result.push(disabledCaseComputed.showOverride(formState, validations, disabledValues, measurementKey) ? disabledCaseComputed.text : null)
        }
        return result
    }

    passesValidation = () => {
        let valid = true;
        // for every component type component:
        for (const key in this.state.validations) {
            // for every instance of that component:
            const validationsArray = [...this.state.validations[key]]
            for (let i = 0; i < validationsArray.length; i++) {
                // skip if disabled
                if (this.isDisabled(key, i)) {
                    continue
                }
                const isValid = validationsArray[i]
                // if the instance is composed of multiple fields, check each field
                if (Array.isArray(isValid)) {
                    for (const subValid of isValid) {
                        if (!subValid) {
                            valid = false
                        }
                    }
                } else {
                    if (!isValid) {
                        valid = false
                    }
                }
            }
        }

        return valid
    }

    updateDisabled = (key, disabledValue) => {
        this.setState(prevState => ({
            disabledValues: {
                ...prevState.disabledValues,
                [key]: disabledValue
            }
        }), () => {
            this.savePTTest()
        })
    }

    savePTTest = async (manual = false) => {
        if (!this.state.user) {
            return;
        }

        if (this.saveQueued) {
            return;
        }

        const now = Date.now();
        const timeSinceLastSave = now - this.lastSaved;

        if (!manual && timeSinceLastSave < THROTTLE_TIMEOUT) {
            this.saveQueued = true;
            setTimeout(() => {
                this.saveQueued = false;
                this.savePTTest();
            }, THROTTLE_TIMEOUT);
            return;
        }

        this.lastSaved = now;

        const passesValidation = this.passesValidation()
        if (!passesValidation) {
            this.setState({
                submitText: 'Please correct the highlighted errors before saving.',
                submitTextType: 'danger'
            }, () => {
                manual && window.scrollTo(0, document.body.scrollHeight);
            })
        } else if (!manual) {
            this.setState({
                submitText: '',
                submitTextType: ''
            })
        }

        try {
            await saveSessionData(this.state.user.uuid, this.state.sessionUUID, {
                formState: this.state.formState,
                validations: this.state.validations,
                disabledValues: this.state.disabledValues,
                markSaved: manual && passesValidation,
            })

            if (manual && passesValidation) {
                this.setState({
                    submitText: 'Measurements saved successfully!',
                    submitTextType: 'success'
                }, () => {
                    window.scrollTo(0, document.body.scrollHeight)
                })
            }
        } catch (e) {
            this.setState({
                submitText: `Error saving measurements: ${e.message || e}`,
                submitTextType: 'danger'
            }, () => {
                window.scrollTo(0, document.body.scrollHeight)
            })
        }
    }

    renderPatientIcon = () => {
        if (!this.state.user) return null;
        return (
            <div id="pt-test-patient-icon" key="pt-test-patient" className="nav-icon p-2" onClick={() => this.props.navigate(`/patient?uuid=${this.state.user.uuid}`)}>
                <h1>
                    <i className="bi bi-person-fill text-success"></i>
                </h1>
            </div>
        )
    }

    renderNavIcon = () => {
        return (
            <div id="pt-test-nav-icon" key="pt-test-nav" className="nav-icon p-2" onClick={() => this.toggleNav()}>
                <h1>
                    <i className={`bi bi-${this.state.navShown ? 'x' : 'list'}`}></i>
                </h1>
            </div>
        )
    }

    renderNav = () => {
        if (!this.state.navShown) {
            return null
        }

        return (
            <div id="pt-test-nav" className="w-100 pb-5 overflow-auto user-select-none" style={{ height: window.innerHeight - document.getElementById('nav-icons-container').getBoundingClientRect().bottom }}>
                <h2 className="nav-entry-link text-center mt-5 cursor-p text-decoration-underline" onClick={() => this.setMeasurementShown(PT_TEST_HOME_PAGE)}>Overview</h2>
                {Object.entries(this.state.formState).map(([key, measurements]) => {
                    if (measurements.length === 0) {
                        return null
                    }

                    const disabled = measurements.every((_, i) => this.isDisabled(key, i))
                    const valid = this.state.validations[key].every((v, i) => this.isDisabled(key, i) || v === true || (Array.isArray(v) && v.every(sv => sv === true)))

                    return <h3 key={`nav-entry-${key}`} className={`nav-entry-link text-center mt-5 cursor-p text-decoration-underline ${disabled ? 'text-warning' : (valid ? 'text-success' : 'text-danger')}`} onClick={() => this.setMeasurementShown(key)}>{MEASUREMENT_CONFIGS[key]?.defaultLabel || key}</h3>
                })}
                <h2 className="nav-entry-link text-center mt-5 cursor-p text-decoration-underline" onClick={() => this.setMeasurementShown(PT_TEST_FINAL_PAGE)}>Summary</h2>
            </div>
        )
    }

    getQueryParams = () => {
        if (!this.state.user) return '';
        return `?uuid=${this.state.user.uuid}&sessionUUID=${this.state.sessionUUID}`;
    }

    renderMeasurementPage = () => {
        const name = this.state.user ? `(${this.state.user.name})` : '';
        const measurementKey = this.props.shownMeasurement;
        if (measurementKey === PT_TEST_HOME_PAGE) {
            return this.renderPTTestHomePage()
        } else if (measurementKey === PT_TEST_FINAL_PAGE) {
            if (!hasData(this.state.formState)) {
                return <Navigate to={`/${this.props.testKey}/home${this.getQueryParams()}`} replace />
            }

            return (
                <SummaryPage
                    name={name}
                    patientName={this.state?.user?.name || 'guest'}
                    submitText={this.state.submitText}
                    submitTextType={this.state.submitTextType}
                    formState={this.getMergedFormState()}
                    validations={this.state.validations}
                    disabledValues={this.state.disabledValues}
                    isDisabled={this.isDisabled}
                />
            )
        }

        const currentValues = this.state.formState[measurementKey];
        if (!currentValues || currentValues.length === 0) {
            return <Navigate to={`/${this.props.testKey}/home${this.getQueryParams()}`} replace />
        }

        const MeasurementComponent = PT_TEST_MEASUREMENT_CONFIG.find(m => m.stateKey === measurementKey)?.component;

        const actionButton = MEASUREMENT_CONFIGS[measurementKey]?.actionButton

        return (
            <>
                <Title>{MEASUREMENT_CONFIGS[measurementKey]?.defaultLabel || measurementKey} {name}</Title>
                {
                    this.state.formState[measurementKey].map((measurement, index) => {
                        const disabledValues = this.state.disabledValues?.[measurementKey] ? this.state.disabledValues[measurementKey][index] : [];
                        return (
                            <MeasurementComponent
                                key={`${measurementKey}-multiple-${index}`}
                                value={measurement.value || ''}
                                label={measurement.label || ''}
                                valid={this.state.validations?.[measurementKey]?.[index] ?? true}
                                disabledValues={disabledValues}
                                onChange={(value, additionalValues) => this.updateIndividualMeasurement(index, value, additionalValues)}
                                onValidationChange={(isValid) => this.updateIndividualValidation(index, isValid)}
                                onDisabledChange={(disabledValue) => this.updatedIndividualDisabledValues(index, disabledValue)}
                                onLabelChange={(label) => this.updateIndividualMeasurementLabel(index, label)}
                                onDelete={() => this.deleteIndividualMeasurement(index)}
                                isDisabled={() => this.isDisabled(measurementKey, index)}
                                getDisableCaseComputedText={() => this.getDisableCaseComputedText(measurementKey)}
                            />
                        )
                    })
                }
                {actionButton && (
                    <div className="d-flex justify-content-center my-3">
                        <button className="btn btn-warning" onClick={() => this.handleActionButton(measurementKey)}>
                            {actionButton.text}
                        </button>
                    </div>
                )}
                <InlineMeasurementInterpretations
                    measurementKey={measurementKey}
                    formState={this.getMergedFormState()}
                />
            </>
        )
    }

    renderPTTestHomePage = () => {
        const session = this.state.user && this.state.user.sessions?.find(s => s.uuid === this.state.sessionUUID);
        const titleName = session?.testName ? `${session.testName} (${this.state.user.name})` : 'Utilities';
        return (
            <>
                <Title>{titleName}</Title>
                {this.renderMeasurementSelection()}
                <ScrollIndicator />
            </>
        )
    }

    renderMeasurementSelection = () => {
        return (<>
            <div className="measurements-list d-flex flex-column align-items-center">
                <div className="utility-item w-100">
                    {PT_TEST_MEASUREMENT_CONFIG.map(({ name, component, stateKey }) => {
                        return (
                            <MultipleMeasurements
                                key={stateKey}
                                measurementKey={stateKey}
                                name={name}
                                measurementConfig={MEASUREMENT_CONFIGS[stateKey]}
                                component={component}
                                onChange={(value) => this.updateValues(stateKey, value)}
                                measurements={this.state.formState[stateKey]}
                                validations={this.state.validations}
                                disabledValues={this.state.disabledValues}
                                onValidationChange={(validations) => this.updateValidations(stateKey, validations)}
                                onDisabledChange={(disabledValues) => this.updateDisabled(stateKey, disabledValues)}
                                isDisabled={this.isDisabled}
                                buttonHidden={this.props.permittedMeasurements && !this.props.permittedMeasurements.includes(stateKey)}
                                buttonDisabledAndChecked={!!this.props.permittedMeasurements}
                                getDisableCaseComputedText={this.getDisableCaseComputedText}
                                // for now, only one measurement of each type is allowed
                                oneMax={true}
                            />
                        )
                    })}
                </div>
            </div>
        </>)
    }

    render() {
        if (!this.state.loaded) {
            return <LoadingPage />
        }

        const measurementIndex = this.getMeasurementIndexByKey(this.props.shownMeasurement);
        const [relativeMeasurementIndex, relativeMeasurementLength] = this.getRelativeMeasurementIndexByKey(this.props.shownMeasurement);

        const dontShowBack = measurementIndex === 0;
        const dontShowNext = relativeMeasurementLength === 1 || this.props.shownMeasurement === PT_TEST_FINAL_PAGE;

        return (
            <div id="pt-test" className={`${this.state.navShown ? 'user-select-none pe-none' : ''}`}>
                {this.renderMeasurementPage()}
                <div id="pt-test-previous-next" className={`d-flex ${dontShowBack || dontShowNext ? 'justify-content-center' : 'justify-content-between'}`}>
                    <button className={`btn btn-secondary m-4 ${dontShowBack ? 'd-none' : ''}`} onClick={() => this.previousMeasurement()}>
                        {relativeMeasurementIndex === 1 ? 'Back to Measurement Selection' : this.props.shownMeasurement === PT_TEST_FINAL_PAGE ? 'Back to Measurements' : 'Previous Measurement'}
                    </button>
                    <button className={`btn btn-primary m-4 ${dontShowNext ? 'd-none' : ''}`} onClick={() => this.nextMeasurement()}>
                        {relativeMeasurementIndex === relativeMeasurementLength - 1 ? 'Finish' : this.props.shownMeasurement === PT_TEST_HOME_PAGE ? 'Proceed to Measurements' : 'Next Measurement'}
                    </button>
                </div>
            </div>
        )
    }
}

// Derive PT_TEST_MEASUREMENT_CONFIG from YAML config + component factory.
// Non-patient-level groups become measurement entries with dynamically created components.
export const PT_TEST_MEASUREMENT_CONFIG = measurementGroupsConfig
    .filter(g => !g.patient_level)
    .map(g => ({
        name: g.name,
        component: createMeasurement(g.key),
        stateKey: g.key,
    }))

export default PhysicalTherapyTest
