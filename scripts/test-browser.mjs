import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const bundled=join(process.env.USERPROFILE??'', '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const local=join(process.cwd(),'.venv/Scripts/python.exe');
const executable=process.env.EMPIRE_PYTHON||(existsSync(local)?local:existsSync(bundled)?bundled:'python');
const fixtures=spawnSync(process.execPath,['--import','tsx','tests/browser-fixtures.ts'],{stdio:'inherit'});
if(fixtures.status!==0)process.exit(fixtures.status??1);
for(const script of ['tests/browser_smoke.py','tests/deeds_review.py','tests/ownership_trade_review.py','tests/camera_events_review.py','tests/turn_presentation_review.py','tests/match_focus_review.py','tests/game_feel_review.py','tests/compact_feedback_review.py','tests/stable_turn_review.py','tests/opponent_models_review.py','tests/board_moments_review.py','tests/unified_ui_review.py','tests/living_city_review.py']){
 const result=spawnSync(executable,[script],{stdio:'inherit'});
 if(result.error)console.error(result.error.message);
 if(result.status!==0)process.exit(result.status??1);
}
const reduced=spawnSync(executable,['tests/turn_presentation_review.py'],{stdio:'inherit',env:{...process.env,EMPIRE_TEST_REDUCED_ONLY:'1'}});
if(reduced.status!==0)process.exit(reduced.status??1);
