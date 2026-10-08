import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BOARD } from '../../../packages/core/board';

export const TILE_HEIGHT = .55;
export const TOKEN_HEIGHT = .68;
export const TOKEN_NAMES = ['Roadster', 'Rocket', 'Sailboat', 'Robot', 'Crown', 'Airship', 'Cat', 'Gem'];
export function spacePosition(index: number) {
  const side = Math.floor(index / 10), step = index % 10;
  return side === 0 ? new THREE.Vector3(5.5 - step * 1.1, TILE_HEIGHT, 5.5)
    : side === 1 ? new THREE.Vector3(-5.5, TILE_HEIGHT, 5.5 - step * 1.1)
    : side === 2 ? new THREE.Vector3(-5.5 + step * 1.1, TILE_HEIGHT, -5.5)
    : new THREE.Vector3(5.5, TILE_HEIGHT, -5.5 + step * 1.1);
}

function canvasTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function grainTexture(wood: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = wood ? '#604532' : '#285B50';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 781;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  if (wood) {
    for (let i = 0; i < 190; i++) {
      const y = random() * 256;
      ctx.strokeStyle = `rgba(${random() > .5 ? '23,13,7' : '205,157,102'},${random() * .20})`;
      ctx.lineWidth = random() * 2 + .2;
      ctx.beginPath(); ctx.moveTo(0, y);
      ctx.bezierCurveTo(70, y + random() * 8, 180, y - random() * 8, 256, y);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 12000; i++) {
      ctx.fillStyle = random() > .5 ? '#427468' : '#174C44';
      ctx.globalAlpha = random() * .27;
      ctx.fillRect(random() * 256, random() * 256, 1, 1);
    }
  }
  const texture = canvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(wood ? 3 : 5, wood ? 1 : 5);
  return texture;
}

export class SceneAssets {
  readonly box = new RoundedBoxGeometry(1, 1, 1, 3, .085);
  readonly sphere = new THREE.SphereGeometry(1, 20, 14);
  readonly cylinder = new THREE.CylinderGeometry(1, 1, 1, 24);
  readonly cone = new THREE.ConeGeometry(1, 1, 24);
  readonly gem = new THREE.OctahedronGeometry(.24, 0);
  readonly roof: THREE.ExtrudeGeometry;
  readonly labels: {mesh: THREE.Mesh; index: number}[] = [];
  readonly tiles: THREE.Mesh[] = [];
  readonly owners: THREE.Mesh[] = [];
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private title: THREE.Mesh | null = null;
  private glassWindows: {position: number[]; rotation: number; lit: boolean}[] = [];
  private contact: THREE.CanvasTexture;

  constructor() {
    const triangle = new THREE.Shape();
    triangle.moveTo(-.5, 0); triangle.lineTo(.5, 0); triangle.lineTo(0, .65); triangle.closePath();
    this.roof = new THREE.ExtrudeGeometry(triangle, {depth: 1, bevelEnabled: false});
    this.roof.translate(0, 0, -.5);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(10,25,23,.45)'); gradient.addColorStop(.5, 'rgba(10,25,23,.20)'); gradient.addColorStop(1, 'rgba(10,25,23,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128); this.contact = canvasTexture(canvas);
  }

  material(color: string, finish: 'matte'|'lacquer'|'metal'|'glass' = 'matte') {
    const key = `${color}-${finish}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({color, roughness: finish === 'metal' ? .28 : finish === 'glass' ? .22 : finish === 'lacquer' ? .30 : .72, metalness: finish === 'metal' ? .72 : finish === 'glass' ? .38 : .02});
      this.materials.set(key, material);
    }
    return material;
  }

  mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: string, scale: number[], pos: number[], finish: 'matte'|'lacquer'|'metal'|'glass' = 'matte', shadows = true) {
    const mesh = new THREE.Mesh(geometry, this.material(color, finish));
    mesh.scale.set(scale[0], scale[1], scale[2]); mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = shadows; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }

  shadow(parent: THREE.Object3D, x: number, z: number, width: number, depth: number, y = .53, opacity = .65) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({map: this.contact, transparent: true, depthWrite: false, opacity}));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); parent.add(mesh);
  }

  buildBoard(scene: THREE.Scene) {
    const walnut = new THREE.MeshStandardMaterial({map: grainTexture(true), roughness: .45, metalness: .04});
    const base = new THREE.Mesh(this.box, walnut); base.scale.set(13.25, .57, 13.25); base.position.y = -.02; base.castShadow = true; base.receiveShadow = true; scene.add(base);
    this.mesh(scene, this.box, '#D2AB65', [13.06, .055, 13.06], [0, .26, 0], 'metal');
    this.mesh(scene, this.box, '#29453F', [12.92, .17, 12.92], [0, .37, 0]);
    this.mesh(scene, this.box, '#E5DAC2', [12.77, .11, 12.77], [0, .45, 0]);
    const felt = new THREE.Mesh(this.box, new THREE.MeshStandardMaterial({map: grainTexture(false), roughness: .97}));
    felt.scale.set(9.77, .085, 9.77); felt.position.y = .51; felt.receiveShadow = true; scene.add(felt);
    // Brass corner fixings make the board read as a crafted physical object.
    for (const x of [-6.24, 6.24]) for (const z of [-6.24, 6.24]) {
      this.mesh(scene, this.cylinder, '#CFAF75', [.055, .018, .055], [x, .514, z], 'metal', false);
    }
    this.shadow(scene, .2, .2, 17, 17, -.31, .70);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({opacity: .25}));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.32; floor.receiveShadow = true; scene.add(floor);

    for (const space of BOARD) {
      const group = new THREE.Group(); group.position.copy(spacePosition(space.index));
      group.rotation.y = -Math.floor(space.index / 10) * Math.PI / 2;
      const tile = this.mesh(group, this.box, '#E0D4BD', [1.04, .16, 1.04], [0, 0, 0]);
      tile.userData.index = space.index; this.tiles.push(tile);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(.98, .98), new THREE.MeshStandardMaterial({map: this.tileTexture(space.index), roughness: .84, metalness: 0}));
      face.rotation.x = -Math.PI / 2; face.position.y = .082; face.receiveShadow = true; group.add(face); this.labels.push({mesh: face, index: space.index});
      if (space.price) this.mesh(group, this.box, space.color, [.96, .045, .19], [0, .105, -.385], 'lacquer', false);
      const owner = this.mesh(group, this.box, '#D8CCB4', [.76, .045, .095], [0, .105, .427], 'lacquer', false);
      owner.visible = false; this.owners.push(owner); scene.add(group);
    }
  }

  private tileTexture(index: number) {
    const space = BOARD[index], canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const background = ({go:'#D9EEE0', jail:'#ECDCBF', parking:'#DCE8D9', goJail:'#EDD4CA', chance:'#E8DFEF', community:'#DFE8E5', tax:'#EBDFC8'} as Record<string,string>)[space.type] ?? '#F6EDDA';
    ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#D4C7AE'; ctx.lineWidth = 2; ctx.strokeRect(13, 13, 486, 486);
    ctx.fillStyle = '#253D3B'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 51px Nunito, sans-serif';
    const words = space.name.replace(' / Visiting','').split(' '); const lines = [''];
    for (const word of words) { const last = lines.length - 1; if (ctx.measureText(`${lines[last]} ${word}`).width > 450) lines.push(word); else lines[last] += (lines[last] ? ' ' : '') + word; }
    const textY = space.type === 'street' ? 235 : 345;
    lines.forEach((line, i) => ctx.fillText(line, 256, textY + (i - (lines.length - 1) / 2) * 56));
    if (space.type !== 'street') this.tileIcon(ctx, space.type, 256, 174);
    ctx.font = '800 45px Nunito, sans-serif';
    ctx.fillStyle = '#526657';
    ctx.fillText(space.price ? `$${space.price}` : space.type === 'go' ? '+ $200' : space.type === 'tax' ? `− $${space.amount}` : space.type === 'jail' ? 'Just visiting' : '', 256, 443);
    if (space.type === 'street') { ctx.fillStyle = '#B69B6F'; ctx.fillRect(219, 339, 74, 3); }
    return canvasTexture(canvas);
  }

  private tileIcon(ctx: CanvasRenderingContext2D, type: string, x: number, y: number) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#527967'; ctx.strokeStyle = '#527967'; ctx.lineWidth = 13; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (type === 'chance') { ctx.fillStyle = '#8C61A9'; ctx.font = '600 160px Fredoka, sans-serif'; ctx.fillText('?', 0, 0); }
    else if (type === 'go') { ctx.beginPath(); ctx.moveTo(-75,-23); ctx.lineTo(22,-23); ctx.lineTo(22,-60); ctx.lineTo(82,0); ctx.lineTo(22,60); ctx.lineTo(22,23); ctx.lineTo(-75,23); ctx.closePath(); ctx.fill(); }
    else if (type === 'utility') { ctx.fillStyle = '#5591A1'; ctx.beginPath(); ctx.moveTo(20,-77); ctx.lineTo(-57,15); ctx.lineTo(-8,15); ctx.lineTo(-24,78); ctx.lineTo(63,-24); ctx.lineTo(12,-24); ctx.closePath(); ctx.fill(); }
    else if (type === 'transport') { ctx.fillStyle='#44647D'; ctx.beginPath(); ctx.roundRect(-62,-70,124,125,25); ctx.fill(); ctx.fillStyle='#DDE9E3'; ctx.fillRect(-41,-42,82,40); ctx.beginPath(); ctx.arc(-33,29,10,0,Math.PI*2); ctx.arc(33,29,10,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#44647D'; ctx.beginPath(); ctx.moveTo(-33,58); ctx.lineTo(-54,84); ctx.moveTo(33,58); ctx.lineTo(54,84); ctx.stroke(); }
    else if (type === 'jail' || type === 'goJail') { ctx.strokeStyle='#9F714D'; ctx.strokeRect(-65,-64,130,130); for(const xx of [-36,0,36]){ctx.beginPath();ctx.moveTo(xx,-64);ctx.lineTo(xx,66);ctx.stroke();} }
    else if (type === 'parking') { ctx.font='800 145px Nunito, sans-serif';ctx.fillText('P',0,0); }
    else { ctx.fillStyle=type==='tax'?'#B08748':'#548475'; ctx.beginPath();ctx.roundRect(-67,-45,134,95,12);ctx.fill();ctx.strokeStyle='#E9DFCB';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-67,-10);ctx.lineTo(67,-10);ctx.stroke();ctx.fillStyle='#E9DFCB';ctx.font='800 61px Nunito';ctx.fillText('$',0,14); }
    ctx.restore();
  }

  buildCity(scene: THREE.Scene) {
    const city = new THREE.Group(); scene.add(city);
    // A compact downtown, surrounded by walkable blocks, a park and two card decks.
    this.mesh(city, this.box, '#E0D6BC', [8.7,.10,4.9], [0,.59,-1.57], 'matte', false);
    this.mesh(city, this.box, '#43515A', [8.72,.045,.62], [0,.66,-.75], 'matte', false);
    this.mesh(city, this.box, '#43515A', [.62,.045,4.95], [.35,.66,-1.55], 'matte', false);
    for (let x=-4; x<4.1; x+=.54) this.mesh(city,this.box,'#E6D5A9',[.24,.012,.035],[x,.689,-.75],'matte',false);
    for (let z=-3.8;z<.5;z+=.55) this.mesh(city,this.box,'#E6D5A9',[.035,.012,.23],[.35,.689,z],'matte',false);
    for(const x of [-.16,.03,.67,.86])for(const z of [-1.38,-1.18,-.32,-.12])this.mesh(city,this.box,'#F2E7CE',[.09,.012,.10],[x,.692,z],'matte',false);
    const towers: [number,number,number,number,number,string,number][] = [
      [-3.1,-3.13,1.02,.92,1.55,'#DB995F',0], [-1.68,-3.13,1.07,1,2.5,'#528893',1], [-.24,-3.25,.90,.90,3.25,'#304F66',2],
      [1.21,-3.1,1.02,.94,2.02,'#B98DAB',0], [2.73,-3.04,1.27,1.05,2.75,'#668B77',1],
      [-3.32,-1.7,1.17,.77,1.17,'#C7796A',0], [-1.86,-1.8,1.16,.81,1.61,'#6D93AD',1],
      [1.39,-1.81,.9,.82,1.31,'#D7B071',0], [2.76,-1.64,1.08,.83,1.65,'#6687A3',2],
      [-2.95,.37,1.34,.92,.79,'#B78766',3], [-1.25,.39,.87,.8,1.02,'#779B91',0], [2.53,.40,1.55,.87,.83,'#A890B3',3]
    ];
    towers.forEach(([x,z,w,d,h,color,style],i)=>this.tower(city,x,z,w,d,h,color,style,i));
    this.windows(city);
    for(const [x,z]of [[-4.05,-3.4],[-3.98,-1.2],[-.54,.46],[3.94,-3.15],[3.92,-1.58],[3.95,.25]])this.tree(city,x,z,.50,1);
    this.park(city);
    for(const [x,z]of [[-3.6,-1.02],[-.08,-1.7],[1.04,-1.05],[3.5,-.38]])this.lamp(city,x,z);
    const car1=this.makeToken(0,'#D98567',false);car1.scale.setScalar(.72);car1.position.set(-2.1,.69,-.75);city.add(car1);
    const car2=this.makeToken(0,'#CBB570',false);car2.scale.setScalar(.62);car2.position.set(.34,.69,-2.1);car2.rotation.y=Math.PI/2;city.add(car2);
    this.mesh(city,this.box,'#194338',[5.05,.10,1.55],[.5,.62,1.72]);
    this.mesh(city,this.box,'#C6A36A',[4.9,.055,1.40],[.5,.691,1.72],'metal',false);
    this.mesh(city,this.box,'#234C43',[4.8,.025,1.30],[.5,.732,1.72],'matte',false);
    this.title=new THREE.Mesh(new THREE.PlaneGeometry(4.52,1.15),new THREE.MeshBasicMaterial({map:this.titleTexture(),transparent:true,toneMapped:false}));
    this.title.rotation.x=-Math.PI/2;this.title.position.set(.5,.75,1.72);city.add(this.title);
    this.cardDeck(city,3.4,2.99,'#895C94','Opportunity');
    this.cardDeck(city,-3.65,3.5,'#C69855','City Fund');
    this.mesh(city,this.box,'#183B35',[2.65,.075,1.25],[.15,.61,3.5]);
    this.mesh(city,this.box,'#C1A370',[2.47,.016,1.1],[.15,.654,3.5],'metal',false);
    this.mesh(city,this.box,'#326658',[2.38,.024,1.01],[.15,.672,3.5]);
  }

  private tower(parent:THREE.Object3D,x:number,z:number,w:number,d:number,h:number,color:string,style:number,seed:number) {
    const floor=.69;this.shadow(parent,x,z,w*1.8,d*1.8,.657,.8);
    this.mesh(parent,this.box,'#C9C1AA',[w+.17,.13,d+.17],[x,floor+.035,z]);
    this.mesh(parent,this.box,color,[w,h,d],[x,floor+h/2+.1,z]);
    this.mesh(parent,this.box,'#E7DFCC',[w+.07,.11,d+.07],[x,floor+h+.13,z]);
    const levels=Math.floor(h/.35),columns=w>1.1?3:2;
    for(let row=0;row<levels;row++)for(let col=0;col<columns;col++){
      const y=floor+.34+row*.34;
      this.glassWindows.push({position:[x+(col-(columns-1)/2)*.28,y,z+d/2+.012],rotation:0,lit:(row+col+seed)%4===0});
      this.glassWindows.push({position:[x+w/2+.012,y,z+(col-(columns-1)/2)*.25],rotation:Math.PI/2,lit:(row+col+seed)%5===0});
    }
    if(style===1||style===2){this.mesh(parent,this.box,color,[w*.69,.39,d*.68],[x,floor+h+.32,z]);this.mesh(parent,this.box,'#D6D2BF',[w*.74,.07,d*.73],[x,floor+h+.53,z]);}
    if(style===2){this.mesh(parent,this.cylinder,'#CBA96D',[.032,.55,.032],[x,floor+h+.80,z],'metal',false);this.mesh(parent,this.sphere,'#E6BE70',[.065,.065,.065],[x,floor+h+1.08,z],'metal',false);}
    else this.mesh(parent,this.box,'#9DA5A0',[.22,.13,.24],[x+.2,floor+h+.25,z-.14],'metal',false);
    if(style===3){
      this.mesh(parent,this.box,'#304C50',[w*.75,.31,.02],[x,floor+.31,z+d/2+.02],'glass',false);
      for(let i=0;i<5;i++){const awning=this.mesh(parent,this.box,i%2?'#F5E7D1':color,[w/5,.07,.32],[x-w*.4+i*w/5,floor+.67,z+d/2+.13],'matte',false);awning.rotation.x=.16;}
    }
    this.mesh(parent,this.box,'#334D50',[.17,.30,.018],[x-.2,floor+.20,z+d/2+.023],'glass',false);
  }

  private windows(parent:THREE.Object3D) {
    const mesh=new THREE.InstancedMesh(this.box,this.material('#FFFFFF','glass'),this.glassWindows.length),dummy=new THREE.Object3D();
    this.glassWindows.forEach((window,i)=>{dummy.position.set(...window.position as [number,number,number]);dummy.rotation.set(0,window.rotation,0);dummy.scale.set(.14,.20,.019);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(window.lit?'#E8C888':'#9AC5CE'));});
    mesh.receiveShadow=true;parent.add(mesh);
  }

  private tree(parent:THREE.Object3D,x:number,z:number,radius=.35,height=1) {
    this.shadow(parent,x,z,radius*2.7,radius*2.7,.558,.65);
    this.mesh(parent,this.cylinder,'#80624A',[.055,.45,.055],[x,.77,z]);
    this.mesh(parent,this.sphere,'#5A9470',[radius,radius*1.12,radius],[x,1.02*height,z]);
    this.mesh(parent,this.sphere,'#78A878',[radius*.68,radius*.69,radius*.68],[x-.12,1.21*height,z+.08]);
  }
  private park(parent:THREE.Object3D) {
    this.mesh(parent,this.box,'#C1C5A2',[2.2,.085,1.92],[-3.29,.59,1.84],'matte',false);
    this.mesh(parent,this.box,'#829E6A',[2.06,.027,1.79],[-3.29,.65,1.84],'matte',false);
    this.mesh(parent,this.box,'#D5C7A3',[.24,.025,1.83],[-3.29,.678,1.84],'matte',false);
    this.tree(parent,-3.9,1.48,.32,1.12);this.tree(parent,-2.66,2.30,.38,1);
    this.mesh(parent,this.cylinder,'#DDD4BC',[.46,.105,.46],[-3.13,.735,1.75]);
    this.mesh(parent,this.cylinder,'#4B9BBD',[.38,.025,.38],[-3.13,.80,1.75],'glass',false);
    this.mesh(parent,this.cylinder,'#D6DEC9',[.11,.27,.11],[-3.13,.87,1.75]);
    this.mesh(parent,this.sphere,'#B0DCE1',[.18,.055,.18],[-3.13,1.01,1.75],'glass',false);
    for(const x of [-4.04,-2.58]){this.mesh(parent,this.box,'#A67B50',[.37,.065,.19],[x,.80,2.33]);this.mesh(parent,this.box,'#A67B50',[.37,.19,.055],[x,.91,2.41]);}
  }
  private lamp(parent:THREE.Object3D,x:number,z:number) {
    this.mesh(parent,this.cylinder,'#3E5558',[.026,.56,.026],[x,.96,z],'metal',false);
    this.mesh(parent,this.box,'#C9B17C',[.15,.06,.15],[x,1.25,z],'metal',false);
    this.mesh(parent,this.sphere,'#FAE6B4',[.065,.068,.065],[x,1.31,z],'lacquer',false);
  }
  private titleTexture(){
    const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=400;const ctx=canvas.getContext('2d')!;
    ctx.textAlign='center';ctx.fillStyle='#F3DEAC';ctx.font='600 150px Fredoka, sans-serif';ctx.fillText('PROPERTY EMPIRE',768,207);
    ctx.fillStyle='#AEC5AD';ctx.font='800 40px Nunito, sans-serif';ctx.fillText('BUILD A CITY. MAKE YOUR FORTUNE.',768,307);
    return canvasTexture(canvas);
  }
  private cardDeck(parent:THREE.Object3D,x:number,z:number,color:string,label:string){
    for(let i=0;i<3;i++){const card=this.mesh(parent,this.box,i===2?color:'#EDE4D2',[1.05,.037,.66],[x+i*.025,.59+i*.045,z+i*.018],'lacquer',false);card.rotation.y=-.16;}
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d')!;ctx.textAlign='center';ctx.fillStyle='#F5E6CA';ctx.font='600 110px Fredoka';ctx.fillText(label==='Opportunity'?'?':'$',256,124);ctx.font='800 30px Nunito';ctx.fillText(label,256,202);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(.92,.50),new THREE.MeshBasicMaterial({map:canvasTexture(canvas),transparent:true}));face.rotation.set(-Math.PI/2,0,.16);face.position.set(x+.05,.704,z+.035);parent.add(face);
  }

  refreshTypography(){
    for(const label of this.labels){const material=label.mesh.material as THREE.MeshStandardMaterial;material.map?.dispose();material.map=this.tileTexture(label.index);material.needsUpdate=true;}
    if(this.title){const material=this.title.material as THREE.MeshBasicMaterial;material.map?.dispose();material.map=this.titleTexture();material.needsUpdate=true;}
  }

  makeToken(style:number,color:string,base=true) {
    const group=new THREE.Group(),white='#F4E9D5',dark='#263F48';
    if(base){this.mesh(group,this.cylinder,'#D2AD67',[.235,.065,.235],[0,.025,0],'metal');this.mesh(group,this.cylinder,color,[.196,.018,.196],[0,.068,0],'lacquer',false);}
    const y = base ? .11 : 0;
    if(style===0){
      this.mesh(group,this.box,color,[.53,.15,.25],[0,y+.13,0],'lacquer');this.mesh(group,this.box,white,[.25,.14,.215],[-.015,y+.26,0],'lacquer');
      this.mesh(group,this.box,'#6FA2B0',[.155,.10,.223],[-.012,y+.275,0],'glass',false);
      for(const x of [-.17,.17])for(const z of [-.14,.14]){const wheel=this.mesh(group,this.cylinder,dark,[.068,.035,.068],[x,y+.08,z]);wheel.rotation.x=Math.PI/2;}
      for(const z of [-.075,.075])this.mesh(group,this.sphere,'#F7D99A',[.035,.026,.026],[.265,y+.15,z],'lacquer',false);
    }else if(style===1){
      this.mesh(group,this.cylinder,white,[.115,.35,.115],[0,y+.24,0],'lacquer');this.mesh(group,this.cone,color,[.115,.23,.115],[0,y+.53,0],'lacquer');this.mesh(group,this.sphere,'#527C92',[.055,.055,.024],[0,y+.31,.112],'glass',false);
      for(let i=0;i<3;i++){const fin=this.mesh(group,this.box,color,[.08,.18,.12],[Math.cos(i*Math.PI*2/3)*.12,y+.095,Math.sin(i*Math.PI*2/3)*.12],'lacquer');fin.rotation.y=-i*Math.PI*2/3;}
    }else if(style===2){
      this.mesh(group,this.sphere,color,[.28,.11,.12],[0,y+.11,0],'lacquer');this.mesh(group,this.cylinder,'#CBA76B',[.018,.38,.018],[0,y+.32,0],'metal',false);
      const sail=this.mesh(group,this.roof,white,[.32,.52,.025],[.01,y+.20,0]);sail.rotation.z=-.14;
    }else if(style===3){
      this.mesh(group,this.box,color,[.23,.25,.18],[0,y+.24,0],'lacquer');this.mesh(group,this.box,white,[.28,.21,.22],[0,y+.48,0],'lacquer');
      for(const x of [-.073,.073]){this.mesh(group,this.sphere,dark,[.033,.033,.012],[x,y+.51,.119],'glass',false);this.mesh(group,this.box,dark,[.095,.08,.17],[x,y+.061,0]);}
      for(const x of [-.172,.172])this.mesh(group,this.box,color,[.071,.18,.09],[x,y+.25,0],'lacquer');this.mesh(group,this.cylinder,'#CDA664',[.015,.13,.015],[0,y+.65,0],'metal',false);this.mesh(group,this.sphere,color,[.033,.033,.033],[0,y+.72,0]);
    }else if(style===4){
      this.mesh(group,this.cylinder,'#DAB666',[.185,.19,.185],[0,y+.15,0],'metal');this.mesh(group,this.cylinder,color,[.20,.035,.20],[0,y+.065,0],'lacquer');
      for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;this.mesh(group,this.cone,'#E6C47C',[.073,.20,.073],[Math.cos(angle)*.16,y+.33,Math.sin(angle)*.16],'metal');this.mesh(group,this.sphere,color,[.036,.036,.036],[Math.cos(angle)*.16,y+.43,Math.sin(angle)*.16],'lacquer',false);}
    }else if(style===5){
      this.mesh(group,this.sphere,color,[.29,.15,.15],[0,y+.41,0],'lacquer');this.mesh(group,this.box,white,[.22,.10,.15],[0,y+.19,0],'lacquer');for(const x of [-.08,.08])this.mesh(group,this.cylinder,'#CBAA6D',[.011,.13,.011],[x,y+.29,0],'metal',false);
      const fin=this.mesh(group,this.roof,white,[.17,.19,.035],[-.25,y+.34,0]);fin.rotation.z=Math.PI/2;
    }else if(style===6){
      this.mesh(group,this.sphere,color,[.15,.20,.12],[0,y+.22,0],'lacquer');this.mesh(group,this.sphere,color,[.18,.145,.14],[0,y+.46,0],'lacquer');for(const x of [-.12,.12]){this.mesh(group,this.cone,color,[.061,.13,.057],[x,y+.61,0],'lacquer');this.mesh(group,this.sphere,dark,[.026,.031,.013],[x*.55,y+.48,.136],'glass',false);}this.mesh(group,this.sphere,white,[.028,.022,.021],[0,y+.43,.147],'matte',false);const tail=this.mesh(group,this.sphere,color,[.053,.17,.053],[.17,y+.19,-.045],'lacquer');tail.rotation.z=-.55;
    }else{
      const gem=new THREE.Mesh(this.gem,this.material(color,'metal'));gem.position.y=y+.32;gem.scale.y=1.35;gem.castShadow=true;group.add(gem);this.mesh(group,this.cylinder,'#D9B470',[.18,.065,.18],[0,y+.075,0],'metal');
    }
    return group;
  }

  house(level:number) {
    const group=new THREE.Group();
    if(level===5){this.mesh(group,this.box,'#C36455',[.60,.43,.36],[0,.21,0],'lacquer');this.mesh(group,this.box,'#F1D8A1',[.64,.065,.41],[0,.45,0],'metal');this.mesh(group,this.box,'#E9DFCB',[.31,.18,.29],[0,.54,0]);for(const x of [-.18,0,.18])this.mesh(group,this.box,'#B7D1CF',[.073,.13,.015],[x,.27,.188],'glass',false);}
    else{this.mesh(group,this.box,'#64A483',[.175,.18,.20],[0,.09,0],'lacquer');this.mesh(group,this.roof,'#316C58',[.22,.15,.25],[0,.185,0],'lacquer');this.mesh(group,this.box,'#ECD8A7',[.044,.095,.016],[0,.069,.103],'matte',false);}
    return group;
  }
}

export function diceTexture(value:number,accent=false) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
  const gradient=ctx.createLinearGradient(0,0,256,256);gradient.addColorStop(0,accent?'#335B5C':'#FFFCF3');gradient.addColorStop(1,accent?'#214044':'#E8DDC8');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
  const pips:Record<number,number[][]>={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
  pips[value].forEach(([x,y])=>{ctx.fillStyle=accent?'#EAC787':'#243D43';ctx.beginPath();ctx.arc(128+x*63,128+y*63,16,0,Math.PI*2);ctx.fill();ctx.fillStyle=accent?'#F5DEA9':'#50666A';ctx.beginPath();ctx.arc(124+x*63,122+y*63,6,Math.PI,Math.PI*2);ctx.fill();});
  return canvasTexture(canvas);
}
