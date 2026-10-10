// Builds the web app, copies it into the Android project and assembles an APK with the Gradle wrapper.
// Usage: node scripts/android-build.mjs [debug|release]   (requires JDK 21 and the Android SDK; see docs/ANDROID.md)
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
const variant=process.argv[2]==='release'?'Release':'Debug';
const run=(command,args,options={})=>{const result=spawnSync(command,args,{stdio:'inherit',shell:process.platform==='win32',...options});if(result.status!==0)process.exit(result.status??1);};
if(!process.env.ANDROID_HOME&&!process.env.ANDROID_SDK_ROOT&&!existsSync(join('android','local.properties'))){
 console.error('Android SDK not found. Install Android Studio (or the command-line tools), then set ANDROID_HOME or create android/local.properties with sdk.dir=<path>.');
 process.exit(1);
}
run('npm',['run','build']);
run('npx',['cap','sync','android']);
run(process.platform==='win32'?'gradlew.bat':'./gradlew',[`assemble${variant}`],{cwd:'android'});
console.log(`APK: android/app/build/outputs/apk/${variant.toLowerCase()}/app-${variant.toLowerCase()}${variant==='Release'?'-unsigned':''}.apk`);
