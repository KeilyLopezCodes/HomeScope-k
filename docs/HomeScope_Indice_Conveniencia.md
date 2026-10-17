# HomeScope — Algoritmo del Índice de Conveniencia

**Versión del algoritmo:** `v1.0` · **Estado:** implementado; parámetros por validar en la Sprint Review · **Fecha:** octubre de 2026

Este documento define los pesos por categoría y la fórmula con la que se calcula el Índice de Conveniencia de cada propiedad. Es la referencia para implementar el cálculo (trabajo `calcular-indice` del módulo `geo-indice`) y para explicar el resultado al usuario.

Requerimientos que cubre:

| Requerimiento | Cómo lo cumple este algoritmo |
| --- | --- |
| RNF-13 Mismo criterio para todas las propiedades | Pesos y parámetros únicos, versionados; se recalculan todas las propiedades cuando cambian (sección 6) |
| RNF-10 Índice comprensible | El puntaje total se reconstruye exactamente a partir del desglose por categoría que ve el usuario (sección 4.5) |
| ADR-08 Índice precalculado en BD | Se calcula en segundo plano al publicar y se guarda; la ficha solo lo lee |

---

## 1. Resumen

```
Índice = Σ (peso de la categoría × subpuntaje de la categoría)        → de 0 a 100

subpuntaje = 100 × (0.5 × proximidad + 0.5 × oferta)                 → de 0 a 100
  proximidad: qué tan cerca está el lugar más cercano de esa categoría
  oferta:     cuántos lugares hay cerca, contando más los más cercanos
```

| Semáforo | Puntaje |
| --- | --- |
| 🟢 Verde | 70 o más |
| 🟡 Amarillo | De 40 a menos de 70 |
| 🔴 Rojo | Menos de 40 |

---

## 2. Datos de entrada

Para cada propiedad se usan sus coordenadas guardadas (`propiedad.latitud`, `propiedad.longitud`) y los puntos de interés obtenidos de Google Places con el servicio que ya existe (`GET /geo/...puntos-interes`):

- **Una consulta por categoría con radio de 2 km** (Nearby Search de Places API (New), ordenada por distancia). Es la misma consulta que alimenta el listado de la ficha.
- **Máximo 20 lugares por categoría**: es el tope de Google por consulta. Como se piden ordenados por distancia, son siempre los 20 más cercanos.
- **Distancia en línea recta** (fórmula de haversine) entre la propiedad y cada lugar, en metros.

Tipos de lugar de Google que agrupa cada categoría (los mismos de `geo-indice.schemas.js`):

| Categoría | Tipos de Places |
| --- | --- |
| Educación | `school`, `primary_school`, `secondary_school`, `university`, `preschool` |
| Salud | `hospital`, `doctor`, `pharmacy`, `dental_clinic`, `medical_lab` |
| Comercio | `supermarket`, `grocery_store`, `convenience_store`, `shopping_mall`, `market` |
| Transporte | `bus_station`, `bus_stop`, `transit_station`, `taxi_stand` |
| Seguridad | `police`, `fire_station` |
| Áreas verdes | `park`, `national_park`, `playground`, `hiking_area` |

---

## 3. Pesos por categoría

Los pesos suman exactamente **1.00**. Se guardan en `categoria_interes.peso`.

| Categoría | Peso | Justificación |
| --- | --- | --- |
| Educación | **0.20** | Necesidad diaria de las familias con hijos; es de los primeros criterios al elegir vivienda. |
| Salud | **0.20** | Farmacias y clínicas se usan con frecuencia; un hospital cercano es crítico en emergencias. |
| Comercio | **0.20** | Abastecimiento diario: tiendas, supermercados y mercados. |
| Transporte | **0.15** | Importante, sobre todo para quien no tiene vehículo. Peso moderado porque Google tiene poca información de paradas en Guatemala (ver sección 9). |
| Seguridad | **0.15** | Cercanía de Policía Nacional Civil y bomberos como indicador de tiempo de respuesta ante emergencias. No mide criminalidad. |
| Áreas verdes | **0.10** | Aporta calidad de vida, pero pesa menos en la decisión que las necesidades diarias. |
| **Total** | **1.00** | |

---

## 4. Fórmula

### 4.1 Parámetros de la versión v1.0

| Parámetro | Símbolo | Valor | Significado |
| --- | --- | --- | --- |
| Distancia de valor completo | `D0` | 100 m | Un lugar a 100 m o menos cuenta completo (≈ 1–2 min a pie). |
| Distancia máxima | `R` | 1500 m | Un lugar a 1.5 km o más ya no suma (≈ 25 min a pie). |
| Peso de la proximidad | `α` | 0.5 | Parte del subpuntaje que depende del lugar más cercano. |
| Peso de la oferta | `1 − α` | 0.5 | Parte del subpuntaje que depende de cuántos lugares hay. |
| Cantidad de referencia | `N_c` | ver tabla | Oferta que se considera completa en cada categoría. |
| Umbrales del semáforo | | 70 y 40 | Verde ≥ 70, amarillo ≥ 40, rojo < 40. |

| Categoría | `N_c` |
| --- | --- |
| Educación | 10 |
| Salud | 10 |
| Comercio | 15 |
| Transporte | 6 |
| Seguridad | 3 |
| Áreas verdes | 6 |

La consulta a Google es de 2 km porque el listado de la ficha permite ver hasta 2 km. Para el índice solo suman los lugares a menos de 1.5 km.

### 4.2 Valor de un lugar según su distancia

Cada lugar vale entre 0 y 1 según qué tan lejos está (`d` en metros):

```
         ⎧ 1                          si d ≤ D0
f(d) =   ⎨ (R − d) / (R − D0)         si D0 < d < R
         ⎩ 0                          si d ≥ R
```

Ejemplos: `f(100) = 1`, `f(500) = 0.714`, `f(800) = 0.5`, `f(1500) = 0`.

### 4.3 Subpuntaje de cada categoría

Para la categoría `c`, con los lugares a distancias `d₁, d₂, …, dₙ`:

```
Proximidad   P_c = f(d_min)                         (0 si no hay ningún lugar)
Oferta       Q_c = min(1, (f(d₁) + f(d₂) + … + f(dₙ)) / N_c)
Subpuntaje   S_c = redondear( 100 × (α × P_c + (1 − α) × Q_c), 2 )
```

- La **proximidad** premia tener al menos un lugar cerca.
- La **oferta** premia tener varias opciones; un lugar cercano suma más que uno lejano. Se limita a 1 para que una categoría con muchísimos lugares no compense a las demás.
- Una categoría sin lugares tiene subpuntaje **0**. No se excluye del cálculo, para que todas las propiedades se comparen con las mismas seis categorías.

### 4.4 Índice total y semáforo

```
I = redondear( Σ peso_c × S_c , 2 )        (S_c ya redondeado)

nivel = verde     si I ≥ 70
        amarillo  si 40 ≤ I < 70
        rojo      si I < 40
```

### 4.5 Redondeo

Los subpuntajes se redondean a 2 decimales **antes** de calcular el total. Así, el total que se muestra siempre se obtiene exactamente con el desglose que ve el usuario (RNF-10), y dos implementaciones que sigan este documento dan el mismo resultado.

---

## 5. Ejemplo de cálculo con datos reales

Datos de Google Places consultados en octubre de 2026 para propiedades de prueba del seed.

### 5.1 Una categoría paso a paso

**Transporte en Jalapa, zona 1.** Google devuelve 2 lugares: a 519 m y a 988 m.

```
f(519) = (1500 − 519) / 1400 = 0.701
f(988) = (1500 − 988) / 1400 = 0.366

P = f(519)                             = 0.701
Q = min(1, (0.701 + 0.366) / 6)        = 0.178
S = 100 × (0.5 × 0.701 + 0.5 × 0.178)  = 43.92
```

Hay una parada a distancia aceptable (proximidad media), pero muy poca oferta.

Los valores intermedios se muestran con 3 decimales, pero el cálculo usa la precisión completa y solo se redondea el subpuntaje. Por eso da 43.92 y no 43.95, que sería el resultado de operar con los valores ya redondeados.

### 5.2 Índice completo de una propiedad

**Jalapa, zona 1 (propiedad 45):**

| Categoría | Lugares a < 1.5 km | Más cercano | Proximidad | Oferta | Subpuntaje | Peso | Aporte |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Educación | 20 | 108 m | 0.994 | 1.000 | 99.71 | 0.20 | 19.94 |
| Salud | 20 | 24 m | 1.000 | 1.000 | 100.00 | 0.20 | 20.00 |
| Comercio | 20 | 42 m | 1.000 | 1.000 | 100.00 | 0.20 | 20.00 |
| Transporte | 2 | 519 m | 0.701 | 0.178 | 43.92 | 0.15 | 6.59 |
| Seguridad | 3 | 66 m | 1.000 | 0.549 | 77.44 | 0.15 | 11.62 |
| Áreas verdes | 12 | 436 m | 0.760 | 0.953 | 85.67 | 0.10 | 8.57 |
| **Índice** | | | | | | | **86.71 🟢** |

### 5.3 Comparación entre propiedades

| Propiedad | Educación | Salud | Comercio | Transporte | Seguridad | Áreas verdes | Índice |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Guatemala, zona 10 | 98.54 | 100.00 | 100.00 | 92.18 | 77.87 | 93.29 | **94.54 🟢** |
| Jalapa, zona 1 | 99.71 | 100.00 | 100.00 | 43.92 | 77.44 | 85.67 | **86.71 🟢** |
| Monjas | 77.19 | 77.74 | 90.62 | 0.00 | 53.38 | 45.92 | **61.71 🟡** |
| San Pedro Pinula | 45.66 | 56.59 | 56.53 | 0.00 | 36.71 | 36.82 | **40.94 🟡** |

El índice ordena las propiedades como se esperaría: el centro de la capital, la cabecera departamental y luego los municipios más pequeños.

### 5.4 Cómo se calibraron los parámetros

La primera propuesta (`D0` = 300 m, `R` = 2 km, cantidades de referencia de 2 a 8) daba **verde a las cuatro propiedades** (de 70.1 a 99.9). Ese índice no ayudaba a comparar. Con los parámetros de la sección 4.1 cualquier lugar a más de 100 m empieza a valer menos, y hace falta más oferta para el máximo. Así el rango queda entre 40.9 y 94.5.

---

## 6. Garantía de un mismo criterio para todas las propiedades (RNF-13)

1. **Una sola implementación.** El índice lo calcula únicamente el backend, en el trabajo `calcular-indice`. El frontend nunca lo calcula: solo muestra los valores guardados.
2. **Pesos en la base de datos.** Los pesos viven en `categoria_interes.peso`. Antes de calcular, el trabajo verifica que los pesos de las categorías activas sumen exactamente 1.00. Si no suman 1.00, el cálculo falla y no se guarda nada.
3. **Parámetros versionados.** `D0`, `R`, `α`, `N_c`, los umbrales del semáforo y los tipos de Places son constantes en código, agrupadas bajo la versión del algoritmo (`v1.0`). Cada índice guarda la versión con que se calculó en `indice_conveniencia.version_algoritmo`.
4. **Cualquier cambio crea una versión nueva.** Cambiar un peso o un parámetro obliga a subir la versión (`v1.1`, `v2.0`…) y a encolar el recálculo de **todas** las propiedades publicadas. Mientras dura el recálculo, cada propiedad conserva su índice anterior hasta que se reemplaza. La versión vigente se registra en este documento.
5. **Mismas entradas para todas.** Se usa el mismo radio de consulta (2 km), el mismo radio de cálculo (1.5 km), los mismos tipos de lugar, la distancia en línea recta desde las coordenadas guardadas de la propiedad y la misma fuente (Google Places).
6. **Cuándo se recalcula:**
   - al publicar la propiedad;
   - cuando cambia su ubicación (RF-17);
   - cuando cambia la versión del algoritmo (recálculo masivo);
   - cada 90 días, porque los lugares abren y cierran (propuesta, a confirmar).
7. **Historial reproducible.** El índice anterior queda con `es_vigente = false`. Los lugares usados se guardan en `punto_interes` con su `fecha_consulta`, así cualquier índice se puede volver a calcular y verificar.

---

## 7. Casos especiales

| Caso | Regla |
| --- | --- |
| La propiedad no tiene coordenadas | No se calcula el índice; la ficha muestra que no está disponible. La arquitectura prevé obtener las coordenadas con Geocoding al guardar la ubicación. |
| Una categoría sin lugares | Subpuntaje 0. La categoría no se excluye. |
| Google falla en una o más categorías | El cálculo completo falla y pg-boss lo reintenta. Nunca se guarda un índice parcial, porque una categoría faltante bajaría el puntaje injustamente. La propiedad conserva su índice vigente anterior, si lo tenía. |
| El mismo lugar aparece en dos categorías | Cuenta en ambas, porque cubre dos necesidades distintas (por ejemplo, un supermercado con farmacia). Dentro de una misma categoría se cuenta una sola vez (por `google_place_id`). |
| Lugar cerrado de forma permanente | Se descarta. La implementación debe pedir a Places el campo `businessStatus` y usar solo los lugares con estado `OPERATIONAL`. |
| Propiedad pausada, vendida o alquilada | Conserva su índice; no se recalcula mientras no esté publicada. |

---

## 8. Correspondencia con el modelo de datos

| Tabla.campo | Qué se guarda |
| --- | --- |
| `categoria_interes.nombre` / `icono` / `activa` | Las seis categorías de este documento |
| `categoria_interes.google_place_types` | Los tipos de Places de la sección 2, separados por coma |
| `categoria_interes.peso` | Los pesos de la sección 3 |
| `punto_interes` | Cada lugar a menos de 2 km, con `distancia_m`, `tiempo_estimado_min` (minutos caminando), `radio_consulta_m` = 2000 y `fecha_consulta` |
| `sub_puntaje_categoria.puntaje` | `S_c` |
| `sub_puntaje_categoria.cantidad_puntos` | Lugares a menos de `R` (1.5 km), los que suman al índice |
| `sub_puntaje_categoria.distancia_minima_m` | `d_min` de la categoría (null si no hay lugares) |
| `indice_conveniencia.puntaje_total` | `I` |
| `indice_conveniencia.nivel_semaforo` | `verde`, `amarillo` o `rojo` |
| `indice_conveniencia.radio_m` | 1500 (radio de cálculo `R`) |
| `indice_conveniencia.version_algoritmo` | `v1.0` |

Valores iniciales para el seed de `categoria_interes`:

| nombre | peso | icono |
| --- | --- | --- |
| educacion | 0.20 | graduation-cap |
| salud | 0.20 | heart-pulse |
| comercio | 0.20 | shopping-cart |
| transporte | 0.15 | bus |
| seguridad | 0.15 | shield |
| areas_verdes | 0.10 | trees |

Los iconos coinciden con los que ya usa la ficha (`homescope-web/src/features/indice/config/categorias.js`). Los umbrales del semáforo (70 y 40) coinciden con los del componente `Semaforo.jsx`.

---

## 9. Limitaciones conocidas

- **Transporte con pocos datos.** Google Places casi no tiene paradas de bus registradas en Guatemala fuera de la capital, y no conoce las rutas de microbuses. En la muestra, Monjas y San Pedro Pinula obtienen 0 en transporte aunque sí tienen servicio. Por eso su peso es 0.15 y no mayor. Conviene revisarlo cuando haya más datos.
- **Máximo 20 lugares por categoría.** En zonas muy densas no se ven todos los lugares a 2 km. No afecta al índice, porque la oferta se satura antes (la cantidad de referencia más alta es 15).
- **Distancia en línea recta.** No considera ríos, barrancos ni el trazado real de las calles; el tiempo mostrado en la ficha es solo estimado.
- **Calidad de la clasificación de Google.** Algunos lugares vienen mal clasificados (por ejemplo, una tienda de electrónica como centro comercial).
- **Seguridad es un indicador indirecto.** Mide cercanía a policía y bomberos, no la criminalidad de la zona.
- **Calibración con pocas propiedades.** Los parámetros se ajustaron con cuatro propiedades de prueba. Se deben revisar con propiedades reales antes de pasar a producción; cualquier ajuste se publica como versión nueva (sección 6).

---

## 10. Cómo recalcular el índice

### 10.1 Recálculo automático

En el uso normal no hay que hacer nada. La API encola el trabajo `calcular-indice` en estos casos:

| Acción | Endpoint |
| --- | --- |
| Publicar una propiedad | `POST /propiedades/:id/publicar`, o `PATCH /propiedades/:id/estado` con `publicado` |
| Cambiar la latitud o la longitud de una propiedad publicada | `PUT /propiedades/:id` (la respuesta trae `recalculando_indice: true`) |

El worker de la API procesa el trabajo en segundos y guarda el índice nuevo; el anterior queda en el historial con `es_vigente = false`. Mientras tanto la ficha muestra "Índice en cálculo" y se actualiza sola. Si Google Places falla, pg-boss reintenta hasta 5 veces con espera creciente.

Cambiar solo otros campos (precio, descripción, dirección escrita…) no recalcula, porque el índice depende únicamente de las coordenadas.

### 10.2 Recálculo manual

Se usa cuando cambia la versión del algoritmo (sección 6), cuando se cambian los pesos, para calcular propiedades publicadas antes de que existiera el cálculo automático, o para reemplazar los índices de prueba.

Requisitos:

- La API debe estar corriendo (`npm run dev` en `homescope-api`). El script solo encola los trabajos; el que calcula es el worker de la API.
- La clave `GOOGLE_MAPS_SERVER_KEY` debe estar configurada en `homescope-api/.env`.

Comandos, desde `homescope-api`:

```bash
# Todas las propiedades publicadas que tienen coordenadas
npm run indice:recalcular

# Solo algunas propiedades, por id
npm run indice:recalcular -- 45 47 49
```

El script indica cuántos cálculos encoló y cuáles propiedades omitió porque no están publicadas o no tienen coordenadas. Si una propiedad ya tenía un cálculo pendiente, no se duplica.

**Costo:** cada propiedad hace hasta 6 consultas a Google Places, una por categoría. Las coordenadas consultadas en las últimas 24 horas salen de la caché de la API y no se cobran, pero la caché se borra al reiniciar la API. Antes de un recálculo de todas las propiedades, conviene revisar el presupuesto en Google Cloud.

### 10.3 Cambiar los pesos o los parámetros

1. Actualizar los pesos en `categoria_interes.peso` con una migración nueva. Los de las categorías activas deben sumar exactamente 1.00; si no, el cálculo falla sin guardar nada.
2. Si cambian otros parámetros, editarlos en `homescope-api/src/modules/geo-indice/indice.algoritmo.js`.
3. En los dos casos, subir `VERSION_ALGORITMO` en ese mismo archivo (por ejemplo, de `v1.0` a `v1.1`) y registrar el cambio en este documento.
4. Ejecutar `npm test` y ajustar los resultados esperados de `tests/fixtures/indice-ejemplos.json` si los valores cambian a propósito.
5. Ejecutar `npm run indice:recalcular` para que todas las propiedades queden con la versión nueva (RNF-13).

### 10.4 Verificar el resultado

- En la ficha, el pie del índice muestra la fecha del cálculo y la versión del algoritmo.
- La ficha devuelve `indice_estado`: `calculado`, `en_calculo` o `sin_ubicacion`.
- En la consola de la API aparece una línea por propiedad, por ejemplo `Índice de la propiedad 45: 86.71 (verde)`, o el motivo por el que se omitió.
- En la base de datos se pueden contar los índices vigentes por versión:

```sql
SELECT version_algoritmo, nivel_semaforo, count(*)
FROM indice_conveniencia
WHERE es_vigente
GROUP BY version_algoritmo, nivel_semaforo
ORDER BY 1, 2;
```

### 10.5 Índices de prueba (solo desarrollo)

Para ver el semáforo y el desglose sin gastar consultas a Google, `npm run db:seed:indices-fake` asigna índices ficticios a las propiedades publicadas con coordenadas y sin índice. Se guardan con la versión `fake-v1.0`, que aparece en la ficha, y no tienen puntos de interés guardados. `npm run db:seed:indices-fake -- --reemplazar` los borra y los vuelve a crear.

Al ejecutar `npm run indice:recalcular`, los índices reales reemplazan a los de prueba. Nunca se deben crear índices de prueba en producción.

---

## 11. Dónde está implementado

| Parte | Archivo |
| --- | --- |
| Tablas, índice único parcial y pesos iniciales | `homescope-api/prisma/migrations/20261016120000_indice_conveniencia/` |
| Fórmula y parámetros (funciones puras) | `homescope-api/src/modules/geo-indice/indice.algoritmo.js` |
| Pruebas con los casos de la sección 5.3 | `homescope-api/tests/indice.algoritmo.test.js` |
| Consulta a Google y guardado del cálculo | `geo-indice.service.js` (`calcularYGuardar`) y `geo-indice.repository.js` |
| Cola de trabajos y worker | `homescope-api/src/shared/adapters/jobs.adapter.js` y `src/jobs/` |
| Disparadores al publicar y al cambiar la ubicación | `propiedades.service.js` |
