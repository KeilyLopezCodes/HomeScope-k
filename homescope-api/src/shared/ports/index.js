// MapsPort — interfaz para Google Maps (Places + Geocoding)
export class MapsPort {
  async getNearbyPlaces(_lat, _lng, _categoryId) { throw new Error('Not implemented'); }
  async geocodeAddress(_address) { throw new Error('Not implemented'); }
}

// StoragePort — interfaz para Cloudinary
export class StoragePort {
  async signUpload(_folder) { throw new Error('Not implemented'); }
  async deleteFile(_publicId) { throw new Error('Not implemented'); }
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
