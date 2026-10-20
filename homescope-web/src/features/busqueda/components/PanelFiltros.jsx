import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../../../shared/components/ui';
import Desplegable from './Desplegable';
import { HABITACIONES, INDICES, MODALIDADES, MONEDAS, TIPOS } from '../config/filtros';
import { formatearRangoPrecio } from './FiltrosActivos';

const COLOR_NIVEL = { verde: 'bg-semaforo-verde', amarillo: 'bg-semaforo-amarillo' };

// Opción de una lista (habitaciones, índice): marca la seleccionada
function Opcion({ seleccionada, onClick, children }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={seleccionada}
      onClick={onClick}
      className={[
        'flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        seleccionada ? 'bg-primary-50 font-medium text-primary-700' : 'text-secondary-700 hover:bg-secondary-50',
      ].join(' ')}
    >
      <span className="flex items-center gap-2">{children}</span>
      {seleccionada && <Check size={14} aria-hidden="true" />}
    </button>
  );
}

function FiltroModalidad({ valor, onCambiar }) {
  const opciones = [{ valor: undefined, etiqueta: 'Todas' }, ...MODALIDADES];
  return (
    <div role="radiogroup" aria-label="Modalidad" className="inline-flex rounded-full border border-secondary-300 bg-white p-0.5">
      {opciones.map((o) => (
        <button
          key={o.etiqueta}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => onCambiar(o.valor)}
          className={[
            'rounded-full px-3 py-1 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            valor === o.valor ? 'bg-primary-600 text-white' : 'text-secondary-600 hover:text-secondary-900',
          ].join(' ')}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

function FiltroTipo({ valor = [], onCambiar }) {
  const resumen = valor.length
    ? `${TIPOS.find((t) => t.valor === valor[0]).etiqueta}${valor.length > 1 ? ` +${valor.length - 1}` : ''}`
    : undefined;

  function alternar(tipo) {
    const nuevo = valor.includes(tipo) ? valor.filter((t) => t !== tipo) : [...valor, tipo];
    onCambiar(nuevo.length ? nuevo : undefined);
  }

  return (
    <Desplegable etiqueta="Tipo" resumen={resumen} activo={valor.length > 0} ancho="w-56">
      {() => (
        <fieldset>
          <legend className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-secondary-500">Tipo de propiedad</legend>
          {TIPOS.map((t) => (
            <label key={t.valor} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-secondary-700 hover:bg-secondary-50">
              <input
                type="checkbox"
                checked={valor.includes(t.valor)}
                onChange={() => alternar(t.valor)}
                className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
              />
              {t.etiqueta}
            </label>
          ))}
        </fieldset>
      )}
    </Desplegable>
  );
}

// Formulario del panel de precio: se aplica con el botón para no buscar con cada dígito
function FormularioPrecio({ inicial, onAplicar, cerrar }) {
  const [moneda, setMoneda] = useState(inicial.moneda ?? 'GTQ');
  const [min, setMin] = useState(inicial.precio_min ?? '');
  const [max, setMax] = useState(inicial.precio_max ?? '');
  const nMin = min === '' ? undefined : Number(min);
  const nMax = max === '' ? undefined : Number(max);
  const error = nMin != null && nMax != null && nMin > nMax ? 'El mínimo no puede ser mayor que el máximo' : null;

  function aplicar(e) {
    e.preventDefault();
    if (error) return;
    const vacio = nMin == null && nMax == null;
    onAplicar({ precio_min: nMin, precio_max: nMax, moneda: vacio ? undefined : moneda });
    cerrar();
  }

  const campo = 'w-full rounded border border-secondary-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <form onSubmit={aplicar} className="space-y-3" noValidate>
      <div>
        <label htmlFor="precio-moneda" className="mb-1 block text-xs font-medium text-secondary-600">Moneda</label>
        <select id="precio-moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)} className={campo}>
          {MONEDAS.map((m) => <option key={m} value={m}>{m === 'GTQ' ? 'Quetzales (Q)' : 'Dólares (US$)'}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="precio-min" className="mb-1 block text-xs font-medium text-secondary-600">Mínimo</label>
          <input id="precio-min" type="number" min="0" step="1000" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Sin mínimo" className={campo} />
        </div>
        <div>
          <label htmlFor="precio-max" className="mb-1 block text-xs font-medium text-secondary-600">Máximo</label>
          <input id="precio-max" type="number" min="0" step="1000" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Sin máximo" className={campo} />
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-danger-600">{error}</p>}
      <p className="text-xs text-secondary-500">Solo incluye propiedades publicadas en esa moneda.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="text" size="sm" onClick={() => { onAplicar({ precio_min: undefined, precio_max: undefined, moneda: undefined }); cerrar(); }}>
          Quitar
        </Button>
        <Button type="submit" size="sm" disabled={Boolean(error)}>Aplicar</Button>
      </div>
    </form>
  );
}

function FiltroPrecio({ filtros, onCambiar }) {
  const activo = filtros.precio_min != null || filtros.precio_max != null;
  return (
    <Desplegable etiqueta="Precio" resumen={activo ? formatearRangoPrecio(filtros) : undefined} activo={activo} ancho="w-72">
      {(cerrar) => <FormularioPrecio inicial={filtros} onAplicar={onCambiar} cerrar={cerrar} />}
    </Desplegable>
  );
}

function FiltroHabitaciones({ valor, onCambiar }) {
  return (
    <Desplegable etiqueta="Habitaciones" resumen={valor ? `${valor}+ hab.` : undefined} activo={valor != null} ancho="w-48">
      {(cerrar) => (
        <div role="menu" aria-label="Habitaciones mínimas">
          <Opcion seleccionada={valor == null} onClick={() => { onCambiar(undefined); cerrar(); }}>Cualquiera</Opcion>
          {HABITACIONES.map((n) => (
            <Opcion key={n} seleccionada={valor === n} onClick={() => { onCambiar(n); cerrar(); }}>
              {n} o más
            </Opcion>
          ))}
        </div>
      )}
    </Desplegable>
  );
}

function FiltroIndice({ valor, onCambiar }) {
  const elegido = INDICES.find((i) => i.valor === valor);
  return (
    <Desplegable etiqueta="Índice" resumen={valor != null ? `Índice ${valor}+` : undefined} activo={valor != null} ancho="w-60">
      {(cerrar) => (
        <div role="menu" aria-label="Índice de Conveniencia mínimo">
          <Opcion seleccionada={valor == null} onClick={() => { onCambiar(undefined); cerrar(); }}>Cualquiera</Opcion>
          {INDICES.map((i) => (
            <Opcion key={i.valor} seleccionada={elegido === i} onClick={() => { onCambiar(i.valor); cerrar(); }}>
              <span aria-hidden="true" className={['h-2.5 w-2.5 rounded-full', COLOR_NIVEL[i.nivel]].join(' ')} />
              {i.etiqueta} <span className="text-xs text-secondary-500">({i.detalle})</span>
            </Opcion>
          ))}
          <p className="mt-2 border-t border-secondary-100 px-2 pt-2 text-xs text-secondary-500">
            Las propiedades con el índice en cálculo no aparecen con este filtro.
          </p>
        </div>
      )}
    </Desplegable>
  );
}

// filtros: los de useFiltrosCatalogo; onCambiar(parcial) los actualiza
export default function PanelFiltros({ filtros, onCambiar }) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros">
      <FiltroModalidad valor={filtros.modalidad} onCambiar={(modalidad) => onCambiar({ modalidad })} />
      <FiltroTipo valor={filtros.tipo} onCambiar={(tipo) => onCambiar({ tipo })} />
      <FiltroPrecio filtros={filtros} onCambiar={onCambiar} />
      <FiltroHabitaciones valor={filtros.habitaciones_min} onCambiar={(habitaciones_min) => onCambiar({ habitaciones_min })} />
      <FiltroIndice valor={filtros.indice_min} onCambiar={(indice_min) => onCambiar({ indice_min })} />
    </div>
  );
}
