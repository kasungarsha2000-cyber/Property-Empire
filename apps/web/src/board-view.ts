import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PLAYER_COLORS } from '../../../packages/core/board';
import type { Game } from '../../../packages/core/types';
import type { Settings } from './storage';
import { SceneAssets, spacePosition, TOKEN_HEIGHT, diceTexture } from './scene-assets';

type Movement = {points: THREE.Vector3[]; start: number; duration: number};

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
 private wasRolling = false;
 private dirty = true;
 private state: Game | null = null;
 private lastSize = '';
 private fitDistance = 28;
 private viewDirection = new THREE.Vector3(12, 15, 16).normalize();
 private settings: Settings;
 private viewerId:string|null=null;
 private highlightMine=true;

 constructor(private element: HTMLElement, private onSelect: (index: number) => void, settings: Settings) {
  this.settings = settings;
  this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'low-power'});
  this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure = .95;
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  this.renderer.shadowMap.autoUpdate = false;
  this.renderer.setClearColor(0x000000, 0);
  this.renderer.domElement.setAttribute('aria-label', '3D city board. Drag to rotate, scroll or pinch to zoom. Use Properties to select a space by keyboard.');
  this.renderer.domElement.addEventListener('webglcontextlost', event => {
   event.preventDefault();
   element.insertAdjacentHTML('beforeend', '<div class="context-error">3D graphics paused. Your game is saved. Reload to recover.</div>');
  });
  element.prepend(this.renderer.domElement);
  const environment = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(this.renderer);
  this.scene.environment = pmrem.fromScene(environment, .04).texture;
  this.scene.environmentIntensity = .40;
  environment.dispose(); pmrem.dispose();
  this.scene.add(new THREE.HemisphereLight('#FFF2DA', '#577A85', .65));
  const key = new THREE.DirectionalLight('#FFF0CE', 1.8);
  key.position.set(-3, 14, 7); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 35});
  key.shadow.bias = -.00025; key.shadow.normalBias = .025; this.scene.add(key);
  const fill = new THREE.DirectionalLight('#B8D8EA', .45);
  fill.position.set(7, 6, -5); this.scene.add(fill);
  this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  this.controls.target.set(0, .8, 0);
  this.controls.enableDamping = true; this.controls.dampingFactor = .09;
  this.controls.enablePan = false; this.controls.minDistance = 8; this.controls.maxDistance = 55;
  this.controls.minPolarAngle = .15; this.controls.maxPolarAngle = Math.PI * .43;
  this.controls.addEventListener('change', () => { this.dirty = true; });
  this.assets.buildBoard(this.scene); this.assets.buildCity(this.scene);
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
   die.position.set(-.48 + i * 1.26, 1.07, 3.5); die.castShadow = true; die.receiveShadow = true;
   this.dice.push(die); this.scene.add(die);
  }
  let down = {x: 0, y: 0};
  this.renderer.domElement.addEventListener('pointerdown', event => { down = {x: event.clientX, y: event.clientY}; });
  this.renderer.domElement.addEventListener('pointerup', event => {
   if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8) return;
   const rect = this.renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster();
   ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
   const targets=[...this.assets.tiles,...Array.from(this.assets.landmarks.values()).filter(landmark=>landmark.visible),...Array.from(this.buildings.values(),entry=>entry.group)];
   const hit = ray.intersectObjects(targets,true)[0];
   if(hit){let object:THREE.Object3D|null=hit.object;while(object&&object.userData.index===undefined)object=object.parent;if(object)this.onSelect(object.userData.index);}
  });
  this.configure(settings);
  new ResizeObserver(() => this.resize()).observe(element); this.resize();
  document.fonts.ready.then(() => { this.assets.refreshTypography(); this.dirty = true; });
  this.renderer.setAnimationLoop(() => this.frame());
 }

 update(game: Game, animate = true) {
  const old = this.state, now = performance.now(); this.state = game;
  if (!animate) { this.paths.clear(); this.diceUntil = 0; }
  if (old && animate && game.log.some(event => event.id > old.eventSeq && event.kind === 'roll') && this.settings.speed !== 'reduced') this.diceUntil = now + (this.settings.speed === 'fast' ? 250 : 950);
  this.dice.forEach((die, i) => {
   const value = game.dice[i], remaining = [1, 2, 3, 4, 5, 6].filter(face => face !== value && face !== 7 - value);
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
   token.scale.setScalar(companions.length > 1 ? .73 : 1);
   const point = spacePosition(player.position).add(offset); point.y = TOKEN_HEIGHT;
   const previous = old?.players.find(other => other.id === player.id);
   if (previous && previous.position !== player.position && animate && this.settings.speed !== 'reduced') {
    const teleport = player.jailed || game.log.some(event => event.id > old!.eventSeq && event.kind === 'card');
    const steps = teleport ? 1 : (player.position - previous.position + 40) % 40, points = [token.position.clone()];
    for (let step = 1; step <= steps; step++) { const next = spacePosition(teleport ? player.position : (previous.position + step) % 40).add(offset); next.y = TOKEN_HEIGHT; points.push(next); }
    this.paths.set(player.id, {points, start: Math.max(now, this.diceUntil), duration: steps * (this.settings.speed === 'fast' ? 55 : 125)});
   } else if (!this.paths.has(player.id)) token.position.copy(point);
  });
  this.assets.owners.forEach((mesh, index) => {
   const property = game.properties[index], player = game.players.find(other => other.id === property.owner); mesh.visible = !!player;
   if (player) mesh.material = this.assets.material(property.mortgaged ? '#858B85' : PLAYER_COLORS[player.token ?? game.players.indexOf(player)], 'lacquer');
  });
  this.refreshOwnership();
  this.assets.landmarks.forEach((landmark,index)=>{landmark.visible=game.properties[index].level===0;});
  game.properties.forEach((property, index) => {
   const existing = this.buildings.get(index); if (existing?.level === property.level) return;
   if (existing) { this.scene.remove(existing.group); this.buildings.delete(index); } if (!property.level) return;
   const group = new THREE.Group(); group.userData.index=index;group.position.copy(spacePosition(index)); group.position.y = .655; group.rotation.y = -Math.floor(index / 10) * Math.PI / 2;
   const count = property.level === 5 ? 1 : property.level;
   for (let n = 0; n < count; n++) { const house = this.assets.house(property.level); house.position.set(property.level === 5 ? 0 : (n - (count - 1) / 2) * .22, 0, -.26); group.add(house); }
   this.scene.add(group); this.buildings.set(index, {level: property.level, group});
  });
  this.renderer.shadowMap.needsUpdate = true; this.dirty = true;
 }
 select(index: number) { this.selection.visible = index >= 0; if (index >= 0) { this.selection.position.copy(spacePosition(index)); this.selection.position.y = .659; } this.dirty = true; }
 setViewer(id:string|null,highlight=true){this.viewerId=id;this.highlightMine=highlight;this.refreshOwnership();}
 private refreshOwnership(){
  if(!this.state)return;
  this.assets.ownershipLabels.forEach((label,index)=>{
   const owner=this.state!.players.find(player=>player.id===this.state!.properties[index].owner);label.visible=!!owner;
   if(owner)label.material=this.assets.ownerLabel(owner.id===this.viewerId?'Yours':owner.name,PLAYER_COLORS[owner.token??this.state!.players.indexOf(owner)]);
   this.assets.ownershipHighlights.get(index)!.visible=this.highlightMine&&!!this.viewerId&&owner?.id===this.viewerId;
  });this.dirty=true;
 }
 focus(index: number) { const direction = this.camera.position.clone().sub(this.controls.target).normalize(); this.controls.target.copy(spacePosition(index)); this.camera.position.copy(this.controls.target).addScaledVector(direction, 12); this.controls.update(); this.dirty = true; }
 zoom(delta: number) {
  const offset = this.camera.position.clone().sub(this.controls.target); offset.setLength(THREE.MathUtils.clamp(offset.length() * (delta > 0 ? .88 : 1.12), 8, 55));
  this.camera.position.copy(this.controls.target).add(offset); this.controls.update(); this.dirty = true;
 }
 reset() { this.controls.target.set(0, .8, 0); this.camera.position.copy(this.controls.target).addScaledVector(this.viewDirection, this.fitDistance); this.controls.update(); this.dirty = true; }
 configure(settings: Settings) {
  this.settings = settings; this.renderer.setPixelRatio(Math.min(devicePixelRatio, settings.quality === 'low' ? 1 : settings.quality === 'medium' ? 1.5 : 2));
  this.renderer.shadowMap.enabled = settings.quality !== 'low'; this.renderer.shadowMap.needsUpdate = true; this.dirty = true;
  if (settings.speed === 'reduced') { this.paths.clear(); this.diceUntil = 0; if (this.state) this.update(this.state, false); }
 }
 private resize() {
  const width = this.element.clientWidth, height = this.element.clientHeight, key = `${width}-${height}`; if (!width || !height || key === this.lastSize) return;
  this.lastSize = key; this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
  // Fit the physical board to the available stage, including its corner-to-corner width.
  const horizontal = new THREE.Vector3(this.viewDirection.z, 0, -this.viewDirection.x).normalize(), vertical = new THREE.Vector3().crossVectors(this.viewDirection, horizontal).normalize();
  let required = 0; const tangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
  for (const x of [-6.7, 6.7]) for (const z of [-6.7, 6.7]) for (const y of [-.35, 1.1]) { const corner = new THREE.Vector3(x, y - .8, z), depth = corner.dot(this.viewDirection); required = Math.max(required, depth + Math.abs(corner.dot(horizontal)) / (tangent * this.camera.aspect), depth + Math.abs(corner.dot(vertical)) / tangent); }
  this.fitDistance = required * 1.06; this.reset();
 }
 private frame() {
  if (document.hidden) return;
  const now = performance.now(); this.controls.update(); const rolling = now < this.diceUntil, animating = rolling || this.wasRolling || this.paths.size > 0;
  this.dice.forEach((die, i) => { if (rolling) { die.rotation.set(now * .008 + i, now * .006, now * .011); die.position.y = 1.07 + Math.abs(Math.sin(now * .009 + i)) * .65; } else { die.rotation.set(0, 0, 0); die.position.y = 1.07; } }); this.wasRolling = rolling;
  for (const [id, path] of this.paths) {
   if (now < path.start) continue;
   const t = Math.min(1, (now - path.start) / path.duration), f = t * (path.points.length - 1), index = Math.min(path.points.length - 2, Math.floor(f)), local = f - index, token = this.tokens.get(id)!;
   token.position.lerpVectors(path.points[index], path.points[index + 1], local); token.position.y += Math.sin(local * Math.PI) * .18; if (t >= 1) this.paths.delete(id);
  }
  if (this.state) { const player = this.state.players[this.state.current], token = this.tokens.get(player.id); this.halo.visible = !!token?.visible; if (token) { this.halo.position.copy(token.position); this.halo.position.y = .655; (this.halo.material as THREE.MeshBasicMaterial).color.set(PLAYER_COLORS[player.token ?? this.state.current]); } }
  if (this.dirty || animating) { if (animating) this.renderer.shadowMap.needsUpdate = true; this.renderer.render(this.scene, this.camera); this.dirty = false; }
 }
}
