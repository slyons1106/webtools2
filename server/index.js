import express from 'express';                                                                   
import cookieParser from 'cookie-parser';                                                        
import cors from 'cors';                                                                         
import path from 'path';                                                                         
import { fileURLToPath } from 'url';                                                             
import bcrypt from 'bcrypt';                                                                     
import { initializeDatabase } from './database.js'; // Import the database initializer           
                                                                                                 
const __filename = fileURLToPath(import.meta.url);                                               
const __dirname = path.dirname(__filename);                                                      
                                                                                                 
const app = express();                                                                           
const port = process.env.PORT || 3000;                                                           
                                                                                                 
let db; // Database instance                                                                     
                                                                                                 
app.use(express.json());                                                                         
app.use(cookieParser());                                                                         
app.use(cors());                                                                                 
                                                                                                 
// Mock Login Endpoint                                                                           
app.post('/api/login', async (req, res) => {                                                     
  const { username, password } = req.body;                                                       
  const user = await db.get("SELECT * FROM users WHERE username = ?", username);                 
                                                                                                 
  if (user && await bcrypt.compare(password, user.password)) {                                   
    // In a real application, you would generate a JWT here                                      
    // For this mock, we'll just set a cookie with the user's role and ID                        
    res.cookie('userId', user.id, { httpOnly: true, secure: req.secure });                       
    res.cookie('role', user.role, { httpOnly: true, secure: req.secure });                       
    res.status(200).json({ message: 'Login successful', role: user.role });                      
  } else {                                                                                       
    res.status(401).json({ message: 'Invalid credentials' });                                    
  }                                                                                              
});                                                                                              
                                                                                                 
// Endpoint to check authentication status and role                                              
app.get('/api/check-auth', async (req, res) => {                                                 
  const userId = req.cookies.userId;                                                             
  if (userId) {                                                                                  
    const user = await db.get("SELECT id, username, role, allowedPages FROM users WHERE id = ?", 
userId);                                                                                         
    if (user) {                                                                                  
      res.status(200).json({ isAuthenticated: true, role: user.role, username: user.username, allowedPages: JSON.parse(user.allowedPages) });                                                     
    } else {                                                                                     
      res.clearCookie('userId');                                                                 
      res.clearCookie('role');                                                                   
      res.status(200).json({ isAuthenticated: false, role: null, username: null, allowedPages: []
 });                                                                                             
    }                                                                                            
  } else {                                                                                       
    res.status(200).json({ isAuthenticated: false, role: null, username: null, allowedPages: [] }
);                                                                                               
  }                                                                                              
});                                                                                              
                                                                                                 
// Logout Endpoint                                                                               
app.post('/api/logout', (req, res) => {                                                          
  res.clearCookie('userId');                                                                     
  res.clearCookie('role');                                                                       
  res.status(200).json({ message: 'Logout successful' });                                        
});                                                                                              
                                                                                                 
// Middleware to check user role and page access                                                 
const authorize = (requiredRole = null, allowedPagePath = null) => async (req, res, next) => {
  const userId = req.cookies.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user logged in' });
  }

  const user = await db.get("SELECT id, username, role, allowedPages FROM users WHERE id = ?", userId);
  if (!user) {
    res.clearCookie('userId');
    res.clearCookie('role');
    return res.status(401).json({ message: 'Unauthorized: User not found' });
  }

  const userAllowedPages = JSON.parse(user.allowedPages || '[]');
  req.user = { id: user.id, username: user.username, role: user.role, allowedPages: userAllowedPages }; // Set req.user here
  console.log('Authorize: User role:', user.role, 'Allowed pages:', userAllowedPages);

  // Admin users bypass all other checks
  if (user.role === 'ADMIN') {
    return next();
  }

  // Check required role if specified
  if (requiredRole && user.role !== requiredRole) {
    console.log('Authorize: Forbidden - Insufficient role.');
    return res.status(403).json({ message: 'Forbidden: Insufficient role' });
  }

  // Check page-specific access for non-admin users if allowedPagePath is specified
  // For API routes like /api/s3-summary, the allowedPagePath would typically be '/s3-summary'
  if (allowedPagePath && !userAllowedPages.includes(allowedPagePath)) {
    console.log('Authorize: Forbidden - Page access denied. Path:', allowedPagePath, 'Included:', userAllowedPages.includes(allowedPagePath));
    return res.status(403).json({ message: 'Forbidden: Page access denied' });
  }

  // If none of the above checks failed, authorize access
  return next();
};
                                                                                                 
// --- API Endpoints ---                                                                         
app.get('/api/public', (req, res) => {                                                           
  res.json({ message: 'This is public data.' });                                                 
});                                                                                              
                                                                                                 
app.get('/api/admin', authorize('ADMIN'), (req, res) => {                                        
  res.json({ message: 'This is admin-only data.', user: req.user });                             
});                                                                                              
                                                                                                 
// Admin User Management API                                                                     
const ADMIN_ROLE_LEVEL = 'ADMIN'; // Define minimum role required for admin panel access         
app.get('/api/admin/users', authorize(ADMIN_ROLE_LEVEL), async (req, res) => {                   
  try {                                                                                          
    const users = await db.all("SELECT id, username, role, allowedPages FROM users");            
    res.status(200).json(users.map(u => ({ ...u, allowedPages: JSON.parse(u.allowedPages) })));  
  } catch (error) {                                                                              
    console.error('Error fetching users:', error);                                               
    res.status(500).json({ message: 'Error fetching users' });                                   
  }                                                                                              
});                                                                                              
                                                                                                 
app.post('/api/admin/users', authorize(ADMIN_ROLE_LEVEL), async (req, res) => {                  
  const { username, password, role, allowedPages } = req.body;                                   
  if (!username || !password || !role) {                                                         
    return res.status(400).json({ message: 'Username, password, and role are required' });       
  }                                                                                              
  if (!['USER', 'ADMIN'].includes(role)) { // Enforce valid roles for now                        
    return res.status(400).json({ message: 'Invalid role specified' });                          
  }                                                                                              
                                                                                                 
  try {                                                                                          
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is a good default salt rounds  
    const result = await db.run(                                                                 
      "INSERT INTO users (username, password, role, allowedPages) VALUES (?, ?, ?, ?)",          
      username,                                                                                  
      hashedPassword,                                                                            
      role,                                                                                      
      JSON.stringify(allowedPages || [])                                                         
    );                                                                                           
    res.status(201).json({ id: result.lastID, username, role, allowedPages });                   
  } catch (error) {                                                                              
    if (error.message.includes('UNIQUE constraint failed: users.username')) {                    
      return res.status(409).json({ message: 'Username already exists' });                       
    }                                                                                            
    console.error('Error creating user:', error);                                                
    res.status(500).json({ message: 'Error creating user' });                                    
  }                                                                                              
});                                                                                              
                                                                                                 
app.put('/api/admin/users/:id', authorize(ADMIN_ROLE_LEVEL), async (req, res) => {               
  const { id } = req.params;                                                                     
  const { username, password, role, allowedPages } = req.body;                                   
                                                                                                 
  // Prevent admin from changing their own role to non-admin or removing their own access        
  if (parseInt(id) === req.user.id && role !== 'ADMIN') {                                        
    return res.status(403).json({ message: 'Cannot demote yourself from Admin' });               
  }                                                                                              
                                                                                                 
  const updates = {};                                                                            
  const params = [];                                                                             
  if (username) { updates.username = username; params.push(username); }                          
  if (password) {                                                                                
    const hashedPassword = await bcrypt.hash(password, 10);                                      
    updates.password = hashedPassword;                                                           
    params.push(hashedPassword);                                                                 
  }                                                                                              
  if (role) {                                                                                    
    if (!['USER', 'ADMIN'].includes(role)) {                                                     
      return res.status(400).json({ message: 'Invalid role specified' });                        
    }                                                                                            
    updates.role = role;                                                                         
    params.push(role);                                                                           
  }                                                                                              
  if (allowedPages !== undefined) {                                                              
    updates.allowedPages = JSON.stringify(allowedPages);                                         
    params.push(JSON.stringify(allowedPages));                                                   
  }                                                                                              
                                                                                                 
  if (Object.keys(updates).length === 0) {                                                       
    return res.status(400).json({ message: 'No fields to update' });                             
  }                                                                                              
                                                                                                 
  const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');                   
  params.push(id);                                                                               
                                                                                                 
  try {                                                                                          
    const result = await db.run(`UPDATE users SET ${setClauses} WHERE id = ?`, ...params);       
    if (result.changes === 0) {                                                                  
      return res.status(404).json({ message: 'User not found' });                                
    }                                                                                            
    res.status(200).json({ message: 'User updated successfully' });                              
  } catch (error) {                                                                              
    if (error.message.includes('UNIQUE constraint failed: users.username')) {                    
      return res.status(409).json({ message: 'Username already exists' });                       
    }                                                                                            
    console.error('Error updating user:', error);                                                
    res.status(500).json({ message: 'Error updating user' });                                    
  }                                                                                              
});                                                                                              
                                                                                                 
app.delete('/api/admin/users/:id', authorize(ADMIN_ROLE_LEVEL), async (req, res) => {            
  const { id } = req.params;                                                                     
                                                                                                 
  // Prevent admin from deleting themselves                                                      
  if (parseInt(id) === req.user.id) {                                                            
    return res.status(403).json({ message: 'Cannot delete yourself' });                          
  }                                                                                              
                                                                                                 
  try {                                                                                          
    const result = await db.run("DELETE FROM users WHERE id = ?", id);                           
    if (result.changes === 0) {                                                                  
      return res.status(404).json({ message: 'User not found' });                                
    }                                                                                            
    res.status(200).json({ message: 'User deleted successfully' });                              
  } catch (error) {                                                                              
    console.error('Error deleting user:', error);                                                
    res.status(500).json({ message: 'Error deleting user' });                                    
  }                                                                                              
});                                                                                              
                                                                                                 
// New API endpoint for S3 summary                                                               
import { spawn } from 'child_process';                                                           
                                                                                                 
app.get('/api/s3-summary', authorize('USER', '/s3-summary'), (req, res) => { // Allow 'USER' role with '/s3-summary' access
  const pythonProcess = spawn('./venv_s3/bin/python', ['./server/s3_utils.py'], {                
    env: {                                                                                       
      ...process.env,                                                                            
      AWS_PROFILE: 'gateway',                                                                    
      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,                                                
      PYTHONUNBUFFERED: '1' // Ensures Python output is unbuffered                               
    }                                                                                            
  });                                                                                            
                                                                                                 
  let pythonOutput = '';                                                                         
  let pythonError = '';                                                                          
                                                                                                 
  pythonProcess.stdout.on('data', (data) => {                                                    
    pythonOutput += data.toString();                                                             
  });                                                                                            
                                                                                                 
  pythonProcess.stderr.on('data', (data) => {                                                    
    pythonError += data.toString();                                                              
  });                                                                                            
                                                                                                 
  pythonProcess.on('close', (code) => {                                                          
    if (code !== 0) {                                                                            
      console.error(`Python script exited with code ${code}: ${pythonError}`);                   
      return res.status(500).json({ message: 'Failed to get S3 summary', error: pythonError });  
    }                                                                                            
                                                                                                 
    try {                                                                                        
      // Assuming Python script prints JSON directly to stdout                                   
      const result = JSON.parse(pythonOutput);                                                   
      res.status(200).json(result);                                                              
    } catch (parseError) {                                                                       
      console.error(`Failed to parse Python script output: ${parseError}. Output: ${pythonOutput}
. Error: ${pythonError}`);                                                                       
      res.status(500).json({ message: 'Failed to parse S3 summary data', error: parseError.message, pythonOutput: pythonOutput, pythonError: pythonError });                                      
    }                                                                                            
  });                                                                                            
                                                                                                 
  pythonProcess.on('error', (err) => {                                                           
    console.error('Failed to start Python child process:', err);                                 
    res.status(500).json({ message: 'Failed to start S3 summary process', error: err.message }); 
  });                                                                                            
});                                                                                              
                                                                                                 
app.get('/api/label-summary', authorize('USER', '/label-summary'), async (req, res) => {
  const getNextWorkingDay = (date) => {                                                          
    const nextDay = new Date(date);                                                              
    nextDay.setDate(date.getDate() + 1);                                                         
    if (nextDay.getDay() === 6) { // Saturday                                                    
      nextDay.setDate(nextDay.getDate() + 2);                                                    
    } else if (nextDay.getDay() === 0) { // Sunday                                               
      nextDay.setDate(nextDay.getDate() + 1);                                                    
    }                                                                                            
    return nextDay;                                                                              
  };                                                                                             
                                                                                                 
  const runLabelScript = (dateStr) => {                                                          
    return new Promise((resolve, reject) => {                                                    
      const args = dateStr ? ['--screen', dateStr] : ['--screen'];                               
            const pythonProcess = spawn('./venv_s3/bin/python', ['./server/python_ref_scripts/label_summary/combined_counter2.py', ...args], {                                                          
        env: {                                                                                   
          ...process.env,                                                                        
          PYTHONUNBUFFERED: '1'                                                                  
        }                                                                                        
      });                                                                                        
                                                                                                 
      let pythonOutput = '';                                                                     
      let pythonError = '';                                                                      
                                                                                                 
      pythonProcess.stdout.on('data', (data) => {                                                
        pythonOutput += data.toString();                                                         
      });                                                                                        
                                                                                                 
      pythonProcess.stderr.on('data', (data) => {                                                
        pythonError += data.toString();                                                          
      });                                                                                        
                                                                                                 
      pythonProcess.on('close', (code) => {                                                      
        if (code !== 0) {                                                                        
          console.error(`Python script exited with code ${code}: ${pythonError}`);               
          reject({ message: 'Failed to get label summary', error: pythonError });                
        } else {                                                                                 
          resolve(pythonOutput);                                                                 
        }                                                                                        
      });                                                                                        
                                                                                                 
      pythonProcess.on('error', (err) => {                                                       
        console.error('Failed to start Python child process:', err);                             
        reject({ message: 'Failed to start label summary process', error: err.message });        
      });                                                                                        
    });                                                                                          
  };                                                                                             
                                                                                                 
  try {                                                                                          
    const today = new Date();                                                                    
    const nextWorkingDay = getNextWorkingDay(today);                                             
                                                                                                 
    const todayStr = today.toISOString().split('T')[0];                                          
    const nextWorkingDayStr = nextWorkingDay.toISOString().split('T')[0];                        
                                                                                                 
    const [todayReport, nextDayReport] = await Promise.all([                                     
      runLabelScript(todayStr),                                                                  
      runLabelScript(nextWorkingDayStr)                                                          
    ]);                                                                                          
                                                                                                 
    res.status(200).json({ todayReport, nextDayReport });                                        
                                                                                                 
  } catch (error) {                                                                              
    res.status(500).json(error);                                                                 
  }                                                                                              
});                                                                                              
                                                                                                 
                                                                                                 
                                                                                                 
// Production-specific logic                                                                     
if (process.env.NODE_ENV === 'production') {                                                     
  const clientBuildPath = path.join(__dirname, '../client/dist');                                
                                                                                                 
  // Serve static files from the React app                                                       
  app.use(express.static(clientBuildPath));                                                      
                                                                                                 
  // The "catchall" handler: for any request that doesn't match one above,                       
  // and is not an API call, send back React's index.html file.                                  
  app.use((req, res, next) => {                                                                  
    if (req.method === 'GET' && !req.path.startsWith('/api')) {                                  
      res.sendFile(path.join(clientBuildPath, 'index.html'));                                    
    } else {                                                                                     
      next();                                                                                    
    }                                                                                            
  });                                                                                            
}                                                                                                
                                                                                                 
// Initialize database and start server                                                          
initializeDatabase().then(database => {                                                          
  db = database;                                                                                 
  app.listen(port, () => {                                                                       
    console.log(`Server is running on port ${port}`);                                            
  });                                                                                            
}).catch(err => {                                                                                
  console.error('Failed to initialize database:', err);                                          
  process.exit(1);                                                                               
});