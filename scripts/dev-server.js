import app from '../src/app.js';
import { connectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';

try {
  await connectDb();
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Job Sensei API listening on http://localhost:${env.port}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
