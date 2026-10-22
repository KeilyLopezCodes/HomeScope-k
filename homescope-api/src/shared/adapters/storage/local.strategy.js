import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { StoragePort } from '../../ports/index.js';

const EXTENSIONES = {
  'image/jpeg':      '.jpg',
  'image/png':       '.png',
  'image/webp':      '.webp',
  'application/pdf': '.pdf',
};
const TIPOS = Object.fromEntries(Object.entries(EXTENSIONES).map(([tipo, ext]) => [ext, tipo]));

// Guarda los archivos en un directorio de este equipo y los sirve en `${baseUrl}/uploads/...`.
// Los privados van a otro directorio que la API no sirve (directorioPrivado)
export class LocalStorageStrategy extends StoragePort {
  constructor({ directorio, directorioPrivado, baseUrl }) {
    super();
    this.raiz        = path.resolve(directorio);
    this.raizPrivada = path.resolve(directorioPrivado);
    this.baseUrl     = baseUrl.replace(/\/$/, '');
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

  async subirPrivado(archivo, carpeta) {
    const ext      = EXTENSIONES[archivo.mimetype] ?? path.extname(archivo.originalname).toLowerCase();
    const publicId = path.posix.join(carpeta, `${crypto.randomUUID()}${ext}`);
    const destino  = this._rutaSegura(publicId, this.raizPrivada);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, archivo.buffer);
    return { public_id: publicId };
  }

  async leerPrivado(publicId) {
    const buffer = await fs.readFile(this._rutaSegura(publicId, this.raizPrivada));
    return { buffer, mimetype: TIPOS[path.extname(publicId).toLowerCase()] ?? 'application/octet-stream' };
  }

  async eliminarPrivado(publicId) {
    try {
      await fs.unlink(this._rutaSegura(publicId, this.raizPrivada));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  // Evita path traversal: la ruta final debe quedar dentro del directorio raíz
  _rutaSegura(publicId, raiz = this.raiz) {
    const ruta = path.resolve(raiz, publicId);
    if (!ruta.startsWith(raiz + path.sep)) throw new Error(`Ruta de archivo inválida: ${publicId}`);
    return ruta;
  }
}
