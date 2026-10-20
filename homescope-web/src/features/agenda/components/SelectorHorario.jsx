import { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './calendario.css';
import { CalendarX2, Clock } from 'lucide-react';
import { Spinner } from '../../../shared/components/ui';
import { useHorarios } from '../hooks/useAgenda';
import { claveDia, diaDeClave, fechaVisita, horaVisita } from '../utils/fechas';

// Calendario con los días que tienen horarios libres y, al elegir un día, sus horas.
// valor: fecha_hora ISO elegida (o null); onChange(fecha_hora | null)
// excluir: fecha_hora que no se ofrece (la hora actual de la visita al reprogramar)
export default function SelectorHorario({ propiedadId, valor, onChange, excluir }) {
  const { data, isPending, isError, refetch } = useHorarios(propiedadId);

  // 'YYYY-MM-DD' → horarios libres de ese día
  const porDia = useMemo(() => new Map((data?.dias ?? [])
    .map((d) => [d.fecha, d.horarios.filter((h) => h.fecha_hora !== excluir)])
    .filter(([, horarios]) => horarios.length)), [data, excluir]);

  const primerDia = porDia.keys().next().value;
  const [dia, setDia] = useState(null);

  // Al cargar, se muestra el primer día con horarios; si el día elegido se quedó sin horarios, también
  useEffect(() => {
    if (!porDia.size) return;
    if (!dia || !porDia.has(dia)) setDia(primerDia);
  }, [porDia]);

  if (isPending) return <Spinner label="Buscando horarios disponibles…" className="py-12" />;
  if (isError) {
    return (
      <p className="py-8 text-center text-sm text-secondary-600">
        No se pudieron cargar los horarios.{' '}
        <button type="button" onClick={() => refetch()} className="font-medium text-primary-600 hover:underline">Reintentar</button>
      </p>
    );
  }
  if (!porDia.size) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <CalendarX2 size={36} strokeWidth={1.5} className="text-secondary-300" aria-hidden="true" />
        <p className="text-sm font-medium text-secondary-700">
          {data.vendedor_tiene_disponibilidad ? 'No hay horarios libres en los próximos 30 días' : 'El vendedor aún no ha publicado sus horarios de visita'}
        </p>
        <p className="max-w-xs text-xs text-secondary-500">Escríbele por mensaje para coordinar otra fecha.</p>
      </div>
    );
  }

  const ultimoDia = [...porDia.keys()].pop();
  const horasDelDia = dia ? porDia.get(dia) ?? [] : [];

  return (
    <div className="grid gap-5 md:grid-cols-[auto_1fr]">
      <Calendar
        className="calendario-visitas"
        locale="es-GT"
        value={dia ? diaDeClave(dia) : null}
        onChange={(fecha) => { setDia(claveDia(fecha)); onChange(null); }}
        minDate={diaDeClave(primerDia)}
        maxDate={diaDeClave(ultimoDia)}
        minDetail="month"
        prev2Label={null}
        next2Label={null}
        tileDisabled={({ date, view }) => view === 'month' && !porDia.has(claveDia(date))}
        tileClassName={({ date, view }) => (view === 'month' && porDia.has(claveDia(date)) ? 'con-horarios' : null)}
      />

      <div className="min-w-0">
        {dia && (
          <>
            <p className="text-sm font-semibold capitalize text-secondary-900">{fechaVisita(horasDelDia[0].fecha_hora)}</p>
            <p className="mb-3 flex items-center gap-1 text-xs text-secondary-500">
              <Clock size={12} aria-hidden="true" /> Hora de Guatemala · cada visita dura 60 minutos
            </p>
            <div role="radiogroup" aria-label="Hora de la visita" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {horasDelDia.map((h) => {
                const elegido = valor === h.fecha_hora;
                return (
                  <button
                    key={h.fecha_hora}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    onClick={() => onChange(h.fecha_hora)}
                    className={[
                      'rounded-md border px-2 py-2 text-sm font-medium tabular-nums transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                      elegido
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-secondary-300 bg-white text-secondary-700 hover:border-primary-400 hover:bg-primary-50',
                    ].join(' ')}
                  >
                    {horaVisita(h.fecha_hora)}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
