import mongoose from 'mongoose';

import { env } from './env.js';

const globalForMongo = globalThis;

function atlasHint(error) {
  const message = String(error?.message || error);
  const tlsFailure =
    message.includes('SSL') ||
    message.includes('tlsv1') ||
    message.includes('TLS') ||
    error?.reason?.type === 'ReplicaSetNoPrimary';

  if (!tlsFailure) return error;

  const wrapped = new Error(
    'MongoDB Atlas TLS handshake failed. On Windows/Node 22 this is usually IPv6 or Network Access. ' +
      'In Atlas: Network Access → add your current IP (or 0.0.0.0/0 for local dev). ' +
      'Also confirm the database user password in MONGODB_URI.',
  );
  wrapped.cause = error;
  return wrapped;
}

function resetMongoPromise() {
  globalForMongo.__jobsenseiMongoPromise = null;
  globalForMongo.__jobsenseiMongoLogged = false;
}

export async function connectDb() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is required. Use a MongoDB Atlas connection string.');
  }

  if (!globalForMongo.__jobsenseiMongoListeners) {
    globalForMongo.__jobsenseiMongoListeners = true;
    mongoose.connection.on('disconnected', resetMongoPromise);
    mongoose.connection.on('error', resetMongoPromise);
  }

  if (!globalForMongo.__jobsenseiMongoPromise) {
    mongoose.set('strictQuery', true);
    globalForMongo.__jobsenseiMongoPromise = mongoose
      .connect(env.mongoUri, {
        serverSelectionTimeoutMS: 15000,
        bufferCommands: false,
        family: 4,
        autoSelectFamily: false,
      })
      .catch((error) => {
        resetMongoPromise();
        throw atlasHint(error);
      });
  }

  await globalForMongo.__jobsenseiMongoPromise;
  if (!globalForMongo.__jobsenseiMongoLogged) {
    globalForMongo.__jobsenseiMongoLogged = true;
    console.log('MongoDB connected');
  }
  return mongoose.connection;
}
