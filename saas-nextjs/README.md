# myvoice web (Next.js)

Next.js App Router frontend for **myvoice**.

## Dev

```bash
cp .env.example .env.local
# For local API without nginx edge:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:9090
npm install
npm run dev
```

Open http://localhost:3000

## Scripts

- `npm run dev` — Turbopack dev server
- `npm run build` — production build (standalone)
- `npm run type-check`
- `npm test`

## Docker

Built as two images from this folder:

- `target: next` — Next.js Node server
- `target: frontend` — nginx edge (`/api`, `/ws`, `/uploads` → Spring; `/` → Next)
