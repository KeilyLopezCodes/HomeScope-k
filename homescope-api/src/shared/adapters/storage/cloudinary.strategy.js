import { StoragePort } from '../../ports/index.js';

// Pendiente: implementar con el SDK de Cloudinary (npm i cloudinary).
//   subir    → cloudinary.uploader.upload_stream({ folder: carpeta }) con archivo.buffer
//              y devolver { url: result.secure_url, public_id: result.public_id }
//   eliminar → cloudinary.uploader.destroy(publicId)
// Para activarla: STORAGE_DRIVER=cloudinary y CLOUDINARY_URL en el .env
export class CloudinaryStorageStrategy extends StoragePort {
  constructor({ url }) {
    super();
    this.url = url;
  }

  async subir(_archivo, _carpeta) {
    throw new Error('CloudinaryStorageStrategy aún no está implementada');
  }

  async eliminar(_publicId) {
    throw new Error('CloudinaryStorageStrategy aún no está implementada');
  }
}
