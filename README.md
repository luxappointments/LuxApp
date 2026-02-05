# LuxApp

SaaS multi-tenant premium para citas de servicios locales (barber, nails, lashes, estética, etc.).

## Stack
- Next.js 16 + App Router + TypeScript
- Tailwind CSS + shadcn/ui style components
- Supabase (Auth + Postgres + Storage + RLS)
- Stripe (subscriptions, depósitos y webhooks)
- Resend (emails)
- Deploy-ready para Vercel

## Features MVP incluidas
- Landing premium con buscador por ciudad/categoría/nombre
- Página pública de negocio: `/b/{slug}`
- Flujo de booking: `/b/{slug}/book`
- Motor de slots inteligentes con ranking por minimización de huecos
- Estados de cita: `pending_confirmation`, `confirmed`, `awaiting_payment`, `paid`, `canceled_by_client`, `canceled_by_business`, `no_show`, `completed`
- Auto-cancel si `awaiting_payment` supera 24h (`/api/bookings/expire`)
- Protección anti no-show por negocio (strikes y force prepay)
- Depósito dinámico global 0/30/100 por score
- Soft blacklist business/global
- Dashboard negocio (overview, calendario, citas, servicios, horarios, políticas, pagos, clientes)
- Panel cliente (mis citas, historial, favoritos)
- Membresías FREE/SILVER/GOLD/BLACK mensual/anual (2 meses gratis)

## Estructura principal
```bash
app/
  api/
    availability/
    bookings/
    notifications/reminders/
    stripe/{checkout,portal,webhook}/
  b/[slug]/
  dashboard/
  client/
  pricing/
components/
lib/
supabase/
  migrations/001_init.sql
  seed/001_seed.sql
```

## Setup local
1. Instala dependencias:
```bash
pnpm install
```
2. Crea `.env.local` desde `.env.example` y completa llaves.
3. Ejecuta SQL base en Supabase SQL Editor:
- `supabase/migrations/001_init.sql`
- `supabase/seed/001_seed.sql`
4. Corre el proyecto:
```bash
pnpm dev
```

## Stripe
- Endpoint webhook: `/api/stripe/webhook`
- Eventos recomendados:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Checkout de membresías: `POST /api/stripe/checkout` con `mode=subscription`
- Checkout depósito: `POST /api/stripe/checkout` con `mode=deposit`

## RLS y funciones
Funciones requeridas implementadas en SQL:
- `is_admin()`
- `owns_business(business_id)`
- `is_business_staff(business_id)`

También incluye:
- `compute_required_deposit_percent(...)`
- `apply_risk_event(...)`
- triggers para defaults de cita y tracking de estado

## Cron jobs recomendados en Vercel
- Cada 30 min: `POST /api/bookings/expire`
- Cada 1 hora: `POST /api/notifications/reminders`

## OneSignal (push notifications)
Variables de entorno requeridas:
- `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`

Archivos requeridos en `public/`:
- `OneSignalSDKWorker.js`
- `OneSignalSDKUpdaterWorker.js`

## Deploy checklist (Vercel)
- Conectar repo a Vercel
- Definir variables de entorno (igual a `.env.example`)
- Configurar dominio principal y URL en `NEXT_PUBLIC_APP_URL`
- Crear webhook de Stripe apuntando a `https://<dominio>/api/stripe/webhook`
- Activar cron jobs
- Verificar Supabase Storage buckets:
  - `business-assets`
  - `payment-proofs`
- Validar RLS con usuarios `client`, `owner`, `staff`, `admin`

## White-label
- Branding centralizado vía tokens en `app/globals.css` y `tailwind.config.ts`
- Fácil rebranding: colores, logo y copy sin tocar lógica core
# LuxApp
# LuxApp
