"""Launch the actual share ZIP after moving it, with global Node/npm off PATH."""
import json,os,re,socket,subprocess,urllib.request,zipfile,uuid
from pathlib import Path
project=Path.cwd().resolve();archive=project.parent/'PropertyEmpire3D-Windows.zip'
run_id=uuid.uuid4().hex[:8]
staging=(project/'test-artifacts'/f'Extracted friend copy {run_id}').resolve()
assert staging.is_relative_to(project/'test-artifacts') and not staging.exists()
with zipfile.ZipFile(archive) as z:
 names=z.namelist()
 assert any(n.endswith('/.runtime/node/node.exe') for n in names)
 assert any(n.endswith('/node_modules/ws/package.json') for n in names)
 assert not any(n.startswith(('PropertyEmpire3D/data/','PropertyEmpire3D/.git/','PropertyEmpire3D/.venv/','PropertyEmpire3D/node_modules/vite/')) for n in names)
 for name in names:assert (staging/name).resolve().is_relative_to(staging),name
 z.extractall(staging)
moved=(project/'test-artifacts'/f'Moved friend & game folder {run_id}').resolve()
assert moved.is_relative_to(project/'test-artifacts') and not moved.exists();staging.rename(moved)
root=moved/'PropertyEmpire3D';env=os.environ.copy()
system=Path(os.environ['SystemRoot']);env['PATH']=os.pathsep.join(map(str,[system/'System32',system,system/'System32/WindowsPowerShell/v1.0']))
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
env['PORT']=str(port);cmd=str(system/'System32/cmd.exe');ps=str(system/'System32/WindowsPowerShell/v1.0/powershell.exe')
def batch(name,args=[]):
 result=subprocess.run([cmd,'/d','/c',name,*args],cwd=root,env=env,input='\n',capture_output=True,text=True,timeout=120)
 assert result.returncode==0,result.stdout+result.stderr
 return result.stdout
state=None
try:
 setup=batch('setup.bat');assert 'Using the portable Node.js runtime' in setup and 'Installing' not in setup and 'Downloading' not in setup,setup
 launch=batch('run.bat',['-NoBrowser']);assert 'is running' in launch,launch
 state=json.loads((root/f'.runtime/server-{port}.json').read_text(encoding='utf-8-sig'));assert Path(state['root']).resolve()==root.resolve()
 base=f'http://127.0.0.1:{port}'
 def get(path):return urllib.request.urlopen(base+path,timeout=5).read().decode('utf-8')
 health=json.loads(get('/health'));assert health['ok'] and health['rooms']==0,health
 html=get('/');assert 'Property Empire' in html
 assets=re.findall(r'(?:src|href)="(/assets/[^\"]+)"',html)
 for asset in assets:assert len(urllib.request.urlopen(base+asset,timeout=5).read())>0
 assert 'precache' in get('/sw.js').lower() or 'cache' in get('/sw.js').lower()
 # Exercise the packaged ws module and server persistence, not a placeholder host.
 script="""import {WebSocket} from 'ws';const ws=new WebSocket('ws://127.0.0.1:'+process.env.PORT+'/ws',{origin:'http://127.0.0.1:'+process.env.PORT});let saved=false;ws.on('open',()=>ws.send(JSON.stringify({type:'CREATE',name:'Friend',token:0,botCount:1})));ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='SESSION')ws.send(JSON.stringify({type:'SAVE'}));if(m.type==='ERROR')throw new Error(m.error);if(m.type==='SAVED'){saved=true;ws.close()}});setTimeout(()=>{if(!saved)throw new Error('No packaged host save');process.exit(0)},2000);"""
 result=subprocess.run([str(root/'.runtime/node/node.exe'),'--input-type=module','-e',script],cwd=root,env=env,capture_output=True,text=True,timeout=15);assert result.returncode==0,result.stderr
 assert list((root/'data/saves').glob('*.json'))
 reopen=batch('run.bat',['-NoBrowser']);assert 'already running' in reopen,reopen
 print(json.dumps({'result':'PASS','zip_MB':round(archive.stat().st_size/1048576,1),'moved_folder':str(root),'global_node_on_path':False,'health':health,'asset_requests':len(assets),'saved_room':True,'reused_host':True}),flush=True)
finally:
 if state:
  # Stop only this test's recorded local-runtime process after checking identity.
  expected=str(root/'.runtime/node/node.exe').replace("'","''");started=state['started'].replace("'","''")
  check=f"$taskP=Get-Process -Id {int(state['pid'])} -ErrorAction SilentlyContinue;if($taskP -and $taskP.Path -ieq '{expected}' -and $taskP.StartTime.ToUniversalTime().ToString('o') -eq '{started}'){{Stop-Process -Id $taskP.Id}}"
  subprocess.run([ps,'-NoProfile','-Command',check],capture_output=True,timeout=15)
