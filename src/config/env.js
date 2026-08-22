import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri:
    process.env.MONGODB_URI ||
    (process.env.VERCEL ? '' : 'mongodb://127.0.0.1:27017/jobsensei'),
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
  isDev: !isProd,
  isVercel: Boolean(process.env.VERCEL),
};

if (isProd && !env.jwtSecret) {
  console.warn('JWT_SECRET is not set. Set it in the Vercel project environment variables.');
}
