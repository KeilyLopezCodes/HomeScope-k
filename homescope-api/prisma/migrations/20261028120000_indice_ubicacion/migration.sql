-- Búsqueda en el mapa: propiedades publicadas dentro del área visible (latitud y longitud entre límites)
CREATE INDEX IF NOT EXISTS "propiedad_latitud_longitud_idx" ON "propiedad"("latitud", "longitud");
