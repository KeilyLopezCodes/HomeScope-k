import multer from 'multer';
import { AppError } from '../errors/AppError.js';

// Recibe archivos multipart en memoria (req.files) y valida tipo, tamaño y cantidad.
// El guardado definitivo lo hace el servicio a través de la estrategia de storage.
export function subirArchivos(campo, { maxArchivos, maxBytes, tipos }) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: maxBytes, files: maxArchivos },
    fileFilter: (_req, archivo, cb) => {
      if (tipos.includes(archivo.mimetype)) return cb(null, true);
      cb(new AppError(
        'TIPO_ARCHIVO_INVALIDO',
        `"${archivo.originalname}" no es un formato permitido (${tipos.join(', ')})`,
        422
      ));
    },
  }).array(campo, maxArchivos);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (!err) return next();
      if (err instanceof AppError) return next(err);
      if (err instanceof multer.MulterError) {
        const mb = (maxBytes / (1024 * 1024)).toFixed(0);
        const errores = {
          LIMIT_FILE_SIZE:       new AppError('ARCHIVO_MUY_GRANDE', `Cada archivo debe pesar como máximo ${mb} MB`, 413),
          LIMIT_FILE_COUNT:      new AppError('DEMASIADOS_ARCHIVOS', `Máximo ${maxArchivos} archivos por solicitud`, 422),
          LIMIT_UNEXPECTED_FILE: new AppError('CAMPO_INVALIDO', `Los archivos deben enviarse en el campo "${campo}"`, 422),
        };
        return next(errores[err.code] ?? new AppError('ERROR_CARGA', err.message, 400));
      }
      next(err);
    });
  };
}
