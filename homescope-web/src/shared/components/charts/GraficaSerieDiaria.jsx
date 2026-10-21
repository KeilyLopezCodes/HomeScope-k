import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

// Mismos tonos que tailwind.config.js: primary-600 para las marcas, grises para ejes y rejilla
const COLOR_SERIE = '#2563eb';
const COLOR_EJE   = '#6b7280'; // secondary-500
const COLOR_GRID  = '#e5e7eb'; // secondary-200

// 'YYYY-MM-DD' → Date al mediodía local (evita que el cambio de zona horaria mueva el día)
const aFecha = (texto) => new Date(`${texto}T12:00:00`);
const fechaCorta = (texto) => new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short' }).format(aFecha(texto));
const fechaLarga = (texto) => new Intl.DateTimeFormat('es-GT', { weekday: 'long', day: 'numeric', month: 'long' }).format(aFecha(texto));

// Un solo tooltip con todas las métricas del día, aunque el cursor esté en una sola gráfica
function TooltipDia({ active, payload, label, metricas }) {
  if (!active || !payload?.length) return null;
  const dia = payload[0].payload;
  return (
    <div className="rounded border border-secondary-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-secondary-700 first-letter:uppercase">{fechaLarga(label)}</p>
      <ul className="space-y-0.5">
        {metricas.map((m) => (
          <li key={m.clave} className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded" style={{ backgroundColor: COLOR_SERIE }} />
            <span className="font-semibold text-secondary-900 tabular-nums">{dia[m.clave]}</span>
            <span className="text-secondary-500">{m.titulo.toLowerCase()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Pequeños múltiplos de una serie diaria: una gráfica por métrica (escalas muy distintas, p. ej. cientos de
// vistas y pocos favoritos) con el mismo eje de fechas y el cursor sincronizado entre todas.
//   serie:    [{ fecha: 'YYYY-MM-DD', <clave>: número, ... }]
//   metricas: [{ clave, titulo, forma: 'linea' | 'barra', alto }]
export default function GraficaSerieDiaria({ serie, metricas, syncId = 'serie-diaria' }) {
  const intervalo = serie.length > 31 ? Math.ceil(serie.length / 8) : serie.length > 10 ? 4 : 0;
  const totales = Object.fromEntries(metricas.map((m) => [m.clave, serie.reduce((s, d) => s + d[m.clave], 0)]));

  return (
    <div className="space-y-4">
      {metricas.map((m, i) => {
        const ultima = i === metricas.length - 1;
        const Grafica = m.forma === 'linea' ? LineChart : BarChart;
        return (
          <figure key={m.clave}>
            <figcaption className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-secondary-700">{m.titulo}</span>
              <span className="text-xs text-secondary-500 tabular-nums">{totales[m.clave]} en el período</span>
            </figcaption>
            <div style={{ height: m.alto + (ultima ? 24 : 8) }}>
              <ResponsiveContainer width="100%" height="100%">
                <Grafica data={serie} syncId={syncId} margin={{ top: 4, right: 8, bottom: ultima ? 0 : 8, left: -16 }} barCategoryGap={2}>
                  <CartesianGrid vertical={false} stroke={COLOR_GRID} />
                  <XAxis
                    dataKey="fecha"
                    hide={!ultima}
                    tickFormatter={fechaCorta}
                    interval={intervalo}
                    tick={{ fontSize: 11, fill: COLOR_EJE }}
                    tickLine={false}
                    axisLine={{ stroke: COLOR_GRID }}
                    minTickGap={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: COLOR_EJE }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickCount={m.forma === 'linea' ? 4 : 3}
                    interval={0}
                  />
                  <Tooltip
                    content={<TooltipDia metricas={metricas} />}
                    cursor={m.forma === 'linea' ? { stroke: COLOR_EJE, strokeWidth: 1 } : { fill: 'rgba(37, 99, 235, 0.08)' }}
                    isAnimationActive={false}
                  />
                  {m.forma === 'linea' ? (
                    <Line
                      type="linear" dataKey={m.clave} name={m.titulo}
                      stroke={COLOR_SERIE} strokeWidth={2} dot={false}
                      activeDot={{ r: 4, stroke: '#ffffff', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  ) : (
                    <Bar dataKey={m.clave} name={m.titulo} fill={COLOR_SERIE} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
                  )}
                </Grafica>
              </ResponsiveContainer>
            </div>
          </figure>
        );
      })}

      {/* Los mismos datos sin depender del cursor */}
      <details className="text-sm">
        <summary className="cursor-pointer text-primary-600 hover:text-primary-700">Ver los datos por día</summary>
        <div className="mt-2 max-h-72 overflow-auto rounded border border-secondary-200">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-secondary-50 text-secondary-600">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">Día</th>
                {metricas.map((m) => <th key={m.clave} scope="col" className="px-3 py-2 text-right font-medium">{m.titulo}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {[...serie].reverse().map((d) => (
                <tr key={d.fecha}>
                  <th scope="row" className="px-3 py-1.5 text-left font-normal text-secondary-700">{fechaCorta(d.fecha)}</th>
                  {metricas.map((m) => <td key={m.clave} className="px-3 py-1.5 text-right tabular-nums">{d[m.clave]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
