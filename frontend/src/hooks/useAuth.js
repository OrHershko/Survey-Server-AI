import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('authToken');
      const userData = authService.getCurrentUser();
      
      if (storedToken && userData) {
        setToken(storedToken);
        setUser(userData);
      } else {
        // Clear invalid state
        setToken(null);
        setUser(null);
        authService.logout();
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.login({ email, password });
      const { accessToken: newToken, user: userData } = response;
      
      // Update state immediately after successful login
      setToken(newToken);
      setUser(userData);
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.register(userData);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  // Create a computed isAuthenticated boolean instead of a function
  const isAuthenticated = !!(token && user);
  
  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    isAuthenticated,
  }), [user, token, isLoading, error, isAuthenticated]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 