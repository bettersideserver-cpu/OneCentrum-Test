# BetterSide — Supabase Unified System

This build is the unified Supabase production build.

## What changed

- Supabase is now the only backend.
- Supabase Auth replaces the old admin login/register API.
- Supabase PostgreSQL is the single application database.
- Supabase Realtime powers live inventory updates.
- The original BetterSide building UI, SVG floor pages, visitor flow, property management and property-hold requests are preserved.
- The Supabase inventory/status architecture is used for units and status categories.
- Admin writes are protected with Supabase RLS and the `profiles.role = 'admin'` check.

## Database setup

1. Create/open the Supabase project configured in `js/config.js`.
2. Open **SQL Editor**.
3. Run `supabase.sql` completely.
4. In **Authentication → Providers**, enable Email.
5. If you want instant admin login after registration, disable email confirmation. If confirmation remains enabled, register and confirm the email before logging in.
6. Deploy the folder as a static website.

The SQL migrates the real floor/unit structure found in the original legacy backend ZIP into `buildings`, `floors`, `units` and `status_categories`, and creates the visitor/request/auth tables.

## Important

The ZIP contains the application's legacy backend-era source code and assets, but it does **not** contain a live export of the legacy backend/legacy database database. Therefore the SQL migrates the floor/unit structure and the original default inventory behavior; it cannot recover legacy backend records that were stored only in the live legacy backend project.

## Frontend files

- `js/supabase.js` — shared Supabase client
- `js/config.js` — Supabase URL + publishable key
- `js/database.js` — unified data adapter used by the old frontend
- `js/auth.js` — Supabase Auth login/register
- `js/auth-guard.js` — admin session/role protection
- `supabase.sql` — complete schema, RLS, RPCs and unit migration seed

Never put a Supabase service-role key in browser code.
