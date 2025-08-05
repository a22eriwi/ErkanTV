// src/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../authContext';
import api from '../Api';

function Login() {
  const { login } = useAuth();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('adminadminadminadmin');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post('/api/login', { email, password });

      login(res.data.accessToken);
      setMessage(`✅ ${res.data.message || 'Logged in!'}`);
      setTimeout(() => navigate('/Home'), 700);
    } catch (err) {
      if (err.response?.status === 403) {
        setMessage('❌ Your account is not yet approved.');
      } else if (err.response?.data?.message) {
        setMessage(`${err.response.data.message}`);
      } else {
        console.error('Login error:', err);
        setMessage('❌ Something went wrong. Please try again.');
      }
    }
  };

  return (
    <>
      <Header />
      <div className='mainDiv'>
        <div className="form-container">
          <h2>Sign in</h2>
          <form onSubmit={handleLogin}>
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
              Sign In
            </button>
          </form>
          {message && (
            <p className={`auth-message ${message.startsWith('') ? 'success' : 'error'}`}>{message}</p>
          )}
          {!isLoggedIn && (
            <div className='authDiv'>
              <p className="auth-message">Don’t have an account?</p>
              <Link to="/Register"><p className="auth-message2">Register here</p></Link>
            </div>
          )}
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

export default Login;
