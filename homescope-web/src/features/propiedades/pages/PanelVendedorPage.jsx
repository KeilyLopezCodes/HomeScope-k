import { lazy, Suspense } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, Eye, Heart, Info, Lightbulb, MessageCircle, Percent, Plus,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Select, Spinner } from '../../../shared/components/ui';
import { useEstadisticasVendedor } from '../hooks/useEstadisticasVendedor';

// Recharts es pesado: se descarga solo al abrir el panel
const GraficaInteres = lazy(() => import('../components/GraficaInteres'));

const PERIODOS = [7, 30, 90];

const ESTADOS = {
  publicado: 'Publicada',
  pausado:   'Pausada',
  vendido:   'Vendida',
  alquilado: 'Alquilada',
};

// El desempeño siempre lleva texto (e ícono cuando es un aviso), nunca solo color
const DESEMPENO = {
  bajo:    { etiqueta: 'Bajo desempeño', variant: 'danger', icono: AlertTriangle },
  normal:  { etiqueta: 'Normal',         variant: 'success' },
  nueva:   { etiqueta: 'Recién publicada', variant: 'default' },
  pausada: { etiqueta: 'Pausada',        variant: 'warning' },
  cerrada: { etiqueta: 'Cerrada',        variant: 'primary' },
};

const NIVEL = {
  alerta:  { icono: AlertTriangle, clase: 'text-danger-600' },
  consejo: { icono: Lightbulb,     clase: 'text-warning-600' },
  info:    { icono: Info,          clase: 'text-secondary-500' },
};

const numero = (n) => new Intl.NumberFormat('es-GT').format(n);
const porcentaje = (n) => (n == null ? '—' : `${new Intl.NumberFormat('es-GT', { maximumFractionDigits: 1 }).format(n)} %`);
const fechaLarga = (texto) => new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long' }).format(new Date(`${texto}T12:00:00`));

function Indicador({ icono: Icono, titulo, valor, detalle }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-secondary-500">
        <Icono size={14} aria-hidden="true" /> {titulo}
      </p>
      <p className="mt-1 text-2xl font-bold text-secondary-900 tabular-nums">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-secondary-500">{detalle}</p>}
    </Card>
  );
}

function BadgeDesempeno({ desempeno }) {
  const d = DESEMPENO[desempeno] ?? { etiqueta: desempeno, variant: 'default' };
  return (
    <Badge variant={d.variant} className="whitespace-nowrap">
      {d.icono && <d.icono size={12} aria-hidden="true" />} {d.etiqueta}
    </Badge>
  );
}

function ListaSugerencias({ sugerencias }) {
  return (
    <ul className="space-y-1.5">
      {sugerencias.map((s) => {
        const { icono: Icono, clase } = NIVEL[s.nivel] ?? NIVEL.info;
        return (
          <li key={s.codigo} className="flex items-start gap-2 text-sm text-secondary-700">
            <Icono size={16} className={`mt-0.5 shrink-0 ${clase}`} aria-hidden="true" />
            <span>{s.mensaje}</span>
          </li>
        );
      })}
    </ul>
  );
}

// Propiedades con bajo desempeño o con avisos (mensajes sin leer, por vencer), primero las de bajo desempeño
function Sugerencias({ propiedades, dias }) {
  const conAvisos = propiedades
    .filter((p) => p.desempeno === 'bajo' || p.sugerencias.some((s) => s.nivel === 'alerta'))
    .sort((a, b) => (b.desempeno === 'bajo') - (a.desempeno === 'bajo'));

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-secondary-900">
        <Lightbulb size={18} className="text-warning-600" aria-hidden="true" /> Sugerencias
      </h2>
      {conAvisos.length === 0 ? (
        <p className="text-sm text-secondary-500">Todo en orden: ninguna propiedad tuvo bajo desempeño en los últimos {dias} días.</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-secondary-500">
            Propiedades que necesitan atención según su actividad de los últimos {dias} días.
          </p>
          <ul className="divide-y divide-secondary-100">
            {conAvisos.map((p) => (
              <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/propiedades/${p.id}`} className="font-medium text-secondary-900 hover:text-primary-700 break-words">
                    {p.titulo}
                  </Link>
                  <BadgeDesempeno desempeno={p.desempeno} />
                </div>
                <ListaSugerencias sugerencias={p.sugerencias} />
                {['publicado', 'pausado'].includes(p.estado) && p.sugerencias.some((s) => s.nivel === 'consejo') && (
                  <Link to={`/mis-propiedades/${p.id}/editar`} className="mt-2 inline-block text-sm text-primary-600 hover:text-primary-700">
                    Editar la propiedad →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

// Tabla en pantallas medianas y grandes, tarjetas en móvil
function RendimientoPorPropiedad({ propiedades, onElegir }) {
  const metricas = (p) => [
    ['Vistas', numero(p.metricas.vistas)],
    ['Favoritos', numero(p.metricas.favoritos)],
    ['Mensajes', numero(p.metricas.mensajes)],
    ['Interés', porcentaje(p.metricas.tasa_interes)],
  ];

  return (
    <Card className="overflow-hidden">
      <h2 className="px-4 pt-4 text-base font-semibold text-secondary-900 sm:px-6">Rendimiento por propiedad</h2>
      <p className="px-4 pb-3 text-xs text-secondary-500 sm:px-6">
        Interés: porcentaje de las vistas que terminaron en un favorito o en un primer mensaje. Elige una propiedad para ver solo su gráfica.
      </p>

      <table className="hidden w-full text-sm md:table">
        <thead className="border-y border-secondary-200 bg-secondary-50 text-xs text-secondary-600">
          <tr>
            <th scope="col" className="px-6 py-2 text-left font-medium">Propiedad</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Vistas</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Favoritos</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Mensajes</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Interés</th>
            <th scope="col" className="px-6 py-2 text-left font-medium">Desempeño</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-100">
          {propiedades.map((p) => (
            <tr key={p.id} className="hover:bg-secondary-50">
              <th scope="row" className="px-6 py-2.5 text-left font-normal">
                <button
                  type="button"
                  onClick={() => onElegir(p.id)}
                  className="text-left font-medium text-secondary-900 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                >
                  {p.titulo}
                </button>
                <span className="block text-xs text-secondary-500">{ESTADOS[p.estado] ?? p.estado}</span>
              </th>
              {metricas(p).map(([nombre, valor]) => (
                <td key={nombre} className="px-3 py-2.5 text-right tabular-nums text-secondary-800">{valor}</td>
              ))}
              <td className="px-6 py-2.5"><BadgeDesempeno desempeno={p.desempeno} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-secondary-100 border-t border-secondary-200 md:hidden">
        {propiedades.map((p) => (
          <li key={p.id} className="px-4 py-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <button type="button" onClick={() => onElegir(p.id)} className="text-left font-medium text-secondary-900 break-words">
                {p.titulo}
                <span className="block text-xs font-normal text-secondary-500">{ESTADOS[p.estado] ?? p.estado}</span>
              </button>
              <BadgeDesempeno desempeno={p.desempeno} />
            </div>
            <dl className="grid grid-cols-4 gap-2 text-center">
              {metricas(p).map(([nombre, valor]) => (
                <div key={nombre}>
                  <dt className="text-[11px] text-secondary-500">{nombre}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-secondary-900">{valor}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function PanelVendedorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dias = PERIODOS.includes(Number(searchParams.get('dias'))) ? Number(searchParams.get('dias')) : 30;
  const propiedadId = Number(searchParams.get('propiedad')) || null;

  const estadisticas = useEstadisticasVendedor({ dias, propiedadId });
  // La lista completa del período alimenta el selector de propiedad (es la misma consulta sin filtro, en caché)
  const general = useEstadisticasVendedor({ dias, enabled: Boolean(propiedadId) });
  const opciones = (propiedadId ? general.data : estadisticas.data)?.propiedades ?? [];

  function filtrar(cambios) {
    const params = new URLSearchParams(searchParams);
    Object.entries(cambios).forEach(([clave, valor]) => (valor ? params.set(clave, valor) : params.delete(clave)));
    if (params.get('dias') === '30') params.delete('dias');
    setSearchParams(params, { replace: true });
  }

  const { data, isPending, isError, error, isFetching, refetch } = estadisticas;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Panel del vendedor</h1>
        <p className="text-sm text-secondary-500">Cuánto interés generan tus propiedades: vistas, favoritos y mensajes de los interesados.</p>
      </div>

      {/* Filtros: aplican a todo lo de abajo */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div role="group" aria-label="Período" className="inline-flex self-start rounded border border-secondary-200 bg-white p-0.5">
          {PERIODOS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={p === dias}
              onClick={() => filtrar({ dias: String(p) })}
              className={[
                'rounded px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                p === dias ? 'bg-primary-600 text-white' : 'text-secondary-600 hover:bg-secondary-100',
              ].join(' ')}
            >
              {p} días
            </button>
          ))}
        </div>
        <div className="sm:w-80">
          <Select
            id="panel-propiedad"
            label="Propiedad"
            value={propiedadId ?? ''}
            onChange={(e) => filtrar({ propiedad: e.target.value })}
          >
            <option value="">Todas mis propiedades</option>
            {opciones.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
          </Select>
        </div>
      </div>

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        error?.status === 404 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Esa propiedad no está entre tus publicaciones"
            action={<Button variant="secondary" onClick={() => filtrar({ propiedad: null })}>Ver todas mis propiedades</Button>}
          />
        ) : (
          <EmptyState
            icon={AlertTriangle}
            title="No se pudieron cargar las estadísticas"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}
          />
        )
      ) : data.propiedades.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Aún no hay estadísticas"
          description="Cuando publiques una propiedad verás aquí cuántas personas la ven, la guardan y te escriben."
          action={<Button onClick={() => navigate('/publicar')}><Plus size={16} aria-hidden="true" /> Publicar propiedad</Button>}
        />
      ) : (
        <div className={['space-y-6 transition-opacity', isFetching ? 'opacity-70' : ''].join(' ')}>
          <section aria-label="Resumen del período" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador icono={Eye} titulo="Vistas" valor={numero(data.resumen.vistas)} />
            <Indicador icono={Heart} titulo="Favoritos" valor={numero(data.resumen.favoritos)} detalle="Nuevos en el período" />
            <Indicador
              icono={MessageCircle} titulo="Mensajes" valor={numero(data.resumen.mensajes)}
              detalle={`De ${numero(data.resumen.contactos)} ${data.resumen.contactos === 1 ? 'interesado' : 'interesados'}`}
            />
            <Indicador icono={Percent} titulo="Tasa de interés" valor={porcentaje(data.resumen.tasa_interes)} detalle="Vistas que terminaron en favorito o mensaje" />
          </section>

          <Card className="p-4 sm:p-6">
            <h2 className="text-base font-semibold text-secondary-900">Interés a lo largo del tiempo</h2>
            <p className="mb-4 text-xs text-secondary-500">
              Del {fechaLarga(data.periodo.desde)} al {fechaLarga(data.periodo.hasta)}
              {propiedadId && data.propiedades[0] ? ` · ${data.propiedades[0].titulo}` : ' · todas tus propiedades'}
            </p>
            <Suspense fallback={<div className="flex h-96 items-center justify-center"><Spinner /></div>}>
              <GraficaInteres serie={data.serie} />
            </Suspense>
          </Card>

          <Sugerencias propiedades={data.propiedades} dias={dias} />

          <RendimientoPorPropiedad
            propiedades={data.propiedades}
            onElegir={(id) => { filtrar({ propiedad: String(id) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        </div>
      )}
    </div>
  );
}
