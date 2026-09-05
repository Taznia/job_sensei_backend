/**
 * One-off migration for the Application Tracker.
 *
 * `Application.jobId` used to be required, with a plain unique index on
 * `{ jobId, userId }`. Tracked applications have no jobId, and MongoDB treats
 * every missing jobId as the same value — so without this change a user could
 * only ever track one manual application before hitting a duplicate-key error.
 *
 * The replacement index keeps the original guarantee ("one application per job
 * per user") for job-board applications, and simply does not apply to tracked
 * ones. MongoDB will not alter an existing index in place, so the old one has
 * to be dropped first.
 *
 * Safe to run more than once, and it touches no documents.
 *
 *   node scripts/migrate-application-index.js
 */

import mongoose from 'mongoose';

import { env } from '../src/config/env.js';

const OLD_INDEX = 'jobId_1_userId_1';
const NEW_INDEX = 'jobId_1_userId_1_partial';

async function main() {
  if (!env.mongoUri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;

  // On a fresh database the collection does not exist yet, and asking it for
  // its indexes throws "ns does not exist". Nothing to migrate in that case:
  // Mongoose builds the correct index the first time a document is written.
  const present = await db.listCollections({ name: 'applications' }).toArray();
  if (present.length === 0) {
    console.log('No applications collection yet — nothing to migrate.');
    await mongoose.disconnect();
    return;
  }

  const collection = db.collection('applications');

  const existing = await collection.indexes();
  const names = existing.map((index) => index.name);
  console.log('Existing indexes:', names.join(', '));

  if (names.includes(OLD_INDEX)) {
    await collection.dropIndex(OLD_INDEX);
    console.log(`Dropped old index: ${OLD_INDEX}`);
  } else {
    console.log(`Old index ${OLD_INDEX} not present — nothing to drop.`);
  }

  if (!names.includes(NEW_INDEX)) {
    await collection.createIndex(
      { jobId: 1, userId: 1 },
      {
        unique: true,
        partialFilterExpression: { jobId: { $type: 'objectId' } },
        name: NEW_INDEX,
      },
    );
    console.log(`Created partial index: ${NEW_INDEX}`);
  } else {
    console.log(`Partial index ${NEW_INDEX} already present.`);
  }

  await collection.createIndex({ userId: 1, createdAt: -1 });
  console.log('Ensured index: userId_1_createdAt_-1');

  console.log('\nFinal indexes:', (await collection.indexes()).map((i) => i.name).join(', '));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
