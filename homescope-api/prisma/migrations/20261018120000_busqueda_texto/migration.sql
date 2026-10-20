-- ─── Módulo: Búsqueda (RF-18, HU-20) ─────────────────────────────────────────
-- Arquitectura §7.3 y §7.4

-- 1. unaccent para buscar sin distinguir tildes ("jardin" encuentra "jardín")
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() no es IMMUTABLE y no se puede usar en un índice: se envuelve en una función que sí lo es
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- 2. Texto completo en español sobre título, descripción, dirección y ubicación.
--    La consulta de búsqueda.repository.js usa exactamente esta misma expresión para aprovechar el índice.
CREATE INDEX ix_propiedad_texto ON propiedad USING GIN (
  to_tsvector('spanish', f_unaccent(
    titulo || ' ' || coalesce(descripcion, '') || ' ' || coalesce(direccion, '') || ' ' ||
    coalesce(zona, '') || ' ' || coalesce(municipio, '') || ' ' || coalesce(departamento, '')
  ))
);

-- 3. Filtros combinados (estado, tipo, modalidad, precio)
CREATE INDEX propiedad_estado_tipo_propiedad_id_modalidad_precio_idx
  ON propiedad (estado, tipo_propiedad_id, modalidad, precio);
