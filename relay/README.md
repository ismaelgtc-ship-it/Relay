# relay (Render account 1)

This repo contains **two** deployable services for Render (monorepo-style):

- `services/gateway` — control-plane API (Express, no Discord logic)
- `services/relay` — Discord realtime bot (discord.js)

Render supports selecting a **Root Directory** per service, so you can deploy:
- Gateway: root dir `services/gateway`
- Relay: root dir `services/relay`

## Environment

### Gateway
Create `services/gateway/.env` from `.env.example`.

### Relay
Create `services/relay/.env` from `.env.example`.

## Local dev (optional)
From each service folder:
```bash
npm i
npm run dev
```
