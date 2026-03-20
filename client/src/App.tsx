import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import Dashboard from './pages/Dashboard';
import OrganizerDashboard from './pages/OrganizerDashboard';
import CreateTournament from './pages/CreateTournament';
import ManageTournament from './pages/ManageTournament';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Spacer for fixed navbar */}
      <div className="pt-16">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer"
            element={
              <ProtectedRoute roles={['ORGANIZER', 'ADMIN']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/create"
            element={
              <ProtectedRoute roles={['ORGANIZER', 'ADMIN']}>
                <CreateTournament />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/tournament/:id"
            element={
              <ProtectedRoute roles={['ORGANIZER', 'ADMIN']}>
                <ManageTournament />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}
