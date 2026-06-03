import { Link } from 'react-router-dom'
import Title from './form/Title'

function NotFound() {
    return (
        <div id="not-found">
            <Title>404 - Page Not Found</Title>
            <div className="d-flex flex-column align-items-center">
                <p>The page you're looking for doesn't exist.</p>
                <Link to="/" className="link text-decoration-underline"><h2>Go Home</h2></Link>
            </div>
        </div>
    )
}

export default NotFound
