import {BOARD,groupSpaces,type Space} from '../../../packages/core/board';
import {rentFor} from '../../../packages/core/engine';
import type {Game} from '../../../packages/core/types';

const money=(value:number)=>`$${value.toLocaleString('en-US')}`;
export function deedFinancials(game:Game,index:number) {
 const space=BOARD[index],property=game.properties[index],group=groupSpaces(index);
 const count=property.owner?group.filter(s=>game.properties[s.index].owner===property.owner).length:0;
 const complete=count===group.length&&count>0,active=!!property.owner&&!property.mortgaged;
 let rows:{label:string;value:string;active:boolean}[];
 if(space.type==='street')rows=[
  {label:'Base rent',value:money(space.rents[0]),active:active&&property.level===0&&!complete},
  {label:'Full color group',value:money(space.rents[0]*2),active:active&&property.level===0&&complete},
  ...space.rents.slice(1).map((value,i)=>({label:i===4?'Hotel':`${i+1} house${i?'s':''}`,value:money(value),active:active&&property.level===i+1}))
 ];
 else if(space.type==='transport')rows=[1,2,3,4].map(n=>({label:`${n} station${n>1?'s':''}`,value:money(25*2**(n-1)),active:active&&count===n}));
 else rows=[{label:'One utility',value:'4× dice',active:active&&count===1},{label:'Both utilities',value:'10× dice',active:active&&count===2}];
 const preview=space.type==='street'?space.rents[0]:space.type==='transport'?25:4;
 const amount=property.owner?rentFor(game,index,1):preview;
 return {rows,count,groupSize:group.length,rent:property.mortgaged?'$0':space.type==='utility'?`${amount}×`:money(amount),rentLabel:property.mortgaged?'Rent paused':property.owner?'Current rent':'Starting rent'};
}

export type BuildingKind='terrace'|'waterfront'|'studio'|'market'|'office'|'garden'|'mansion'|'tower'|'station'|'solar'|'water';
export function propertyDesign(space:Space) {
 const kinds:Record<string,BuildingKind>={amber:'terrace',sky:'waterfront',rose:'studio',orange:'market',red:'office',yellow:'garden',green:'mansion',blue:'tower',transport:'station'};
 const kind=space.type==='utility'?(space.index===12?'solar':'water'):kinds[space.group]??'terrace';
 const heights:Record<BuildingKind,number>={terrace:.35,waterfront:.43,studio:.38,market:.31,office:.49,garden:.32,mansion:.40,tower:.66,station:.29,solar:.27,water:.50};
 return {kind,color:space.color,height:heights[kind]+(space.index%4)*.025,width:kind==='tower'?.34:.54+(space.index%4)*.02,depth:.27,roof:['terrace','waterfront','mansion','garden'].includes(kind),roofColor:kind==='terrace'?'#654839':kind==='garden'?'#517B70':'#345868'};
}

const esc=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** Original vector artwork uses the same district architecture and palette as board miniatures. */
export function propertyArtwork(index:number,level=0) {
 const space=BOARD[index],design=propertyDesign(space),kind=design.kind,color=design.color;
 const background=kind==='waterfront'?'#E0F1F3':kind==='garden'||kind==='mansion'?'#E7EFE2':'#F0EBDF';
 const variant=index%4;
 const height=(kind==='tower'?130:kind==='office'?100:kind==='mansion'?76:kind==='station'?57:76)+variant*4;
 const width=(kind==='tower'?85:kind==='mansion'?142:118)+variant*4,x=(400-width-40)/2,base=183,top=base-height;
 const rect=(xx:number,yy:number,w:number,h:number,fill:string,r=0)=>`<rect x="${xx}" y="${yy}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
 const poly=(points:string,fill:string)=>`<polygon points="${points}" fill="${fill}"/>`;
 const tree=(xx:number,yy:number,size:number)=>`<path d="M${xx} ${yy}v-${size}" stroke="#80634A" stroke-width="5"/><circle cx="${xx}" cy="${yy-size-10}" r="${size}" fill="#6D976D"/><circle cx="${xx-8}" cy="${yy-size-17}" r="${size*.64}" fill="#91B685"/>`;
 let building='';
 if(kind==='water'){
  building=`<path d="m166 178 13-97h48l14 97M179 105h48m-54 35h60m-58 30 55-54m-56 0 54 54" fill="none" stroke="#688788" stroke-width="8"/>`;
  building+=rect(160,44,84,65,'#76AFC1',13)+`<ellipse cx="202" cy="47" rx="42" ry="13" fill="#B7DEE1"/>`+rect(167,58,7,32,'#A8D1D8',3);
 }else{
  building+=poly(`${x+width},${top} ${x+width+38},${top-19} ${x+width+38},${base-19} ${x+width},${base}`,design.roofColor);
  building+=rect(x,top,width,height,color,2);
  building+=poly(`${x},${top} ${x+38},${top-19} ${x+width+38},${top-19} ${x+width},${top}`, '#E5DFCF');
  if(design.roof){building+=poly(`${x-8},${top+5} ${x+width/2},${top-31} ${x+width+8},${top+5}`,design.roofColor)+poly(`${x+width/2},${top-31} ${x+width/2+38},${top-50} ${x+width+46},${top-14} ${x+width+8},${top+5}`, '#466674');}
  const cols=kind==='tower'?3:variant%2?3:4,rows=kind==='tower'?6:kind==='office'?4:2;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const wx=x+12+col*((width-18)/cols),wy=top+16+row*((height-23)/rows),ww=(width-32)/cols*.64;
   building+=rect(wx-2,wy-2,ww+4,16,'#E9E4D6',1)+rect(wx,wy,ww,12,kind==='garden'?'#A8D5C4':'#4D7685',1);
   if(kind==='terrace'||kind==='waterfront')building+=`<path d="M${wx+ww/2} ${wy}v12" stroke="#C8DED8" stroke-width="2"/>`;
  }
  for(let row=0;row<rows;row++)building+=poly(`${x+width+10},${top+14+row*(height-23)/rows} ${x+width+27},${top+5+row*(height-23)/rows} ${x+width+27},${top+18+row*(height-23)/rows} ${x+width+10},${top+27+row*(height-23)/rows}`,'#80A4AC');
  building+=rect(x+width*.44,base-28,width*.14,28,'#294B55',2);
  if(kind==='market'||kind==='studio'){
   building+=rect(x+8,base-33,width-16,28,'#315A63',3);
   for(let i=0;i<8;i++)building+=poly(`${x-5+i*(width+10)/8},${base-51} ${x-5+(i+1)*(width+10)/8},${base-51} ${x-9+(i+1)*(width+18)/8},${base-33} ${x-9+i*(width+18)/8},${base-33}`,i%2?'#FFF4D9':color);
   if(kind==='studio')building+=`<circle cx="${x+width/2}" cy="${top+10}" r="13" fill="#F4EBD7"/><circle cx="${x+width/2}" cy="${top+10}" r="8" fill="#8874A4"/>`;
  }
  if(kind==='mansion')for(const cx of [x+12,x+47,x+82,x+117])building+=rect(cx,top+34,8,48,'#F8F0DE',2);
  if(kind==='waterfront')building+=`<path d="M${x-3} ${base-42}h${width+6}m-${width} 0v14m25-14v14m25-14v14m25-14v14m25-14v14m-${width-2} 0h${width}" fill="none" stroke="#EDF4E7" stroke-width="4"/>`;
  if(kind==='tower')building+=rect(x+12,top-12,width-24,10,design.roofColor)+`<path d="M${x+width/2} ${top-12}v-18" stroke="#B68D51" stroke-width="3"/>`;
  if(kind==='station'){
   building+=`<path d="M${x+18} ${top+28}q45-48 90 0v45h-90Z" fill="#354F5E"/>`;
   building+=rect(x-8,base-32,width+27,29,'#D8DDCB',8);
   for(let i=0;i<5;i++)building+=rect(x+2+i*25,base-27,18,12,'#426D84',2);
   building+=`<path d="M${x-16} ${base+4}h${width+53}m-${width+53} 7h${width+53}" stroke="#7F8580" stroke-width="3"/>`;
  }
  if(kind==='solar')for(let panel=0;panel<3;panel++){
   const px=x-5+panel*49,py=top-8;
   building+=poly(`${px},${py} ${px+28},${py-22} ${px+66},${py-6} ${px+38},${py+16}`,'#2F597A');
   building+=`<path d="m${px+14} ${py-11} 38 16m-38 8 28-22" stroke="#8BB9D2" stroke-width="2"/>`;
  }
  if(kind==='garden')building+=rect(x+12,top+11,width-24,height-14,'#A1C3A1',2)+`<path d="M${x+width/2} ${top-23}v${height+23}m-42-${height+23}v${height+23}m84-${height+23}v${height+23}M${x+12} ${top+40}h${width-24}" stroke="#F2EDD2" stroke-width="5"/>`;
 }
 let development='';
 if(level>0)development=`<g transform="translate(320 33)"><rect x="-20" y="-18" width="66" height="28" rx="14" fill="#FFFDF5"/><text x="13" y="1" fill="#355D50" font-family="Nunito,sans-serif" font-size="13" font-weight="800" text-anchor="middle">${level===5?'Hotel':`${level} ${level===1?'house':'houses'}`}</text></g>`;
 return `<svg class="property-art" viewBox="0 0 400 224" role="img" aria-label="${esc(space.name)} property illustration" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="224" fill="${background}"/><circle cx="323" cy="47" r="24" fill="#F4DC9E"/><path d="M0 170q80-27 170-5t230-13v72H0Z" fill="${kind==='waterfront'?'#A6CFD0':'#D2DDC4'}"/><ellipse cx="208" cy="190" rx="139" ry="17" fill="#61725C" opacity=".13"/>${poly('62,182 213,221 349,165 195,126','#E2D8C1')}${tree(85,184,19)}${building}${tree(322,171,15)}${development}</svg>`;
}
