/** Precomputed fixed-step dice motion keeps collisions independent of display FPS. */
export type DiceRest = {x:number;z:number;yaw:number};
export type DicePose = {x:number;y:number;z:number;rotation:[number,number,number]};
export type DicePair = [DicePose,DicePose];
export type DiceRollPlan = {frames:DicePair[];rest:[DiceRest,DiceRest];duration:number};
export const DICE_FIELD = {minX:-4.85,maxX:4.85,minZ:2.5,maxZ:4.85,floor:.5525} as const;
export const INITIAL_DICE:[DiceRest,DiceRest] = [{x:-.95,z:3.65,yaw:0},{x:.95,z:3.65,yaw:0}];
const radius=.65,half=.375,tau=Math.PI*2,step=1/240,duration=1.15;
// Enclose all three rotated cards, including their small stacked offsets.
const decks=[{x:-3.65,z:2.9,halfX:.63,halfZ:.46},{x:3.4,z:2.99,halfX:.63,halfZ:.46}];
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
type Body={x:number;z:number;vx:number;vz:number};

export function dicePlaceClear(x:number,z:number):boolean {
 if(x<DICE_FIELD.minX+radius-1e-7||x>DICE_FIELD.maxX-radius+1e-7||z<DICE_FIELD.minZ+radius-1e-7||z>DICE_FIELD.maxZ-radius+1e-7)return false;
 return decks.every(d=>Math.hypot(x-clamp(x,d.x-d.halfX,d.x+d.halfX),z-clamp(z,d.z-d.halfZ,d.z+d.halfZ))>=radius-1e-7);
}
function rebound(b:Body,nx:number,nz:number){const speed=b.vx*nx+b.vz*nz;if(speed<0){b.vx-=1.62*speed*nx;b.vz-=1.62*speed*nz;}}
function constrain(b:Body){
 const loX=DICE_FIELD.minX+radius,hiX=DICE_FIELD.maxX-radius,loZ=DICE_FIELD.minZ+radius,hiZ=DICE_FIELD.maxZ-radius;
 if(b.x<loX){b.x=loX;rebound(b,1,0)}if(b.x>hiX){b.x=hiX;rebound(b,-1,0)}
 if(b.z<loZ){b.z=loZ;rebound(b,0,1)}if(b.z>hiZ){b.z=hiZ;rebound(b,0,-1)}
 for(const d of decks){
  const cx=clamp(b.x,d.x-d.halfX,d.x+d.halfX),cz=clamp(b.z,d.z-d.halfZ,d.z+d.halfZ);
  let dx=b.x-cx,dz=b.z-cz,length=Math.hypot(dx,dz);
  if(length>=radius)continue;
  if(length<1e-9){
   // This also makes restored positions inside an obstacle recover deterministically.
   const edges=[{distance:b.x-(d.x-d.halfX),nx:-1,nz:0},{distance:d.x+d.halfX-b.x,nx:1,nz:0},{distance:b.z-(d.z-d.halfZ),nx:0,nz:-1},{distance:d.z+d.halfZ-b.z,nx:0,nz:1}];
   const edge=edges.sort((a,c)=>a.distance-c.distance)[0];dx=edge.nx;dz=edge.nz;
   b.x+=dx*(edge.distance+radius);b.z+=dz*(edge.distance+radius);rebound(b,dx,dz);
  }else{dx/=length;dz/=length;b.x+=dx*(radius-length);b.z+=dz*(radius-length);rebound(b,dx,dz);}
 }
}
function resolvePair(bodies:[Body,Body]){
 // Iteration handles a die pinned between its partner and a wall or deck.
 for(let n=0;n<32;n++){
  bodies.forEach(constrain);const[a,b]=bodies,dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
  if(d>=radius*2-1e-9)break;
  const nx=d>1e-9?dx/d:1,nz=d>1e-9?dz/d:0,push=(radius*2-d)/2+1e-8;
  a.x-=nx*push;a.z-=nz*push;b.x+=nx*push;b.z+=nz*push;
  const closing=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;
  if(closing<0){const impulse=-closing*.81;a.vx-=impulse*nx;a.vz-=impulse*nz;b.vx+=impulse*nx;b.vz+=impulse*nz;}
 }
 bodies.forEach(constrain);
}
function verticalExtent([x,y,z]:[number,number,number]){
 const cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);
 return half*(Math.abs(cx*sz+sx*sy*cz)+Math.abs(cx*cz-sx*sy*sz)+Math.abs(sx*cy));
}
export function planDiceRoll(from:readonly DiceRest[]=INITIAL_DICE,random:()=>number=Math.random):DiceRollPlan {
 const bodies:[Body,Body]=[0,1].map(i=>({x:from[i].x,z:from[i].z,vx:(random()<.5?-1:1)*(12+random()*9),vz:(random()<.5?-1:1)*(3+random()*5)})) as [Body,Body];
 const angles=[0,1].map(i=>({x:(random()<.5?-1:1)*(2+Math.floor(random()*3))*tau,z:(random()<.5?-1:1)*(1+Math.floor(random()*3))*tau,y:from[i].yaw+(random()<.5?-1:1)*(1+random()*2)*tau}));
 const heights=[DICE_FIELD.floor+half,DICE_FIELD.floor+half],vy=[5.8+random()*1.5,5.8+random()*1.5];
 const frames:DicePair[]=[],count=Math.round(duration/step);
 for(let n=0;n<=count;n++){
  const t=n/count,ease=1-(1-t)**3;
  if(n){
   for(const b of bodies){b.x+=b.vx*step;b.z+=b.vz*step;const drag=Math.exp(-(2.1+12*t*t)*step);b.vx*=drag;b.vz*=drag;}
   resolvePair(bodies);
  }
  frames.push(bodies.map((b,i)=>{
   const rotation:[number,number,number]=[angles[i].x*ease,from[i].yaw+(angles[i].y-from[i].yaw)*ease,angles[i].z*ease];
   const support=DICE_FIELD.floor+verticalExtent(rotation);
   if(n){vy[i]-=22*step;heights[i]+=vy[i]*step;if(heights[i]<support){heights[i]=support;if(vy[i]<0)vy[i]=-vy[i]*.38;}}
   // Drain the last bounce continuously while rotation approaches a level face.
   const settle=t>.8?((1-t)/.2)**2:1;
   const y=n===count?DICE_FIELD.floor+half:support+Math.max(0,heights[i]-support)*settle;
   return{x:b.x,y,z:b.z,rotation};
  }) as DicePair);
 }
 const end=frames.at(-1)!;
 return{frames,rest:end.map(d=>({x:d.x,z:d.z,yaw:d.rotation[1]})) as [DiceRest,DiceRest],duration};
}
export function sampleDiceRoll(plan:DiceRollPlan,t:number):DicePair {
 const f=clamp(t,0,1)*(plan.frames.length-1),n=Math.floor(f);
 if(n===plan.frames.length-1||f===n)return plan.frames[n];
 const blend=f-n,a=plan.frames[n],b=plan.frames[n+1];
 const pair=a.map((d,i)=>({x:d.x+(b[i].x-d.x)*blend,y:d.y+(b[i].y-d.y)*blend,z:d.z+(b[i].z-d.z)*blend,rotation:d.rotation.map((r,j)=>r+(b[i].rotation[j]-r)*blend) as [number,number,number]})) as DicePair;
 // Chords between collision steps can graze curved obstacles; project safely.
 const bodies=pair.map(d=>({x:d.x,z:d.z,vx:0,vz:0})) as [Body,Body];resolvePair(bodies);
 pair.forEach((d,i)=>{d.x=bodies[i].x;d.z=bodies[i].z;d.y=Math.max(d.y,DICE_FIELD.floor+verticalExtent(d.rotation));});
 return pair;
}
