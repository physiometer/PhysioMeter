import React, { Component } from 'react'
import { Link } from 'react-router-dom'

import { getAllUsers, deleteUser as dbDeleteUser } from '../DB'
import Title from './form/Title'
import Text from './form/Text'
import ClearAllData from './ClearAllData'
import HIPAANote from './HIPAANote'

export class ExistingUser extends Component {
    constructor(props) {
        super(props)

        this.state = {
            users: [],
            search: '',
            sortKey: 'name',
            sortAsc: true,
            submitText: '',
            submitTextType: ''
        }
    }

    componentDidMount = async () => {
        try {
            const users = await getAllUsers()
            this.setState({ users })
        } catch (e) {
            console.error('Failed to retrieve patients:', e)
        }
    }

    deleteUser = async (user) => {
        if (!window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
            return
        }

        try {
            await dbDeleteUser(user.uuid)
            this.setState((prevState) => ({
                users: prevState.users.filter(u => u.uuid !== user.uuid),
                submitText: `Patient ${user.name} deleted successfully.`,
                submitTextType: 'success'
            }))
        } catch (e) {
            this.setState({
                submitText: `Failed to delete patient ${user.name}: ${e.message || e}`,
                submitTextType: 'error'
            })
        }
    }

    toggleSort = (key) => {
        this.setState(prev => ({
            sortKey: key,
            sortAsc: prev.sortKey === key ? !prev.sortAsc : true
        }))
    }

    getFilteredUsers = () => {
        const { users, search, sortKey, sortAsc } = this.state
        return users
            .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => {
                let valA, valB
                if (sortKey === 'createdAt') {
                    valA = a.createdAt || 0
                    valB = b.createdAt || 0
                } else if (sortKey === 'dateOfBirth') {
                    valA = a.dateOfBirth || ''
                    valB = b.dateOfBirth || ''
                } else {
                    valA = (a[sortKey] || '').toLowerCase()
                    valB = (b[sortKey] || '').toLowerCase()
                }
                if (valA < valB) return sortAsc ? -1 : 1
                if (valA > valB) return sortAsc ? 1 : -1
                return 0
            })
    }

    sortIcon = (key) => {
        if (this.state.sortKey !== key) return <i className="bi bi-chevron-expand ms-1"></i>
        return this.state.sortAsc
            ? <i className="bi bi-chevron-up ms-1"></i>
            : <i className="bi bi-chevron-down ms-1"></i>
    }

    render() {
        const filtered = this.getFilteredUsers()

        return (
            <div id="existing-patient">
                <Title>Existing Patients</Title>
                <HIPAANote />
                <Link to="/new-patient" className="link text-decoration-underline"><h2>Create New Patient</h2></Link>
                <Title>Select Existing Patient ({this.state.users.length})</Title>
                {this.state.submitText && (
                    <Text value={this.state.submitText} type={this.state.submitTextType} />
                )}
                <div id="existing-patient-section" className="mx-5">
                    <input
                        type="text"
                        className="form-control mb-3"
                        placeholder="Search patients..."
                        value={this.state.search}
                        onChange={e => this.setState({ search: e.target.value })}
                    />
                    <table className="table table-bordered table-striped table-hover">
                        <thead>
                            <tr>
                                <th className="cursor-p" onClick={() => this.toggleSort('name')}>
                                    <h5>Name {this.sortIcon('name')}</h5>
                                </th>
                                <th className="cursor-p" onClick={() => this.toggleSort('dateOfBirth')}>
                                    <h5>Date of Birth {this.sortIcon('dateOfBirth')}</h5>
                                </th>
                                <th className="cursor-p" onClick={() => this.toggleSort('createdAt')}>
                                    <h5>Created {this.sortIcon('createdAt')}</h5>
                                </th>
                                <th>
                                    <h5>Delete Patient</h5>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(user => (
                                <tr key={user.uuid}>
                                    <td className="align-middle">
                                        <h5 className="m-0"><Link to={`/patient?uuid=${user.uuid}`}>{user.name}</Link></h5>
                                    </td>
                                    <td className="align-middle">{user.dateOfBirth ? new Date(user.dateOfBirth + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
                                    <td className="align-middle">{new Date(user.createdAt).toLocaleString()}</td>
                                    <td className="align-middle">
                                        <i className="bi bi-trash-fill text-danger cursor-p" onClick={() => this.deleteUser(user)} aria-label={`Delete patient ${user.name}`}></i>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan="4" className="text-center text-muted">No patients found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <ClearAllData />
            </div >
        )
    }
}

export default ExistingUser