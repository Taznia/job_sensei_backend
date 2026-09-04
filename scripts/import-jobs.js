/**
 * CLI for the Module 2 job import.
 *
 *   npm run import:jobs                      both boards, 40 each
 *   npm run import:jobs -- --limit 10        fewer per board
 *   npm run import:jobs -- --source remotive one board only
 *
 * Useful for seeding real listings without going through Postman.
 */
import mongoose from 'mongoose';

import { connectDb } from '../src/config/db.js';
import { IMPORT_SOURCES, importJobs } from '../src/services/jobImport.service.js';

function parseArgs(argv) {
  const opts = { sources: [...IMPORT_SOURCES], limit: 40 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit') opts.limit = Number(argv[++i]);
    else if (argv[i] === '--source') opts.sources = [argv[++i]];
  }
  const unknown = opts.sources.filter((s) => !IMPORT_SOURCES.includes(s));
  if (unknown.length) {
    throw new Error(
      `Unknown source "${unknown[0]}". Available: ${IMPORT_SOURCES.join(', ')}`,
    );
  }
  return opts;
}

try {
  const opts = parseArgs(process.argv.slice(2));
  await connectDb();
  console.log(`Importing up to ${opts.limit} jobs from: ${opts.sources.join(', ')}`);

  const result = await importJobs(opts);

  for (const s of result.sources) {
    console.log(
      s.ok
        ? `  ${s.source.padEnd(10)} fetched ${s.fetched}, created ${s.created}, updated ${s.updated}, skipped ${s.skipped}  (${s.ms}ms)`
        : `  ${s.source.padEnd(10)} FAILED: ${s.error}`,
    );
  }
  const t = result.totals;
  console.log(`\nTotal: ${t.created} created, ${t.updated} updated, ${t.skipped} skipped.`);

  await mongoose.disconnect();
} catch (error) {
  console.error(`\nImport failed: ${error.message}\n`);
  process.exitCode = 1;
  await mongoose.disconnect().catch(() => {});
}
