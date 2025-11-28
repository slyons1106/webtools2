import React, { createContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  role: string | null;
  allowedPages: string[] | null; // Added allowedPages to context type
  login: (newRole: string, newAllowedPages: string[]) => void; // Updated login signature
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<string | null>(null);
  const [allowedPages, setAllowedPages] = useState<string[] | null>(null); // New state for allowed pages
  const [loading, setLoading] = useState<boolean>(true); // To prevent flashing content

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/check-auth');
      if (response.ok) {
        const data = await response.json();
        console.log('checkAuthStatus data:', data); // Log the received data
        setIsAuthenticated(data.isAuthenticated);
        setRole(data.role);
        setAllowedPages(data.allowedPages); // Set allowed pages from response
      } else {
        setIsAuthenticated(false);
        setRole(null);
        setAllowedPages(null); // Clear allowed pages on failure
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setIsAuthenticated(false);
      setRole(null);
      setAllowedPages(null); // Clear allowed pages on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = (newRole: string, newAllowedPages: string[]) => {
    setIsAuthenticated(true);
    setRole(newRole);
    setAllowedPages(newAllowedPages); // Set allowed pages on login
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsAuthenticated(false);
      setRole(null);
      setAllowedPages(null); // Clear allowed pages on logout
    }
  };

  if (loading) {
    return <div>Loading authentication...</div>; // Simple loading indicator
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, allowedPages, login, logout, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
