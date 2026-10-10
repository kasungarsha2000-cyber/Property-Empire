import {PLAYER_COLORS} from '../../../../packages/core/board';
import type {Game,Player} from '../../../../packages/core/types';

export const esc=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const money=(n:number)=>`$${n.toLocaleString('en-US')}`;
export const signed=(n:number)=>`${n<0?'−':'+'}${money(Math.abs(n))}`;
export const plural=(n:number,word:string,many=`${word}s`)=>`${n} ${n===1?word:many}`;

/** One stroke-based icon family keeps the chrome quiet next to the board. */
const ICONS:Record<string,string>={
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',
 back:'<path d="M15 5l-7 7 7 7"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 dice:'<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path stroke-width="2.6" d="M8.5 8.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01"/>',
 home:'<path d="M4 10.5 12 4l8 6.5V20h-5v-5.5H9V20H4Z"/>',
 deeds:'<rect x="4" y="3.5" width="12" height="15" rx="2"/><path d="M8 7.5h4M8 11h4M8 21h10a2 2 0 0 0 2-2V8"/>',
 trade:'<path d="M5 8h13.5L15 4.5M19 16H5.5L9 19.5"/>',
 bank:'<path d="M3.5 9 12 4l8.5 5M5.5 10v7.5M10 10v7.5M14 10v7.5M18.5 10v7.5M3.5 20.5h17"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
 help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4M12 16.8h.01"/>',
 save:'<path d="M5 4h11l3 3v13H5Z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
 play:'<path d="M8 5.5v13l10-6.5Z"/>',
 wifi:'<path d="M3.5 9.5a12 12 0 0 1 17 0M6.5 12.5a8 8 0 0 1 11 0M9.5 15.5a4 4 0 0 1 5 0M12 19h.01"/>',
 join:'<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
 share:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 minus:'<path d="M5 12h14"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
 unlock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 7.7-1.5"/>',
 jail:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
 card:'<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.3 2.5c-.5.2-.8.6-.8 1.1v.3M12 16.5h.01"/>',
 cash:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
 warning:'<path d="M12 4 21 19.5H3Z"/><path d="M12 10v4M12 17h.01"/>',
 info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
 trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5A3.5 3.5 0 0 1 15.5 11M12 13v4M8.5 20h7M10 17h4"/>',
 target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5"/>',
 reset:'<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/>',
 sound:'<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
 build:'<path d="M3.5 20V11l6-5 6 5v9Z"/><path d="M8 20v-4.5h3V20M18.5 6v5M16 8.5h5"/>',
 sell:'<path d="M3.5 20V11l6-5 6 5v9Z"/><path d="M8 20v-4.5h3V20M16 8.5h5"/>',
 history:'<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4M12 8v4.5l3 2"/>',
 user:'<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
 users:'<circle cx="9" cy="9" r="3.2"/><path d="M3 19.5a6 6 0 0 1 12 0M15.5 6a3 3 0 0 1 0 6M17 19.5a6 6 0 0 0-2.5-4.9"/>',
 bot:'<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4.5V8M9.5 13h.01M14.5 13h.01M9.5 16.5h5"/>',
 offline:'<path d="M3.5 9.5a12 12 0 0 1 5-3M12 6.5a12 12 0 0 1 8.5 3M6.5 12.5a8 8 0 0 1 3-1.7M12 19h.01M4 4l16 16"/>',
 gavel:'<path d="m13.5 4.5 6 6M11 7l6 6M12.2 5.8l-4.4 4.4 6 6 4.4-4.4M10.8 12.5 4 19.3"/>',
 coin:'<circle cx="12" cy="12" r="8"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4.1 0 1.1-1.1 2-2.5 2-1.2 0-2.1-.5-2.6-1.3M12 6.5V8M12 16v1.5"/>',
 exit:'<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 16l4-4-4-4M18 12H9"/>',
 eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
 grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
 restore:'<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
 flag:'<path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11"/>',
 pause:'<path d="M9 5.5v13M15 5.5v13"/>',
};
export function icon(name:string,label?:string){
 return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${label?`role="img" aria-label="${esc(label)}"`:'aria-hidden="true"'}>${ICONS[name]??ICONS.home}</svg>`;
}

/** Original pawn silhouettes matching the 3D tokens. */
const TOKEN_PATHS=[
 'M3 14h18v4H3ZM6 14l2-6h8l3 6M8 18v2m10-2v2M8 10h8',
 'M8 16V9c0-4 4-7 4-7s4 3 4 7v7ZM8 12l-4 6h4m8-6 4 6h-4M10 19v3m4-3v3M11 9h2',
 'M12 3v13M10 4 4 14h6Zm4 2 6 8h-6ZM3 17h18l-4 4H7Z',
 'M6 5h12v7H6ZM8 12v8h8v-8M3 14v4m18-4v4M9 8h.01m6 0h.01M12 5V2M8 20v2m8-2v2',
 'm3 7 5 5 4-8 4 8 5-5-2 13H5ZM6 17h12',
 'M3 10c0-4 4-6 9-6s9 2 9 6-4 6-9 6-9-2-9-6ZM9 16v4h6v-4M3 8 1 5v10l2-3',
 'M5 8V3l5 4h4l5-4v5c3 8-1 13-7 13S2 16 5 8ZM8 12h.01m8 0h.01m-6 4 2 1 2-1',
 'm3 9 4-5h10l4 5-9 12ZM3 9h18M7 4l5 17 5-17'
];
export function tokenIcon(token:number){
 return `<svg class="icon token-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${TOKEN_PATHS[token]??TOKEN_PATHS[0]}"/></svg>`;
}
export const COLOR_NAMES=['Blue','Coral','Mint','Lavender','Gold','Teal','Rose','Olive'];
export const playerToken=(g:Game,p:Player)=>p.token??g.players.indexOf(p);
export const playerColor=(g:Game,p:Player)=>PLAYER_COLORS[playerToken(g,p)];
export function avatar(g:Game,p:Player,size:'sm'|'md'|'lg'='md'){
 return `<span class="avatar avatar-${size}" style="--player:${playerColor(g,p)}">${tokenIcon(playerToken(g,p))}</span>`;
}

/** Replace markup only when it changed, keeping scroll positions of keyed regions. */
export function patch(el:HTMLElement,html:string){
 if(el.dataset.html===html)return false;
 const scrolls=new Map<string,number>();
 el.querySelectorAll<HTMLElement>('[data-scroll]').forEach(node=>scrolls.set(node.dataset.scroll!,node.scrollTop));
 const focused=document.activeElement instanceof HTMLElement&&el.contains(document.activeElement)?document.activeElement.dataset.focusKey:undefined;
 el.innerHTML=html;el.dataset.html=html;
 el.querySelectorAll<HTMLElement>('[data-scroll]').forEach(node=>{const top=scrolls.get(node.dataset.scroll!);if(top)node.scrollTop=top;});
 if(focused)el.querySelector<HTMLElement>(`[data-focus-key="${focused}"]`)?.focus({preventScroll:true});
 return true;
}
