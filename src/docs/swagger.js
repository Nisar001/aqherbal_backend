import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'AQ Herbal E-commerce API',
      version: '1.0.0',
      description: 'API documentation for the Herbal Medicine E-commerce backend'
    },
    servers: [
      { url: '/api/v1' }
    ]
  },
  apis: ['src/modules/**/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
export const setupSwagger = (app) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
