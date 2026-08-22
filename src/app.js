import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { api } from './routes/index.js';
import { HttpError } from './utils/httpError.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientOrigin === '*' ? true : env.clientOrigin }));
  app.use(morgan(env.isDev ? 'dev' : 'combined'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(async (req, res, next) => {
    try {
      await connectDb();
      next();
    } catch (error) {
      next(error);
    }
  });
  app.use(
    '/api/auth',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true }),
  );
  app.use('/api', api);

  app.use((_req, _res, next) => {
    next(new HttpError(404, 'Route not found.'));
  });
  app.use(errorHandler);
  return app;
}

const app = createApp();
export default app;
