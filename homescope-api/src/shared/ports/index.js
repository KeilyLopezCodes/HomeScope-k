// MapsPort — interfaz para Google Maps (Places + Geocoding)
export class MapsPort {
  async getNearbyPlaces(_lat, _lng, _categoryId) { throw new Error('Not implemented'); }
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
}

// MailPort — interfaz para SMTP
export class MailPort {
  async send(_to, _subject, _html) { throw new Error('Not implemented'); }
}

// RealtimePort — interfaz para Socket.io
export class RealtimePort {
  async emitToUser(_userId, _event, _data) { throw new Error('Not implemented'); }
}

// JobPort — interfaz para pg-boss
export class JobPort {
  async enqueue(_jobName, _data) { throw new Error('Not implemented'); }
}
