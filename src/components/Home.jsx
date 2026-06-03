import { Link } from 'react-router-dom'
import Title from './form/Title'
import ScrollIndicator from './form/ScrollIndicator'

export default function Home() {
    return (
        <div id="home">
            <Title>Home</Title>
            <nav className="d-flex flex-column align-items-center">
                <Link to="/new-patient" className="link text-decoration-underline"><h2>New Patient</h2></Link>
                <Link to="/existing-patient" className="link text-decoration-underline"><h2>Existing Patient</h2></Link>
                <Link to="/presets" className="link text-decoration-underline"><h2>Presets</h2></Link>
                <Link to="/utilities" className="link text-decoration-underline"><h2>Utilities</h2></Link>
                <Link to="/user-guide" className="link text-decoration-underline"><h2>User Guide</h2></Link>
            </nav>
            <ScrollIndicator />
        </div>
    )
}
