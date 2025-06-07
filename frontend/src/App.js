import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './styles/theme';
import './styles/App.css';

// Layout Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import NotificationProvider from './components/common/NotificationProvider';

// Lazy-loaded Pages
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Surveys = React.lazy(() => import('./pages/Surveys'));
const SurveyDetail = React.lazy(() => import('./pages/SurveyDetail'));
const CreateSurvey = React.lazy(() => import('./pages/CreateSurvey'));
const MySurveys = React.lazy(() => import('./pages/MySurveys'));
const MyResponses = React.lazy(() => import('./pages/MyResponses'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <ErrorBoundary>
              <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
                <div className="App">
                <Routes>
                  {/* Public routes with layout */}
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="login" element={<Login />} />
                    <Route path="register" element={<Register />} />
                    
                    {/* Protected routes */}
                    <Route path="dashboard" element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="surveys" element={
                      <ProtectedRoute>
                        <Surveys />
                      </ProtectedRoute>
                    } />
                    <Route path="surveys/:id" element={
                      <ProtectedRoute>
                        <SurveyDetail />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="my-surveys" element={
                      <ProtectedRoute>
                        <MySurveys />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="my-responses" element={
                      <ProtectedRoute>
                        <MyResponses />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="create-survey" element={
                      <ProtectedRoute>
                        <CreateSurvey />
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
            </Suspense>
          </ErrorBoundary>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
