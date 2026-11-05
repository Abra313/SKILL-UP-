$ErrorActionPreference = "Stop"

$projectRef = "dhwntrdxhtueqqteuemg"

Write-Host "Signing in to Supabase CLI..."
& npx --yes supabase login
if ($LASTEXITCODE -ne 0) {
  throw "Supabase CLI login failed."
}

Write-Host "Linking this project to Supabase..."
& npx --yes supabase link --project-ref $projectRef
if ($LASTEXITCODE -ne 0) {
  throw "Could not link the Supabase project."
}

Write-Host "Applying the database migration..."
& npx --yes supabase db push
if ($LASTEXITCODE -ne 0) {
  throw "Supabase database migration failed."
}

Write-Host "Supabase database setup completed."
