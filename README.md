# Dreno

Two-sided marketplace connecting athletes with mental performance coaches.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express (ESM)
- Database / Auth / Storage: Supabase (Postgres, Supabase Auth, RLS)
- Payments: Stripe Connect Express, 25% platform commission
- Email: Resend
- Video: Daily.co (iframe embed)

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd dreno2

cd server && npm install && cp .env.example .env
# Fill in server/.env

cd ../client && npm install && cp .env.example .env
# Fill in client/.env
```

### 2. Create Supabase project

Go to https://supabase.com and create a new project.

Copy your project URL and keys into both `.env` files.

### 3. Run schema and seed

In the Supabase SQL editor, run:

1. `supabase/schema.sql` (creates all tables and RLS policies)
2. Read the instructions at the top of `supabase/seed.sql`, create auth users manually in the Supabase Dashboard under Authentication, then replace the placeholder UUIDs and run the seed file.

### 4. Configure external services

- **Stripe**: Create an account at https://stripe.com. Add `STRIPE_SECRET_KEY` and `STRIPE_CONNECT_CLIENT_ID`. For webhooks, use the Stripe CLI or create a webhook endpoint pointing to `POST /api/stripe/webhook` and add the signing secret as `STRIPE_WEBHOOK_SECRET`.
- **Daily.co**: Create an account at https://www.daily.co and add your API key as `DAILY_API_KEY`.
- **Resend**: Create an account at https://resend.com, verify a sending domain, and add your API key as `RESEND_API_KEY`. Update the `FROM` address in `server/emails.js` to match your verified domain.

### 5. Fonts

The design uses the Expose display font. Drop `Expose.woff2` into `client/public/fonts/expose/`. Until you have the file, headings fall back to Anton / Archivo. Satoshi and Chakra Petch are loaded from Fontshare and Google Fonts.

### 6. Run dev servers

Terminal 1 (server):
```bash
cd server && npm run dev
```

Terminal 2 (client):
```bash
cd client && npm run dev
```

Open http://localhost:5173

## Key routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/signup` | Create account (athlete or coach) |
| `/login` | Sign in |
| `/onboarding/athlete` | 4-step athlete onboarding |
| `/onboarding/coach` | 5-step coach onboarding |
| `/coaches` | Browse verified coaches |
| `/coach/:id` | Coach public profile |
| `/book/:id` | Book a session with a coach |
| `/payment/success` | Post-payment confirmation |
| `/dashboard` | Athlete dashboard |
| `/session/:bookingId` | Video session room |
| `/goals` | Goal tracking |
| `/journal` | Private journal |
| `/messages` | Messaging per booking thread |
| `/coach-dashboard` | Coach management panel |
| `/admin` | Admin coach verification (password-gated) |

## Admin

Visit `/admin` and enter the `ADMIN_PASSWORD` from your `.env`. From there you can approve or reject coach applications.

## Disclaimer

Dreno is not therapy or medical care. If you are in crisis, contact local emergency services or a crisis line.
