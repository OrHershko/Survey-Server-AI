import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

// Layout Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Surveys from './pages/Surveys';

// Styles
import './styles/App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes with layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              
              {/* Protected routes */}
              <Route path="surveys" element={
                <ProtectedRoute>
                  <Surveys />
                </ProtectedRoute>
              } />
              
              <Route path="my-surveys" element={
                <ProtectedRoute>
                  <div>My Surveys (Coming Soon)</div>
                </ProtectedRoute>
              } />
              
              <Route path="create-survey" element={
                <ProtectedRoute>
                  <div>Create Survey (Coming Soon)</div>
                </ProtectedRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={
                <div>
                  <h1>404 - Page Not Found</h1>
                  <p>The page you're looking for doesn't exist.</p>
                </div>
              } />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
