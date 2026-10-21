-- Panel del vendedor: conteos por propiedad y por día
-- El índice por (propiedad_id, fecha_vista) cubre también las búsquedas solo por propiedad_id
DROP INDEX IF EXISTS "vista_propiedad_propiedad_id_idx";
CREATE INDEX IF NOT EXISTS "vista_propiedad_propiedad_id_fecha_vista_idx" ON "vista_propiedad"("propiedad_id", "fecha_vista");
CREATE INDEX IF NOT EXISTS "favorito_propiedad_id_idx" ON "favorito"("propiedad_id");
