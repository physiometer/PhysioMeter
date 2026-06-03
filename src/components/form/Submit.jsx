import React, { Component } from 'react'

export class Submit extends Component {
    render() {
        return (
            <div className="submit d-flex flex-column align-items-center justify-content-center text-center w-100 ">
                <button className={`submit-button btn btn-${this.props.color || "primary"}`} onClick={this.props.onClick}>
                    {this.props.label || "Submit"}
                </button>
            </div>
        )
    }
}

export default Submit