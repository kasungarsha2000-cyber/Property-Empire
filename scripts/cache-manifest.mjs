import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root='apps/web/dist';
async function files(dir,prefix=''){const result=[];for(const item of await readdir(dir,{withFileTypes:true})){const relative=prefix+item.name;if(item.isDirectory())result.push(...await files(join(dir,item.name),relative+'/'));else if(item.name!=='sw.js')result.push('/'+relative);}return result;}
const assets=await files(root),fingerprint=createHash('sha256').update(assets.join('|')).digest('hex').slice(0,12);
const source=await readFile('apps/web/public/sw.js','utf8');
await writeFile(join(root,'sw.js'),source.replace("const CACHE='property-empire-v1';",`const CACHE='property-empire-${fingerprint}';`).replace("const PRECACHE=['/'];",`const PRECACHE=${JSON.stringify(['/',...assets])};`));
console.log(`Offline cache manifest: ${assets.length} local assets.`);
