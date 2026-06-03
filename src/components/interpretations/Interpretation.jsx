function Interpretation({ label, messages, citation }) {
    return (
        <div className="card mb-3 border-primary" style={{ borderWidth: '2px' }}>
            <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Interpretation: {label}</h5>
            </div>
            <div className="card-body p-2">
                {messages.map((msg, i) => (
                    <div key={i} className={`alert alert-${msg.type} ${i < messages.length - 1 ? 'mb-2' : 'mb-0'}`} style={{ whiteSpace: 'pre-line' }}>
                        {msg.text}
                    </div>
                ))}
            </div>
            {citation && (
                <div className="card-footer py-1 px-2">
                    <small className="text-muted" dangerouslySetInnerHTML={{ __html: `Reference: ${citation}` }} />
                </div>
            )}
        </div>
    )
}

export default Interpretation
