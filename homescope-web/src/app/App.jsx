import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, RegisterPage, LoginPage, useAuth } from '../features/auth';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
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
        {/* raíz redirige según sesión */}
        <Route path="/" element={<Navigate to="/propiedades" replace />} />
        {/* rutas protegidas */}
        <Route path="/propiedades" element={<ProtectedRoute><div>Catálogo</div></ProtectedRoute>} />
        <Route path="/propiedades/:id" element={<ProtectedRoute><div>Ficha de propiedad</div></ProtectedRoute>} />
        <Route path="/propiedades/nueva" element={<ProtectedRoute><div>Publicar propiedad</div></ProtectedRoute>} />
        <Route path="/mensajes" element={<ProtectedRoute><div>Mensajes</div></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><div>Agenda</div></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute><div>Panel de administración</div></ProtectedRoute>} />
        <Route path="*" element={<div>404 — Página no encontrada</div>} />
      </Routes>
    </AuthProvider>
  );
}
