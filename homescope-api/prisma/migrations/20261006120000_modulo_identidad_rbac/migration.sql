-- ============================================================
-- Migración: modulo_identidad_rbac
-- Alinea usuario y token_usuario con el ERD.
-- Añade: rol, permiso, rol_permiso, usuario_rol
-- ============================================================

-- 1. Tablas de roles y permisos (sin dependencias)
CREATE TABLE "rol" (
    "id"     SMALLSERIAL NOT NULL,
    "nombre" VARCHAR(30)  NOT NULL,
    CONSTRAINT "rol_pkey"    PRIMARY KEY ("id"),
    CONSTRAINT "rol_nombre_key" UNIQUE ("nombre")
);

CREATE TABLE "permiso" (
    "id"          SMALLSERIAL  NOT NULL,
    "codigo"      VARCHAR(60)  NOT NULL,
    "modulo"      VARCHAR(40)  NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    CONSTRAINT "permiso_pkey"       PRIMARY KEY ("id"),
    CONSTRAINT "permiso_codigo_key" UNIQUE ("codigo")
);

CREATE TABLE "rol_permiso" (
    "rol_id"     SMALLINT NOT NULL,
    "permiso_id" SMALLINT NOT NULL,
    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("rol_id", "permiso_id")
);

-- 2. Columnas nuevas en usuario
--    apellido: NOT NULL con default temporal para filas existentes
ALTER TABLE "usuario"
    ADD COLUMN "apellido"      VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN "foto_url"      VARCHAR(500),
    ADD COLUMN "ultimo_acceso" TIMESTAMPTZ;

-- Renombrar creado_en → fecha_registro
ALTER TABLE "usuario" RENAME COLUMN "creado_en" TO "fecha_registro";

-- Eliminar columna rol (reemplazada por usuario_rol)
-- Primero guardamos los valores para migrar a usuario_rol
ALTER TABLE "usuario" ADD COLUMN "_rol_tmp" VARCHAR(20);
UPDATE "usuario" SET "_rol_tmp" = "rol";
ALTER TABLE "usuario" DROP COLUMN "rol";

-- 3. Tabla pivote usuario_rol
CREATE TABLE "usuario_rol" (
    "usuario_id"       INTEGER     NOT NULL,
    "rol_id"           SMALLINT    NOT NULL,
    "fecha_asignacion" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("usuario_id", "rol_id")
);

-- 4. Seed de roles base
INSERT INTO "rol" ("nombre") VALUES ('comprador'), ('vendedor'), ('administrador')
    ON CONFLICT ("nombre") DO NOTHING;

-- 5. Migrar roles existentes de _rol_tmp → usuario_rol
INSERT INTO "usuario_rol" ("usuario_id", "rol_id")
SELECT u.id, r.id
FROM "usuario" u
JOIN "rol" r ON r.nombre = COALESCE(NULLIF(u."_rol_tmp", ''), 'comprador')
ON CONFLICT DO NOTHING;

-- Limpiar columna temporal
ALTER TABLE "usuario" DROP COLUMN "_rol_tmp";

-- Quitar default temporal de apellido (nuevos registros deben proveerlo)
ALTER TABLE "usuario" ALTER COLUMN "apellido" DROP DEFAULT;

-- 6. Ajustes en token_usuario
--    Renombrar creado_en → fecha_creacion
ALTER TABLE "token_usuario" RENAME COLUMN "creado_en" TO "fecha_creacion";

--    Añadir columnas nuevas
ALTER TABLE "token_usuario"
    ADD COLUMN "recordar_sesion" BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN "usado_en"        TIMESTAMPTZ;

--    Ampliar tipo VARCHAR(20) → VARCHAR(30) y token_hash TEXT → VARCHAR(255)
ALTER TABLE "token_usuario"
    ALTER COLUMN "tipo"       TYPE VARCHAR(30)  USING "tipo"::VARCHAR(30),
    ALTER COLUMN "token_hash" TYPE VARCHAR(255) USING "token_hash"::VARCHAR(255);

-- 7. Foreign keys
ALTER TABLE "rol_permiso"
    ADD CONSTRAINT "rol_permiso_rol_id_fkey"
        FOREIGN KEY ("rol_id")     REFERENCES "rol"("id")     ON DELETE CASCADE,
    ADD CONSTRAINT "rol_permiso_permiso_id_fkey"
        FOREIGN KEY ("permiso_id") REFERENCES "permiso"("id") ON DELETE CASCADE;

ALTER TABLE "usuario_rol"
    ADD CONSTRAINT "usuario_rol_usuario_id_fkey"
        FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "usuario_rol_rol_id_fkey"
        FOREIGN KEY ("rol_id")     REFERENCES "rol"("id")     ON DELETE CASCADE;
