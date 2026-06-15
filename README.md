# Cafe POS System

A full-stack Point of Sale system for cafes, built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Cashier Terminal** — Product grid with category filters, cart with quantity controls, cash/credit payment
- **Kitchen Display** — Real-time order view with auto-refresh, mark complete
- **Admin Dashboard** — Products CRUD, user role management, order history with refunds, sales reports with charts
- **Auth** — Supabase email/password authentication with role-based access (admin, manager, cashier)
- **Keyboard Shortcuts** — `1-5` for categories, `Enter` to charge
- **Receipt Printing** — Browser print dialog with formatted receipt
- **Configurable Tax** — Admin-configurable tax rate (default 10%, set to 0% to disable)

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres + RLS)
- Zustand (cart state + localStorage)
- Recharts (reports)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd cafe-pos
npm install
```

### 2. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create `.env.local`:

```bash
cp .env.local.example .env.local
# Edit with your Supabase credentials
```

### 3. Run the migration

In your Supabase SQL Editor, run the contents of:

```
supabase/migrations/001_initial.sql
```

### 4. Seed the admin user

In the Supabase Auth dashboard, create a user:
- Email: `admin@cafe.com`
- Password: `Admin123!`

Then update their profile role:

```sql
UPDATE public.profiles SET role = 'admin', full_name = 'Admin' WHERE id = '<user-id>';
```

### 5. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Pages

| Route | Role | Description |
| --- | --- | --- |
| `/login` | All | Email/password login |
| `/cashier` | Cashier+ | POS terminal |
| `/admin` | Admin/Manager | Dashboard with tabs |
| `/kitchen` | All | Kitchen order display |

## Payment Types

- **Cash**: Enter amount received → system calculates change
- **Credit**: Enter 4-8 digit transaction reference from external terminal

## License

MIT
