param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskOriginalLocation = Get-Location
$taskProcess = $null
$taskOwnedProcess = $false
function Test-GameHost {
    try {
        $taskHealth = Invoke-RestMethod "$taskProbe/health" -TimeoutSec 2
        $taskPage = Invoke-WebRequest "$taskProbe/" -UseBasicParsing -TimeoutSec 2
        return $taskHealth.ok -and $taskPage.Content.Contains('Property Empire')
    } catch { return $false }
}
function Test-OwnServer($taskListeners) {
    if (@($taskListeners).Count -eq 0) { return $false }
    if (-not (Test-Path -LiteralPath $taskStatePath)) { return $false }
    try {
        $taskState = Get-Content -LiteralPath $taskStatePath -Raw | ConvertFrom-Json
        if ($taskState.root -ine $taskRoot -or $taskState.port -ne [int]$taskPort) { return $false }
        $taskExistingProcess = Get-Process -Id $taskState.pid -ErrorAction Stop
        if ($taskExistingProcess.StartTime.ToUniversalTime().ToString('o') -ne $taskState.started) { return $false }
        return @($taskListeners | Where-Object { $_.OwningProcess -ne $taskState.pid }).Count -eq 0
    } catch { return $false }
}
try {
    Set-Location -LiteralPath $taskRoot
    $taskPort = if ($env:PORT) { $env:PORT } else { '3001' }
    if ($taskPort -notmatch '^\d{1,5}$' -or [int]$taskPort -lt 1 -or [int]$taskPort -gt 65535) { throw 'PORT must be between 1 and 65535.' }
    $taskUrl = "http://localhost:$taskPort"
    $taskProbe = "http://127.0.0.1:$taskPort"
    $taskRuntime = Join-Path $taskRoot '.runtime'
    $taskStatePath = Join-Path $taskRuntime "server-$taskPort.json"
    $taskListeners = @(Get-NetTCPConnection -LocalPort ([int]$taskPort) -State Listen -ErrorAction SilentlyContinue)
    if ($taskListeners.Count -gt 0) {
        if ((Test-OwnServer $taskListeners) -and (Test-GameHost)) {
            Write-Host "Property Empire from this folder is already running at $taskUrl"
            if (-not $NoBrowser) { Start-Process $taskUrl }
            exit 0
        }
        throw "Port $taskPort is used by another application or game folder. Close that server, or set PORT to another number before running this copy."
    }
    & (Join-Path $PSScriptRoot 'setup-game.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Game setup did not finish. Run setup.bat and check its error message.' }
    $taskNode = Join-Path $taskRuntime 'node/node.exe'
    $taskLogs = Join-Path $taskRoot 'data'
    New-Item -ItemType Directory -Path $taskLogs -Force | Out-Null
    $taskBootstrap = Join-Path $taskRuntime 'launch-server.mjs'
    # Write logs in Node itself, so the hidden server does not retain the
    # launcher's redirected console handles after PowerShell exits.
    @'
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
for (const [stream, label] of [[process.stdout, 'server'], [process.stderr, 'error']]) {
  const target = resolve('data', `launcher-${label}-${process.env.PORT}.log`);
  stream.write = (chunk, encoding, callback) => {
    appendFileSync(target, chunk, typeof encoding === 'string' ? encoding : undefined);
    if (typeof encoding === 'function') encoding(); else if (callback) callback();
    return true;
  };
}
try { await import(pathToFileURL(resolve('apps/server/dist/index.js')).href); }
catch (error) { console.error(error); process.exit(1); }
'@ | Set-Content -LiteralPath $taskBootstrap -Encoding UTF8
    $taskPreviousPort = $env:PORT
    $env:PORT = $taskPort
    try {
        $taskProcess = Start-Process -FilePath $taskNode -ArgumentList ('"' + $taskBootstrap + '"') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru
    } finally { $env:PORT = $taskPreviousPort }
    $taskOwnedProcess = $true
    @{ root = $taskRoot; port = [int]$taskPort; pid = $taskProcess.Id; started = $taskProcess.StartTime.ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $taskStatePath -Encoding UTF8
    $taskReady = $false
    for ($taskAttempt = 0; $taskAttempt -lt 40; $taskAttempt++) {
        $taskProcess.Refresh()
        if ($taskProcess.HasExited) { break }
        if (Test-GameHost) {
            $taskStartedListeners = @(Get-NetTCPConnection -LocalPort ([int]$taskPort) -State Listen -ErrorAction SilentlyContinue)
            if (Test-OwnServer $taskStartedListeners) { $taskReady = $true; break }
        }
        Start-Sleep -Milliseconds 250
    }
    if (-not $taskReady) { throw "The server did not start. Check $taskLogs\launcher-error-$taskPort.log." }
    Write-Host "Property Empire is running at $taskUrl (server PID $($taskProcess.Id))."
    Write-Host 'Your saved games are retained. Double-click run.bat again to reopen the game.'
    if (-not $NoBrowser) { Start-Process $taskUrl }
} catch {
    if ($taskOwnedProcess -and $taskProcess) { $taskProcess.Refresh(); if (-not $taskProcess.HasExited) { Stop-Process -Id $taskProcess.Id -ErrorAction SilentlyContinue } }
    Write-Host "Could not launch Property Empire: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally { Set-Location -LiteralPath $taskOriginalLocation.Path }
