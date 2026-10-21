-- ─── Vigencia de los anuncios ────────────────────────────────────────────────
-- Un anuncio publicado vence 60 días después de publicarse (o de renovarse). Hasta ahora la columna
-- existía pero nunca se llenaba: las propiedades ya publicadas toman 60 días desde su publicación.
UPDATE propiedad
SET fecha_expiracion = COALESCE(fecha_publicacion, now()) + INTERVAL '60 days'
WHERE estado IN ('publicado', 'pausado') AND fecha_expiracion IS NULL;

-- Listado "Mis propiedades": las del vendedor por estado
CREATE INDEX propiedad_vendedor_id_estado_idx ON propiedad(vendedor_id, estado);
