function Calculation({ label, value, unit }) {
    return (
        <div className="card mb-3 border-info" style={{ borderWidth: '2px' }}>
            <div className="card-header bg-info text-white">
                <h5 className="mb-0">Calculation: {label}</h5>
            </div>
            <div className="card-body">
                <h4 className="mb-0 text-center">{value}{unit ? ` ${unit}` : ''}</h4>
            </div>
        </div>
    )
}

export default Calculation
