function Text(props) {
    return (
        <div className="text-label d-flex flex-column align-items-center justify-content-center w-100 text-center">
            {props.value &&
                <h4 className={props.type ? `text-${props.type}` : ''}>{props.value}</h4>
            }
            {props.children}
        </div >
    )
}

export default Text