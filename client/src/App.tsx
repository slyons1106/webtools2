import { Routes, Route } from 'react-router-dom';                                                
import HomePage from './pages/HomePage';                                                         
import AdminPage from './pages/AdminPage';                                                       
import LoginPage from './pages/LoginPage';                                                       
import Page1 from './pages/Page1';                                                               
import Page2 from './pages/Page2';                                                               
import Page3 from './pages/Page3';                                                               
import Page4 from './pages/Page4';                                                               
import Page5 from './pages/Page5';                                                               
import Page6 from './pages/Page6';                                                               
import S3SummaryPage from './pages/S3SummaryPage';                                               
import LabelSummaryPage from './pages/LabelSummaryPage';
import S3DownloaderPage from './pages/S3DownloaderPage'; // Import the new S3DownloaderPage
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation'; // Import the new Navigation component
import './App.css';

function App() {
  return (
    <div className="App">
      <Navigation /> {/* Render the Navigation component */}

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
                  path="/s3-summary"
                  element={
                    <ProtectedRoute>
                      <S3SummaryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/label-summary"
                  element={
                    <ProtectedRoute>
                      <LabelSummaryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/s3-downloader" // New route for S3DownloaderPage
                  element={
                    <ProtectedRoute>
                      <S3DownloaderPage />
                    </ProtectedRoute>
                  }
                />        <Route                                                                                   
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