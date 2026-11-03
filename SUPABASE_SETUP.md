# Supabase setup

The app reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `.env` through the local Node server. The publishable key is intended for browser use; database access is restricted by the RLS policies in `supabase/schema.sql`. Never put a Supabase `service_role` key in `.env` or this frontend.

## Connect the database

1. Open the Supabase project `tchsnkitlycooksmvytu` and go to **SQL Editor**.
2. Run the full contents of `supabase/schema.sql`. It creates/backfills profiles for existing Auth users, enforces the `admin` and `learner` roles, and installs a trigger that creates a learner profile whenever a new Auth user signs up. Existing profile roles are preserved as `admin` or normalized to `learner`. Run this script again to apply schema updates.
3. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:8001` and add `http://localhost:8001/**` to Redirect URLs. Add your deployed website URL before deployment.
4. From the project folder, run `node --env-file=.env server.js`, then open `http://localhost:8001`. Node.js 20.6 or later is required for `--env-file`.
5. Create or sign in to the administrator account through the app's Supabase Auth form. All public signups are learners by default; users cannot select or assign themselves the admin role.
6. Promote the administrator in SQL Editor, replacing the email with the Auth account email:

   ```sql
   update public.profiles
   set role = 'admin'
   where lower(email) = lower('admin@example.com');
   ```

   Confirm exactly one row was updated, then sign out and back in. The only supported profile roles are `admin` and `learner`. Admin privileges are checked against this database profile; the browser cannot grant itself admin access.

## Find registered users

- Every successful signup is stored by Supabase Auth in `auth.users`; when email confirmation is enabled, an unconfirmed signup is stored there too.
- The database trigger copies the user's email and name into `public.profiles`. Admins can view learner profiles in **Admin → Students**; administrator profiles are kept separate from the learner list.
- To verify accounts in Supabase SQL Editor, run:

  ```sql
  select id, email, full_name, role, created_at
  from public.profiles
  order by created_at desc;
  ```

- If Auth users exist but are missing from `public.profiles`, run `supabase/schema.sql` again to install the trigger and backfill existing accounts. Never expose passwords or use a service-role key in the browser.

## Data behavior

- Admin workspace and course edits are persisted to Supabase.
- Learner workspace data is scoped by the signed-in Supabase Auth user ID.
- Learners can submit enrollment requests for published courses from the basket. Requests are stored in `public.enrollment_requests` and are visible to admins under **Admin → Finance**.
- Before approving a request, an admin must independently verify payment. Approval uses the `approve_enrollment_request(uuid)` database function to create the enrollment and approve the request atomically. It grants course access but does not charge a learner or verify a transaction with a payment provider. Rejections are recorded and the learner may submit a new request.
- Apply the full `supabase/schema.sql` before using enrollment requests; it creates the request table, row-level security policies, and approval function.
- The first admin or learner login can seed the database from legacy localStorage only when the page is running on the same browser origin. The old snapshot is retained as a backup. Switching from `file://` to `http://localhost:8001` uses a different browser storage origin, so old file-based records are not automatically imported.
- Legacy localStorage purchases are not converted into `enrollments`. They are user-editable demo records and cannot be trusted to grant course access; verify prior purchases and add only confirmed enrollments from the admin/database side.
- Existing sample payments, activities, and learner records are demo data. A real payment provider and verified transaction records are not connected.
- Email confirmation and password reset redirects must be configured in Supabase Auth for the deployed domain.
