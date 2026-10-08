import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const bundled=join(process.env.USERPROFILE??'', '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const local=join(process.cwd(),'.venv/Scripts/python.exe');
const executable=process.env.EMPIRE_PYTHON||(existsSync(local)?local:existsSync(bundled)?bundled:'python');
const result=spawnSync(executable,['tests/browser_smoke.py'],{stdio:'inherit'});
if(result.error)console.error(result.error.message);process.exit(result.status??1);
