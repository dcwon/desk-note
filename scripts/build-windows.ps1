[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [switch]$SkipTests,
  [switch]$Dev,
  [ValidateSet("x86_64-pc-windows-msvc")]
  [string]$Target = "x86_64-pc-windows-msvc"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

function Require-Command {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$InstallHint
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing command '$Name'. $InstallHint"
  }
}

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-VisualStudioBuildTools {
  $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
  if (-not (Test-Path $vswhere)) {
    Write-Warning "vswhere.exe was not found. Install Visual Studio Build Tools and select 'Desktop development with C++' if Rust compilation fails."
    return
  }

  $installPath = & $vswhere `
    -latest `
    -products * `
    -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
    -property installationPath

  if (-not $installPath) {
    throw "Visual Studio C++ build tools were not found. Install 'Microsoft Visual Studio Build Tools' and select 'Desktop development with C++'."
  }

  Write-Host "Visual Studio C++ tools: $installPath"
}

Write-Step "Checking Windows build dependencies"
Require-Command "node" "Install Node.js LTS from https://nodejs.org/"
Require-Command "npm" "Install Node.js LTS from https://nodejs.org/"
Require-Command "rustup" "Install Rust from https://rustup.rs/"
Require-Command "cargo" "Install Rust from https://rustup.rs/"
Test-VisualStudioBuildTools

Write-Host "Node: $(node --version)"
Write-Host "npm:  $(npm --version)"
Write-Host "Rust: $(rustc --version)"
Write-Host "Cargo: $(cargo --version)"

if (-not $SkipInstall) {
  if (Test-Path "package-lock.json") {
    Write-Step "Installing npm dependencies with npm ci"
    & npm ci
  } else {
    Write-Step "Installing npm dependencies with npm install"
    & npm install
  }
}

Write-Step "Ensuring Rust target $Target"
& rustup target add $Target

if (-not $SkipTests) {
  Write-Step "Running frontend tests"
  & npm test -- --run
}

Write-Step "Running frontend production build"
& npm run build

if ($Dev) {
  Write-Step "Starting Tauri dev app"
  & npm run tauri:dev -- --target $Target
  exit $LASTEXITCODE
}

Write-Step "Building Windows Tauri installers"
& npm run tauri:build -- --target $Target

Write-Step "Build outputs"
$targetRelease = Join-Path $RepoRoot "src-tauri\target\$Target\release"
$defaultRelease = Join-Path $RepoRoot "src-tauri\target\release"
$releaseRoots = @($targetRelease, $defaultRelease) | Where-Object { Test-Path $_ }

if ($releaseRoots.Count -eq 0) {
  Write-Warning "No release directory was found under src-tauri\target. Check the Tauri build output above."
  exit 0
}

$artifacts = foreach ($root in $releaseRoots) {
  Get-ChildItem -Path $root -Recurse -File -Include "*.exe", "*.msi" -ErrorAction SilentlyContinue
}

if (-not $artifacts) {
  Write-Warning "No .exe or .msi artifacts were found. Check src-tauri\target manually."
  exit 0
}

$artifacts |
  Sort-Object FullName -Unique |
  ForEach-Object { Write-Host $_.FullName -ForegroundColor Green }
