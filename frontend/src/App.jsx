import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'
import PageLoader from './components/PageLoader'
import { LanguageProvider } from './context/LanguageContext'

// Lazy load all pages for optimal bundle splitting and critically improved FCP/LCP
const LandingPage = lazy(() => import('./pages/LandingPage'))
const SignIn = lazy(() => import('./pages/SignIn'))
const SignUp = lazy(() => import('./pages/SignUp'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'))
const DoctorRevenue = lazy(() => import('./pages/DoctorRevenue'))
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'))
const Appointments = lazy(() => import('./pages/Appointments'))
const Messages = lazy(() => import('./pages/Messages'))
const Profile = lazy(() => import('./pages/Profile'))
const AIExerciseFeedback = lazy(() => import('./pages/AIExerciseFeedback'))
const PatientHistory = lazy(() => import('./pages/PatientHistory'))
const SearchDoctors = lazy(() => import('./pages/SearchDoctors'))
const DoctorProfileView = lazy(() => import('./pages/DoctorProfileView'))
const Contact = lazy(() => import('./pages/Contact'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
// Payment pages removed
const NotFound = lazy(() => import('./pages/NotFound'))

function App() {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LanguageProvider><LandingPage /></LanguageProvider>} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ForgotPassword />} />
          <Route path="/contact" element={<Contact />} />
          {/* Payment routes removed */}

          {/* Doctor only */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRole="doctor">
              <DoctorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/doctor-revenue" element={
            <ProtectedRoute allowedRole="doctor">
              <DoctorRevenue />
            </ProtectedRoute>
          } />

          {/* Patient only */}
          <Route path="/patient-dashboard" element={
            <ProtectedRoute allowedRole="patient">
              <PatientDashboard />
            </ProtectedRoute>
          } />

          {/* Shared — any logged-in user */}
          <Route path="/find-doctors" element={
              <SearchDoctors />
          } />
          <Route path="/doctor/:id" element={
              <DoctorProfileView />
          } />
          <Route path="/admin" element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/appointments" element={
            <ProtectedRoute>
              <Appointments />
            </ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/feedback" element={
            <ProtectedRoute>
              <AIExerciseFeedback />
            </ProtectedRoute>
          } />
          <Route path="/patient-history/:patientId" element={
            <ProtectedRoute>
              <PatientHistory />
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App

