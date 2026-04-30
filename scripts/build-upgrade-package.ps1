$ErrorActionPreference = "Stop"

try {
  $root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
  $package = Join-Path $root "_upgrade_framework"

  $dirs = @(
    "src\app",
    "src\pages",
    "scripts",
    "docs"
  )

  $files = @(
    "src\content.config.ts",
    "astro.config.mjs",
    "keystatic.config.ts",
    "package.json",
    "package-lock.json",
    "tailwind.config.mjs",
    "tsconfig.json",
    "README.md",
    ".gitignore",
    ".env.example",
    ".editorconfig"
  )

  if (Test-Path -LiteralPath $package) {
    Remove-Item -LiteralPath $package -Recurse -Force
  }
  New-Item -ItemType Directory -Path $package | Out-Null

  foreach ($dir in $dirs) {
    $src = Join-Path $root $dir
    if (!(Test-Path -LiteralPath $src)) {
      Write-Host "Skip missing dir: $dir"
      continue
    }

    $dst = Join-Path $package $dir
    New-Item -ItemType Directory -Path $dst | Out-Null
    robocopy $src $dst /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) {
      throw "Robocopy failed for $dir with exit code $LASTEXITCODE"
    }
  }

  foreach ($file in $files) {
    $src = Join-Path $root $file
    if (!(Test-Path -LiteralPath $src)) {
      Write-Host "Skip missing file: $file"
      continue
    }

    $dst = Join-Path $package $file
    $dstDir = Split-Path -Parent $dst
    if (!(Test-Path -LiteralPath $dstDir)) {
      New-Item -ItemType Directory -Path $dstDir | Out-Null
    }
    Copy-Item -LiteralPath $src -Destination $dst -Force
  }

  $forbidden = @(
    "src\content",
    "public\uploads",
    ".git",
    "node_modules",
    "dist",
    ".env"
  )

  foreach ($path in $forbidden) {
    $forbiddenPath = Join-Path $package $path
    if (Test-Path -LiteralPath $forbiddenPath) {
      throw "Forbidden path found in upgrade package: $path"
    }
  }

  Write-Host "Upgrade package created: $package"
} catch {
  Write-Error $_.Exception.Message
  Write-Error $_.ScriptStackTrace
  exit 1
}
