import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import Page1 from './pages/Page1';
import Page2 from './pages/Page2';
import Page3 from './pages/Page3';
import Page4 from './pages/Page4';
import Page5 from './pages/Page5';
import Page6 from './pages/Page6';
import { AuthContext } from './context/AuthContext'; // Only AuthContext is needed now
import ProtectedRoute from './components/ProtectedRoute';
import { useContext } from 'react';
import './App.css';

const AuthStatus: React.FC = () => {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }

  const handleLogout = () => {
    auth.logout();
  };

  return (
    <div>
      {auth.isAuthenticated ? (
        <>
          <span>Welcome, {auth.role}!</span>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <span>You are not logged in.</span>
      )}
    </div>
  );
};

function App() {
  // AuthContext is consumed here for conditional rendering of menu items
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }

  return (
    <div className="App">
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/admin">Admin</Link>
          </li>
          <li>
            <Link to="/page1">Page 1</Link>
          </li>
          <li>
            <Link to="/page2">Page 2</Link>
          </li>
          <li>
            <Link to="/page3">Page 3</Link>
          </li>
          {auth.isAuthenticated && auth.role === 'ADMIN' && (
            <>
              <li>
                <Link to="/page4">Page 4</Link>
              </li>
              <li>
                <Link to="/page5">Page 5</Link>
              </li>
              <li>
                <Link to="/page6">Page 6</Link>
              </li>
            </>
          )}
          <li>
            <Link to="/login">Login</Link>
          </li>
        </ul>
        <AuthStatus />
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/page1"
          element={
            <ProtectedRoute>
              <Page1 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/page2"
          element={
            <ProtectedRoute>
              <Page2 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/page3"
          element={
            <ProtectedRoute>
              <Page3 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/page4"
          element={
            <ProtectedRoute adminOnly={true}>
              <Page4 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/page5"
          element={
            <ProtectedRoute adminOnly={true}>
              <Page5 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/page6"
          element={
            <ProtectedRoute adminOnly={true}>
              <Page6 />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;