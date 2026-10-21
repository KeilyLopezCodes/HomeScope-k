import GraficaSerieDiaria from '../../../shared/components/charts/GraficaSerieDiaria';

// Interés en las propiedades del vendedor: vistas, favoritos y mensajes por día
const METRICAS = [
  { clave: 'vistas',    titulo: 'Vistas',                forma: 'linea', alto: 160 },
  { clave: 'favoritos', titulo: 'Guardada en favoritos', forma: 'barra', alto: 100 },
  { clave: 'mensajes',  titulo: 'Mensajes recibidos',    forma: 'barra', alto: 100 },
];

export default function GraficaInteres({ serie }) {
  return <GraficaSerieDiaria serie={serie} metricas={METRICAS} syncId="interes" />;
}
