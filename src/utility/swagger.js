const swaggerAutogen = require('swagger-autogen');

const doc = {
  info: {
    title: 'Social Network for Music API',
    description: 'API per il sito Social Network for Music',
  },
  host: 'localhost:3000',
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['../server.js'];

swaggerAutogen(outputFile, endpointsFiles, doc).then(async () => {
  await import('../server.js');
});
