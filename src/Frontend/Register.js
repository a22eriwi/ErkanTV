import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../Api';
import { useAuth } from '../authContext';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post('/api/register', {
        name,
        email,
        password,
      });

      if (res.status === 201) {
        setMessage('✅ Registered successfully! Waiting for approval');
      } else {
        setMessage(`❌ ${res.data.message || 'Registration failed.'}`);
      }
    } catch (err) {
      console.error('Register error:', err);
      if (err.response?.data?.message) {
        setMessage(`❌ ${err.response.data.message}`);
      } else {
        setMessage('❌ Something went wrong.');
      }
    }
  };

  return (
    <>
      <Header />
      <div className='mainDiv'>
        <div className="form-container">
          <h2>Register</h2>
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="authKnapp" type="submit">
              Sign Up
            </button>
          </form>
          {message && (
            <p className={`auth-message ${message.startsWith('✅') ? 'success' : 'error'}`}>{message}</p>
          )}
          <div className='authDiv'>
            <p className="auth-message">Already have an account?</p>
            <Link to="/login"><p className="auth-message2">Sign in here</p></Link>
          </div>
        </div>
      </div>
    </>
  );
}


function Header() {
    const { isLoggedIn, logout } = useAuth();
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

export default Register;
