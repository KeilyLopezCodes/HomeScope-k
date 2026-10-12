import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, RegisterPage, LoginPage, ForgotPasswordPage, ResetPasswordPage, VerificarCorreoPage, useAuth } from '../features/auth';
import { PerfilPage } from '../features/perfil';
import { PublicarPropiedadPage } from '../features/propiedades';
import MainLayout from '../shared/components/MainLayout';
import ComingSoonPage from '../shared/pages/ComingSoonPage';
import NotFoundPage from '../shared/pages/NotFoundPage';
import ForbiddenPage from '../shared/pages/ForbiddenPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="text-gray-400 text-sm">Cargando…</span>
    </div>
  );
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.some(r => r.toLowerCase() === user.rol?.toLowerCase())) {
    return <Navigate to="/403" replace />;
  }
  return children;
}

/* Rutas de auth sin layout (pantalla completa) */
function AuthRoutes() {
  return (
    <Routes>
      <Route path="/login"            element={<LoginPage />} />
      <Route path="/registro"         element={<RegisterPage />} />
      <Route path="/recuperar"        element={<ForgotPasswordPage />} />
      <Route path="/recuperar/:token" element={<ResetPasswordPage />} />
      <Route path="/verificar-correo" element={<VerificarCorreoPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Auth — sin layout */}
        <Route path="/login"            element={<LoginPage />} />
        <Route path="/registro"         element={<RegisterPage />} />
        <Route path="/recuperar"        element={<ForgotPasswordPage />} />
        <Route path="/recuperar/:token" element={<ResetPasswordPage />} />
        <Route path="/verificar-correo" element={<VerificarCorreoPage />} />

        {/* Páginas de error — con layout */}
        <Route path="/403" element={<MainLayout><ForbiddenPage /></MainLayout>} />

        {/* Raíz */}
        <Route path="/" element={<Navigate to="/propiedades" replace />} />

        {/* Rutas con layout */}
        <Route path="/propiedades" element={
          <MainLayout><ComingSoonPage /></MainLayout>
        } />
        <Route path="/propiedades/:id" element={
          <MainLayout><ComingSoonPage /></MainLayout>
        } />
        <Route path="/propiedades/nueva" element={
          <ProtectedRoute roles={['vendedor', 'seller', 'admin', 'administrador']}>
            <MainLayout><PublicarPropiedadPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/mapa" element={
          <MainLayout><ComingSoonPage /></MainLayout>
        } />
        <Route path="/favoritos" element={
          <ProtectedRoute>
            <MainLayout><ComingSoonPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/mensajes" element={
          <ProtectedRoute>
            <MainLayout><ComingSoonPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/mis-visitas" element={
          <ProtectedRoute>
            <MainLayout><ComingSoonPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/mis-propiedades" element={
          <ProtectedRoute>
            <MainLayout><ComingSoonPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/panel-vendedor" element={
          <ProtectedRoute>
            <MainLayout><ComingSoonPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/agenda" element={
          <ProtectedRoute>
            <MainLayout><ComingSoonPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/perfil" element={
          <ProtectedRoute>
            <MainLayout><PerfilPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute roles={['admin', 'administrador']}>
            <MainLayout><ComingSoonPage /></MainLayout>
          </ProtectedRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<MainLayout><NotFoundPage /></MainLayout>} />
      </Routes>
    </AuthProvider>
  );
}
