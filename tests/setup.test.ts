import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, renameSync, existsSync, utimesSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';

// Removing local-runtime preference or folder ownership must break these real launcher checks.
const windows = process.platform === 'win32';
const roots: string[] = [];
const processes: number[] = [];
const project = resolve('.');
async function freePort() {
  const server = createServer();
  await new Promise<void>(ok => server.listen(0, '127.0.0.1', ok));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>(ok => server.close(() => ok()));
  return port;
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'Property Empire setup ')); roots.push(root);
  for (const dir of ['scripts', '.runtime/node', 'apps/web/dist', 'apps/server/dist', 'data/saves']) mkdirSync(join(root, dir), { recursive: true });
  for (const file of ['start-game.ps1', 'setup-game.ps1', 'package-game.ps1']) {
    const source = join(project, 'scripts', file);
    if (existsSync(source)) copyFileSync(source, join(root, 'scripts', file));
  }
  copyFileSync(process.execPath, join(root, '.runtime/node/node.exe'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'setup-fixture', version: '1.0.0', type: 'module', dependencies: {} }));
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ name: 'setup-fixture', version: '1.0.0', lockfileVersion: 3, packages: { '': { name: 'setup-fixture', version: '1.0.0' } } }));
  writeFileSync(join(root, 'data/saves/KEEP.json'), 'retained');
  writeFileSync(join(root, 'apps/web/dist/index.html'), '<title>Property Empire</title>');
  writeFileSync(join(root, 'apps/server/dist/index.js'), `import http from 'node:http'; const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/health'?'application/json':'text/html');res.end(req.url==='/health'?JSON.stringify({ok:true}):'<title>Property Empire</title>');});server.listen(Number(process.env.PORT),'127.0.0.1');`);
  // Preserve a genuinely newer build timestamp despite Date's millisecond
  // precision and NTFS's finer file-write timestamps.
  const built = new Date(Math.ceil(Math.max(Date.now(), ...['package.json', 'package-lock.json'].map(file => statSync(join(root, file)).mtimeMs))) + 2);
  for (const output of ['apps/web/dist/index.html', 'apps/server/dist/index.js']) utimesSync(join(root, output), built, built);
  return root;
}
function launch(root: string, port: number | string) {
  const result = spawnSync(join(process.env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts/start-game.ps1'), '-NoBrowser'], {
    encoding: 'utf8', timeout: 50000, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port), PATH: join(process.env.SystemRoot!, 'System32'), PSModulePath: join(process.env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/Modules') },
  });
  const state = join(root, '.runtime', `server-${port}.json`);
  if (existsSync(state)) { const pid = JSON.parse(readFileSync(state, 'utf8').replace(/^\uFEFF/, '')).pid; if (pid && !processes.includes(pid)) processes.push(pid); }
  return result;
}
afterEach(() => {
  for (const pid of processes.splice(0)) { try { execFileSync(join(process.env.SystemRoot!, 'System32/taskkill.exe'), ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
describe.skipIf(!windows)('portable Windows launcher', () => {
  it('runs a prebuilt game using only the folder runtime, then reuses its own server', async () => {
    const root = fixture(), port = await freePort();
    const first = launch(root, port);
    expect(first.error).toBeUndefined();
    expect(first.status, first.stdout + first.stderr).toBe(0);
    expect(first.stdout).toContain('is running');
    const second = launch(root, port);
    expect(second.status, second.stdout + second.stderr).toBe(0);
    expect(second.stdout).toContain('already running');
    expect(readFileSync(join(root, 'data/saves/KEEP.json'), 'utf8')).toBe('retained');
  }, 60000);
  it('rejects an occupied port belonging to another extracted copy', async () => {
    const first = fixture(), second = fixture(), port = await freePort();
    const start = launch(first, port);
    expect(start.status, start.stdout + start.stderr).toBe(0);
    const conflict = launch(second, port);
    expect(conflict.status).toBe(1);
    expect(conflict.stdout).toContain('another');
    expect(conflict.stdout).toContain('PORT');
  }, 60000);
  it('runs after the whole extracted folder is moved to another path with spaces', async () => {
    const original = fixture(); const moved = original + ' moved folder';
    renameSync(original, moved); roots[roots.indexOf(original)] = moved;
    const result = launch(moved, await freePort());
    expect(result.status, result.stdout + result.stderr).toBe(0);
  }, 60000);
  it('rejects an invalid port without starting a server', () => {
    const result = launch(fixture(), '70000');
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('PORT must be between');
  });
  it('packages builds and production dependencies while omitting saves and development files', () => {
    const root = fixture();
    // An external fresh build may supersede the previous setup fingerprint.
    writeFileSync(join(root, '.runtime/build-state.json'), JSON.stringify({ format: 2, fingerprint: 'previous-source', outputFingerprint: 'previous-build' }));
    cpSync(join(dirname(process.execPath), 'node_modules/npm'), join(root, '.runtime/node/node_modules/npm'), { recursive: true });
    for (const dir of ['.git', 'test-artifacts', '.venv', 'node_modules/vite']) { mkdirSync(join(root, dir), { recursive: true }); writeFileSync(join(root, dir, 'PRIVATE.txt'), 'do not share'); }
    for (const file of ['setup.bat', 'run.bat']) copyFileSync(join(project, file), join(root, file));
    const output = join(root, 'share.zip');
    const result = spawnSync(join(process.env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts/package-game.ps1'), '-SkipBuild', '-OutputPath', output], { encoding: 'utf8', timeout: 60000 });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const listing = execFileSync('powershell.exe', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.IO.Compression.FileSystem; $archive=[IO.Compression.ZipFile]::OpenRead('${output.replaceAll("'", "''")}'); try {$archive.Entries.FullName}finally{$archive.Dispose()}`], { encoding: 'utf8' }).replaceAll('\\', '/');
    expect(listing).toContain('PropertyEmpire3D/apps/web/dist/index.html');
    expect(listing).toContain('PropertyEmpire3D/apps/server/dist/index.js');
    expect(listing).toContain('PropertyEmpire3D/package-lock.json');
    expect(listing).toContain('PropertyEmpire3D/.runtime/build-state.json');
    expect(listing).toContain('PropertyEmpire3D/setup.bat');
    expect(listing).not.toContain('PRIVATE.txt');
    expect(listing).not.toContain('KEEP.json');
    expect(listing).not.toContain('.runtime/node/node.exe');
  }, 90000);
  it('rejects SkipBuild when a source input is newer than the bundled JavaScript', () => {
    const root = fixture(), output = join(root, 'stale-share.zip');
    const input = join(root, 'package.json');
    const packageData = JSON.parse(readFileSync(input, 'utf8')); packageData.description = 'changed after building';
    writeFileSync(input, JSON.stringify(packageData));
    const edited = new Date(Date.now() + 3000); utimesSync(input, edited, edited);
    const result = spawnSync(join(process.env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts/package-game.ps1'), '-SkipBuild', '-OutputPath', output], { encoding: 'utf8', timeout: 20000 });
    expect(result.status, result.stdout + result.stderr).toBe(1);
    expect(result.stdout).toContain('stale build');
    expect(existsSync(output)).toBe(false);
    expect(existsSync(join(root, '.runtime/build-state.json'))).toBe(false);
    expect(readFileSync(join(root, 'data/saves/KEEP.json'), 'utf8')).toBe('retained');
  });
  it('detects modified build content even when the source fingerprint stays unchanged', () => {
    const root = fixture(), powershell = join(process.env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe');
    const argumentsForSetup = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts/setup-game.ps1')];
    const stamp = spawnSync(powershell, [...argumentsForSetup, '-StampBuild'], { encoding: 'utf8', timeout: 20000 });
    expect(stamp.status, stamp.stdout + stamp.stderr).toBe(0);
    writeFileSync(join(root, 'apps/server/dist/index.js'), 'throw new Error("damaged built server");');
    const repair = spawnSync(powershell, argumentsForSetup, { encoding: 'utf8', timeout: 20000 });
    // This fixture intentionally has no npm: detecting damage must reach the rebuild path.
    expect(repair.status, repair.stdout + repair.stderr).toBe(1);
    expect(repair.stdout).toContain('Installing the tools needed to build');
    expect(repair.stdout).toContain('npm is missing');
  });
});
