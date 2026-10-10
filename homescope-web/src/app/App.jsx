import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, RegisterPage, LoginPage, ForgotPasswordPage, ResetPasswordPage, VerificarCorreoPage, useAuth } from '../features/auth';
import { PerfilPage } from '../features/perfil';
import { PublicarPropiedadPage } from '../features/propiedades';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-gray-400 text-sm">Cargando…</span></div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* auth — públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/recuperar" element={<ForgotPasswordPage />} />
        <Route path="/recuperar/:token" element={<ResetPasswordPage />} />
        <Route path="/verificar-correo" element={<VerificarCorreoPage />} />
        {/* raíz redirige según sesión */}
        <Route path="/" element={<Navigate to="/propiedades" replace />} />
        {/* rutas protegidas */}
        <Route path="/propiedades/nueva" element={<ProtectedRoute><PublicarPropiedadPage /></ProtectedRoute>} />
        <Route path="/propiedades/:id" element={<ProtectedRoute><div>Ficha de propiedad</div></ProtectedRoute>} />
        <Route path="/propiedades" element={<ProtectedRoute><div>Catálogo</div></ProtectedRoute>} />
        <Route path="/mensajes" element={<ProtectedRoute><div>Mensajes</div></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><div>Agenda</div></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><PerfilPage /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute><div>Panel de administración</div></ProtectedRoute>} />
        <Route path="*" element={<div>404 — Página no encontrada</div>} />
      </Routes>
    </AuthProvider>
  );
}
