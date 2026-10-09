param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskPort = if ($env:PORT) { $env:PORT } else { '3001' }
if ($taskPort -notmatch '^\d+$' -or [int]$taskPort -lt 1 -or [int]$taskPort -gt 65535) { throw 'PORT must be between 1 and 65535.' }
$taskUrl = "http://localhost:$taskPort"
$taskProbe = "http://127.0.0.1:$taskPort"
function Test-GameHost {
    try {
        $taskHealth = Invoke-RestMethod "$taskProbe/health" -TimeoutSec 2
        $taskPage = Invoke-WebRequest "$taskProbe/" -UseBasicParsing -TimeoutSec 2
        return $taskHealth.ok -and $taskPage.Content.Contains('Property Empire')
    } catch { return $false }
}
try {
    if (Test-GameHost) {
        Write-Host "Property Empire is already running at $taskUrl"
        if (-not $NoBrowser) { Start-Process $taskUrl }
        exit 0
    }
    if (Get-NetTCPConnection -LocalPort ([int]$taskPort) -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $taskPort is used by another application. Set PORT to another number or close that application."
    }
    $taskNode = Get-Command node -ErrorAction SilentlyContinue
    if (-not $taskNode) { throw 'Install Node.js, then double-click run.bat again.' }
    if (-not (Test-Path -LiteralPath 'node_modules/vite/package.json')) {
        Write-Host 'Installing game dependencies...'
        & npm.cmd install
        if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. See the message above.' }
    }
    $taskOutputs = @('apps/web/dist/index.html', 'apps/server/dist/index.js')
    $taskRebuild = @($taskOutputs | Where-Object { -not (Test-Path -LiteralPath $_) }).Count -gt 0
    if (-not $taskRebuild) {
        $taskBuilt = ($taskOutputs | ForEach-Object { Get-Item -LiteralPath $_ } | Sort-Object LastWriteTimeUtc | Select-Object -First 1).LastWriteTimeUtc
        $taskInputs = @(Get-ChildItem -LiteralPath 'apps/web/src','apps/web/public','apps/server/src','packages/core' -File -Recurse) + @(Get-Item -LiteralPath 'package.json','package-lock.json','vite.config.ts','apps/web/index.html','scripts/cache-manifest.mjs')
        $taskRebuild = @($taskInputs | Where-Object { $_.LastWriteTimeUtc -gt $taskBuilt }).Count -gt 0
    }
    if ($taskRebuild) {
        Write-Host 'Building Property Empire...'
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'Game build failed. See the message above.' }
    }
    $taskLogs = Join-Path $taskRoot 'data'
    New-Item -ItemType Directory -Path $taskLogs -Force | Out-Null
    $taskProcess = Start-Process -FilePath $taskNode.Source -ArgumentList 'apps/server/dist/index.js' -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogs 'launcher-server.log') -RedirectStandardError (Join-Path $taskLogs 'launcher-error.log') -PassThru
    $taskReady = $false
    for ($taskAttempt=0; $taskAttempt -lt 30; $taskAttempt++) {
        if (Test-GameHost) { $taskReady = $true; break }
        if ($taskProcess.HasExited) { break }
        Start-Sleep -Milliseconds 300
    }
    if (-not $taskReady) { throw "The server did not start. Check $taskLogs\launcher-error.log." }
    Write-Host "Property Empire is running at $taskUrl (server PID $($taskProcess.Id))."
    Write-Host 'Your saved games are retained. Double-click run.bat again to reopen the game.'
    if (-not $NoBrowser) { Start-Process $taskUrl }
} catch {
    Write-Host "Could not launch Property Empire: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
