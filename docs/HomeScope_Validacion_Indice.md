# HomeScope — Validación del Índice de Conveniencia con ubicaciones reales

**Algoritmo:** `v1.0` ([HomeScope_Indice_Conveniencia.md](HomeScope_Indice_Conveniencia.md)) · **Fecha de la prueba:** 18 de octubre de 2026 · **Datos:** Google Places API (New)

## Resultado en una línea

En las **8 ubicaciones reales** probadas, el semáforo coincide con el nivel que se esperaba para la zona, y las ubicaciones quedan ordenadas como se esperaría: centro de la capital, ciudades, zona residencial, pueblo pequeño y campo. Dentro de algunas categorías sí hay errores, causados por la forma en que Google clasifica los lugares. Se detallan en la sección 4 con una propuesta de corrección para la versión `v1.1`.

---

## 1. Cómo se hizo la prueba

1. **Ubicaciones reales y verificadas.** Las coordenadas se obtuvieron con Google Geocoding a partir de lugares conocidos (parques centrales, colonias). Las dos ubicaciones rurales se verificaron con geocodificación inversa: Google las ubica en una aldea y en un camino sin nombre, fuera de cualquier casco urbano.
2. **Hipótesis antes de calcular.** Para cada ubicación se anotó el nivel esperado según el tipo de zona, antes de ver el resultado.
3. **Flujo real de la aplicación.** En cada punto se creó una propiedad temporal, se publicó, y el trabajo `calcular-indice` calculó el índice igual que en producción: consulta a Google Places, cálculo y guardado. Después se tomaron el índice, el desglose y los lugares más cercanos de cada categoría, y se borraron las propiedades.

---

## 2. Resultados

| # | Ubicación | Tipo de zona | Esperado | Obtenido | ¿Coherente? |
| --- | --- | --- | --- | --- | --- |
| 1 | Parque Central, zona 1, Ciudad de Guatemala | Centro histórico, nodo de transporte | Verde | **99.41 🟢** | ✅ |
| 2 | Parque Central, Antigua Guatemala | Centro de ciudad turística | Verde | **89.03 🟢** | ✅ |
| 3 | Zona Viva, zona 10, Ciudad de Guatemala | Centro comercial y de negocios | Verde | **88.24 🟢** | ✅ (ver 4.2) |
| 4 | Parque Central, Jalapa | Cabecera departamental | Verde | **85.01 🟢** | ✅ |
| 5 | Ciudad San Cristóbal, Mixco | Residencial suburbano | Verde o amarillo | **73.05 🟢** | ✅ |
| 6 | Parque Central, San Carlos Alzatate, Jalapa | Municipio pequeño | Amarillo | **45.97 🟡** | ✅ |
| 7 | Aldea Laguna Seca, San Pedro Pinula, Jalapa | Aldea rural | Rojo | **9.76 🔴** | ✅ |
| 8 | Camino sin nombre entre Jalapa y Monjas | Campo abierto | Rojo | **7.24 🔴** | ✅ |

Coordenadas usadas:

| # | Latitud, longitud | Precisión de Google |
| --- | --- | --- |
| 1 | 14.64196, -90.51365 | Exacta (`ROOFTOP`) |
| 2 | 14.55689, -90.73368 | Exacta |
| 3 | 14.59771, -90.51482 | Exacta |
| 4 | 14.63503, -89.98049 | Exacta |
| 5 | 14.60120, -90.59319 | Aproximada (centro de la colonia) |
| 6 | 14.49704, -90.05753 | Exacta |
| 7 | 14.65798, -89.79011 | Exacta (predio en la aldea) |
| 8 | 14.56000, -89.93000 | Punto elegido; Google lo ubica en un camino sin nombre |

### 2.1 Desglose por categoría

Subpuntaje de 0 a 100 de cada categoría. Entre paréntesis: lugares a menos de 1.5 km y distancia al más cercano.

| # | Educación | Salud | Comercio | Transporte | Seguridad | Áreas verdes | Índice |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Zona 1 | 100 (20 · 89 m) | 100 (20 · 89 m) | 100 (20 · 89 m) | 99.25 (20 · 121 m) | 96.79 (19 · 190 m) | 100 (20 · 0 m) | **99.41** |
| 2 Antigua | 97.79 (20 · 162 m) | 100 (20 · 77 m) | 100 (20 · 67 m) | 31.83 (1 · 736 m) | 98.00 (6 · 156 m) | 100 (20 · 0 m) | **89.03** |
| 3 Zona 10 | 98.43 (19 · 144 m) | 100 (20 · 23 m) | 99.82 (20 · 105 m) | 94.79 (13 · 203 m) | 35.14 (2 · 870 m) | 90.96 (19 · 353 m) | **88.24** |
| 4 Jalapa | 100 (20 · 42 m) | 97.96 (20 · 157 m) | 100 (20 · 45 m) | 36.75 (1 · 618 m) | 76.67 (3 · 106 m) | 84.05 (14 · 0 m) | **85.01** |
| 5 Mixco | 94.05 (20 · 179 m) | 100 (20 · 0 m) | 100 (20 · 0 m) | 0 (ninguno) | 30.81 (3 · 1033 m) | 96.21 (20 · 206 m) | **73.05** |
| 6 San Carlos A. | 66.78 (5 · 49 m) | 62.48 (3 · 138 m) | 63.33 (4 · 36 m) | 0 (ninguno) | 0 (ninguno) | 74.55 (3 · 0 m) | **45.97** |
| 7 Laguna Seca | 0 (ninguno) | 0 (ninguno) | 19.58 (1 · 986 m) | 0 (ninguno) | 0 (ninguno) | 58.46 (2 · 0 m) | **9.76** |
| 8 Camino rural | 0 (ninguno) | 0 (ninguno) | 26.93 (1 · 793 m) | 0 (ninguno) | 0 (ninguno) | 18.54 (1 · 1055 m) | **7.24** |

---

## 3. ¿Son coherentes con la zona?

**Sí, a nivel de índice y de orden.** Las 8 ubicaciones obtienen el color esperado y el orden refleja la realidad:

- **Centros urbanos (zona 1, Antigua, zona 10, Jalapa): de 85 a 99, verde.** Tienen al menos 20 lugares de educación, salud y comercio a menos de 1.5 km, casi todos a menos de 200 m. El Parque Central de zona 1 obtiene el puntaje más alto porque además tiene Transmetro y Transurbano (estación Parque Centenario a 121 m) y bomberos a 190 m.
- **Residencial suburbano (Ciudad San Cristóbal): 73, verde en el límite.** Tiene buena oferta de servicios cotidianos, pero la policía y los bomberos están a más de 1 km. No aparece ninguna parada de bus registrada.
- **Municipio pequeño (San Carlos Alzatate): 46, amarillo.** Hay mercado, escuelas, una clínica y farmacias cerca del parque, pero pocos de cada uno, y no aparecen policía, bomberos ni transporte.
- **Rural (Laguna Seca y el camino entre Jalapa y Monjas): menos de 10, rojo.** Solo aparecen 3 lugares en 2 km, y ninguno de educación, salud, transporte o seguridad.

Los lugares más cercanos que usó el cálculo también son reconocibles. Por ejemplo, en Jalapa:

| Categoría | Lugar | Distancia |
| --- | --- | --- |
| Educación | Instituto Técnico Profesional Miguel Ángel Asturias | 42 m |
| Salud | Cruz Roja Guatemalteca, delegación Jalapa | 157 m |
| Seguridad | Policía Nacional Civil, Comisaría 22 | 106 m |
| Transporte | Nueva Terminal de Buses | 1.7 km |

---

## 4. Incoherencias encontradas

Ninguna cambia el color de una ubicación, pero sí mueven algunos subpuntajes. Todas vienen de los datos de Google, no de la fórmula.

### 4.1 Lugares mal clasificados por Google (falsos positivos)

Google asigna varios tipos a cada lugar, y el cálculo acepta un lugar si **cualquiera** de sus tipos pertenece a la categoría. Por eso se cuelan lugares que no corresponden:

| Ubicación | Categoría | Lugar contado | Problema |
| --- | --- | --- | --- |
| Zona 10 | Transporte | Guatemala City Holiday Inn Hotel (203 m) | Es un hotel, no transporte |
| Antigua | Seguridad | Equipos para Ambulancia (156 m), POLIMERC (602 m) | Son comercios; inflan seguridad a 98 |
| San Carlos Alzatate | Educación | "Supervisión" (49 m) | Oficina de supervisión educativa, no una escuela |
| Laguna Seca | Áreas verdes | "ALDEA EL DURAZNO" (0 m) | Es el nombre de una aldea, no un parque; da 58 en áreas verdes a una zona rural |
| Camino rural | Áreas verdes | "Estados Unidos" (1055 m) | Nombre sin sentido para un parque |

### 4.2 Datos faltantes en Google (falsos negativos)

- **Transporte fuera de la capital.** Mixco y San Carlos Alzatate obtienen **0** aunque sí tienen buses; Antigua y Jalapa solo registran su terminal. Ya estaba identificado en la sección 9 del documento del algoritmo y se confirma aquí.
- **Seguridad en zona 10.** Solo aparece una oficina de antecedentes policiacos de la PNC a 870 m, así que seguridad baja a 35. Zona 10 tiene presencia policial que Google no registra como `police`.
- **Seguridad en municipios pequeños.** San Carlos Alzatate no registra policía ni bomberos.

### 4.3 Precisión de la coordenada

Ciudad San Cristóbal se geocodificó como colonia (precisión aproximada), así que el punto cayó sobre un centro comercial: varios lugares quedaron a 0 m. En una propiedad real no pasa, porque el vendedor fija el punto exacto con el marcador del mapa.

---

## 5. Recomendaciones para la versión v1.1

1. **Aceptar un lugar solo por su tipo principal.** Pedir a Places el campo `primaryType` y contar el lugar solo si su tipo principal pertenece a la categoría. Eliminaría casi todos los falsos positivos de la sección 4.1: el hotel, las tiendas de equipo, la aldea. No cuesta consultas adicionales; solo requiere un campo más en la máscara.
2. **Revisar el peso de transporte** (hoy 0.15) o complementarlo con otra fuente de datos. En Guatemala, Google no conoce las paradas de bus fuera de la capital.
3. **Repetir esta validación** con las mismas 8 ubicaciones después del cambio, para comparar. El índice es determinista con los mismos datos de Google.

Los cambios 1 y 2 modifican los resultados, así que según la sección 6 del documento del algoritmo requieren subir la versión y recalcular todas las propiedades.

---

## 6. Cómo repetir la prueba

1. Con la API corriendo, crear y publicar una propiedad en cada coordenada de la sección 2 (por Swagger, `POST /propiedades` y luego `POST /propiedades/{id}/publicar`, con un usuario vendedor).
2. Esperar unos segundos y leer el resultado en `GET /propiedades/{id}` (`indice_conveniencia`). La tabla `punto_interes` guarda los lugares que se usaron.
3. Borrar las propiedades de prueba (`DELETE /propiedades/{id}`); sus índices y puntos se borran en cascada.

Costo: hasta 6 consultas a Google Places por ubicación, unas 48 para las 8.
