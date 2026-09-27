
CREATE TABLE accion_moderacion
(
  id               INTEGER      NOT NULL GENERATED ALWAYS AS IDENTITY,
  administrador_id INTEGER      NOT NULL,
  reporte_id       INTEGER     ,
  accion           VARCHAR(20)  NOT NULL,
  propiedad_id     INTEGER     ,
  usuario_id       INTEGER     ,
  motivo           VARCHAR(300) NOT NULL,
  fecha_accion     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE accion_moderacion IS 'Modulo: Resenas y moderacion';

COMMENT ON COLUMN accion_moderacion.accion IS 'aprobar|pausar|suspender|...';

CREATE TABLE busqueda_guardada
(
  id                  INTEGER      NOT NULL GENERATED ALWAYS AS IDENTITY,
  usuario_id          INTEGER      NOT NULL,
  texto               VARCHAR(200),
  criterios_json      JSONB        NOT NULL,
  notificar_correo    BOOLEAN      NOT NULL DEFAULT TRUE,
  activa              BOOLEAN      NOT NULL DEFAULT TRUE,
  fecha_creacion      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ultima_notificacion TIMESTAMPTZ ,
  PRIMARY KEY (id)
);

COMMENT ON TABLE busqueda_guardada IS 'Modulo: Mensajeria y agenda';

CREATE TABLE categoria_interes
(
  id                 SMALLINT     NOT NULL,
  nombre             VARCHAR(40)  NOT NULL UNIQUE,
  google_place_types VARCHAR(200) NOT NULL,
  icono              VARCHAR(50)  NOT NULL,
  peso               NUMERIC(4,2) NOT NULL,
  activa             BOOLEAN      NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id)
);

COMMENT ON TABLE categoria_interes IS 'Modulo: Indice y puntos de interes';

COMMENT ON COLUMN categoria_interes.nombre IS 'educación|salud|comercio|...';

CREATE TABLE comentario_zona
(
  id             INTEGER       NOT NULL GENERATED ALWAYS AS IDENTITY,
  propiedad_id   INTEGER       NOT NULL,
  usuario_id     INTEGER       NOT NULL,
  comentario     VARCHAR(1000) NOT NULL,
  estado         VARCHAR(10)   NOT NULL DEFAULT 'visible',
  fecha_creacion TIMESTAMPTZ   NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE comentario_zona IS 'Modulo: Resenas y moderacion';

COMMENT ON COLUMN comentario_zona.estado IS 'visible|oculto';

CREATE TABLE conversacion
(
  id                INTEGER     NOT NULL GENERATED ALWAYS AS IDENTITY,
  propiedad_id      INTEGER     NOT NULL,
  comprador_id      INTEGER     NOT NULL,
  vendedor_id       INTEGER     NOT NULL,
  fecha_inicio      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_mensaje_en TIMESTAMPTZ,
  PRIMARY KEY (id)
);

COMMENT ON TABLE conversacion IS 'Modulo: Mensajeria y agenda';

CREATE TABLE disponibilidad_vendedor
(
  id           INTEGER  NOT NULL GENERATED ALWAYS AS IDENTITY,
  vendedor_id  INTEGER  NOT NULL,
  propiedad_id INTEGER ,
  dia_semana   SMALLINT NOT NULL,
  hora_inicio  TIME     NOT NULL,
  hora_fin     TIME     NOT NULL,
  activa       BOOLEAN  NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id)
);

COMMENT ON TABLE disponibilidad_vendedor IS 'Modulo: Mensajeria y agenda';

COMMENT ON COLUMN disponibilidad_vendedor.dia_semana IS '1=lunes..7=domingo';

CREATE TABLE favorito
(
  usuario_id     INTEGER     NOT NULL,
  propiedad_id   INTEGER     NOT NULL,
  fecha_agregado TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, propiedad_id)
);

COMMENT ON TABLE favorito IS 'Modulo: Propiedades';

CREATE TABLE foto_propiedad
(
  id           INTEGER      NOT NULL GENERATED ALWAYS AS IDENTITY,
  propiedad_id INTEGER      NOT NULL,
  url          VARCHAR(500) NOT NULL,
  public_id    VARCHAR(200) NOT NULL,
  orden        SMALLINT     NOT NULL,
  es_portada   BOOLEAN      NOT NULL DEFAULT FALSE,
  tamano_bytes INTEGER      NOT NULL,
  fecha_subida TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE foto_propiedad IS 'Modulo: Propiedades';

COMMENT ON COLUMN foto_propiedad.public_id IS 'Cloudinary';

CREATE TABLE historial_precio
(
  id              INTEGER       NOT NULL GENERATED ALWAYS AS IDENTITY,
  propiedad_id    INTEGER       NOT NULL,
  precio_anterior NUMERIC(14,2) NOT NULL,
  precio_nuevo    NUMERIC(14,2) NOT NULL,
  cambiado_por    INTEGER       NOT NULL,
  fecha_cambio    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE historial_precio IS 'Modulo: Propiedades';

CREATE TABLE indice_conveniencia
(
  id                INTEGER      NOT NULL GENERATED ALWAYS AS IDENTITY,
  propiedad_id      INTEGER      NOT NULL,
  puntaje_total     NUMERIC(5,2) NOT NULL,
  nivel_semaforo    VARCHAR(10)  NOT NULL,
  radio_m           SMALLINT     NOT NULL,
  version_algoritmo VARCHAR(10)  NOT NULL,
  es_vigente        BOOLEAN      NOT NULL DEFAULT TRUE,
  fecha_calculo     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE indice_conveniencia IS 'Modulo: Indice y puntos de interes';

COMMENT ON COLUMN indice_conveniencia.nivel_semaforo IS 'verde|amarillo|rojo';

CREATE TABLE mensaje
(
  id              BIGINT        NOT NULL GENERATED ALWAYS AS IDENTITY,
  conversacion_id INTEGER       NOT NULL,
  remitente_id    INTEGER       NOT NULL,
  contenido       VARCHAR(2000) NOT NULL,
  fecha_envio     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  leido_en        TIMESTAMPTZ  ,
  PRIMARY KEY (id)
);

COMMENT ON TABLE mensaje IS 'Modulo: Mensajeria y agenda';

CREATE TABLE notificacion
(
  id              BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY,
  usuario_id      INTEGER      NOT NULL,
  tipo            VARCHAR(30)  NOT NULL,
  titulo          VARCHAR(150) NOT NULL,
  contenido       VARCHAR(500) NOT NULL,
  referencia_tipo VARCHAR(30) ,
  referencia_id   INTEGER     ,
  leida           BOOLEAN      NOT NULL DEFAULT FALSE,
  enviada_correo  BOOLEAN      NOT NULL DEFAULT FALSE,
  fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE notificacion IS 'Modulo: Mensajeria y agenda';

COMMENT ON COLUMN notificacion.tipo IS 'mensaje|visita|expiracion|...';

CREATE TABLE permiso
(
  id          SMALLINT     NOT NULL,
  codigo      VARCHAR(60)  NOT NULL UNIQUE,
  modulo      VARCHAR(40)  NOT NULL,
  descripcion VARCHAR(200) NOT NULL,
  PRIMARY KEY (id)
);

COMMENT ON TABLE permiso IS 'Modulo: Usuarios y seguridad';

CREATE TABLE propiedad
(
  id                  INTEGER       NOT NULL GENERATED ALWAYS AS IDENTITY,
  vendedor_id         INTEGER       NOT NULL,
  tipo_propiedad_id   SMALLINT      NOT NULL,
  titulo              VARCHAR(150)  NOT NULL,
  descripcion         TEXT          NOT NULL,
  modalidad           VARCHAR(10)   NOT NULL,
  precio              NUMERIC(14,2) NOT NULL,
  moneda              CHAR(3)       NOT NULL,
  habitaciones        SMALLINT      NOT NULL,
  banos               NUMERIC(3,1)  NOT NULL,
  area_m2             NUMERIC(10,2) NOT NULL,
  parqueos            SMALLINT      NOT NULL,
  direccion           VARCHAR(300)  NOT NULL,
  zona                VARCHAR(50)   NOT NULL,
  municipio           VARCHAR(80)   NOT NULL,
  departamento        VARCHAR(80)   NOT NULL,
  latitud             NUMERIC(9,6)  NOT NULL,
  longitud            NUMERIC(9,6)  NOT NULL,
  google_place_id     VARCHAR(200) ,
  estado              VARCHAR(20)   NOT NULL DEFAULT 'borrador',
  paso_formulario     SMALLINT      NOT NULL DEFAULT 1,
  fecha_publicacion   TIMESTAMPTZ  ,
  fecha_expiracion    TIMESTAMPTZ  ,
  fecha_creacion      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  fecha_actualizacion TIMESTAMPTZ   NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE propiedad IS 'Modulo: Propiedades';

COMMENT ON COLUMN propiedad.modalidad IS 'venta|alquiler';

COMMENT ON COLUMN propiedad.estado IS 'borrador|publicado|pausado|vendido|alquilado';

CREATE TABLE punto_interes
(
  id                  BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY,
  propiedad_id        INTEGER      NOT NULL,
  categoria_id        SMALLINT     NOT NULL,
  google_place_id     VARCHAR(200) NOT NULL,
  nombre              VARCHAR(200) NOT NULL,
  latitud             NUMERIC(9,6) NOT NULL,
  longitud            NUMERIC(9,6) NOT NULL,
  distancia_m         INTEGER      NOT NULL,
  tiempo_estimado_min SMALLINT     NOT NULL,
  radio_consulta_m    SMALLINT     NOT NULL,
  fecha_consulta      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE punto_interes IS 'Modulo: Indice y puntos de interes';

COMMENT ON COLUMN punto_interes.radio_consulta_m IS '500|1000|2000';

CREATE TABLE reporte
(
  id                   INTEGER       NOT NULL GENERATED ALWAYS AS IDENTITY,
  reportante_id        INTEGER       NOT NULL,
  tipo_objetivo        VARCHAR(20)   NOT NULL,
  propiedad_id         INTEGER      ,
  usuario_reportado_id INTEGER      ,
  comentario_zona_id   INTEGER      ,
  motivo               VARCHAR(50)   NOT NULL,
  descripcion          VARCHAR(1000),
  estado               VARCHAR(20)   NOT NULL DEFAULT 'pendiente',
  fecha_creacion       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE reporte IS 'Modulo: Resenas y moderacion';

COMMENT ON COLUMN reporte.tipo_objetivo IS 'propiedad|usuario|comentario';

COMMENT ON COLUMN reporte.estado IS 'pendiente|en_revision|resuelto|descartado';

CREATE TABLE resena
(
  id             INTEGER       NOT NULL GENERATED ALWAYS AS IDENTITY,
  vendedor_id    INTEGER       NOT NULL,
  comprador_id   INTEGER       NOT NULL,
  propiedad_id   INTEGER       NOT NULL,
  calificacion   SMALLINT      NOT NULL,
  comentario     VARCHAR(1000),
  fecha_creacion TIMESTAMPTZ   NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE resena IS 'Modulo: Resenas y moderacion';

COMMENT ON COLUMN resena.calificacion IS '1 a 5';

CREATE TABLE rol
(
  id     SMALLINT    NOT NULL,
  nombre VARCHAR(30) NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

COMMENT ON TABLE rol IS 'Modulo: Usuarios y seguridad';

COMMENT ON COLUMN rol.nombre IS 'comprador|vendedor|administrador';

CREATE TABLE rol_permiso
(
  rol_id     SMALLINT NOT NULL,
  permiso_id SMALLINT NOT NULL,
  PRIMARY KEY (rol_id, permiso_id)
);

COMMENT ON TABLE rol_permiso IS 'Modulo: Usuarios y seguridad';

CREATE TABLE sub_puntaje_categoria
(
  indice_id          INTEGER      NOT NULL,
  categoria_id       SMALLINT     NOT NULL,
  puntaje            NUMERIC(5,2) NOT NULL,
  cantidad_puntos    SMALLINT     NOT NULL,
  distancia_minima_m INTEGER     ,
  PRIMARY KEY (indice_id, categoria_id)
);

COMMENT ON TABLE sub_puntaje_categoria IS 'Modulo: Indice y puntos de interes';

CREATE TABLE tipo_propiedad
(
  id     SMALLINT    NOT NULL,
  nombre VARCHAR(40) NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

COMMENT ON TABLE tipo_propiedad IS 'Modulo: Propiedades';

COMMENT ON COLUMN tipo_propiedad.nombre IS 'casa|apartamento|terreno|local|oficina';

CREATE TABLE token_usuario
(
  id              BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY,
  usuario_id      INTEGER      NOT NULL,
  tipo            VARCHAR(30)  NOT NULL,
  token_hash      VARCHAR(255) NOT NULL UNIQUE,
  recordar_sesion BOOLEAN      NOT NULL DEFAULT FALSE,
  expira_en       TIMESTAMPTZ  NOT NULL,
  usado_en        TIMESTAMPTZ ,
  fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE token_usuario IS 'Modulo: Usuarios y seguridad';

COMMENT ON COLUMN token_usuario.tipo IS 'verificacion_correo|recuperacion|refresh';

CREATE TABLE usuario
(
  id                INTEGER      NOT NULL GENERATED ALWAYS AS IDENTITY,
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100) NOT NULL,
  correo            VARCHAR(150) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  telefono          VARCHAR(20) ,
  foto_url          VARCHAR(500),
  correo_verificado BOOLEAN      NOT NULL DEFAULT FALSE,
  estado            VARCHAR(20)  NOT NULL DEFAULT 'activo',
  fecha_registro    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ultimo_acceso     TIMESTAMPTZ ,
  PRIMARY KEY (id)
);

COMMENT ON TABLE usuario IS 'Modulo: Usuarios y seguridad';

COMMENT ON COLUMN usuario.estado IS 'activo|suspendido|inhabilitado';

CREATE TABLE usuario_rol
(
  usuario_id       INTEGER     NOT NULL,
  rol_id           SMALLINT    NOT NULL,
  fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, rol_id)
);

COMMENT ON TABLE usuario_rol IS 'Modulo: Usuarios y seguridad';

CREATE TABLE verificacion_vendedor
(
  id              INTEGER      NOT NULL GENERATED ALWAYS AS IDENTITY,
  usuario_id      INTEGER      NOT NULL,
  tipo_documento  VARCHAR(30)  NOT NULL,
  documento_url   VARCHAR(500) NOT NULL,
  estado          VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
  revisado_por    INTEGER     ,
  motivo_rechazo  VARCHAR(300),
  fecha_solicitud TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fecha_revision  TIMESTAMPTZ ,
  PRIMARY KEY (id)
);

COMMENT ON TABLE verificacion_vendedor IS 'Modulo: Usuarios y seguridad';

COMMENT ON COLUMN verificacion_vendedor.estado IS 'pendiente|aprobada|rechazada';

CREATE TABLE visita
(
  id                    INTEGER      NOT NULL GENERATED ALWAYS AS IDENTITY,
  propiedad_id          INTEGER      NOT NULL,
  comprador_id          INTEGER      NOT NULL,
  fecha_hora_solicitada TIMESTAMPTZ  NOT NULL,
  fecha_hora_confirmada TIMESTAMPTZ ,
  estado                VARCHAR(20)  NOT NULL DEFAULT 'solicitada',
  nota_comprador        VARCHAR(300),
  recordatorio_enviado  BOOLEAN      NOT NULL DEFAULT FALSE,
  fecha_creacion        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fecha_actualizacion   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE visita IS 'Modulo: Mensajeria y agenda';

COMMENT ON COLUMN visita.estado IS 'solicitada|confirmada|...';

CREATE TABLE vista_propiedad
(
  id           BIGINT      NOT NULL GENERATED ALWAYS AS IDENTITY,
  propiedad_id INTEGER     NOT NULL,
  usuario_id   INTEGER    ,
  origen       VARCHAR(20) NOT NULL,
  fecha_vista  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMENT ON TABLE vista_propiedad IS 'Modulo: Propiedades';

COMMENT ON COLUMN vista_propiedad.origen IS 'catalogo|mapa|busqueda';

ALTER TABLE usuario_rol
  ADD CONSTRAINT FK_usuario_TO_usuario_rol
    FOREIGN KEY (usuario_id)
    REFERENCES usuario (id);

ALTER TABLE usuario_rol
  ADD CONSTRAINT FK_rol_TO_usuario_rol
    FOREIGN KEY (rol_id)
    REFERENCES rol (id);

ALTER TABLE rol_permiso
  ADD CONSTRAINT FK_rol_TO_rol_permiso
    FOREIGN KEY (rol_id)
    REFERENCES rol (id);

ALTER TABLE rol_permiso
  ADD CONSTRAINT FK_permiso_TO_rol_permiso
    FOREIGN KEY (permiso_id)
    REFERENCES permiso (id);

ALTER TABLE token_usuario
  ADD CONSTRAINT FK_usuario_TO_token_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuario (id);

ALTER TABLE verificacion_vendedor
  ADD CONSTRAINT FK_usuario_TO_verificacion_vendedor
    FOREIGN KEY (usuario_id)
    REFERENCES usuario (id);

ALTER TABLE verificacion_vendedor
  ADD CONSTRAINT FK_usuario_TO_verificacion_vendedor1
    FOREIGN KEY (revisado_por)
    REFERENCES usuario (id);

ALTER TABLE propiedad
  ADD CONSTRAINT FK_usuario_TO_propiedad
    FOREIGN KEY (vendedor_id)
    REFERENCES usuario (id);

ALTER TABLE propiedad
  ADD CONSTRAINT FK_tipo_propiedad_TO_propiedad
    FOREIGN KEY (tipo_propiedad_id)
    REFERENCES tipo_propiedad (id);

ALTER TABLE foto_propiedad
  ADD CONSTRAINT FK_propiedad_TO_foto_propiedad
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE historial_precio
  ADD CONSTRAINT FK_propiedad_TO_historial_precio
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE historial_precio
  ADD CONSTRAINT FK_usuario_TO_historial_precio
    FOREIGN KEY (cambiado_por)
    REFERENCES usuario (id);

ALTER TABLE vista_propiedad
  ADD CONSTRAINT FK_propiedad_TO_vista_propiedad
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE vista_propiedad
  ADD CONSTRAINT FK_usuario_TO_vista_propiedad
    FOREIGN KEY (usuario_id)
    REFERENCES usuario (id);

ALTER TABLE favorito
  ADD CONSTRAINT FK_usuario_TO_favorito
    FOREIGN KEY (usuario_id)
    REFERENCES usuario (id);

ALTER TABLE favorito
  ADD CONSTRAINT FK_propiedad_TO_favorito
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE punto_interes
  ADD CONSTRAINT FK_propiedad_TO_punto_interes
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE punto_interes
  ADD CONSTRAINT FK_categoria_interes_TO_punto_interes
    FOREIGN KEY (categoria_id)
    REFERENCES categoria_interes (id);

ALTER TABLE indice_conveniencia
  ADD CONSTRAINT FK_propiedad_TO_indice_conveniencia
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE sub_puntaje_categoria
  ADD CONSTRAINT FK_indice_conveniencia_TO_sub_puntaje_categoria
    FOREIGN KEY (indice_id)
    REFERENCES indice_conveniencia (id);

ALTER TABLE sub_puntaje_categoria
  ADD CONSTRAINT FK_categoria_interes_TO_sub_puntaje_categoria
    FOREIGN KEY (categoria_id)
    REFERENCES categoria_interes (id);

ALTER TABLE conversacion
  ADD CONSTRAINT FK_propiedad_TO_conversacion
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE conversacion
  ADD CONSTRAINT FK_usuario_TO_conversacion
    FOREIGN KEY (comprador_id)
    REFERENCES usuario (id);

ALTER TABLE conversacion
  ADD CONSTRAINT FK_usuario_TO_conversacion1
    FOREIGN KEY (vendedor_id)
    REFERENCES usuario (id);

ALTER TABLE mensaje
  ADD CONSTRAINT FK_conversacion_TO_mensaje
    FOREIGN KEY (conversacion_id)
    REFERENCES conversacion (id);

ALTER TABLE mensaje
  ADD CONSTRAINT FK_usuario_TO_mensaje
    FOREIGN KEY (remitente_id)
    REFERENCES usuario (id);

ALTER TABLE notificacion
  ADD CONSTRAINT FK_usuario_TO_notificacion
    FOREIGN KEY (usuario_id)
    REFERENCES usuario (id);

ALTER TABLE busqueda_guardada
  ADD CONSTRAINT FK_usuario_TO_busqueda_guardada
    FOREIGN KEY (usuario_id)
    REFERENCES usuario (id);

ALTER TABLE disponibilidad_vendedor
  ADD CONSTRAINT FK_usuario_TO_disponibilidad_vendedor
    FOREIGN KEY (vendedor_id)
    REFERENCES usuario (id);

ALTER TABLE disponibilidad_vendedor
  ADD CONSTRAINT FK_propiedad_TO_disponibilidad_vendedor
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE visita
  ADD CONSTRAINT FK_propiedad_TO_visita
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE visita
  ADD CONSTRAINT FK_usuario_TO_visita
    FOREIGN KEY (comprador_id)
    REFERENCES usuario (id);

ALTER TABLE resena
  ADD CONSTRAINT FK_usuario_TO_resena
    FOREIGN KEY (vendedor_id)
    REFERENCES usuario (id);

ALTER TABLE resena
  ADD CONSTRAINT FK_usuario_TO_resena1
    FOREIGN KEY (comprador_id)
    REFERENCES usuario (id);

ALTER TABLE resena
  ADD CONSTRAINT FK_propiedad_TO_resena
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE comentario_zona
  ADD CONSTRAINT FK_propiedad_TO_comentario_zona
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE comentario_zona
  ADD CONSTRAINT FK_usuario_TO_comentario_zona
    FOREIGN KEY (usuario_id)
    REFERENCES usuario (id);

ALTER TABLE reporte
  ADD CONSTRAINT FK_usuario_TO_reporte
    FOREIGN KEY (reportante_id)
    REFERENCES usuario (id);

ALTER TABLE reporte
  ADD CONSTRAINT FK_propiedad_TO_reporte
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE reporte
  ADD CONSTRAINT FK_usuario_TO_reporte1
    FOREIGN KEY (usuario_reportado_id)
    REFERENCES usuario (id);

ALTER TABLE reporte
  ADD CONSTRAINT FK_comentario_zona_TO_reporte
    FOREIGN KEY (comentario_zona_id)
    REFERENCES comentario_zona (id);

ALTER TABLE accion_moderacion
  ADD CONSTRAINT FK_usuario_TO_accion_moderacion
    FOREIGN KEY (administrador_id)
    REFERENCES usuario (id);

ALTER TABLE accion_moderacion
  ADD CONSTRAINT FK_reporte_TO_accion_moderacion
    FOREIGN KEY (reporte_id)
    REFERENCES reporte (id);

ALTER TABLE accion_moderacion
  ADD CONSTRAINT FK_propiedad_TO_accion_moderacion
    FOREIGN KEY (propiedad_id)
    REFERENCES propiedad (id);

ALTER TABLE accion_moderacion
  ADD CONSTRAINT FK_usuario_TO_accion_moderacion1
    FOREIGN KEY (usuario_id)
    REFERENCES usuario (id);

CREATE UNIQUE INDEX uq_conversacion_propiedad_comprador
  ON conversacion (propiedad_id ASC, comprador_id ASC);

CREATE UNIQUE INDEX uq_resena_comprador_propiedad
  ON resena (comprador_id ASC, propiedad_id ASC);