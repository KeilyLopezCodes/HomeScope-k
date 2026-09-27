export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? 500;
  res.status(status).json({
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message: err.message ?? 'Error interno del servidor',
      details: err.details ?? [],
    },
  });
}
