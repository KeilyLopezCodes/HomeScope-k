-- ─── Módulo: Propiedades ─────────────────────────────────────────────────────

-- 1. Tabla tipo_propiedad
CREATE TABLE tipo_propiedad (
  id     SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(40)  NOT NULL UNIQUE
);

INSERT INTO tipo_propiedad (nombre) VALUES
  ('casa'), ('apartamento'), ('terreno'), ('local'), ('oficina');

-- 2. Alterar tabla propiedad
--    a) Añadir tipo_propiedad_id nullable para migrar datos
ALTER TABLE propiedad ADD COLUMN tipo_propiedad_id SMALLINT;

--    b) Migrar columna tipo (string) → tipo_propiedad_id (FK)
UPDATE propiedad p
SET tipo_propiedad_id = tp.id
FROM tipo_propiedad tp
WHERE tp.nombre = p.tipo;

--    c) Fallback para filas sin coincidencia
UPDATE propiedad
SET tipo_propiedad_id = (SELECT id FROM tipo_propiedad WHERE nombre = 'casa')
WHERE tipo_propiedad_id IS NULL;

--    d) NOT NULL + FK
ALTER TABLE propiedad ALTER COLUMN tipo_propiedad_id SET NOT NULL;
ALTER TABLE propiedad ADD CONSTRAINT fk_propiedad_tipo
  FOREIGN KEY (tipo_propiedad_id) REFERENCES tipo_propiedad(id);

--    e) Eliminar columna tipo (reemplazada por FK)
ALTER TABLE propiedad DROP COLUMN tipo;

--    f) Renombrar operacion → modalidad
ALTER TABLE propiedad RENAME COLUMN operacion TO modalidad;

--    g) Añadir columnas faltantes
ALTER TABLE propiedad
  ADD COLUMN moneda            CHAR(3)        NOT NULL DEFAULT 'GTQ',
  ADD COLUMN habitaciones      SMALLINT,
  ADD COLUMN banos             NUMERIC(3,1),
  ADD COLUMN area_m2           NUMERIC(10,2),
  ADD COLUMN parqueos          SMALLINT,
  ADD COLUMN zona              VARCHAR(50),
  ADD COLUMN municipio         VARCHAR(80),
  ADD COLUMN departamento      VARCHAR(80),
  ADD COLUMN latitud           NUMERIC(9,6),
  ADD COLUMN longitud          NUMERIC(9,6),
  ADD COLUMN google_place_id   VARCHAR(200),
  ADD COLUMN paso_formulario   SMALLINT       NOT NULL DEFAULT 1,
  ADD COLUMN fecha_publicacion TIMESTAMPTZ,
  ADD COLUMN fecha_expiracion  TIMESTAMPTZ;

--    h) Renombrar columnas de fecha
ALTER TABLE propiedad RENAME COLUMN creado_en TO fecha_creacion;
ALTER TABLE propiedad RENAME COLUMN actualizado_en TO fecha_actualizacion;

--    i) Quitar DEFAULT temporal de moneda
ALTER TABLE propiedad ALTER COLUMN moneda DROP DEFAULT;

-- 3. Tabla foto_propiedad
CREATE TABLE foto_propiedad (
  id           INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  propiedad_id INTEGER      NOT NULL REFERENCES propiedad(id) ON DELETE CASCADE,
  url          VARCHAR(500) NOT NULL,
  public_id    VARCHAR(200) NOT NULL,
  orden        SMALLINT     NOT NULL,
  es_portada   BOOLEAN      NOT NULL DEFAULT FALSE,
  tamano_bytes INTEGER      NOT NULL,
  fecha_subida TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_foto_propiedad_propiedad ON foto_propiedad(propiedad_id);

-- 4. Tabla historial_precio
CREATE TABLE historial_precio (
  id              INTEGER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  propiedad_id    INTEGER        NOT NULL REFERENCES propiedad(id) ON DELETE CASCADE,
  precio_anterior NUMERIC(14,2)  NOT NULL,
  precio_nuevo    NUMERIC(14,2)  NOT NULL,
  cambiado_por    INTEGER        NOT NULL REFERENCES usuario(id),
  fecha_cambio    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_historial_precio_propiedad ON historial_precio(propiedad_id);

-- 5. Renombrar propiedad_vista → vista_propiedad
ALTER TABLE propiedad_vista RENAME TO vista_propiedad;

--    Renombrar columna visto_en → fecha_vista
ALTER TABLE vista_propiedad RENAME COLUMN visto_en TO fecha_vista;

--    Añadir columna origen
ALTER TABLE vista_propiedad ADD COLUMN origen VARCHAR(20) NOT NULL DEFAULT 'catalogo';
ALTER TABLE vista_propiedad ALTER COLUMN origen DROP DEFAULT;

--    usuario_id pasa a ser nullable (vistas anónimas)
ALTER TABLE vista_propiedad ALTER COLUMN usuario_id DROP NOT NULL;

--    Cambiar id a BIGINT
ALTER TABLE vista_propiedad ALTER COLUMN id TYPE BIGINT;

-- 6. Completar conversacion
ALTER TABLE conversacion RENAME COLUMN creado_en TO fecha_inicio;
ALTER TABLE conversacion ADD COLUMN ultimo_mensaje_en TIMESTAMPTZ;

-- 7. Favorito: eliminar columna id y usar PK compuesta (usuario_id, propiedad_id)
--    Renombrar creado_en → fecha_agregado
ALTER TABLE favorito RENAME COLUMN creado_en TO fecha_agregado;

--    Eliminar PK actual basada en id
ALTER TABLE favorito DROP CONSTRAINT favorito_pkey;
ALTER TABLE favorito DROP COLUMN id;

--    Crear nueva PK compuesta
ALTER TABLE favorito ADD PRIMARY KEY (usuario_id, propiedad_id);
