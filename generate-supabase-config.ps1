$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
  throw "Missing .env. Copy .env.example to .env and add your Supabase project URL and publishable key."
}

$values = @{}
foreach ($line in Get-Content $envPath) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
    $value = $Matches[2].Trim()
    if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $values[$Matches[1]] = $value
  }
}

$url = $values["SUPABASE_URL"]
$publishableKey = $values["SUPABASE_PUBLISHABLE_KEY"]
if (-not $url -or -not $publishableKey) {
  throw ".env must define SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY."
}
if ($url -notmatch '^https://[^/]+\.supabase\.co/?$') {
  throw "SUPABASE_URL must be an HTTPS Supabase project URL."
}
if ($publishableKey -match 'service_role|secret') {
  throw "Do not use a Supabase service-role or secret key in browser configuration."
}

$urlJson = ConvertTo-Json -InputObject $url.TrimEnd("/") -Compress
$keyJson = ConvertTo-Json -InputObject $publishableKey -Compress
$output = @"
window.SKILL_UP_SUPABASE_CONFIG = {
  url: $urlJson,
  publishableKey: $keyJson
};
"@
Set-Content -Path (Join-Path $PSScriptRoot "supabase-config.js") -Value $output -Encoding ascii
Write-Host "Generated supabase-config.js for static hosting. It contains only the browser publishable key."
