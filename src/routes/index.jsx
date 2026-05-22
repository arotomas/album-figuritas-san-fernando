import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { ProtectedRoute, GuestRoute } from './ProtectedRoute'
import { PageSkeleton } from '../components/performance/AppSkeleton'

const SplashScreen = lazy(() =>
  import('../pages/SplashScreen').then((m) => ({ default: m.SplashScreen })),
)
const LoginScreen = lazy(() =>
  import('../pages/LoginScreen').then((m) => ({ default: m.LoginScreen })),
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
            <SplashScreen />
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

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
