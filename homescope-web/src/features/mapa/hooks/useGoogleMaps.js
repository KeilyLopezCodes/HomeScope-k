import { useEffect, useState } from 'react';
import { cargarGoogleMaps } from '../services/googleMaps';

// { maps, error }: maps queda en null mientras carga el script
export function useGoogleMaps() {
  const [estado, setEstado] = useState({ maps: null, error: null });

  useEffect(() => {
    let activo = true;
    cargarGoogleMaps()
      .then((maps) => activo && setEstado({ maps, error: null }))
      .catch((error) => activo && setEstado({ maps: null, error }));
    return () => { activo = false; };
  }, []);

  return estado;
}
