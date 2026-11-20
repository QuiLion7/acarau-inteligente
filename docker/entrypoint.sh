#!/bin/sh
# Migra o banco e só então inicia o servidor; se a migração falhar, o container para.
set -e
node scripts/migrar.mjs
exec node server.js
