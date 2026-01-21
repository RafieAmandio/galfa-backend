# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Galfa Backend is an investment platform built with Next.js 16 (React 19) that manages fixed-rate, floating-rate, and installment-based investment accounts. It features Supabase authentication, real-time portfolio calculations, and compound interest modeling for Indonesian Rupiah (IDR) investments.

## Development Commands

```bash
pnpm dev       # Start dev server with Turbopack (localhost:3000)
pnpm build     # Build production application
pnpm start     # Start production server
pnpm lint      # Run ESLint checks
```

Package manager: **pnpm 10.27.0** (locked)

## Tech Stack

- **Framework**: Next.js 16.1.0 with React 19
- **Database**: PostgreSQL via Supabase with Drizzle ORM
- **Auth**: Supabase Auth with Row Level Security (RLS)
- **Forms**: Server Actions with `useActionState` + `zod-form-data`
- **Tables**: @tanstack/react-table with advanced filtering
- **Styling**: Tailwind CSS 4 + shadcn/ui components

## Architecture Patterns

### Server-Side Data Fetching (Required Pattern)

Page components (`page.tsx`) are server components that handle auth and data fetching:

```typescript
export default async function InvestorPage() {
  const user = await requireAuth();  // Server-side auth
  const data = await fetchData(user.email);
  return <InvestorView user={user} data={data} />;
}
```

View components (`*-view.tsx`, `*-modal.tsx`, `*-table.tsx`) are client components for UI interactions.

### Authentication Helpers

Use helpers from `src/lib/auth/server-auth-helpers.ts`:
- `requireAuth()` - For investor pages (redirects if not authenticated)
- `requireAdmin()` - For admin-only pages
- `requireAdminOrRedirectToSummary()` - Admin pages with investor fallback

### Form Handling Pattern

Client forms use `useActionState` with controlled inputs:

```typescript
const [actionState, actionDispatch, isActionPending] = useActionState(serverAction, undefined);
```

Server actions validate with `zod-form-data` and return `{ success, message, errors?, data? }`.

### File Naming Conventions

- `page.tsx` - Server components (auth + data fetching only)
- `*-view.tsx` - Client view components
- `*-modal.tsx` - Client modal/dialog components
- `*-table.tsx` - Client table components with Tanstack React Table
- `actions/*.ts` - Server actions with `"use server"` directive

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── investor/           # Investor dashboard routes
│   └── admin/              # Admin management routes
├── features/               # Feature-based modules
│   ├── {feature}/
│   │   ├── actions/        # Server actions (data layer)
│   │   ├── components/     # Client view components
│   │   └── views/          # Table components
├── components/             # Shared components
│   └── ui/                 # shadcn/ui components
├── db/
│   ├── drizzle/            # Schema and connection
│   └── supabase/           # Supabase clients
├── lib/
│   ├── auth/               # Auth utilities
│   └── utils/              # Financial calculators
└── hooks/                  # Custom React hooks
```

## Key Business Logic

### Investment Types
- **Fixed-rate**: Monthly compound interest, 5% admin fee on originals only, rollover support
- **Floating-rate**: Variable rates based on VC performance metrics
- **Installment**: Monthly payments with principal/interest breakdowns and CoF calculations

### Financial Rules
- Admin fees: Single 5% fee per investment chain (rollovers exempt)
- Compound interest: Monthly compounding with daily proportioning
- Currency: Indonesian Rupiah (IDR) formatting

## Environment Variables

Required in `.env`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_SERVICE_KEY
SUPABASE_CONNECTION_STRING
```

Optional: `DISABLE_ADMIN_CHECK=true` for development

## Critical Guidelines

**DO:**
- Use server components for `page.tsx` files
- Fetch all data server-side before rendering
- Use `useActionState` for all form handling
- Use `zod-form-data` for server-side validation
- Use Tanstack React Table with column filtering for data tables

**DON'T:**
- Handle auth client-side in page components
- Fetch data client-side for initial page load
- Use async/await patterns for form submissions
- Use uncontrolled inputs in forms
- Use basic HTML tables for data display
