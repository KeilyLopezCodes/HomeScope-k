import { lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, CalendarDays, Eye, Flag, Home, MessageCircle, Star, Users,
} from 'lucide-react';
import { Button, Card, EmptyState, Spinner } from '../../../shared/components/ui';
import { useEstadisticasPlataforma } from '../hooks/useAdmin';
import { ACCIONES, ESTADOS_CUENTA, ESTADOS_PROPIEDAD, Filtros, numero } from '../components/comunes';

// Recharts se descarga solo al abrir esta sección
const GraficaSerieDiaria = lazy(() => import('../../../shared/components/charts/GraficaSerieDiaria'));

const PERIODOS = [7, 30, 90].map((d) => ({ valor: String(d), etiqueta: `${d} días` }));
const METRICAS_SERIE = [
  { clave: 'vistas',               titulo: 'Vistas de publicaciones', forma: 'linea', alto: 150 },
  { clave: 'mensajes',             titulo: 'Mensajes enviados',       forma: 'barra', alto: 90 },
  { clave: 'usuarios_nuevos',      titulo: 'Usuarios nuevos',         forma: 'barra', alto: 90 },
  { clave: 'publicaciones_nuevas', titulo: 'Publicaciones nuevas',    forma: 'barra', alto: 90 },
];
const ROLES = { comprador: 'Compradores', vendedor: 'Vendedores', administrador: 'Administradores', admin: 'Administradores' };
const TIPOS_REPORTE = { propiedad: 'Publicaciones', usuario: 'Usuarios', comentario: 'Comentarios' };
const VISITAS = { solicitada: 'Solicitadas', confirmada: 'Confirmadas', reprogramada: 'Reprogramadas', cancelada: 'Canceladas' };

const fechaLarga = (t) => new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long' }).format(new Date(`${t}T12:00:00`));

function Indicador({ icono: Icono, titulo, valor, detalle, enlace }) {
  const contenido = (
    <>
      <p className="flex items-center gap-1.5 text-xs font-medium text-secondary-500"><Icono size={14} aria-hidden="true" /> {titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-secondary-900">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-secondary-500">{detalle}</p>}
    </>
  );
  return (
    <Card className="p-4">
      {enlace ? <Link to={enlace} className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">{contenido}</Link> : contenido}
    </Card>
  );
}

// Distribución por categoría: barras horizontales con la etiqueta y el valor como texto (no solo color)
function Distribucion({ titulo, datos, etiquetas }) {
  const filas = Object.entries(datos ?? {})
    .map(([clave, valor]) => ({ clave, etiqueta: etiquetas[clave]?.etiqueta ?? etiquetas[clave] ?? clave, valor }))
    .sort((a, b) => b.valor - a.valor);
  const maximo = Math.max(1, ...filas.map((f) => f.valor));
  const total = filas.reduce((s, f) => s + f.valor, 0);
  return (
    <Card className="p-4">
      <h3 className="mb-3 flex items-baseline justify-between text-sm font-semibold text-secondary-900">
        {titulo} <span className="text-xs font-normal tabular-nums text-secondary-500">{numero(total)} en total</span>
      </h3>
      {filas.length === 0 ? <p className="text-sm text-secondary-500">Sin datos en este período.</p> : (
        <ul className="space-y-2">
          {filas.map((f) => (
            <li key={f.clave} className="text-sm">
              <div className="mb-0.5 flex justify-between gap-2">
                <span className="text-secondary-700">{f.etiqueta}</span>
                <span className="font-semibold tabular-nums text-secondary-900">{numero(f.valor)}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary-100" aria-hidden="true">
                <div className="h-2 rounded-full bg-primary-600" style={{ width: `${(f.valor / maximo) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function EstadisticasPlataforma() {
  const [params, setParams] = useSearchParams();
  const dias = ['7', '30', '90'].includes(params.get('dias')) ? params.get('dias') : '30';
  const { data, isPending, isError, refetch, isFetching } = useEstadisticasPlataforma(Number(dias));

  return (
    <section aria-labelledby="titulo-estadisticas" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="titulo-estadisticas" className="text-lg font-semibold text-secondary-900">Estadísticas de la plataforma</h2>
          {data && <p className="text-xs text-secondary-500">Del {fechaLarga(data.periodo.desde)} al {fechaLarga(data.periodo.hasta)}</p>}
        </div>
        <Filtros etiqueta="Período" opciones={PERIODOS} valor={dias} onCambiar={(v) => setParams(v === '30' ? {} : { dias: v }, { replace: true })} />
      </div>

      {isPending ? <div className="flex justify-center py-16"><Spinner /></div>
        : isError ? (
          <EmptyState icon={AlertTriangle} title="No se pudieron cargar las estadísticas"
            action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>} />
        ) : (
          <div className={['space-y-6 transition-opacity', isFetching ? 'opacity-70' : ''].join(' ')}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Indicador icono={Users} titulo="Usuarios" valor={numero(data.usuarios.total)}
                detalle={`${numero(data.usuarios.nuevos)} nuevos en el período`} enlace="/admin/usuarios?vista=todos" />
              <Indicador icono={Home} titulo="Publicaciones activas" valor={numero(data.propiedades.publicadas)}
                detalle={`${numero(data.propiedades.nuevas_publicaciones)} publicadas en el período · ${numero(data.propiedades.total)} en total`} />
              <Indicador icono={Eye} titulo="Vistas" valor={numero(data.actividad.vistas)}
                detalle={`${numero(data.actividad.favoritos)} guardadas en favoritos`} />
              <Indicador icono={MessageCircle} titulo="Mensajes" valor={numero(data.actividad.mensajes)}
                detalle={`${numero(data.actividad.conversaciones)} conversaciones nuevas`} />
              <Indicador icono={CalendarDays} titulo="Visitas solicitadas" valor={numero(data.actividad.visitas_solicitadas)}
                detalle={`${numero(data.actividad.visitas_por_estado.confirmada ?? 0)} confirmadas`} />
              <Indicador icono={Flag} titulo="Reportes abiertos" valor={numero(data.moderacion.reportes_abiertos)}
                detalle={`${numero(data.moderacion.acciones)} acciones de moderación en el período`} enlace="/admin/publicaciones" />
            </div>

            <Card className="p-4 sm:p-6">
              <h3 className="mb-4 text-base font-semibold text-secondary-900">Actividad diaria</h3>
              <Suspense fallback={<div className="flex h-96 items-center justify-center"><Spinner /></div>}>
                <GraficaSerieDiaria serie={data.serie} metricas={METRICAS_SERIE} syncId="plataforma" />
              </Suspense>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Distribucion titulo="Usuarios por rol" datos={data.usuarios.por_rol} etiquetas={ROLES} />
              <Distribucion titulo="Cuentas por estado" datos={data.usuarios.por_estado} etiquetas={ESTADOS_CUENTA} />
              <Distribucion titulo="Publicaciones por estado" datos={data.propiedades.por_estado} etiquetas={ESTADOS_PROPIEDAD} />
              <Distribucion titulo="Visitas solicitadas en el período" datos={data.actividad.visitas_por_estado} etiquetas={VISITAS} />
              <Distribucion titulo="Reportes abiertos por tipo" datos={data.moderacion.reportes_por_tipo} etiquetas={TIPOS_REPORTE} />
              <Distribucion titulo="Acciones de moderación en el período" datos={data.moderacion.acciones_por_tipo} etiquetas={ACCIONES} />
            </div>

            <Card className="flex items-center gap-3 p-4">
              <Star size={20} className="text-warning-500" aria-hidden="true" />
              <p className="text-sm text-secondary-700">
                <span className="font-semibold text-secondary-900">{numero(data.actividad.resenas)}</span> reseñas nuevas en el período ·
                calificación promedio de los vendedores:{' '}
                <span className="font-semibold text-secondary-900">{data.actividad.calificacion_promedio ?? '—'}</span> de 5
              </p>
            </Card>
          </div>
        )}
    </section>
  );
}
