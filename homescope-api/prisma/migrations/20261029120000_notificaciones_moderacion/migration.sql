-- Notificaciones de moderación para los administradores: reportes nuevos (publicaciones, usuarios,
-- comentarios de zona) y solicitudes de verificación de vendedores
ALTER TABLE notificacion DROP CONSTRAINT notificacion_tipo_check;
ALTER TABLE notificacion ADD CONSTRAINT notificacion_tipo_check
  CHECK (tipo IN ('mensaje', 'visita', 'resena', 'expiracion', 'verificacion', 'sistema', 'moderacion'));
