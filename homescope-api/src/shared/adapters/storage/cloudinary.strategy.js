import { StoragePort } from '../../ports/index.js';

// Pendiente: implementar con el SDK de Cloudinary (npm i cloudinary).
//   subir    → cloudinary.uploader.upload_stream({ folder: carpeta }) con archivo.buffer
//              y devolver { url: result.secure_url, public_id: result.public_id }
//   eliminar → cloudinary.uploader.destroy(publicId)
//   subirPrivado / leerPrivado / eliminarPrivado → recursos con type: 'authenticated'
//              (arquitectura: documentos de verificación como recursos privados)
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

  // Transformación de entrega en la URL: https://res.cloudinary.com/<nube>/image/upload/f_auto,q_auto,c_limit,w_1600/…
  // c_limit: reduce al ancho máximo sin agrandar las imágenes más pequeñas
  urlOptimizada(url, { anchoMaximo }) {
    if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url ?? '')) return url;
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${anchoMaximo}/`);
  }

  async subirPrivado(_archivo, _carpeta) {
    throw new Error('CloudinaryStorageStrategy aún no está implementada');
  }

  async leerPrivado(_publicId) {
    throw new Error('CloudinaryStorageStrategy aún no está implementada');
  }

  async eliminarPrivado(_publicId) {
    throw new Error('CloudinaryStorageStrategy aún no está implementada');
  }
}
