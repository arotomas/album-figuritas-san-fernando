import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { AdminLayout } from '../layouts/AdminLayout'
import { ProtectedRoute, GuestRoute, ProfileSetupRoute } from './ProtectedRoute'
import { RootRedirect } from './RootRedirect'
import { AdminRoute, AdminRoleGate } from './AdminRoute'
import { PageSkeleton } from '../components/performance/AppSkeleton'

const LoginScreen = lazy(() =>
  import('../pages/LoginScreen').then((m) => ({ default: m.LoginScreen })),
)
const RegisterScreen = lazy(() =>
  import('../pages/RegisterScreen').then((m) => ({ default: m.RegisterScreen })),
)
const ProfileSetupScreen = lazy(() =>
  import('../pages/ProfileSetupScreen').then((m) => ({ default: m.ProfileSetupScreen })),
)
const ForgotPasswordScreen = lazy(() =>
  import('../pages/ForgotPasswordScreen').then((m) => ({ default: m.ForgotPasswordScreen })),
)
const ResetPasswordScreen = lazy(() =>
  import('../pages/ResetPasswordScreen').then((m) => ({ default: m.ResetPasswordScreen })),
)
const MapScreen = lazy(() =>
  import('../pages/MapScreen').then((m) => ({ default: m.MapScreen })),
)
const CaptureScreen = lazy(() =>
  import('../pages/CaptureScreen').then((m) => ({ default: m.CaptureScreen })),
)
const NearFigureScreen = lazy(() =>
  import('../pages/NearFigureScreen').then((m) => ({ default: m.NearFigureScreen })),
)
const MyFiguresScreen = lazy(() =>
  import('../pages/MyFiguresScreen').then((m) => ({ default: m.MyFiguresScreen })),
)
const OptionsScreen = lazy(() =>
  import('../pages/OptionsScreen').then((m) => ({ default: m.OptionsScreen })),
)
const AdminDashboardPage = lazy(() =>
  import('../pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminPlayersPage = lazy(() =>
  import('../pages/admin/AdminPlayersPage').then((m) => ({ default: m.AdminPlayersPage })),
)
const AdminFiguresPage = lazy(() =>
  import('../pages/admin/AdminFiguresPage').then((m) => ({ default: m.AdminFiguresPage })),
)
const AdminCapturesPage = lazy(() =>
  import('../pages/admin/AdminCapturesPage').then((m) => ({ default: m.AdminCapturesPage })),
)
const AdminMapPage = lazy(() =>
  import('../pages/admin/AdminMapPage').then((m) => ({ default: m.AdminMapPage })),
)

function LazyPage({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

export function AppRoutes() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Routes>
        <Route
          path="/"
          element={
            <LazyPage>
              <RootRedirect />
            </LazyPage>
          }
        />

        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LazyPage>
                  <LoginScreen />
                </LazyPage>
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <LazyPage>
                  <RegisterScreen />
                </LazyPage>
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <LazyPage>
                  <ForgotPasswordScreen />
                </LazyPage>
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <LazyPage>
                <ResetPasswordScreen />
              </LazyPage>
            }
          />
          <Route
            path="/profile-setup"
            element={
              <ProfileSetupRoute>
                <LazyPage>
                  <ProfileSetupScreen />
                </LazyPage>
              </ProfileSetupRoute>
            }
          />
        </Route>

        <Route
          path="/capture"
          element={
            <ProtectedRoute>
              <LazyPage>
                <CaptureScreen />
              </LazyPage>
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/map"
            element={
              <LazyPage>
                <MapScreen />
              </LazyPage>
            }
          />
          <Route
            path="/near"
            element={
              <LazyPage>
                <NearFigureScreen />
              </LazyPage>
            }
          />
          <Route
            path="/my-figures"
            element={
              <LazyPage>
                <MyFiguresScreen />
              </LazyPage>
            }
          />
          <Route
            path="/options"
            element={
              <LazyPage>
                <OptionsScreen />
              </LazyPage>
            }
          />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute requireCompleteProfile={false}>
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <AdminRoleGate minRole="admin">
                <LazyPage>
                  <AdminDashboardPage />
                </LazyPage>
              </AdminRoleGate>
            }
          />
          <Route
            path="players"
            element={
              <LazyPage>
                <AdminPlayersPage />
              </LazyPage>
            }
          />
          <Route
            path="figures"
            element={
              <AdminRoleGate minRole="admin">
                <LazyPage>
                  <AdminFiguresPage />
                </LazyPage>
              </AdminRoleGate>
            }
          />
          <Route
            path="captures"
            element={
              <LazyPage>
                <AdminCapturesPage />
              </LazyPage>
            }
          />
          <Route
            path="map"
            element={
              <AdminRoleGate minRole="admin">
                <LazyPage>
                  <AdminMapPage />
                </LazyPage>
              </AdminRoleGate>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}
