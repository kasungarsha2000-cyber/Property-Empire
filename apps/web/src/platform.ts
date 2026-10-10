import {Capacitor,SystemBars,SystemBarsStyle} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Haptics,ImpactStyle,NotificationType} from '@capacitor/haptics';
import {Share} from '@capacitor/share';

/** Native Android shell (Capacitor) or a regular browser tab. */
export const isNative=Capacitor.isNativePlatform();
export const platformName=Capacitor.getPlatform();
export const hapticsSupported=isNative||(typeof navigator!=='undefined'&&'vibrate' in navigator&&/Android/i.test(navigator.userAgent));

export type HapticKind='light'|'medium'|'heavy'|'success'|'warning'|'error';
let hapticsEnabled=true,lastHaptic=0;
export function setHaptics(enabled:boolean){hapticsEnabled=enabled;}
/** Meaningful moments only; calls closer than 60 ms are merged so animations never buzz continuously. */
export function haptic(kind:HapticKind){
 if(!hapticsEnabled||!hapticsSupported)return;
 const now=performance.now();if(now-lastHaptic<60)return;lastHaptic=now;
 if(isNative){
  const task=kind==='success'||kind==='warning'||kind==='error'?Haptics.notification({type:{success:NotificationType.Success,warning:NotificationType.Warning,error:NotificationType.Error}[kind]}):Haptics.impact({style:{light:ImpactStyle.Light,medium:ImpactStyle.Medium,heavy:ImpactStyle.Heavy}[kind]});
  void task.catch(()=>{});return;
 }
 try{navigator.vibrate?.({light:8,medium:14,heavy:24,success:[10,40,14],warning:[18,50,18],error:[30,60,30]}[kind]);}catch{}
}

export interface PlatformHandlers {
 /** Close the topmost layer. Return false when there is nothing left to close. */
 back:()=>boolean;
 pause:()=>void;
 resume:()=>void;
}

let armed=false,handlers:PlatformHandlers|null=null;
/** Browser back uses one sentinel history entry while anything inside the game can be closed. */
export function armBack(needed:boolean){if(isNative||!needed||armed)return;history.pushState({propertyEmpire:true},'');armed=true;}

export async function initPlatform(next:PlatformHandlers){
 handlers=next;
 document.documentElement.dataset.platform=platformName;
 if(isNative){
  await App.addListener('backButton',()=>{if(!handlers?.back())void App.minimizeApp().catch(()=>App.exitApp());});
  await App.addListener('appStateChange',({isActive})=>{if(isActive)handlers?.resume();else handlers?.pause();});
  void SystemBars.setStyle({style:SystemBarsStyle.Light}).catch(()=>{});
 }else{
  addEventListener('popstate',()=>{armed=false;if(handlers?.back())armBack(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)handlers?.pause();else handlers?.resume();});
  addEventListener('pagehide',()=>handlers?.pause());
 }
}

/** Native share sheet in the app; clipboard in browsers. Returns how the text was delivered. */
export async function shareText(title:string,text:string):Promise<'shared'|'copied'|'failed'>{
 if(isNative){try{await Share.share({title,text,dialogTitle:title});return'shared';}catch{return'failed';}}
 if(typeof navigator.share==='function'){try{await navigator.share({title,text});return'shared';}catch(error){if(error instanceof DOMException&&error.name==='AbortError')return'failed';}}
 try{await navigator.clipboard.writeText(text);return'copied';}catch{return'failed';}
}
