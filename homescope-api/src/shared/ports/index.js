// MapsPort — interfaz para Google Maps (Places + Geocoding)
// Implementación en shared/adapters/googleMaps.adapter.js
export class MapsPort {
  /**
   * Lugares cercanos a un punto, del más cercano al más lejano.
   * @param {{ lat: number, lng: number }} origen
   * @param {{ tipos: string[], radio: number, maximo?: number }} opciones  tipos de lugar de Places, radio en metros
   * @returns {Promise<Array<{ place_id: string, nombre: string, direccion: string|null, latitud: number, longitud: number, tipos: string[] }>>}
   */
  async buscarLugaresCercanos(_origen, _opciones) { throw new Error('Not implemented'); }
  async geocodeAddress(_address) { throw new Error('Not implemented'); }
}

// StoragePort — estrategia de almacenamiento de archivos (disco local, Cloudinary…)
// Implementaciones en shared/adapters/storage/
export class StoragePort {
  /**
   * @param {{ buffer: Buffer, mimetype: string, originalname: string, size: number }} archivo
   * @param {string} carpeta  ruta lógica, ej. 'propiedades/12'
   * @returns {Promise<{ url: string, public_id: string }>}
   */
  async subir(_archivo, _carpeta) { throw new Error('Not implemented'); }
  async eliminar(_publicId) { throw new Error('Not implemented'); }

  // Archivos privados (documentos de identidad): no tienen URL pública; solo se leen desde la API
  /** @returns {Promise<{ public_id: string }>} */
  async subirPrivado(_archivo, _carpeta) { throw new Error('Not implemented'); }
  /** @returns {Promise<{ buffer: Buffer, mimetype: string }>} */
  async leerPrivado(_publicId) { throw new Error('Not implemented'); }
  async eliminarPrivado(_publicId) { throw new Error('Not implemented'); }
}

// MailPort — interfaz para SMTP
export class MailPort {
  async send(_to, _subject, _html) { throw new Error('Not implemented'); }
}

// RealtimePort — interfaz para Socket.io
export class RealtimePort {
  async emitToUser(_userId, _event, _data) { throw new Error('Not implemented'); }
  async desconectarUsuario(_userId) { throw new Error('Not implemented'); }
}

// JobPort — interfaz para pg-boss
export class JobPort {
  async enqueue(_jobName, _data) { throw new Error('Not implemented'); }
}
