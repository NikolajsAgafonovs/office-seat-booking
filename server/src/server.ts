// Process entry point: load config, open the database, serve.
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { DevDirectory } from './auth.js';
import { readFloorPlan } from './floorPlan.js';
import { buildApp } from './app.js';

const config = loadConfig();
const app = buildApp({
  config,
  db: createDb(config.databaseUrl),
  directory: new DevDirectory(),
  plan: readFloorPlan(config.floorPlanPath),
  logger: true,
});

app.listen({ port: config.port, host: '0.0.0.0' }).catch((err: unknown) => {
  app.log.error(err);
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    void app.close().then(() => process.exit(0));
  });
}
