import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const Layout = () => {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <p>&copy; 2025 Survey Server with AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout; 