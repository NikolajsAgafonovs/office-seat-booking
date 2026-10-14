#!/bin/sh
# Container entrypoint (decision 0009): apply migrations on the mounted volume, then serve.
# Release commands cannot do this because they run without the volume.
set -eu
cd /app/server
node ../node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
exec node dist/server.js
