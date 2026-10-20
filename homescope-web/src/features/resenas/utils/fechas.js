export const fechaResena = (iso) =>
  new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export const mesYAnio = (iso) =>
  new Intl.DateTimeFormat('es-GT', { month: 'long', year: 'numeric' }).format(new Date(iso));
