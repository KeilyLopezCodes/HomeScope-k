-- ─── Historial de precios: moneda de cada cambio ─────────────────────────────
-- La API permite cambiar la moneda (GTQ ↔ USD): sin ella, "500000 → 64000" no dice si bajó o cambió de moneda.

ALTER TABLE historial_precio
  ADD COLUMN moneda_anterior CHAR(3),
  ADD COLUMN moneda_nueva    CHAR(3);

-- Los registros existentes se hicieron sin cambiar de moneda: toman la de su propiedad
UPDATE historial_precio h
SET moneda_anterior = p.moneda, moneda_nueva = p.moneda
FROM propiedad p
WHERE p.id = h.propiedad_id;

ALTER TABLE historial_precio
  ALTER COLUMN moneda_anterior SET NOT NULL,
  ALTER COLUMN moneda_nueva    SET NOT NULL,
  ADD CONSTRAINT ck_historial_moneda CHECK (moneda_anterior IN ('GTQ', 'USD') AND moneda_nueva IN ('GTQ', 'USD')),
  ADD CONSTRAINT ck_historial_precios CHECK (precio_anterior >= 0 AND precio_nuevo >= 0),
  -- Un registro solo existe si algo cambió (el precio o la moneda)
  ADD CONSTRAINT ck_historial_hay_cambio CHECK (precio_anterior <> precio_nuevo OR moneda_anterior <> moneda_nueva);

-- Consulta del historial de una propiedad ordenado por fecha
CREATE INDEX historial_precio_propiedad_id_fecha_cambio_idx ON historial_precio(propiedad_id, fecha_cambio);
