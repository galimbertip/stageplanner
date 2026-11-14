#!/bin/sh
# GPverse — controlla che la versione sia la stessa in app, service worker, manifest e changelog
V=$(grep -o "version: 'V[0-9.]*'" js/core.js | grep -o 'V[0-9.]*')
echo "APP.version: $V"
grep -q "gpverse-stageplanner-$V'" sw.js && echo "sw.js ok" || echo "sw.js DA AGGIORNARE"
grep -q "\"version\": \"${V#V}\"" manifest.webmanifest && echo "manifest ok" || echo "manifest DA AGGIORNARE"
grep -q "^## $V " CHANGELOG.md && echo "CHANGELOG.md ok" || echo "CHANGELOG.md DA AGGIORNARE"
