# Supabase setup

The site uses Supabase Auth for registration and login, and the `app_workspaces` table for shared course/content data and private learner data. The browser client uses the project's publishable key; never put a `service_role` or secret key in this project.

## 1. Create the database objects

The app uses shared workspace tables plus protected course-access and payment tables:

- `profiles` stores each Auth user's name, email, and role. A database trigger creates every new profile with the `learner` role, regardless of signup metadata. The only roles are `learner` and `admin`.
- `app_workspaces` stores the public course/content workspace, admin workspace, and each learner's private workspace as JSONB. Separate tables are not needed for those app records.
- `course_access` stores trusted full-course grants, and `course_payments` stores Paystack transactions. Learners can read their own records but cannot create or change them in the browser.
- `course_bundle_access` stores the trusted all-course entitlement. `referral_payout_accounts` and `referral_withdrawals` keep payout details and requests behind learner/admin row-level security.

The role is read from the protected `profiles` table. Authenticated users can update their own name but cannot change their role. New registrations automatically become learners; admin accounts must be promoted manually by a trusted project owner in the SQL Editor.

To provision these objects with the Supabase CLI, run this from PowerShell in the project folder:

```text
powershell -ExecutionPolicy Bypass -File .\setup-supabase.ps1
```

The script signs in to Supabase CLI, links the project, and applies the migration in [`supabase/migrations/`](./supabase/migrations/). Supabase will ask you to authenticate and may ask for the project's database password. The migration creates the tables, signup trigger, helper function, and row-level security policies. Do not put a database password, access token, or service-role key in the website.

Alternatively, in the Supabase dashboard open **SQL Editor**, paste the contents of [`supabase-schema.sql`](./supabase-schema.sql), and run it. Then run the security/privacy migration from [`supabase/migrations/20261108001000_add_security_privacy_controls.sql`](./supabase/migrations/20261108001000_add_security_privacy_controls.sql) in the SQL Editor as well.

If privacy settings report that a table is missing from the API schema cache, the migration has not been applied to that project. If `supabase db push` is blocked because the remote database has older migration versions missing from this checkout, do not mark those unrelated versions as reverted. Run the privacy migration SQL in the linked project's SQL Editor, then mark only this migration as applied with `npx supabase migration repair --remote --status applied 20261108001000`. The app uses that migration to create both privacy tables, apply row-level security, and enable Realtime.

For live referral tracking, apply [`supabase/migrations/20261107230000_enable_real_referrals.sql`](./supabase/migrations/20261107230000_enable_real_referrals.sql) and [`supabase/migrations/20261107234200_enable_live_referral_updates.sql`](./supabase/migrations/20261107234200_enable_live_referral_updates.sql) after the core schema. Referral links attribute new registrations; referral commissions are managed separately from course-payment verification.

## 2. Configure authentication

In **Authentication → URL Configuration**, set the Site URL to the deployed HTTPS website URL and allow that site's `auth.html` callback URL for email confirmation and password recovery.

```text
https://your-deployed-domain.example/**
```

In **Authentication → Providers → Email**, enable email/password sign-in. Email confirmation can remain enabled; new users will be asked to confirm their email before their first sign-in.

Learner settings and the admin dashboard's **Security & Privacy** page use Auth for password changes, password recovery and TOTP two-factor authentication. Configure the Authenticator Assurance Level and TOTP factor settings in **Authentication → Multi-Factor Authentication**. The privacy migration creates the preference and request tables with row-level security and enables their Realtime updates. Admins review learner requests from the combined **Security & Privacy** page. Apply the migration before using privacy settings or requests.

Session-wide logout is supported by Auth. Per-device login history, IP/location audit, suspicious-login detection, custom security alert delivery, automatic data correction/deletion, and a retention schedule require additional server-side services and are not provided by the static client. Notification and consent choices are saved as preferences; they do not activate delivery or tracking services on their own.

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

Static hosting does not read `.env` files. The generator reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` and writes `supabase-config.js`, which the browser loads. Deploy that generated file, but never deploy `.env`. Only use a publishable key in browser configuration. Never place a service-role or secret key in this project.

Existing accounts and application data are read from Supabase. Browser-local application data is not used.

If registration reports **“Database error saving new user”**, apply all pending migrations with `powershell -ExecutionPolicy Bypass -File .\setup-supabase.ps1`. If registration still fails, inspect **Supabase Dashboard → Logs → Auth** for the database trigger error.

## 5. Course modules, free previews, and lesson materials

Administrators can add or remove any number of course modules. Each module can have one MP4, MOV, WebM or PDF. Videos (up to 512 MB) upload directly to Bunny Stream using resumable TUS uploads; PDF files (up to 25 MB) use the private `course-videos` Supabase Storage bucket. Signed-in learners can preview the first module of a published course for free. A one-time ₦5,000 Paystack payment unlocks one course, or ₦25,000 unlocks all current and future published courses. Paid access is recorded server-side and checked before Bunny playback URLs or PDF links are issued.

Apply the lesson-media migration to the linked Supabase project:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-supabase.ps1
```

The migration recreates or updates the private bucket, limits accepted file types and sizes, restores the administrator upload/delete policy, and permits enrolled learners to read their course files. The pending course-media retirement migration only removes its obsolete Storage policy; it no longer deletes course lesson references before this migration restores media access.

The setup script applies pending migrations to the configured remote project. It may prompt for your Supabase access token or database password; enter credentials only in the terminal, never in the website or chat. If the CLI reports migration-history mismatches, stop and inspect the remote migration list before repairing migration history. Apply [`supabase/migrations/20261118164000_course_access_paystack.sql`](./supabase/migrations/20261118164000_course_access_paystack.sql) before enabling the free preview or payment flow; it preserves existing successful admin-verified payments while making new course access verifiable. Then apply [`supabase/migrations/20261119120000_course_bundles_referral_payouts.sql`](./supabase/migrations/20261119120000_course_bundles_referral_payouts.sql) before enabling bundle checkout or referral payouts.

### Configure Bunny Stream video uploads and playback

In the Supabase Dashboard for the same project, add these values under **Project Settings → Edge Functions → Secrets**:

- `BUNNY_STREAM_LIBRARY_ID`: the numeric ID of the Bunny Stream video library.
- `BUNNY_STREAM_API_KEY`: that library's Stream API key (used only by the Edge Function).
- `BUNNY_STREAM_TOKEN_AUTH_KEY`: the separate token-authentication key from the library's **Security** settings.

Enable **Embed view token authentication** in the Bunny library's Security settings. The upload API key and token-auth key are different credentials. Do not put either key in the website, `.env`, or `supabase-config.js`. A Bunny API key was shared in the conversation while configuring the project; rotate it in Bunny before adding the replacement as a Supabase secret.

After linking the project and signing in to Supabase CLI, deploy the function from the repository root:

```powershell
npx supabase functions deploy bunny-course-media
```

The function only issues upload credentials to administrators, allows free previews of the first published module, checks trusted full-course access before signing later-module playback URLs, and removes replaced videos. The browser uploads video bytes directly to Bunny with TUS; Bunny API credentials never reach the browser.

### Configure Paystack course payments

In the Supabase Dashboard for the same project, add `PAYSTACK_SECRET_KEY` under **Project Settings → Edge Functions → Secrets**. Use a Paystack test secret key while testing, then replace it with a live secret key when ready to collect real payments. Do not put this key in `.env`, browser configuration, or frontend code.

After applying the course-access migration, deploy the payment verifier:

```powershell
npx supabase functions deploy course-payments
npx supabase functions deploy bunny-course-media
```

The learner is redirected to Paystack checkout. After Paystack returns, the Edge Function verifies the transaction directly with Paystack, requires the exact ₦5,000 course or ₦25,000 all-course NGN amount and the signed-in learner/plan metadata, then grants the matching access. Bundle access includes courses published in the future. A browser-side “success” value alone never unlocks paid materials. Verified course and bundle payments each credit a referred learner's referrer at the configured 20% rate; the admin can change this rate.

Learners can save bank details in Referral programme and request any amount up to their available balance. Each request reserves the funds until an admin marks it paid or rejects it. Payments are manual bank transfers performed outside the app; do not mark a request paid until the transfer has completed. No minimum withdrawal applies.

Troubleshooting:

- **PDF preview says “Object not found”:** apply the lesson-media and course-access migrations so the private bucket and access policy exist, then re-upload the PDF if it was uploaded to a different project or before the bucket was configured. Module 1 files are free for published courses; later modules require an active course-access grant.
- **Bunny player shows 403:** confirm `BUNNY_STREAM_TOKEN_AUTH_KEY` is the distinct token-authentication key from the library's **Security** page, not the Stream API key. Verify embed view token authentication is enabled and add the deployed website domain to the library's allowed embedding domains. A correctly signed token cannot override Bunny embedding restrictions.
- **Authenticator code is rejected:** use the current 6-digit code for this account's Skill Up Hub entry; enable automatic date/time on the phone and try a fresh code.
- **Video uploads feel slow:** uploads now run up to three module files at once. A single video's transfer time still depends on file size and network upload bandwidth; Bunny encoding begins after transfer and is not awaited by course save.
