import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Mock user database
const users = [
  { username: 'user', password: 'password', role: 'USER' },
  { username: 'admin', password: 'adminpassword', role: 'ADMIN' },
];

app.use(express.json());
app.use(cookieParser());

// Mock Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    // In a real application, you would generate a JWT here
    // For this mock, we'll just set a cookie with the user's role
    res.cookie('role', user.role, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.status(200).json({ message: 'Login successful', role: user.role });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Endpoint to check authentication status and role
app.get('/api/check-auth', (req, res) => {
  const userRole = req.cookies.role;
  if (userRole) {
    res.status(200).json({ isAuthenticated: true, role: userRole });
  } else {
    res.status(200).json({ isAuthenticated: false, role: null });
  }
});

// Logout Endpoint
app.post('/api/logout', (req, res) => {
  res.clearCookie('role');
  res.status(200).json({ message: 'Logout successful' });
});

// Middleware to check user role
const authorize = (requiredRole) => (req, res, next) => {
  const userRole = req.cookies.role;
  if (userRole && (requiredRole === 'ANY' || userRole === requiredRole)) {
    req.user = { role: userRole }; // Attach user role to request
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Insufficient role' });
  }
};

// Public API route
app.get('/api/public', (req, res) => {
  res.json({ message: 'This is public data.' });
});

// Protected Admin API route
app.get('/api/admin', authorize('ADMIN'), (req, res) => {
  res.json({ message: 'This is admin-only data.', user: req.user });
});

// Serve client static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/dist'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});