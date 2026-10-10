param([string]$OutputPath, [switch]$IncludeRuntime, [switch]$SkipBuild, [switch]$Force)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskOriginalLocation = Get-Location
$taskOriginalPath = $env:PATH
$taskStageBase = $null
try {
    Set-Location -LiteralPath $taskRoot
    if (-not $OutputPath) { $OutputPath = Join-Path (Split-Path -Parent $taskRoot) 'PropertyEmpire3D-Windows.zip' }
    $taskOutput = [IO.Path]::GetFullPath($OutputPath)
    if ([IO.Path]::GetExtension($taskOutput) -ine '.zip') { throw 'OutputPath must end in .zip.' }
    if ((Test-Path -LiteralPath $taskOutput) -and -not $Force) { throw "The package already exists: $taskOutput. Choose another OutputPath or use -Force." }
    if ($SkipBuild) {
        Write-Host 'Checking that the existing browser and server builds are current...'
        & (Join-Path $PSScriptRoot 'setup-game.ps1') -StampBuild
    }
    else { & (Join-Path $PSScriptRoot 'setup-game.ps1') }
    if ($LASTEXITCODE -ne 0) { throw 'Setup/build failed; no share package was created.' }
    $taskNodeHome = Join-Path $taskRoot '.runtime/node'
    $taskNode = Join-Path $taskNodeHome 'node.exe'
    $taskNpm = Join-Path $taskNodeHome 'node_modules/npm/bin/npm-cli.js'
    if (-not (Test-Path -LiteralPath $taskNpm)) { throw 'The portable runtime must include npm to prepare a share package.' }
    $taskStageBase = Join-Path ([IO.Path]::GetTempPath()) ('PropertyEmpire-package-' + [guid]::NewGuid().ToString('N'))
    $taskStageRoot = Join-Path $taskStageBase 'PropertyEmpire3D'
    New-Item -ItemType Directory -Path $taskStageRoot -Force | Out-Null
    # Allowlist source and distributable files: never copy player data, caches or development dependencies.
    foreach ($taskDirectory in @('apps', 'packages', 'scripts', 'docs')) {
        $taskSource = Join-Path $taskRoot $taskDirectory
        if (Test-Path -LiteralPath $taskSource) {
            foreach ($taskFile in Get-ChildItem -LiteralPath $taskSource -Recurse -File) {
                $taskRelative = $taskFile.FullName.Substring($taskRoot.Length + 1)
                if ($taskRelative -match '(^|[\\/])(node_modules|data|saves|test-artifacts|\.git|\.venv)([\\/]|$)' -or $taskFile.Extension -in @('.log', '.zip')) { continue }
                $taskDestination = Join-Path $taskStageRoot $taskRelative
                New-Item -ItemType Directory -Path (Split-Path -Parent $taskDestination) -Force | Out-Null
                Copy-Item -LiteralPath $taskFile.FullName -Destination $taskDestination
            }
        }
    }
    foreach ($taskFile in Get-ChildItem -LiteralPath $taskRoot -File) {
        if ($taskFile.Name -match '^(package(-lock)?\.json|.*\.config\.(ts|js|mjs)|tsconfig.*\.json|.*\.bat|README.*|LICENSE.*|.*\.md)$') {
            Copy-Item -LiteralPath $taskFile.FullName -Destination (Join-Path $taskStageRoot $taskFile.Name)
        }
    }
    $taskStageRuntime = Join-Path $taskStageRoot '.runtime'
    New-Item -ItemType Directory -Path $taskStageRuntime -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $taskRoot '.runtime/build-state.json') -Destination (Join-Path $taskStageRuntime 'build-state.json')
    if ($IncludeRuntime) { Copy-Item -LiteralPath $taskNodeHome -Destination (Join-Path $taskStageRuntime 'node') -Recurse }
    Write-Host 'Preparing production dependencies in an isolated share folder...'
    $env:PATH = "$taskNodeHome;$taskOriginalPath"
    Set-Location -LiteralPath $taskStageRoot
    & $taskNode $taskNpm ci --omit=dev --no-audit --no-fund --cache (Join-Path $taskRoot '.runtime/npm-cache')
    if ($LASTEXITCODE -ne 0) { throw 'Production dependency installation failed; no package was created.' }
    $taskParentOutput = Split-Path -Parent $taskOutput
    New-Item -ItemType Directory -Path $taskParentOutput -Force | Out-Null
    # ZIP through .NET includes dot directories such as .runtime and all production dependency files.
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $taskPendingZip = Join-Path $taskStageBase 'ready.zip'
    $taskZipSource = Join-Path $taskStageBase 'payload'
    New-Item -ItemType Directory -Path $taskZipSource | Out-Null
    Set-Location -LiteralPath $taskRoot
    Move-Item -LiteralPath $taskStageRoot -Destination (Join-Path $taskZipSource 'PropertyEmpire3D')
    [IO.Compression.ZipFile]::CreateFromDirectory($taskZipSource, $taskPendingZip, [IO.Compression.CompressionLevel]::Optimal, $false)
    Move-Item -LiteralPath $taskPendingZip -Destination $taskOutput -Force:$Force
    $taskSize = [Math]::Round((Get-Item -LiteralPath $taskOutput).Length / 1MB, 1)
    Write-Host "Share ZIP ready: $taskOutput ($taskSize MB)" -ForegroundColor Green
    Write-Host 'Friend: extract the whole folder, run setup.bat once, then run.bat.'
} catch {
    Write-Host "Packaging failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    $env:PATH = $taskOriginalPath
    Set-Location -LiteralPath $taskOriginalLocation.Path
    if ($taskStageBase -and (Test-Path -LiteralPath $taskStageBase)) {
        $taskResolvedStage = [IO.Path]::GetFullPath($taskStageBase)
        $taskTempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
        if ($taskResolvedStage.StartsWith($taskTempPrefix, [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($taskResolvedStage) -like 'PropertyEmpire-package-*') {
            Remove-Item -LiteralPath $taskResolvedStage -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}
