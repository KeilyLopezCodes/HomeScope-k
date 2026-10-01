import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HomeScope API',
      version: '1.0.0',
      description: 'API REST de la plataforma HomeScope — compra, venta y alquiler de propiedades con Índice de Conveniencia.',
    },
    servers: [{ url: '/api/v1', description: 'Servidor local' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code:    { type: 'string', example: 'CREDENCIALES_INVALIDAS' },
                message: { type: 'string', example: 'Credenciales incorrectas' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
  },
  // Lee los comentarios JSDoc de todos los archivos de rutas
  apis: ['./src/modules/**/*.routes.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
