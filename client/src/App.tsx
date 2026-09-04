import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import PreviewDashboard from './pages/PreviewDashboard';
import AuthCallback from './pages/AuthCallback';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Coaches from './pages/Coaches';
import CoachProfile from './pages/CoachProfile';
import Book from './pages/Book';
import PaymentSuccess from './pages/PaymentSuccess';
import SessionRoom from './pages/SessionRoom';
import Goals from './pages/Goals';
import Journal from './pages/Journal';
import Messages from './pages/Messages';
import CoachDashboard from './pages/CoachDashboard';
import Admin from './pages/Admin';
import AthleteOnboard from './pages/onboarding/AthleteOnboard';
import CoachOnboard from './pages/onboarding/CoachOnboard';
import AdminOnboard from './pages/onboarding/AdminOnboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminAthletes from './pages/AdminAthletes';
import AdminSettings from './pages/AdminSettings';
import CoachProfileEdit from './pages/CoachProfileEdit';
import CoachAthletes from './pages/CoachAthletes';
import CoachAthleteHub from './pages/CoachAthleteHub';
import Drills from './pages/Drills';
import DrillReaction from './pages/DrillReaction';
import DrillGoNoGo from './pages/DrillGoNoGo';
import DrillLeaderboard from './pages/DrillLeaderboard';
import DrillEyeTrack from './pages/DrillEyeTrack';
import DrillSigh from './pages/DrillSigh';
import Settings from './pages/Settings';
import SessionFeedback from './pages/SessionFeedback';
import AdminFlags from './pages/AdminFlags';
import Playbook from './pages/Playbook';

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="bottom-center"
          gutter={8}
          toastOptions={{
            duration: 2800,
            style: {
              background: 'rgba(30,30,30,0.92)',
              color: '#fff',
              border: 'none',
              borderRadius: 50,
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              padding: '10px 20px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.28)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          {/* Dev-only preview route for capturing the athlete dashboard screenshot; not exposed in prod builds. */}
          {import.meta.env.DEV && (
            <Route path="/preview/dashboard" element={<PreviewDashboard />} />
          )}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/coaches" element={<ProtectedRoute><Coaches /></ProtectedRoute>} />
          <Route path="/coach/:id" element={<ProtectedRoute><CoachProfile /></ProtectedRoute>} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />

          <Route
            path="/onboarding/athlete"
            element={
              <ProtectedRoute>
                <AthleteOnboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/coach"
            element={
              <ProtectedRoute>
                <CoachOnboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/admin"
            element={
              <ProtectedRoute>
                <AdminOnboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute role="administrator">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/athletes"
            element={
              <ProtectedRoute role="administrator">
                <AdminAthletes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute role="administrator">
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="athlete">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book/:id"
            element={
              <ProtectedRoute role="athlete">
                <Book />
              </ProtectedRoute>
            }
          />
          <Route
            path="/session/:bookingId"
            element={
              <ProtectedRoute>
                <SessionRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute role="athlete">
                <Goals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/journal"
            element={
              <ProtectedRoute role="athlete">
                <Journal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach-dashboard"
            element={
              <ProtectedRoute role="coach">
                <CoachDashboard />
              </ProtectedRoute>
            }
          />

<Route path="/drills" element={<ProtectedRoute role="athlete"><Drills /></ProtectedRoute>} />
          <Route path="/drills/reaction" element={<ProtectedRoute role="athlete"><DrillReaction /></ProtectedRoute>} />
          <Route path="/drills/go-no-go" element={<ProtectedRoute role="athlete"><DrillGoNoGo /></ProtectedRoute>} />
          <Route path="/drills/leaderboard" element={<ProtectedRoute role="athlete"><DrillLeaderboard /></ProtectedRoute>} />
          <Route path="/drills/eye-track" element={<ProtectedRoute role="athlete"><DrillEyeTrack /></ProtectedRoute>} />
          <Route path="/drills/sigh" element={<ProtectedRoute role="athlete"><DrillSigh /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          <Route
            path="/coach/profile/edit"
            element={
              <ProtectedRoute role="coach">
                <CoachProfileEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/athletes"
            element={
              <ProtectedRoute role="coach">
                <CoachAthletes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/athletes/:id"
            element={
              <ProtectedRoute role="coach">
                <CoachAthleteHub />
              </ProtectedRoute>
            }
          />

          <Route path="/playbook" element={<ProtectedRoute role="athlete"><Playbook /></ProtectedRoute>} />
          <Route path="/session/:bookingId/feedback" element={<ProtectedRoute role="athlete"><SessionFeedback /></ProtectedRoute>} />
          <Route path="/admin/flags" element={<AdminFlags />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
