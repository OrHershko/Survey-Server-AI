import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>Survey Server</h1>
        </Link>
        
        <nav className="nav">
          <Link to="/surveys" className="nav-link">
            Surveys
          </Link>
          
          {user ? (
            <>
              <Link to="/my-surveys" className="nav-link">
                My Surveys
              </Link>
              <Link to="/create-survey" className="nav-link">
                Create Survey
              </Link>
              <div className="user-menu">
                <span className="username">Welcome, {user.username}</span>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/register" className="nav-link">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header; 