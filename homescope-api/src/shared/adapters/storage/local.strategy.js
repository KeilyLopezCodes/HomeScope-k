import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { StoragePort } from '../../ports/index.js';

const EXTENSIONES = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
};

// Guarda los archivos en un directorio de este equipo y los sirve en `${baseUrl}/uploads/...`
export class LocalStorageStrategy extends StoragePort {
  constructor({ directorio, baseUrl }) {
    super();
    this.raiz    = path.resolve(directorio);
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async subir(archivo, carpeta) {
    const ext      = EXTENSIONES[archivo.mimetype] ?? path.extname(archivo.originalname).toLowerCase();
    const publicId = path.posix.join(carpeta, `${crypto.randomUUID()}${ext}`);
    const destino  = this._rutaSegura(publicId);

    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, archivo.buffer);

    return { url: `${this.baseUrl}/uploads/${publicId}`, public_id: publicId };
  }

  async eliminar(publicId) {
    try {
      await fs.unlink(this._rutaSegura(publicId));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err; // ya no existe → nada que hacer
    }
  }

  // Evita path traversal: la ruta final debe quedar dentro del directorio raíz
  _rutaSegura(publicId) {
    const ruta = path.resolve(this.raiz, publicId);
    if (!ruta.startsWith(this.raiz + path.sep)) throw new Error(`Ruta de archivo inválida: ${publicId}`);
    return ruta;
  }
}
