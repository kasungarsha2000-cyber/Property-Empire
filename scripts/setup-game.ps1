param([switch]$RuntimeOnly, [switch]$StampBuild)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskOriginalPath = $env:PATH
$taskOriginalLocation = Get-Location
$taskOriginalProgress = $ProgressPreference
$ProgressPreference = 'SilentlyContinue'
$taskRuntime = Join-Path $taskRoot '.runtime'
$taskNodeHome = Join-Path $taskRuntime 'node'
$taskNode = Join-Path $taskNodeHome 'node.exe'
$taskStaging = $null
function Get-GameFileHash([string]$taskFilePath) {
    $taskFileStream = [IO.File]::OpenRead($taskFilePath)
    $taskFileHasher = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($taskFileHasher.ComputeHash($taskFileStream)).Replace('-', '').ToLowerInvariant() }
    finally { $taskFileStream.Dispose(); $taskFileHasher.Dispose() }
}
function Test-LocalNode {
    if (-not (Test-Path -LiteralPath $taskNode)) { return $false }
    try {
        $taskInfo = & $taskNode -p 'JSON.stringify({version:process.versions.node,arch:process.arch})' 2>$null | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0) { return $false }
        $taskVersion = [version]$taskInfo.version
        $taskRuntimeRecord = Join-Path $taskNodeHome 'property-empire-runtime.json'
        if (Test-Path -LiteralPath $taskRuntimeRecord) {
            $taskRecordedRelease = Get-Content -LiteralPath $taskRuntimeRecord -Raw | ConvertFrom-Json
            if ($taskRecordedRelease.version -ne $taskInfo.version -or [DateTime]$taskRecordedRelease.supportedUntil -le [DateTime]::UtcNow.Date) { return $false }
        }
        return $taskInfo.arch -eq $taskArchitecture -and $taskVersion.Major -ge 22 -and ($taskVersion.Major % 2) -eq 0 -and ($taskVersion.Major -gt 22 -or $taskVersion.Minor -ge 12)
    } catch { return $false }
}
function Get-BuildInputs {
    $taskFiles = @()
    foreach ($taskDir in @('apps/web/src', 'apps/web/public', 'apps/server/src', 'packages/core')) {
        $taskPath = Join-Path $taskRoot $taskDir
        if (Test-Path -LiteralPath $taskPath) { $taskFiles += @(Get-ChildItem -LiteralPath $taskPath -Recurse -File) }
    }
    foreach ($taskFile in @('package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'apps/web/index.html', 'scripts/cache-manifest.mjs')) {
        $taskPath = Join-Path $taskRoot $taskFile
        if (Test-Path -LiteralPath $taskPath) { $taskFiles += Get-Item -LiteralPath $taskPath }
    }
    return $taskFiles | Sort-Object FullName
}
function Get-BuildFingerprint($taskInputs) {
    $taskRows = foreach ($taskInput in $taskInputs) {
        $taskRelative = $taskInput.FullName.Substring($taskRoot.Length).Replace('\', '/')
        "$taskRelative $(Get-GameFileHash $taskInput.FullName)"
    }
    $taskHasher = [System.Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($taskHasher.ComputeHash([Text.Encoding]::UTF8.GetBytes(($taskRows -join "`n")))).Replace('-', '').ToLowerInvariant() }
    finally { $taskHasher.Dispose() }
}
function Get-OutputFingerprint {
    $taskArtifacts = foreach ($taskDirectory in @('apps/web/dist', 'apps/server/dist')) {
        Get-ChildItem -LiteralPath (Join-Path $taskRoot $taskDirectory) -Recurse -File
    }
    return Get-BuildFingerprint @($taskArtifacts | Sort-Object FullName)
}
function Invoke-GameNpm([string[]]$taskArguments) {
    $taskNpm = Join-Path $taskNodeHome 'node_modules/npm/bin/npm-cli.js'
    if (-not (Test-Path -LiteralPath $taskNpm)) { throw 'The local Node runtime is incomplete (npm is missing). Remove .runtime/node and rerun setup.bat.' }
    & $taskNode $taskNpm @taskArguments
    if ($LASTEXITCODE -ne 0) { throw "npm $($taskArguments -join ' ') failed. Check the error above, your Internet connection and available disk space, then rerun setup.bat." }
}
try {
    Set-Location -LiteralPath $taskRoot
    $taskNativeArch = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
    $taskArchitecture = switch ($taskNativeArch.ToUpperInvariant()) { 'AMD64' { 'x64' } 'ARM64' { 'arm64' } default { throw 'This game requires 64-bit Windows (x64 or ARM64).' } }
    New-Item -ItemType Directory -Path $taskRuntime -Force | Out-Null
    if (-not (Test-LocalNode)) {
        Write-Host 'Downloading a portable Node.js LTS runtime into this game folder...'
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        $taskIndex = Invoke-RestMethod 'https://nodejs.org/dist/index.json' -TimeoutSec 60
        # dist/index.json retains EOL releases marked LTS; filter with the official release schedule.
        $taskSchedule = Invoke-RestMethod 'https://raw.githubusercontent.com/nodejs/Release/main/schedule.json' -TimeoutSec 60
        $taskToday = [DateTime]::UtcNow.Date
        $taskReleases = @($taskIndex | Where-Object {
            $taskMajor = ($_.version -split '\.')[0]
            $taskLife = $taskSchedule.PSObject.Properties[$taskMajor]
            $_.lts -and $taskLife -and ([DateTime]$taskLife.Value.end) -gt $taskToday -and $_.files -contains "win-$taskArchitecture-zip" -and [version]($_.version.TrimStart('v')) -ge [version]'22.12.0'
        } | Sort-Object { [version]($_.version.TrimStart('v')) } -Descending)
        $taskRelease = $taskReleases | Where-Object { $_.version -match '^v24\.' } | Select-Object -First 1
        if (-not $taskRelease) { $taskRelease = $taskReleases | Select-Object -First 1 }
        if (-not $taskRelease) { throw 'No supported Windows Node.js LTS release was found in the official release index.' }
        $taskArchiveName = "node-$($taskRelease.version)-win-$taskArchitecture.zip"
        $taskBaseUrl = "https://nodejs.org/dist/$($taskRelease.version)"
        $taskChecksums = (Invoke-WebRequest "$taskBaseUrl/SHASUMS256.txt" -UseBasicParsing -TimeoutSec 60).Content
        $taskChecksum = [regex]::Match($taskChecksums, "(?m)^([a-fA-F0-9]{64})\s+" + [regex]::Escape($taskArchiveName) + '\r?$')
        if (-not $taskChecksum.Success) { throw 'The official Node.js checksum list does not contain the selected ZIP.' }
        $taskStaging = Join-Path $taskRuntime ('setup-' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $taskStaging | Out-Null
        $taskArchive = Join-Path $taskStaging $taskArchiveName
        Invoke-WebRequest "$taskBaseUrl/$taskArchiveName" -OutFile $taskArchive -UseBasicParsing -TimeoutSec 300
        $taskActualHash = Get-GameFileHash $taskArchive
        if ($taskActualHash -ine $taskChecksum.Groups[1].Value) { throw 'Node.js download failed SHA256 verification. Nothing was installed; rerun setup.bat to download again.' }
        Expand-Archive -LiteralPath $taskArchive -DestinationPath $taskStaging
        $taskExtracted = Join-Path $taskStaging ([IO.Path]::GetFileNameWithoutExtension($taskArchiveName))
        if (-not (Test-Path -LiteralPath (Join-Path $taskExtracted 'node.exe'))) { throw 'The verified Node.js archive could not be extracted.' }
        # Replace the runtime only after the complete download, checksum and extraction succeed.
        if (Test-Path -LiteralPath $taskNodeHome) {
            $taskResolvedNode = [IO.Path]::GetFullPath($taskNodeHome)
            if ($taskResolvedNode -ne [IO.Path]::GetFullPath((Join-Path $taskRoot '.runtime/node'))) { throw 'Unsafe runtime path.' }
            Remove-Item -LiteralPath $taskResolvedNode -Recurse -Force
        }
        Move-Item -LiteralPath $taskExtracted -Destination $taskNodeHome
        $taskReleaseMajor = ($taskRelease.version -split '\.')[0]
        @{ version = $taskRelease.version.TrimStart('v'); supportedUntil = $taskSchedule.PSObject.Properties[$taskReleaseMajor].Value.end; architecture = $taskArchitecture } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskNodeHome 'property-empire-runtime.json') -Encoding UTF8
        if (-not (Test-LocalNode)) { throw 'The portable runtime could not run on this Windows computer.' }
        Write-Host "Installed Node.js $($taskRelease.version) ($taskArchitecture)."
    } else { Write-Host 'Using the portable Node.js runtime in this game folder.' }
    $env:PATH = "$taskNodeHome;$taskOriginalPath"
    if ($RuntimeOnly) { return }
    $taskOutputs = @('apps/web/dist/index.html', 'apps/server/dist/index.js') | ForEach-Object { Join-Path $taskRoot $_ }
    $taskInputs = @(Get-BuildInputs)
    $taskFingerprint = Get-BuildFingerprint $taskInputs
    $taskStatePath = Join-Path $taskRuntime 'build-state.json'
    $taskRebuild = @($taskOutputs | Where-Object { -not (Test-Path -LiteralPath $_) }).Count -gt 0
    if ($StampBuild) {
        if ($taskRebuild) { throw 'Cannot record a build: the browser or server build is missing.' }
        # A build performed outside setup can replace the old fingerprint,
        # but both entry bundles must still be newer than every source input.
        $taskBuilt = ($taskOutputs | ForEach-Object { Get-Item -LiteralPath $_ } | Sort-Object LastWriteTimeUtc | Select-Object -First 1).LastWriteTimeUtc
        if (@($taskInputs | Where-Object { $_.LastWriteTimeUtc -gt $taskBuilt }).Count -gt 0) {
            throw 'Cannot record a stale build: game sources are newer than the browser or server bundle. Run npm run build, then package again.'
        }
    } elseif (-not $taskRebuild) {
        if (Test-Path -LiteralPath $taskStatePath) {
            try {
                $taskState = Get-Content -LiteralPath $taskStatePath -Raw | ConvertFrom-Json
                $taskRebuild = $taskState.format -ne 2 -or $taskState.fingerprint -ne $taskFingerprint -or $taskState.outputFingerprint -ne (Get-OutputFingerprint)
            } catch { $taskRebuild = $true }
        } else {
            $taskBuilt = ($taskOutputs | ForEach-Object { Get-Item -LiteralPath $_ } | Sort-Object LastWriteTimeUtc | Select-Object -First 1).LastWriteTimeUtc
            $taskRebuild = @($taskInputs | Where-Object { $_.LastWriteTimeUtc -gt $taskBuilt }).Count -gt 0
        }
    }
    $taskPackage = Get-Content -LiteralPath (Join-Path $taskRoot 'package.json') -Raw | ConvertFrom-Json
    $taskDependenciesReady = $true
    foreach ($taskDependency in $taskPackage.dependencies.PSObject.Properties.Name) {
        if (-not (Test-Path -LiteralPath (Join-Path $taskRoot "node_modules/$taskDependency/package.json"))) { $taskDependenciesReady = $false; break }
    }
    if (-not $StampBuild) {
        if ($taskRebuild) {
            Write-Host 'Installing the tools needed to build the game...'
            Invoke-GameNpm @('ci', '--include=dev', '--no-audit', '--no-fund', '--cache', (Join-Path $taskRuntime 'npm-cache'))
            Write-Host 'Building Property Empire...'
            Invoke-GameNpm @('run', 'build')
        } elseif (-not $taskDependenciesReady) {
            Write-Host 'Installing game runtime dependencies...'
            Invoke-GameNpm @('ci', '--omit=dev', '--no-audit', '--no-fund', '--cache', (Join-Path $taskRuntime 'npm-cache'))
        }
    }
    @{ fingerprint = $taskFingerprint; outputFingerprint = (Get-OutputFingerprint); format = 2 } | ConvertTo-Json | Set-Content -LiteralPath $taskStatePath -Encoding UTF8
    Write-Host 'Setup complete. Double-click run.bat to play. Saved games are kept in data\saves.' -ForegroundColor Green
} catch {
    Write-Host "Setup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Rerun setup.bat after fixing the problem. Existing saved games are retained.'
    exit 1
} finally {
    $env:PATH = $taskOriginalPath
    $ProgressPreference = $taskOriginalProgress
    Set-Location -LiteralPath $taskOriginalLocation.Path
    if ($taskStaging -and (Test-Path -LiteralPath $taskStaging)) {
        $taskResolvedStaging = [IO.Path]::GetFullPath($taskStaging)
        $taskRuntimePrefix = [IO.Path]::GetFullPath($taskRuntime).TrimEnd('\') + '\'
        if ($taskResolvedStaging.StartsWith($taskRuntimePrefix, [StringComparison]::OrdinalIgnoreCase)) { Remove-Item -LiteralPath $taskResolvedStaging -Recurse -Force -ErrorAction SilentlyContinue }
    }
}
