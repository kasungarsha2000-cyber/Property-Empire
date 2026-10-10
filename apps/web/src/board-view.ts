import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PLAYER_COLORS } from '../../../packages/core/board';
import type { Game } from '../../../packages/core/types';
import { isReduced, type Settings } from './storage';
import { SceneAssets, spacePosition, TOKEN_HEIGHT, diceTexture } from './scene-assets';
import {pawnPose} from './pawn-motion';
import {CityLife} from './city-life';
import {movementRoute} from './animation-plan';
import {DICE_FIELD,INITIAL_DICE,planDiceRoll,sampleDiceRoll,type DiceRest,type DiceRollPlan} from './dice-physics';
import {batchStaticScene} from './static-batch';
import {propertyMotions,propertyMotionPose,propertyMotionStart,type PropertyMotion} from './property-motion';

type Movement = {points: THREE.Vector3[]; start: number; duration: number;lastStep:number};
type CameraTween = {fromPosition:THREE.Vector3;fromTarget:THREE.Vector3;toPosition:THREE.Vector3;toTarget:THREE.Vector3;start:number;duration:number};

export class BoardView {
 private scene = new THREE.Scene();
 private camera = new THREE.PerspectiveCamera(40, 1, .1, 150);
 private renderer: THREE.WebGLRenderer;
 private controls: OrbitControls;
 private assets = new SceneAssets();
 private buildings = new Map<number, {level: number; group: THREE.Group}>();
 private tokens = new Map<string, THREE.Group>();
 private paths = new Map<string, Movement>();
 private halo: THREE.Mesh;
 private selection: THREE.Group;
 private dice: THREE.Mesh[] = [];
 private diceTextures: THREE.CanvasTexture[][] = [];
 private diceUntil = 0;
 private diceStarted = 0;
 private diceRest:DiceRest[]=INITIAL_DICE.map(die=>({...die}));
 private dicePlan:DiceRollPlan|null=null;
 private wasRolling = false;
 private playbackActive=false;
 private flourishes=new Map<string,{start:number;duration:number}>();
 private propertyEffects=new Map<number,{motion:PropertyMotion;start:number;ring:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;growing:THREE.Object3D[]}>();
 private propertyRingGeometry=new THREE.RingGeometry(.71,.78,4);
 onStep:()=>void=()=>{};
 onSettled:()=>void=()=>{};
 onFrame:()=>void=()=>{};
 get isAnimating(){return this.paths.size>0||performance.now()<this.diceUntil;}
 private dirty = true;
 private overlayDirty=true;
 private state: Game | null = null;
 private lastSize = '';
 private fitDistance = 28;
 private viewDirection = new THREE.Vector3(12, 15, 16).normalize();
 private settings: Settings;
 private viewerId:string|null=null;
 private highlightMine=true;
 private customizedView=false;
 private cityLife:CityLife;
 private cityStatus=document.createElement('div');
 private motionPreference=matchMedia('(prefers-reduced-motion:reduce)');
 private lastSunShadow=0;
 private keyLight:THREE.DirectionalLight;
 private get reduced(){return isReduced(this.settings);}
 private active=true;
 private paused=false;
 private idle=false;
 private tween:CameraTween|null=null;

 constructor(private element: HTMLElement, private onSelect: (index: number) => void, settings: Settings) {
  this.settings = settings;
  this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'low-power'});
  this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure = .95;
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  this.renderer.shadowMap.autoUpdate = false;
  this.renderer.setClearColor(0x000000, 0);
  this.renderer.domElement.setAttribute('aria-label', '3D city board. Drag to rotate, right-drag to pan, point and scroll to zoom. Use Properties to select a space by keyboard.');
  this.renderer.domElement.addEventListener('webglcontextlost', event => {
   event.preventDefault();
   element.insertAdjacentHTML('beforeend', '<div class="context-error">3D graphics paused. Your game is saved. Reload to recover.</div>');
  });
  element.prepend(this.renderer.domElement);
  const environment = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(this.renderer);
  this.scene.environment = pmrem.fromScene(environment, .04).texture;
  this.scene.environmentIntensity = .40;
  environment.dispose(); pmrem.dispose();
  const hemisphere=new THREE.HemisphereLight('#FFF2DA', '#577A85', .65);this.scene.add(hemisphere);
  const key = this.keyLight=new THREE.DirectionalLight('#FFF0CE', 1.8);
  key.position.set(-3, 14, 7); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 35});
  key.shadow.bias = -.00025; key.shadow.normalBias = .025; this.scene.add(key);
  const fill = new THREE.DirectionalLight('#B8D8EA', .45);
  fill.position.set(7, 6, -5); this.scene.add(fill);
  this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  this.controls.target.set(0, .8, 0);
  this.controls.enableDamping = true; this.controls.dampingFactor = .09;
  this.controls.enablePan = true; this.controls.screenSpacePanning = false; this.controls.zoomToCursor = true;
  this.controls.minDistance = 4; this.controls.maxDistance = 55;
  this.controls.minPolarAngle = .15; this.controls.maxPolarAngle = Math.PI * .43;
  this.controls.addEventListener('change', () => { this.dirty = true;this.overlayDirty=true; });
  this.controls.addEventListener('start',()=>{this.customizedView=true;this.tween=null;});
  this.assets.buildBoard(this.scene); this.assets.buildCity(this.scene);
  batchStaticScene(this.scene);
  this.cityLife=new CityLife(this.scene,this.assets,{key,fill,hemisphere});
  this.cityStatus.className='city-status';this.cityStatus.textContent=this.cityLife.status;this.cityStatus.setAttribute('aria-label','City weather and time of day');element.parentElement?.append(this.cityStatus);
  this.motionPreference.addEventListener('change',()=>this.configure(this.settings));
  document.addEventListener('visibilitychange',()=>{this.cityLife.resetClock();this.dirty=true;});
  this.halo = new THREE.Mesh(new THREE.RingGeometry(.30, .35, 48), new THREE.MeshBasicMaterial({color: '#E9C37C', side: THREE.DoubleSide, transparent: true, opacity: .9}));
  this.halo.rotation.x = -Math.PI / 2; this.halo.visible = false; this.scene.add(this.halo);
  this.selection = new THREE.Group();
  for (let side = 0; side < 4; side++) {
   const line = this.assets.mesh(this.selection, this.assets.box, '#E8BC68', side % 2 ? [.035, .025, 1.08] : [1.08, .025, .035], side === 0 ? [0, 0, -.535] : side === 1 ? [.535, 0, 0] : side === 2 ? [0, 0, .535] : [-.535, 0, 0], 'metal', false);
   (line as THREE.Mesh).material = new THREE.MeshBasicMaterial({color: '#EAC171'});
  }
  this.selection.visible = false; this.scene.add(this.selection);
  const dieGeometry = new RoundedBoxGeometry(.75, .75, .75, 3, .095);
  for (let i = 0; i < 2; i++) {
   const textures = Array.from({length: 6}, (_, face) => diceTexture(face + 1, i === 1)); this.diceTextures.push(textures);
   const materials = [3, 2, 0, 5, 1, 4].map(face => new THREE.MeshStandardMaterial({map: textures[face], roughness: .31, metalness: .06}));
   const die = new THREE.Mesh(dieGeometry, materials);
   die.position.set(this.diceRest[i].x, DICE_FIELD.floor+.375, this.diceRest[i].z); die.castShadow = true; die.receiveShadow = true;
   this.dice.push(die); this.scene.add(die);
  }
  let down = {x: 0, y: 0, time: 0};const pointers=new Set<number>();let multiTouch=false;
  this.renderer.domElement.addEventListener('pointerdown', event => { pointers.add(event.pointerId);if(pointers.size>1)multiTouch=true;else{multiTouch=false;down = {x: event.clientX, y: event.clientY, time: performance.now()};} });
  this.renderer.domElement.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); });
  this.renderer.domElement.addEventListener('pointerup', event => {
   pointers.delete(event.pointerId);
   if(event.button!==0||multiTouch)return;
   // A tap is short and nearly stationary; drags and pinches only move the camera.
   if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 10||performance.now()-down.time>600) return;
   const rect = this.renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster();
   ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
   const targets=[...this.assets.tiles,...Array.from(this.assets.landmarks.values()).filter(landmark=>landmark.visible),...Array.from(this.buildings.values(),entry=>entry.group)];
   const hit = ray.intersectObjects(targets,true)[0];
   let object:THREE.Object3D|null=hit?.object??null;while(object&&object.userData.index===undefined)object=object.parent;this.onSelect(object?object.userData.index:-1);
  });
  this.configure(settings);
  new ResizeObserver(() => this.resize()).observe(element); this.resize();
  document.fonts.ready.then(() => { this.assets.refreshTypography(); this.dirty = true; });
  this.renderer.setAnimationLoop(() => this.frame());
 }

 update(game: Game, animate = true) {
  const old = this.state, now = performance.now(); this.state = game;
  if (!animate || old&&game.eventSeq<old.eventSeq) { this.paths.clear(); this.flourishes.clear();this.diceUntil = 0;this.clearPropertyEffects(); }
  const propertyChanges=animate&&!this.reduced?propertyMotions(old,game):[];
  const roll=old&&animate?game.log.filter(event=>event.id>old.eventSeq&&event.kind==='roll').at(-1):undefined;
  if(roll){
   this.dicePlan=planDiceRoll(this.dice.map(die=>({x:die.position.x,z:die.position.z,yaw:die.rotation.y})));this.diceRest=this.dicePlan.rest;
   this.diceStarted=now;if(!this.reduced)this.diceUntil=now+(this.settings.speed==='fast'?350:1150);
  }
  const rolled=roll?.text.match(/rolls (\d) \+ (\d)/);
  this.dice.forEach((die, i) => {
   const value = rolled?Number(rolled[i+1]):game.dice[i], remaining = [1, 2, 3, 4, 5, 6].filter(face => face !== value && face !== 7 - value);
   const first = remaining[0], second = remaining.find(face => face !== first && face !== 7 - first)!;
   const faces = [first, 7 - first, value, 7 - value, second, 7 - second];
   (die.material as THREE.MeshStandardMaterial[]).forEach((material, face) => { material.map = this.diceTextures[i][faces[face] - 1]; });
  });
  this.tokens.forEach((token, id) => { if (!game.players.some(player => player.id === id)) { this.scene.remove(token); this.tokens.delete(id); this.paths.delete(id); } });
  game.players.forEach((player, i) => {
   const style = player.token ?? i;
   let token = this.tokens.get(player.id);
   if (token && token.userData.style !== style) { this.scene.remove(token); this.tokens.delete(player.id); token = undefined; }
   if (!token) { token = this.assets.makeToken(style, PLAYER_COLORS[style]); token.userData.style = style; this.tokens.set(player.id, token); this.scene.add(token); }
   token.visible = !player.bankrupt;
   const companions = game.players.filter(other => !other.bankrupt && other.position === player.position), slot = companions.indexOf(player);
   const offset = companions.length > 1 ? new THREE.Vector3((slot % 3 - Math.min(2, companions.length - 1) / 2) * .34, 0, (Math.floor(slot / 3) - Math.floor((companions.length - 1) / 3) / 2) * .34) : new THREE.Vector3();
   token.userData.baseScale=companions.length > 1 ? .73 : 1;token.scale.setScalar(token.userData.baseScale);if(!this.paths.has(player.id))token.rotation.set(0,0,0);
   const point = spacePosition(player.position).add(offset); point.y = TOKEN_HEIGHT;
   const previous = old?.players.find(other => other.id === player.id);
   const route=old&&animate?movementRoute(old,game,player.id):[];
   if (previous && route.length && animate && !this.reduced) {
    const steps=route.length,points = [token.position.clone()];
    for(const index of route){const next=spacePosition(index).add(offset);next.y=TOKEN_HEIGHT;points.push(next);}
    this.paths.set(player.id, {points, start: Math.max(now, this.diceUntil), duration: steps * (this.settings.speed === 'fast' ? 85 : 180),lastStep:-1});
   } else if (!this.paths.has(player.id)) token.position.copy(point);
  });
  if(old&&animate&&!this.reduced){for(const p of game.players){if(game.winner===p.id&&old.winner!==p.id||game.properties.some((v,i)=>v.owner===p.id&&(old.properties[i].owner!==p.id||v.level>old.properties[i].level)))this.flourishes.set(p.id,{start:now,duration:520});}}
  this.assets.owners.forEach((mesh, index) => {
   const property = game.properties[index], player = game.players.find(other => other.id === property.owner); mesh.visible = !!player;
   if (player) mesh.material = this.assets.material(property.mortgaged ? '#858B85' : PLAYER_COLORS[player.token ?? game.players.indexOf(player)], 'lacquer');
  });
  this.refreshOwnership();
  game.properties.forEach((property, index) => {
   const existing = this.buildings.get(index); if (existing?.level === property.level) return;
   if (existing) { this.scene.remove(existing.group); this.buildings.delete(index); } if (!property.level) return;
   const group = new THREE.Group(); group.userData.index=index;group.position.copy(spacePosition(index)); group.position.y = .655; group.rotation.y = -Math.floor(index / 10) * Math.PI / 2;
   const count = property.level === 5 ? 1 : property.level;
   for (let n = 0; n < count; n++) { const house = this.assets.house(property.level); house.position.set(property.level === 5 ? 0 : (n - (count - 1) / 2) * .22, 0, -.26); group.add(house); }
   this.scene.add(group); this.buildings.set(index, {level: property.level, group});
  });
  for(const motion of propertyChanges){
   this.finishPropertyEffect(motion.property);
   const color=motion.kind==='build'?'#A8E2A0':motion.kind==='rent'?'#C4A5ED':'#FFD67D';
   const ring=new THREE.Mesh(this.propertyRingGeometry,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.55,depthWrite:false,toneMapped:false}));
   ring.name=`property-${motion.kind}-${motion.property}`;ring.rotation.set(-Math.PI/2,0,Math.PI/4);ring.position.copy(spacePosition(motion.property));ring.position.y=.674;
   const path=motion.payer?this.paths.get(motion.payer):undefined,arrival=path?path.start+path.duration:this.diceUntil;
   const start=propertyMotionStart(motion,now,arrival),entry=this.buildings.get(motion.property);
   const growing=motion.kind==='build'&&entry?entry.group.children.filter((_,n)=>motion.level===5||n>=(motion.previousLevel??0)):[];
   for(const house of growing)house.scale.y=.001;
   ring.visible=start<=now;this.scene.add(ring);this.propertyEffects.set(motion.property,{motion,start,ring,growing});
  }
  this.renderer.shadowMap.needsUpdate = true; this.dirty = true;this.overlayDirty=true;
  this.playbackActive=this.isAnimating;
 }
 select(index: number) { this.selection.visible = index >= 0; if (index >= 0) { this.selection.position.copy(spacePosition(index)); this.selection.position.y = .659; } this.dirty = true; }
 projectSpace(index:number){const point=spacePosition(index);point.y=1.1;return this.project(point);}
 projectDeck(deck:'chance'|'community'){return this.project(new THREE.Vector3(deck==='chance'?3.4:-3.65,.85,deck==='chance'?2.99:2.9));}
 private project(point:THREE.Vector3){point.project(this.camera);if(point.z<-1||point.z>1)return null;return{x:(point.x+1)*this.element.clientWidth/2,y:(1-point.y)*this.element.clientHeight/2};}
 setViewer(id:string|null,highlight=true){this.viewerId=id;this.highlightMine=highlight;this.refreshOwnership();}
 private refreshOwnership(){
  if(!this.state)return;
  this.assets.ownershipLabels.forEach((label,index)=>{
   const owner=this.state!.players.find(player=>player.id===this.state!.properties[index].owner);label.visible=!!owner;
   if(owner){const mine=owner.id===this.viewerId;label.material=this.assets.ownerLabel(mine?'✓ YOURS':owner.name,mine?'#176247':PLAYER_COLORS[owner.token??this.state!.players.indexOf(owner)]);label.scale.set(1,1,1);label.position.z=.65;this.assets.owners[index].material=this.assets.material(this.state!.properties[index].mortgaged?'#858B85':mine?'#176247':PLAYER_COLORS[owner.token??this.state!.players.indexOf(owner)],'lacquer');}
   this.assets.ownershipHighlights.get(index)!.visible=this.highlightMine&&!!this.viewerId&&owner?.id===this.viewerId;
  });this.dirty=true;
 }
 focus(index: number, animate=true) {
  this.customizedView=true;const direction = this.camera.position.clone().sub(this.controls.target).normalize(),target=spacePosition(index);target.y=.6;
  const distance=THREE.MathUtils.clamp(Math.min(12,this.fitDistance*.55),this.controls.minDistance,this.controls.maxDistance);
  this.moveCamera(target.clone().addScaledVector(direction,distance),target,animate);
 }
 /** Eased camera move; skipped for reduced motion. User input cancels it. */
 private moveCamera(position:THREE.Vector3,target:THREE.Vector3,animate:boolean){
  if(!animate||this.reduced||this.paused){this.tween=null;this.controls.target.copy(target);this.camera.position.copy(position);this.controls.update();this.dirty=true;return;}
  this.tween={fromPosition:this.camera.position.clone(),fromTarget:this.controls.target.clone(),toPosition:position,toTarget:target,start:performance.now(),duration:this.settings.speed==='fast'?360:560};this.dirty=true;
 }
 zoom(delta: number) {
  this.customizedView=true;
  const offset = this.camera.position.clone().sub(this.controls.target); offset.setLength(THREE.MathUtils.clamp(offset.length() * (delta > 0 ? .88 : 1.12), this.controls.minDistance, this.controls.maxDistance));
  this.camera.position.copy(this.controls.target).add(offset); this.controls.update(); this.dirty = true;
 }
 reset(animate=false) { this.measure();this.customizedView=false;const target=new THREE.Vector3(0,.8,0);this.moveCamera(target.clone().addScaledVector(this.viewDirection,this.fitDistance),target,animate); }
 /** Stop drawing while the board is hidden behind a full-screen page. */
 setActive(active:boolean){if(this.active===active)return;this.active=active;this.dirty=true;if(active){this.lastSize='';this.resize();}}
 /** App in background: release the animation loop entirely; resume restores it. */
 setPaused(paused:boolean){if(this.paused===paused)return;this.paused=paused;this.renderer.setAnimationLoop(paused?null:()=>this.frame());if(!paused){this.cityLife.resetClock();this.dirty=true;}}
 /** Gentle orbit behind the main menu. */
 setIdle(idle:boolean){this.idle=idle;this.controls.autoRotate=idle&&!this.reduced;this.controls.autoRotateSpeed=.45;this.dirty=true;}
 configure(settings: Settings) {
  this.settings = settings;
  const sensitivity={gentle:.65,normal:1,quick:1.45}[settings.camera]??1;this.controls.rotateSpeed=.85*sensitivity;this.controls.zoomSpeed=sensitivity;this.controls.panSpeed=.9*sensitivity;this.controls.autoRotate=this.idle&&!this.reduced;
  this.renderer.setPixelRatio(Math.min(devicePixelRatio, settings.quality === 'low' ? 1 : settings.quality === 'medium' ? 1.5 : 2));
  const snapPlayback=this.reduced&&this.playbackActive;
  const shadowSize=settings.quality==='high'?2048:1024;
  if(this.keyLight.shadow.mapSize.x!==shadowSize){this.keyLight.shadow.mapSize.set(shadowSize,shadowSize);this.keyLight.shadow.map?.dispose();this.keyLight.shadow.map=null;}
  this.cityLife.configure(this.reduced,settings.quality);
  if(this.reduced)this.clearPropertyEffects();
  this.renderer.shadowMap.enabled = settings.quality !== 'low'; this.renderer.shadowMap.needsUpdate = true; this.dirty = true;
  if (this.reduced) { this.paths.clear();this.flourishes.clear(); this.diceUntil = 0; if (this.state) this.update(this.state, false); }
  if(snapPlayback)queueMicrotask(()=>this.onSettled());
 }
 private resize() {
  const priorFit=this.fitDistance;if(!this.measure())return;
  if(this.customizedView){const offset=this.camera.position.clone().sub(this.controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*this.fitDistance/priorFit,this.controls.minDistance,this.controls.maxDistance));this.camera.position.copy(this.controls.target).add(offset);this.controls.update();this.dirty=true;}
  else this.reset();
 }
 /** Read the stage size and refresh renderer size, aspect, view direction and fit distance. Returns false when unchanged. */
 private measure() {
  const width = this.element.clientWidth, height = this.element.clientHeight, key = `${width}-${height}`; if (!width || !height || key === this.lastSize) return false;
  this.lastSize = key;this.overlayDirty=true; this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
  // Tall phone stages look at the board edge-on from the Start side so its edge, not its diagonal, spans the width.
  const portrait=this.camera.aspect<.85;
  this.viewDirection=portrait?new THREE.Vector3(.06,.78,.6).normalize():new THREE.Vector3(12,15,16).normalize();
  // Fit the physical board to the available stage, including its corner-to-corner width.
  const horizontal = new THREE.Vector3(this.viewDirection.z, 0, -this.viewDirection.x).normalize(), vertical = new THREE.Vector3().crossVectors(this.viewDirection, horizontal).normalize();
  let required = 0; const tangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
  for (const x of [-6.7, 6.7]) for (const z of [-6.7, 6.7]) for (const y of [-.35, 1.1]) { const corner = new THREE.Vector3(x, y - .8, z), depth = corner.dot(this.viewDirection); required = Math.max(required, depth + Math.abs(corner.dot(horizontal)) / (tangent * this.camera.aspect), depth + Math.abs(corner.dot(vertical)) / tangent); }
  // Aircraft and clouds must remain visible above the skyline without shrinking the board unnecessarily.
  if(!portrait)for(const x of [-4.15,4.15])for(const z of [-4.4,1.55]){const corner=new THREE.Vector3(x,5.95-.8,z),depth=corner.dot(this.viewDirection);required=Math.max(required,depth+Math.abs(corner.dot(horizontal))/(tangent*this.camera.aspect),depth+Math.abs(corner.dot(vertical))/tangent);}
  this.fitDistance = required * (portrait?1.03:1.06);
  return true;
 }
 private frame() {
  if (document.hidden||!this.active) return;
  const now = performance.now();
  if(this.tween){const t=Math.min(1,(now-this.tween.start)/this.tween.duration),k=t<.5?4*t*t*t:1-(-2*t+2)**3/2;this.camera.position.lerpVectors(this.tween.fromPosition,this.tween.toPosition,k);this.controls.target.lerpVectors(this.tween.fromTarget,this.tween.toTarget,k);this.dirty=true;if(t>=1)this.tween=null;}
  this.controls.update(); const rolling = now < this.diceUntil, animating = rolling || this.wasRolling || this.paths.size > 0||this.flourishes.size>0;
  const ambient=this.cityLife.update(now);if(this.cityStatus.textContent!==this.cityLife.status)this.cityStatus.textContent=this.cityLife.status;
  const dicePoses=rolling&&this.dicePlan?sampleDiceRoll(this.dicePlan,Math.min(1,(now-this.diceStarted)/(this.diceUntil-this.diceStarted))):null;
  this.dice.forEach((die,i)=>{
   const rest=this.diceRest[i];
   if(dicePoses){const pose=dicePoses[i];die.position.set(pose.x,pose.y,pose.z);die.rotation.set(...pose.rotation);}
   else{die.position.set(rest.x,DICE_FIELD.floor+.375,rest.z);die.rotation.set(0,rest.yaw,0);}
  });this.wasRolling=rolling;
  for (const [id, path] of this.paths) {
   if (now < path.start) continue;
   const t = Math.min(1, (now - path.start) / path.duration), f = t * (path.points.length - 1), index = Math.min(path.points.length - 2, Math.floor(f)), local = f - index, token = this.tokens.get(id)!;
   const pose=pawnPose(local),size=token.userData.baseScale??1;token.position.lerpVectors(path.points[index],path.points[index+1],pose.progress);token.position.y+=pose.height;
   let heading=Math.atan2(path.points[index+1].x-path.points[index].x,path.points[index+1].z-path.points[index].z);
   if(index>0&&local<.22){const before=Math.atan2(path.points[index].x-path.points[index-1].x,path.points[index].z-path.points[index-1].z),delta=Math.atan2(Math.sin(heading-before),Math.cos(heading-before)),blend=local/.22;heading=before+delta*blend*blend*(3-2*blend);}
   token.rotation.set(pose.lean,heading,-pose.lean*.6);token.scale.set(size*pose.scaleXZ,size*pose.scaleY,size*pose.scaleXZ);
   if(index!==path.lastStep){path.lastStep=index;this.onStep();}
   if(t>=1){token.position.copy(path.points.at(-1)!);token.rotation.x=token.rotation.z=0;token.scale.setScalar(size);this.paths.delete(id);}
  }
  for(const [id,flourish] of this.flourishes){const token=this.tokens.get(id);if(!token||this.paths.has(id)){this.flourishes.delete(id);continue;}const t=Math.min(1,(now-flourish.start)/flourish.duration),size=token.userData.baseScale??1;token.position.y=TOKEN_HEIGHT+Math.sin(t*Math.PI)*.08;token.rotation.z=Math.sin(t*Math.PI*2)*(1-t)*.025;token.scale.setScalar(size*(1+Math.sin(t*Math.PI)*.04));if(t>=1){token.position.y=TOKEN_HEIGHT;token.rotation.z=0;token.scale.setScalar(size);this.flourishes.delete(id);}}
  const propertyAnimating=this.propertyEffects.size>0;
  for(const [index,effect]of this.propertyEffects){
   const pose=propertyMotionPose(effect.motion.kind,now-effect.start,this.reduced);
   effect.ring.visible=pose.visible;effect.ring.material.opacity=pose.opacity;effect.ring.scale.setScalar(pose.ringScale);
   for(const house of effect.growing)house.scale.y=pose.growth;
   if(pose.done)this.finishPropertyEffect(index);
  }
  if (this.state) { const player = this.state.players[this.state.current], token = this.tokens.get(player.id); this.halo.visible = !!token?.visible; if (token) { this.halo.position.copy(token.position); this.halo.position.y = .655; (this.halo.material as THREE.MeshBasicMaterial).color.set(PLAYER_COLORS[player.token ?? this.state.current]); } }
  if (this.dirty || animating || ambient || propertyAnimating) {
   const shadowInterval=this.settings.quality==='high'?1000/18:1000/12;
   const settled=animating&&!rolling&&!this.paths.size&&!this.flourishes.size||propertyAnimating&&!this.propertyEffects.size;
   if(settled||(animating||propertyAnimating)&&now-this.lastSunShadow>=shadowInterval||ambient&&now-this.lastSunShadow>5000){this.renderer.shadowMap.needsUpdate=true;this.lastSunShadow=now;}
   this.renderer.render(this.scene, this.camera); this.dirty = false;
   if(this.overlayDirty){this.overlayDirty=false;this.onFrame();}
  }
  if(this.playbackActive&&!this.isAnimating){this.playbackActive=false;queueMicrotask(()=>this.onSettled());}
 }
 private finishPropertyEffect(index:number){const effect=this.propertyEffects.get(index);if(!effect)return;for(const house of effect.growing)house.scale.y=1;this.scene.remove(effect.ring);effect.ring.material.dispose();this.propertyEffects.delete(index);}
 private clearPropertyEffects(){for(const index of this.propertyEffects.keys())this.finishPropertyEffect(index);this.dirty=true;}
}
