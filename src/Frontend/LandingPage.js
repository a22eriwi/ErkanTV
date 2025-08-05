//LandingPage
import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../authContext';

export default function LandingPage() {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn) {
            navigate('/Home'); // Redirect to /home or any other route
        }
    }, [isLoggedIn, navigate]);

    return (
        <>
            <Header />
            <div className='mainDiv'>
                <Banner />
            </div>
        </>
    );
}
function Banner() {
    return (
        <>
            <div className="banner" >
                <div className="Align" >
                    <h1 className="valkommen" > Welcome to ErkanTV </h1>
                </div>
                < h3 className="valkommen2" > Please sign in to access the content! </h3>
            </div>
        </>
    );
}

function Header() {
    const { isLoggedIn, user, logout } = useAuth();
    return (
        <>
            <header className="header">
                <Link className='logga' to="/">
                    ErkanTV
                </Link>
                <div className='signDiv'>
                    {isLoggedIn ? (
                        <>
                            <Link className="signinKnapp" to="/" onClick={() => { logout() }}>Sign out</Link>
                        </>
                    ) : (
                        <Link className="signinKnapp" to="/Login">Sign in</Link>
                    )}
                </div>
            </header>
        </>
    );
}
