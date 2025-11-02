import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Gallery from './pages/Gallery';
import Configurator from './pages/Configurator';
import MyPresets from './pages/MyPresets';
import PresetDetail from './pages/PresetDetail';
import Profile from './pages/Profile';
import DFUFlash from './pages/DFUFlash';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-brand-brown">
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/gallery" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route
              path="/configurator"
              element={
                <ProtectedRoute>
                  <Configurator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-presets"
              element={
                <ProtectedRoute>
                  <MyPresets />
                </ProtectedRoute>
              }
            />
            <Route path="/preset/:id" element={<PresetDetail />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/dfu-flash" element={<DFUFlash />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
