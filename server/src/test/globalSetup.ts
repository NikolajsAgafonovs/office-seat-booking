// Builds one SQLite template database by applying the committed migrations; each test file
// copies it. Non-destructive on purpose: the template is a fresh file every run.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const TMP_DIR = path.join(serverRoot, '.tmp');
export const TEMPLATE_DB = path.join(TMP_DIR, 'template.db');

export default function setup(): void {
  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(TMP_DIR, { recursive: true });
  const prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');
  execFileSync(
    process.execPath,
    [prismaCli, 'migrate', 'deploy', '--schema', path.join(serverRoot, 'prisma/schema.prisma')],
    {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: `file:${TEMPLATE_DB.replace(/\\/g, '/')}` },
      stdio: 'pipe',
    },
  );
}
