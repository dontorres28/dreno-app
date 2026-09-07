import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/Spinner';

// Entry pages — eager so the first paint is immediate.
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';

// Every other route — lazy-loaded so the landing bundle stays small.
const PreviewDashboard  = lazy(() => import('./pages/PreviewDashboard'));
const Dashboard         = lazy(() => import('./pages/Dashboard'));
const Coaches           = lazy(() => import('./pages/Coaches'));
const CoachProfile      = lazy(() => import('./pages/CoachProfile'));
const Book              = lazy(() => import('./pages/Book'));
const PaymentSuccess    = lazy(() => import('./pages/PaymentSuccess'));
const SessionRoom       = lazy(() => import('./pages/SessionRoom'));
const Goals             = lazy(() => import('./pages/Goals'));
const Journal           = lazy(() => import('./pages/Journal'));
const Messages          = lazy(() => import('./pages/Messages'));
const CoachDashboard    = lazy(() => import('./pages/CoachDashboard'));
const Admin             = lazy(() => import('./pages/Admin'));
const AthleteOnboard    = lazy(() => import('./pages/onboarding/AthleteOnboard'));
const CoachOnboard      = lazy(() => import('./pages/onboarding/CoachOnboard'));
const AdminOnboard      = lazy(() => import('./pages/onboarding/AdminOnboard'));
const AdminDashboard    = lazy(() => import('./pages/AdminDashboard'));
const AdminAthletes     = lazy(() => import('./pages/AdminAthletes'));
const AdminSettings     = lazy(() => import('./pages/AdminSettings'));
const CoachProfileEdit  = lazy(() => import('./pages/CoachProfileEdit'));
const CoachAthletes     = lazy(() => import('./pages/CoachAthletes'));
const CoachAthleteHub   = lazy(() => import('./pages/CoachAthleteHub'));
const Drills            = lazy(() => import('./pages/Drills'));
const DrillReaction     = lazy(() => import('./pages/DrillReaction'));
const DrillGoNoGo       = lazy(() => import('./pages/DrillGoNoGo'));
const DrillLeaderboard  = lazy(() => import('./pages/DrillLeaderboard'));
const DrillEyeTrack     = lazy(() => import('./pages/DrillEyeTrack'));
const DrillSigh         = lazy(() => import('./pages/DrillSigh'));
const Settings          = lazy(() => import('./pages/Settings'));
const SessionFeedback   = lazy(() => import('./pages/SessionFeedback'));
const AdminFlags        = lazy(() => import('./pages/AdminFlags'));
const Playbook          = lazy(() => import('./pages/Playbook'));

function RouteFallback() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={32} />
    </div>
  );
}

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
        <Suspense fallback={<RouteFallback />}>
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

            <Route path="/onboarding/athlete" element={<ProtectedRoute><AthleteOnboard /></ProtectedRoute>} />
            <Route path="/onboarding/coach"   element={<ProtectedRoute><CoachOnboard /></ProtectedRoute>} />
            <Route path="/onboarding/admin"   element={<ProtectedRoute><AdminOnboard /></ProtectedRoute>} />

            <Route path="/admin-dashboard" element={<ProtectedRoute role="administrator"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/athletes"  element={<ProtectedRoute role="administrator"><AdminAthletes /></ProtectedRoute>} />
            <Route path="/admin/settings"  element={<ProtectedRoute role="administrator"><AdminSettings /></ProtectedRoute>} />

            <Route path="/dashboard"          element={<ProtectedRoute role="athlete"><Dashboard /></ProtectedRoute>} />
            <Route path="/book/:id"           element={<ProtectedRoute role="athlete"><Book /></ProtectedRoute>} />
            <Route path="/session/:bookingId" element={<ProtectedRoute><SessionRoom /></ProtectedRoute>} />
            <Route path="/goals"              element={<ProtectedRoute role="athlete"><Goals /></ProtectedRoute>} />
            <Route path="/journal"            element={<ProtectedRoute role="athlete"><Journal /></ProtectedRoute>} />
            <Route path="/messages"           element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/coach-dashboard"    element={<ProtectedRoute role="coach"><CoachDashboard /></ProtectedRoute>} />

            <Route path="/drills"             element={<ProtectedRoute role="athlete"><Drills /></ProtectedRoute>} />
            <Route path="/drills/reaction"    element={<ProtectedRoute role="athlete"><DrillReaction /></ProtectedRoute>} />
            <Route path="/drills/go-no-go"    element={<ProtectedRoute role="athlete"><DrillGoNoGo /></ProtectedRoute>} />
            <Route path="/drills/leaderboard" element={<ProtectedRoute role="athlete"><DrillLeaderboard /></ProtectedRoute>} />
            <Route path="/drills/eye-track"   element={<ProtectedRoute role="athlete"><DrillEyeTrack /></ProtectedRoute>} />
            <Route path="/drills/sigh"        element={<ProtectedRoute role="athlete"><DrillSigh /></ProtectedRoute>} />
            <Route path="/settings"           element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            <Route path="/coach/profile/edit"   element={<ProtectedRoute role="coach"><CoachProfileEdit /></ProtectedRoute>} />
            <Route path="/coach/athletes"       element={<ProtectedRoute role="coach"><CoachAthletes /></ProtectedRoute>} />
            <Route path="/coach/athletes/:id"   element={<ProtectedRoute role="coach"><CoachAthleteHub /></ProtectedRoute>} />

            <Route path="/playbook" element={<ProtectedRoute role="athlete"><Playbook /></ProtectedRoute>} />
            <Route path="/session/:bookingId/feedback" element={<ProtectedRoute role="athlete"><SessionFeedback /></ProtectedRoute>} />
            <Route path="/admin/flags" element={<AdminFlags />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
