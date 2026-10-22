import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, RegisterPage, LoginPage, ForgotPasswordPage, ResetPasswordPage, VerificarCorreoPage, useAuth } from '../features/auth';
import { PerfilPage } from '../features/perfil';
import { PublicarPropiedadPage, CatalogoPage, PropiedadDetallePage, MisPropiedadesPage, PanelVendedorPage } from '../features/propiedades';
import { MensajesPage, AvisosTiempoReal, EstadoConexion } from '../features/mensajes';
import { VisitasPage } from '../features/agenda';
import { PerfilVendedorPage } from '../features/resenas';
import { AdminPage } from '../features/admin';
import { FavoritosPage, CompararPage, BarraComparador } from '../features/favoritos';
import { VerificacionPage } from '../features/verificacion';
import { BusquedaMapaPage } from '../features/mapa';
import { SocketProvider } from '../shared/realtime/SocketProvider';
import MainLayout from '../shared/components/MainLayout';
import NotFoundPage from '../shared/pages/NotFoundPage';
import ForbiddenPage from '../shared/pages/ForbiddenPage';
import ComponentesPage from '../shared/pages/dev/ComponentesPage';

// Enlaces antiguos /recuperar/:token → /recuperar-contrasena/:token conservando el token
// (Navigate no reemplaza los parámetros de la ruta: hay que armar la URL con el valor real)
function RedirigirRecuperacion() {
  const { token } = useParams();
  return <Navigate to={`/recuperar-contrasena/${encodeURIComponent(token)}`} replace />;
}

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

// Muestra /403 si el rol del usuario no está entre los indicados (sin distinguir mayúsculas;
// los nombres de rol aún no están unificados: vendedor/seller)
function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  const rol = user?.rol?.toLowerCase();
  if (!roles.includes(rol)) return <Navigate to="/403" replace />;
  return children;
}

const ROLES_VENDEDOR = ['vendedor', 'seller'];
const ROLES_ADMIN = ['administrador', 'admin'];

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
        <Route path="/recuperar/:token"         element={<RedirigirRecuperacion />} />
        <Route path="/verificar-correo"         element={<VerificarCorreoPage />} />

        {/* Páginas de error */}
        <Route path="/403" element={<MainLayout><ForbiddenPage /></MainLayout>} />

        {/* Raíz */}
        <Route path="/" element={<Navigate to="/propiedades" replace />} />

        {/* Públicas */}
        <Route path="/propiedades"      element={<MainLayout><CatalogoPage /></MainLayout>} />
        <Route path="/propiedades/:id" element={<MainLayout><PropiedadDetallePage /></MainLayout>} />
        <Route path="/vendedores/:id"  element={<MainLayout><PerfilVendedorPage /></MainLayout>} />
        {/* El comparador no requiere sesión: la selección se guarda en el navegador */}
        <Route path="/comparar"         element={<MainLayout><CompararPage /></MainLayout>} />
        <Route path="/mapa"             element={<MainLayout><BusquedaMapaPage /></MainLayout>} />

        {/* Protegidas — cualquier usuario autenticado */}
        <Route path="/perfil" element={
          <ProtectedRoute><MainLayout><PerfilPage /></MainLayout></ProtectedRoute>
        } />
        <Route path="/favoritos" element={
          <ProtectedRoute><MainLayout><FavoritosPage /></MainLayout></ProtectedRoute>
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

        {/* Verificación de identidad: requisito para publicar */}
        <Route path="/verificacion" element={
          <ProtectedRoute>
            <RoleRoute roles={ROLES_VENDEDOR}>
              <MainLayout><VerificacionPage /></MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        } />
        {/* Gestión de anuncios: solo vendedores */}
        <Route path="/mis-propiedades" element={
          <ProtectedRoute>
            <RoleRoute roles={ROLES_VENDEDOR}>
              <MainLayout><MisPropiedadesPage /></MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        } />
        <Route path="/mis-propiedades/:id/editar" element={
          <ProtectedRoute>
            <RoleRoute roles={ROLES_VENDEDOR}>
              <MainLayout><PublicarPropiedadPage modo="editar" /></MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        } />
        <Route path="/panel-vendedor" element={
          <ProtectedRoute>
            <RoleRoute roles={ROLES_VENDEDOR}>
              <MainLayout><PanelVendedorPage /></MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        } />
        {/* Administración: solo administradores (el backend también lo exige en /admin) */}
        <Route path="/admin/*" element={
          <ProtectedRoute>
            <RoleRoute roles={ROLES_ADMIN}>
              <MainLayout><AdminPage /></MainLayout>
            </RoleRoute>
          </ProtectedRoute>
        } />

        {/* Dev — solo en desarrollo */}
        {import.meta.env.DEV && (
          <Route path="/dev/componentes" element={<MainLayout><ComponentesPage /></MainLayout>} />
        )}

        {/* 404 */}
        <Route path="*" element={<MainLayout><NotFoundPage /></MainLayout>} />
      </Routes>
      {/* Propiedades elegidas para comparar, visible en toda la app (después de la página: su espacio va al final) */}
      <BarraComparador />
      </SocketProvider>
    </AuthProvider>
  );
}
