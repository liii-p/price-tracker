#!/bin/sh
set -e

# Create the database or apply any new migrations, then start the app.
node_modules/.bin/prisma migrate deploy
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
