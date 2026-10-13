import path from 'node:path';
import { createPublicGateway } from './app';
// Separate entry point for Hostinger. Render continues using dist/server.cjs.
createPublicGateway({
  dist: path.join(process.cwd(), 'dist'),
  backend: 'https://althera.onrender.com',
  publicOrigin: 'https://altherasolutions.com',
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Althera public gateway ready'));
