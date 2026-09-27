-- HomeScope · Carga inicial de roles y permisos (SQL Server)
-- Generado a partir de HomeScope_Matriz_Roles_Permisos.xlsx
-- 'Propio' y 'Condicional' se conceden aquí; la verificación de dueño o condición se hace en el backend.
-- El 'Visitante' no es un rol: sus permisos corresponden a rutas públicas sin JWT.

SET NOCOUNT ON;
BEGIN TRANSACTION;

INSERT INTO Rol (id, nombre) VALUES (1, N'comprador'), (2, N'vendedor'), (3, N'administrador');

-- Permiso.id es SMALLINT sin IDENTITY en el modelo ER; si lo definen como IDENTITY, envolver este INSERT con SET IDENTITY_INSERT Permiso ON/OFF.
INSERT INTO Permiso (id, codigo, modulo, descripcion) VALUES
  (1, N'cuenta.registrar', N'Cuenta y perfil', N'Crear una cuenta como comprador, vendedor o ambos'),
  (2, N'cuenta.iniciar_sesion', N'Cuenta y perfil', N'Iniciar sesión y usar "recordar sesión"'),
  (3, N'cuenta.recuperar_password', N'Cuenta y perfil', N'Solicitar recuperación de contraseña por correo'),
  (4, N'cuenta.verificar_correo', N'Cuenta y perfil', N'Confirmar el correo con el enlace recibido'),
  (5, N'cuenta.activar_rol_vendedor', N'Cuenta y perfil', N'Agregar el rol de vendedor a una cuenta de comprador'),
  (6, N'perfil.ver_propio', N'Cuenta y perfil', N'Ver el propio perfil'),
  (7, N'perfil.editar_propio', N'Cuenta y perfil', N'Editar los datos del propio perfil'),
  (8, N'perfil.ver_publico', N'Cuenta y perfil', N'Ver el perfil público de un vendedor (reseñas, insignia)'),
  (9, N'perfil.ver_contacto', N'Cuenta y perfil', N'Ver teléfono y correo de otro usuario'),
  (10, N'historial.ver_propio', N'Cuenta y perfil', N'Ver el historial propio (vistas, guardadas o publicadas)'),
  (11, N'propiedad.ver_catalogo', N'Propiedades', N'Ver el catálogo de propiedades publicadas'),
  (12, N'propiedad.ver_ficha', N'Propiedades', N'Ver la ficha completa de una propiedad'),
  (13, N'propiedad.crear', N'Propiedades', N'Crear y guardar un borrador de propiedad'),
  (14, N'propiedad.publicar', N'Propiedades', N'Publicar una propiedad'),
  (15, N'propiedad.editar', N'Propiedades', N'Editar datos, precio y ubicación'),
  (16, N'propiedad.cambiar_estado', N'Propiedades', N'Pausar, reactivar o marcar como vendida/alquilada'),
  (17, N'propiedad.renovar', N'Propiedades', N'Renovar un anuncio próximo a expirar'),
  (18, N'propiedad.eliminar', N'Propiedades', N'Eliminar una propiedad propia'),
  (19, N'foto.gestionar', N'Propiedades', N'Subir, ordenar, eliminar fotos y elegir portada'),
  (20, N'precio.ver_historial', N'Propiedades', N'Ver la línea de tiempo de precios'),
  (21, N'mapa.ver', N'Mapa e índice', N'Ver mapa, vista satelital y Street View'),
  (22, N'poi.ver', N'Mapa e índice', N'Ver puntos de interés, radio y filtro de categorías'),
  (23, N'indice.ver', N'Mapa e índice', N'Ver el Índice de Conveniencia y su desglose'),
  (24, N'indice.recalcular', N'Mapa e índice', N'Forzar el recálculo del índice'),
  (25, N'indice.configurar_pesos', N'Mapa e índice', N'Modificar categorías y pesos del algoritmo'),
  (26, N'busqueda.usar', N'Búsqueda y favoritos', N'Buscar por texto y filtros combinables'),
  (27, N'busqueda.mapa', N'Búsqueda y favoritos', N'Buscar directamente sobre el mapa'),
  (28, N'favorito.gestionar', N'Búsqueda y favoritos', N'Guardar y quitar favoritos'),
  (29, N'comparador.usar', N'Búsqueda y favoritos', N'Comparar hasta 3 favoritos'),
  (30, N'busqueda.guardar_alerta', N'Búsqueda y favoritos', N'Guardar una búsqueda y recibir alertas por correo'),
  (31, N'conversacion.iniciar', N'Mensajería', N'Iniciar una conversación con el vendedor de una propiedad'),
  (32, N'mensaje.enviar', N'Mensajería', N'Enviar mensajes en una conversación'),
  (33, N'conversacion.ver_propias', N'Mensajería', N'Ver sus conversaciones e historial'),
  (34, N'notificacion.ver_propias', N'Mensajería', N'Ver y marcar como leídas sus notificaciones'),
  (35, N'disponibilidad.gestionar', N'Agenda de visitas', N'Definir horarios disponibles para visitas'),
  (36, N'visita.solicitar', N'Agenda de visitas', N'Solicitar una visita en un horario disponible'),
  (37, N'visita.confirmar', N'Agenda de visitas', N'Confirmar o reprogramar una visita'),
  (38, N'visita.cancelar', N'Agenda de visitas', N'Cancelar una visita'),
  (39, N'visita.ver_propias', N'Agenda de visitas', N'Ver sus visitas agendadas'),
  (40, N'resena.crear', N'Reputación', N'Calificar y reseñar a un vendedor'),
  (41, N'resena.ver', N'Reputación', N'Ver reseñas y calificación promedio'),
  (42, N'comentario_zona.crear', N'Reputación', N'Comentar sobre la zona de una propiedad'),
  (43, N'comentario_zona.ver', N'Reputación', N'Ver comentarios sobre la zona'),
  (44, N'reporte.crear', N'Reputación', N'Reportar una publicación, usuario o comentario'),
  (45, N'verificacion.solicitar', N'Vendedor', N'Enviar documentos para verificación de identidad'),
  (46, N'estadisticas.ver_propias', N'Vendedor', N'Ver estadísticas de sus propiedades'),
  (47, N'verificacion.revisar', N'Administración', N'Aprobar o rechazar verificaciones de vendedores'),
  (48, N'moderacion.ver_reportes', N'Administración', N'Ver y atender la cola de reportes'),
  (49, N'moderacion.publicacion', N'Administración', N'Aprobar, pausar o eliminar publicaciones'),
  (50, N'moderacion.comentario', N'Administración', N'Ocultar reseñas o comentarios de zona'),
  (51, N'usuario.listar', N'Administración', N'Ver y buscar usuarios de la plataforma'),
  (52, N'usuario.suspender', N'Administración', N'Suspender, inhabilitar o reactivar cuentas'),
  (53, N'usuario.asignar_admin', N'Administración', N'Asignar o quitar el rol de administrador'),
  (54, N'estadisticas.ver_generales', N'Administración', N'Ver estadísticas generales de la plataforma'),
  (55, N'auditoria.ver', N'Administración', N'Ver el historial de acciones de moderación');

INSERT INTO RolPermiso (rol_id, permiso_id) VALUES
  (1, 4),  -- comprador: cuenta.verificar_correo (Sí)
  (2, 4),  -- vendedor: cuenta.verificar_correo (Sí)
  (1, 5),  -- comprador: cuenta.activar_rol_vendedor (Sí)
  (1, 6),  -- comprador: perfil.ver_propio (Sí)
  (2, 6),  -- vendedor: perfil.ver_propio (Sí)
  (3, 6),  -- administrador: perfil.ver_propio (Sí)
  (1, 7),  -- comprador: perfil.editar_propio (Sí)
  (2, 7),  -- vendedor: perfil.editar_propio (Sí)
  (3, 7),  -- administrador: perfil.editar_propio (Sí)
  (1, 8),  -- comprador: perfil.ver_publico (Sí)
  (2, 8),  -- vendedor: perfil.ver_publico (Sí)
  (3, 8),  -- administrador: perfil.ver_publico (Sí)
  (1, 9),  -- comprador: perfil.ver_contacto (Condicional)
  (2, 9),  -- vendedor: perfil.ver_contacto (Condicional)
  (3, 9),  -- administrador: perfil.ver_contacto (Sí)
  (1, 10),  -- comprador: historial.ver_propio (Propio)
  (2, 10),  -- vendedor: historial.ver_propio (Propio)
  (1, 11),  -- comprador: propiedad.ver_catalogo (Sí)
  (2, 11),  -- vendedor: propiedad.ver_catalogo (Sí)
  (3, 11),  -- administrador: propiedad.ver_catalogo (Sí)
  (1, 12),  -- comprador: propiedad.ver_ficha (Sí)
  (2, 12),  -- vendedor: propiedad.ver_ficha (Sí)
  (3, 12),  -- administrador: propiedad.ver_ficha (Sí)
  (2, 13),  -- vendedor: propiedad.crear (Sí)
  (2, 14),  -- vendedor: propiedad.publicar (Condicional)
  (2, 15),  -- vendedor: propiedad.editar (Propio)
  (2, 16),  -- vendedor: propiedad.cambiar_estado (Propio)
  (2, 17),  -- vendedor: propiedad.renovar (Propio)
  (2, 18),  -- vendedor: propiedad.eliminar (Propio)
  (2, 19),  -- vendedor: foto.gestionar (Propio)
  (1, 20),  -- comprador: precio.ver_historial (Sí)
  (2, 20),  -- vendedor: precio.ver_historial (Sí)
  (3, 20),  -- administrador: precio.ver_historial (Sí)
  (1, 21),  -- comprador: mapa.ver (Sí)
  (2, 21),  -- vendedor: mapa.ver (Sí)
  (3, 21),  -- administrador: mapa.ver (Sí)
  (1, 22),  -- comprador: poi.ver (Sí)
  (2, 22),  -- vendedor: poi.ver (Sí)
  (3, 22),  -- administrador: poi.ver (Sí)
  (1, 23),  -- comprador: indice.ver (Sí)
  (2, 23),  -- vendedor: indice.ver (Sí)
  (3, 23),  -- administrador: indice.ver (Sí)
  (3, 24),  -- administrador: indice.recalcular (Sí)
  (3, 25),  -- administrador: indice.configurar_pesos (Sí)
  (1, 26),  -- comprador: busqueda.usar (Sí)
  (2, 26),  -- vendedor: busqueda.usar (Sí)
  (3, 26),  -- administrador: busqueda.usar (Sí)
  (1, 27),  -- comprador: busqueda.mapa (Sí)
  (2, 27),  -- vendedor: busqueda.mapa (Sí)
  (3, 27),  -- administrador: busqueda.mapa (Sí)
  (1, 28),  -- comprador: favorito.gestionar (Propio)
  (1, 29),  -- comprador: comparador.usar (Propio)
  (1, 30),  -- comprador: busqueda.guardar_alerta (Propio)
  (1, 31),  -- comprador: conversacion.iniciar (Condicional)
  (1, 32),  -- comprador: mensaje.enviar (Condicional)
  (2, 32),  -- vendedor: mensaje.enviar (Condicional)
  (1, 33),  -- comprador: conversacion.ver_propias (Propio)
  (2, 33),  -- vendedor: conversacion.ver_propias (Propio)
  (1, 34),  -- comprador: notificacion.ver_propias (Propio)
  (2, 34),  -- vendedor: notificacion.ver_propias (Propio)
  (3, 34),  -- administrador: notificacion.ver_propias (Propio)
  (2, 35),  -- vendedor: disponibilidad.gestionar (Propio)
  (1, 36),  -- comprador: visita.solicitar (Condicional)
  (2, 37),  -- vendedor: visita.confirmar (Propio)
  (1, 38),  -- comprador: visita.cancelar (Propio)
  (2, 38),  -- vendedor: visita.cancelar (Propio)
  (1, 39),  -- comprador: visita.ver_propias (Propio)
  (2, 39),  -- vendedor: visita.ver_propias (Propio)
  (1, 40),  -- comprador: resena.crear (Condicional)
  (1, 41),  -- comprador: resena.ver (Sí)
  (2, 41),  -- vendedor: resena.ver (Sí)
  (3, 41),  -- administrador: resena.ver (Sí)
  (1, 42),  -- comprador: comentario_zona.crear (Condicional)
  (1, 43),  -- comprador: comentario_zona.ver (Sí)
  (2, 43),  -- vendedor: comentario_zona.ver (Sí)
  (3, 43),  -- administrador: comentario_zona.ver (Sí)
  (1, 44),  -- comprador: reporte.crear (Sí)
  (2, 44),  -- vendedor: reporte.crear (Sí)
  (2, 45),  -- vendedor: verificacion.solicitar (Sí)
  (2, 46),  -- vendedor: estadisticas.ver_propias (Propio)
  (3, 47),  -- administrador: verificacion.revisar (Sí)
  (3, 48),  -- administrador: moderacion.ver_reportes (Sí)
  (3, 49),  -- administrador: moderacion.publicacion (Sí)
  (3, 50),  -- administrador: moderacion.comentario (Sí)
  (3, 51),  -- administrador: usuario.listar (Sí)
  (3, 52),  -- administrador: usuario.suspender (Sí)
  (3, 53),  -- administrador: usuario.asignar_admin (Sí)
  (3, 54),  -- administrador: estadisticas.ver_generales (Sí)
  (3, 55);  -- administrador: auditoria.ver (Sí)

COMMIT TRANSACTION;
