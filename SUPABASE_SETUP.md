# Supabase setup

The site uses Supabase Auth for registration and login, and the `app_workspaces` table for shared course/content data and private learner data. The browser client uses the project's publishable key; never put a `service_role` or secret key in this project.

## 1. Create the database objects

The app uses two database tables:

- `profiles` stores each Auth user's name, email, and role. A database trigger creates every new profile with the `learner` role, regardless of signup metadata. The only roles are `learner` and `admin`.
- `app_workspaces` stores the public course/content workspace, admin workspace, and each learner's private workspace as JSONB. Separate tables are not needed for those app records.

The role is read from the protected `profiles` table. Authenticated users can update their own name but cannot change their role. New registrations automatically become learners; admin accounts must be promoted manually by a trusted project owner in the SQL Editor.

To provision these objects with the Supabase CLI, run this from PowerShell in the project folder:

```text
powershell -ExecutionPolicy Bypass -File .\setup-supabase.ps1
```

The script signs in to Supabase CLI, links the project, and applies the migration in [`supabase/migrations/`](./supabase/migrations/). Supabase will ask you to authenticate and may ask for the project's database password. The migration creates the tables, signup trigger, helper function, and row-level security policies. Do not put a database password, access token, or service-role key in the website.

Alternatively, in the Supabase dashboard open **SQL Editor**, paste the contents of [`supabase-schema.sql`](./supabase-schema.sql), and run it. This SQL file contains the same setup for manual provisioning.

## 2. Configure authentication

In **Authentication → URL Configuration**, set the Site URL to the deployed HTTPS website URL and allow that site's `auth.html` callback URL for email confirmation.

```text
https://your-deployed-domain.example/**
```

In **Authentication → Providers → Email**, enable email/password sign-in. Email confirmation can remain enabled; new users will be asked to confirm their email before their first sign-in.

## 3. Assign an administrator

Register the administrator account through the same sign-up page as other learners. After that account appears in **Authentication → Users** and its profile is created, run this in the SQL Editor, replacing the email:

```sql
update public.profiles
set role = 'admin'
where lower(email) = lower('admin@example.com')
returning id, email, role;
```

Confirm the returned row shows `admin`. To return the account to learner access, use `set role = 'learner'` with the same email filter. Only assign admin to accounts you control. Never put an admin password or privileged key in browser code.

## 4. Run the site

Deploy the static files to an HTTPS web host and open the deployed `index.html`. Supabase keeps the active sign-in session in tab-scoped session storage so it survives navigation between the site's pages; application data is fetched from and saved to Supabase.

Copy `.env.example` to `.env` and set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, then generate the browser configuration:

```powershell
powershell -ExecutionPolicy Bypass -File .\generate-supabase-config.ps1
```

Static hosting does not read `.env` files. The generator writes `supabase-config.js`, which the browser loads; deploy that generated file, but never deploy `.env`. Only use a publishable key here. Never place a service-role or secret key in this project.

Existing accounts and application data are read from Supabase. Browser-local application data is not used.

If registration reports **“Database error saving new user”**, apply all pending migrations with `powershell -ExecutionPolicy Bypass -File .\setup-supabase.ps1`. If registration still fails, inspect **Supabase Dashboard → Logs → Auth** for the database trigger error.
