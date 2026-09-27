import { Routes, Route } from 'react-router-dom';

// TODO: Importar layouts y páginas de cada feature
// TODO: Configurar AuthProvider y SocketProvider

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div>HomeScope — Inicio</div>} />
      {/* auth */}
      <Route path="/registro" element={<div>Registro</div>} />
      <Route path="/login" element={<div>Login</div>} />
      {/* propiedades */}
      <Route path="/propiedades" element={<div>Catálogo</div>} />
      <Route path="/propiedades/:id" element={<div>Ficha de propiedad</div>} />
      <Route path="/propiedades/nueva" element={<div>Publicar propiedad</div>} />
      {/* mensajes */}
      <Route path="/mensajes" element={<div>Mensajes</div>} />
      {/* agenda */}
      <Route path="/agenda" element={<div>Agenda</div>} />
      {/* admin */}
      <Route path="/admin/*" element={<div>Panel de administración</div>} />
      <Route path="*" element={<div>404 — Página no encontrada</div>} />
    </Routes>
  );
}
