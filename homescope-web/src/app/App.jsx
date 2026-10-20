import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, RegisterPage, LoginPage, ForgotPasswordPage, ResetPasswordPage, VerificarCorreoPage, useAuth } from '../features/auth';
import { PerfilPage } from '../features/perfil';
import { PublicarPropiedadPage, CatalogoPage, PropiedadDetallePage } from '../features/propiedades';
import { MensajesPage, AvisosTiempoReal, EstadoConexion } from '../features/mensajes';
import { VisitasPage } from '../features/agenda';
import { SocketProvider } from '../shared/realtime/SocketProvider';
import MainLayout from '../shared/components/MainLayout';
import ComingSoonPage from '../shared/pages/ComingSoonPage';
import NotFoundPage from '../shared/pages/NotFoundPage';
import ForbiddenPage from '../shared/pages/ForbiddenPage';
import ComponentesPage from '../shared/pages/dev/ComponentesPage';

// Redirige a /login si no hay sesión; conserva la ruta de origen en location.state.from
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="text-gray-400 text-sm">Cargando…</span>
    </div>
  );
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

// Muestra /403 si el usuario no tiene el permiso requerido (códigos de la matriz de roles)
function PermissionRoute({ children, permiso }) {
  const { tienePermiso, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="text-gray-400 text-sm">Cargando…</span>
    </div>
  );
  if (permiso && !tienePermiso(permiso)) return <Navigate to="/403" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      {/* Mensajes y notificaciones en tiempo real para toda la app (solo con sesión) */}
      <AvisosTiempoReal />
      <EstadoConexion />
      <Routes>
        {/* Auth — sin layout */}
        <Route path="/login"                    element={<LoginPage />} />
        <Route path="/registro"                 element={<RegisterPage />} />
        <Route path="/recuperar-contrasena"     element={<ForgotPasswordPage />} />
        <Route path="/recuperar-contrasena/:token" element={<ResetPasswordPage />} />
        {/* alias legacy */}
        <Route path="/recuperar"                element={<Navigate to="/recuperar-contrasena" replace />} />
        <Route path="/recuperar/:token"         element={<Navigate to="/recuperar-contrasena/:token" replace />} />
        <Route path="/verificar-correo"         element={<VerificarCorreoPage />} />

        {/* Páginas de error */}
        <Route path="/403" element={<MainLayout><ForbiddenPage /></MainLayout>} />

        {/* Raíz */}
        <Route path="/" element={<Navigate to="/propiedades" replace />} />

        {/* Públicas */}
        <Route path="/propiedades"      element={<MainLayout><CatalogoPage /></MainLayout>} />
        <Route path="/propiedades/:id" element={<MainLayout><PropiedadDetallePage /></MainLayout>} />
        <Route path="/mapa"             element={<MainLayout><ComingSoonPage /></MainLayout>} />

        {/* Protegidas — cualquier usuario autenticado */}
        <Route path="/perfil" element={
          <ProtectedRoute><MainLayout><PerfilPage /></MainLayout></ProtectedRoute>
        } />
        <Route path="/favoritos" element={
          <ProtectedRoute><MainLayout><ComingSoonPage /></MainLayout></ProtectedRoute>
        } />
        <Route path="/comparar" element={
          <ProtectedRoute><MainLayout><ComingSoonPage /></MainLayout></ProtectedRoute>
        } />
        <Route path="/mensajes" element={
          <ProtectedRoute><MainLayout><MensajesPage /></MainLayout></ProtectedRoute>
        } />
        <Route path="/mensajes/:id" element={
          <ProtectedRoute><MainLayout><MensajesPage /></MainLayout></ProtectedRoute>
        } />
        <Route path="/visitas" element={
          <ProtectedRoute><MainLayout><VisitasPage /></MainLayout></ProtectedRoute>
        } />

        {/* Protegidas — requieren permiso específico */}
        <Route path="/publicar" element={
          <ProtectedRoute>
            <PermissionRoute permiso="propiedad.crear">
              <MainLayout><PublicarPropiedadPage /></MainLayout>
            </PermissionRoute>
          </ProtectedRoute>
        } />
        {/* alias legacy */}
        <Route path="/propiedades/nueva" element={<Navigate to="/publicar" replace />} />

        <Route path="/mis-propiedades" element={
          <ProtectedRoute>
            <PermissionRoute permiso="propiedad.listar_propias">
              <MainLayout><ComingSoonPage /></MainLayout>
            </PermissionRoute>
          </ProtectedRoute>
        } />
        <Route path="/mis-propiedades/:id/editar" element={
          <ProtectedRoute>
            <PermissionRoute permiso="propiedad.editar">
              <MainLayout><ComingSoonPage /></MainLayout>
            </PermissionRoute>
          </ProtectedRoute>
        } />
        <Route path="/panel-vendedor" element={
          <ProtectedRoute>
            <PermissionRoute permiso="propiedad.listar_propias">
              <MainLayout><ComingSoonPage /></MainLayout>
            </PermissionRoute>
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute>
            <PermissionRoute permiso="admin.acceso">
              <MainLayout><ComingSoonPage /></MainLayout>
            </PermissionRoute>
          </ProtectedRoute>
        } />

        {/* Dev — solo en desarrollo */}
        {import.meta.env.DEV && (
          <Route path="/dev/componentes" element={<MainLayout><ComponentesPage /></MainLayout>} />
        )}

        {/* 404 */}
        <Route path="*" element={<MainLayout><NotFoundPage /></MainLayout>} />
      </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}
