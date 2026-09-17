FROM node:22-alpine

WORKDIR /app

# Avhengigheter først, så laget caches når bare kildekoden endres.
COPY package.json package-lock.json* ./
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/economics/package.json packages/economics/
COPY packages/observability/package.json packages/observability/
COPY packages/queue/package.json packages/queue/
COPY packages/agents/package.json packages/agents/
COPY apps/worker/package.json apps/worker/
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

# TODO(kristian): Fase 6 bør bygge til JS med tsc og kjøre på node direkte.
# tsx i produksjon fungerer, men koster oppstartstid og et ekstra lag.
ENV NODE_ENV=production
CMD ["npm", "run", "worker"]
