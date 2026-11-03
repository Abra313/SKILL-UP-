# Supabase setup

The app reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `.env` through the local Node server. The publishable key is intended for browser use; database access is restricted by the RLS policies in `supabase/schema.sql`. Never put a Supabase `service_role` key in `.env` or this frontend.

## Connect the database

1. Open the Supabase project `tchsnkitlycooksmvytu` and go to **SQL Editor**.
2. Run the full contents of `supabase/schema.sql` once. It creates/backfills Auth profiles, courses, per-learner workspaces, verified enrollments, the admin workspace, and row-level access policies.
3. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:8001` and add `http://localhost:8001/**` to Redirect URLs. Add your deployed website URL before deployment.
4. From the project folder, run `node --env-file=.env server.js`, then open `http://localhost:8001`. Node.js 20.6 or later is required for `--env-file`.
5. Create or sign in to the administrator account through the app's Supabase Auth form. New signups are learners by default.
6. Promote the administrator in SQL Editor, replacing the email with the Auth account email:

   ```sql
   update public.profiles
   set role = 'admin'
   where lower(email) = lower('admin@example.com');
   ```

   Confirm exactly one row was updated, then sign out and back in. Admin privileges are checked against this database profile; the browser cannot grant itself admin access.

## Data behavior

- Admin workspace and course edits are persisted to Supabase.
- Learner workspace data is scoped by the signed-in Supabase Auth user ID.
- The first admin or learner login can seed the database from legacy localStorage only when the page is running on the same browser origin. The old snapshot is retained as a backup. Switching from `file://` to `http://localhost:8001` uses a different browser storage origin, so old file-based records are not automatically imported.
- Legacy localStorage purchases are not converted into `enrollments`. They are user-editable demo records and cannot be trusted to grant course access; verify prior purchases and add only confirmed enrollments from the admin/database side.
- Existing sample payments, activities, and learner records are demo data. A real payment provider and verified transaction records are not connected.
- Email confirmation and password reset redirects must be configured in Supabase Auth for the deployed domain.
