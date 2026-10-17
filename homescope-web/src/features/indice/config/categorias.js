import { Bus, GraduationCap, HeartPulse, Shield, ShoppingCart, Trees } from 'lucide-react';

// Categorías del Índice de Conveniencia (mismas claves que la API). El icono y el color
// identifican la categoría tanto en el mapa como en el listado.
export const CATEGORIAS = {
  educacion:    { nombre: 'Educación',    Icono: GraduationCap, color: '#2563eb' },
  salud:        { nombre: 'Salud',        Icono: HeartPulse,    color: '#dc2626' },
  comercio:     { nombre: 'Comercio',     Icono: ShoppingCart,  color: '#d97706' },
  transporte:   { nombre: 'Transporte',   Icono: Bus,           color: '#7c3aed' },
  seguridad:    { nombre: 'Seguridad',    Icono: Shield,        color: '#334155' },
  areas_verdes: { nombre: 'Áreas verdes', Icono: Trees,         color: '#16a34a' },
};

export const CODIGOS_CATEGORIA = Object.keys(CATEGORIAS);

export const RADIOS = [
  { valor: 500,  etiqueta: '500 m' },
  { valor: 1000, etiqueta: '1 km' },
  { valor: 2000, etiqueta: '2 km' },
];

export function formatearDistancia(metros) {
  return metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toFixed(1)} km`;
}
