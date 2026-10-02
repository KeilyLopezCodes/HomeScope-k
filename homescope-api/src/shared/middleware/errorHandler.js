import { ZodError } from 'zod';

export function errorHandler(err, _req, res, _next) {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos.',
        details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      },
    });
  }

  const status = err.status ?? 500;
  res.status(status).json({
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message: err.message ?? 'Error interno del servidor',
      details: err.details ?? [],
    },
  });
}
