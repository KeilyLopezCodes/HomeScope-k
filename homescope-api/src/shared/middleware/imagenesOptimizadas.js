import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

// Imágenes optimizadas para el almacenamiento local (el equivalente de las transformaciones de Cloudinary):
//   /uploads/propiedades/12/foto.jpg?w=1600&f=auto&q=auto
//   w      ancho máximo en px (no agranda las más pequeñas)
//   f=auto WebP si el navegador lo acepta; si no, JPEG
//   q=auto calidad automática (75)
// El resultado se guarda en `${raiz}/.optimizadas/` y se reutiliza. Sin esos parámetros sigue al
// siguiente middleware (express.static sirve el original).
const ANCHO_MAXIMO = 2400;
const CALIDAD_AUTO = 75;
const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function imagenesOptimizadas(raiz) {
  const raizAbsoluta = path.resolve(raiz);
  const cache = path.join(raizAbsoluta, '.optimizadas');

  return async (req, res, next) => {
    const { w, f, q } = req.query;
    if (!w && !f && !q) return next();

    const relativa = decodeURIComponent(req.path).replace(/^\/+/, '');
    const original = path.resolve(raizAbsoluta, relativa);
    // Dentro del directorio de subidas (sin path traversal), solo imágenes y nunca la propia caché
    if (!original.startsWith(raizAbsoluta + path.sep) || original.startsWith(cache + path.sep)
      || !EXTENSIONES.has(path.extname(original).toLowerCase())) return next();

    const ancho = Math.min(Math.max(parseInt(w) || ANCHO_MAXIMO, 1), ANCHO_MAXIMO);
    const calidad = q && q !== 'auto' ? Math.min(Math.max(parseInt(q) || CALIDAD_AUTO, 30), 95) : CALIDAD_AUTO;
    const webp = f === 'webp' || (f === 'auto' && /image\/webp/.test(req.get('accept') ?? ''));
    const formato = webp ? 'webp' : 'jpeg';

    try {
      const { mtimeMs } = await fs.stat(original);
      const clave = crypto.createHash('sha1').update(`${relativa}|${mtimeMs}|${ancho}|${calidad}|${formato}`).digest('hex');
      const destino = path.join(cache, `${clave}.${formato}`);

      let buffer = await fs.readFile(destino).catch(() => null);
      if (!buffer) {
        buffer = await sharp(original)
          .rotate() // respeta la orientación EXIF de las fotos de celular
          .resize({ width: ancho, withoutEnlargement: true })
          .toFormat(formato, { quality: calidad })
          .toBuffer();
        await fs.mkdir(cache, { recursive: true });
        await fs.writeFile(destino, buffer);
      }

      res.set({
        'Content-Type': `image/${formato}`,
        'Cache-Control': 'public, max-age=86400',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        ...(f === 'auto' && { Vary: 'Accept' }),
      }).send(buffer);
    } catch (err) {
      if (err.code === 'ENOENT') return next(); // no existe: el 404 lo da express.static
      next(err);
    }
  };
}
