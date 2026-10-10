import * as THREE from 'three';
import {SceneAssets} from './scene-assets';
type Quality = 'low'|'medium'|'high';
type Pose = {x: number; y: number; z: number; heading: number};
type Lighting = {key: THREE.DirectionalLight; fill: THREE.DirectionalLight; hemisphere: THREE.HemisphereLight};
const tau = Math.PI * 2;
const wrap = (value: number, length: number) => ((value % length) + length) % length;
const smooth = (value: number) => {const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t);};

/** A four-minute solar day and three-minute weather cycle, independent of game state. */
export function cityCycle(seconds: number) {
  const solar = Math.cos(wrap(seconds, 240) / 240 * tau);
  const daylight = smooth((solar + .25) / .80);
  const weatherTime = wrap(seconds, 180);
  const weather = weatherTime < 60 ? 'Clear' : weatherTime < 120 ? 'Cloudy' : 'Rain';
  const cloud = weatherTime < 60 ? smooth((weatherTime - 48) / 12)
    : weatherTime < 162 ? 1 : 1 - smooth((weatherTime - 162) / 18);
  const rain = weatherTime < 120 ? 0 : smooth((weatherTime - 118) / 10) * (1 - smooth((weatherTime - 162) / 18));
  const period = daylight > .72 ? 'Day' : daylight < .16 ? 'Night' : wrap(seconds, 240) < 120 ? 'Dusk' : 'Dawn';
  return {period, weather, daylight, cloud, rain, key: .58 + daylight * 1.22 - cloud * daylight * .25,
    hemisphere: .68 + daylight * .10, fill: .48 + (1 - daylight) * .12};
}

/** Continuous two-lane capsule, including U-turns inside the road ends. */
function capsule(distance: number, half: number, radius: number): Pose {
  const straight = half * 2, arc = Math.PI * radius;
  const d = wrap(distance, straight * 2 + arc * 2);
  if (d < straight) return {x: -half + d, y: .69, z: radius, heading: 0};
  if (d < straight + arc) {
    const angle = Math.PI / 2 - (d - straight) / radius;
    return {x: half + Math.cos(angle) * radius, y: .69, z: Math.sin(angle) * radius, heading: Math.PI / 2 - angle};
  }
  if (d < straight * 2 + arc) return {x: half - (d - straight - arc), y: .69, z: -radius, heading: Math.PI};
  const angle = -Math.PI / 2 - (d - straight * 2 - arc) / radius;
  return {x: -half + Math.cos(angle) * radius, y: .69, z: Math.sin(angle) * radius, heading: Math.PI / 2 - angle};
}

export function trafficPose(seconds: number, index: number): Pose {
  const vertical = index >= 4, half = vertical ? 1.42 : 4, radius = .13;
  const length = half * 4 + tau * radius, count = vertical ? 2 : 4;
  const pose = capsule(seconds * .38 + (index % 4) / count * length, half, radius);
  return vertical ? {x: .35 + pose.z, y: pose.y, z: -1.02 - pose.x, heading: pose.heading + Math.PI / 2}
    : {...pose, z: -.75 + pose.z};
}

export function walkerPose(seconds: number, index: number): Pose {
  // Four disconnected sidewalk stretches keep walkers out of both traffic lanes.
  const right = index % 4 >= 2, north = index % 2 === 0;
  const min = right ? 1.08 : -3.65, max = right ? 3.65 : -.44;
  const span = max - min, d = wrap(seconds * .085 + Math.floor(index / 4) * span, span * 2);
  return {x: d < span ? min + d : max - (d - span), y: .69, z: north ? -1.11 : -.39, heading: d < span ? 0 : Math.PI};
}

export function aircraftPose(seconds: number): Pose {
  const angle = seconds / 82 * tau;
  return {x: Math.cos(angle) * 3.65, y: 5.65 + Math.sin(angle * 2) * .12,
    z: -1.30 + Math.sin(angle) * 2.72, heading: Math.atan2(-Math.cos(angle) * 2.72, -Math.sin(angle) * 3.65)};
}

export class CityLife {
  status = 'Day · Clear';
  private readonly root = new THREE.Group();
  private readonly dummy = new THREE.Object3D();
  private readonly poseRoot = new THREE.Object3D();
  private readonly body: THREE.InstancedMesh;
  private readonly cabin: THREE.InstancedMesh;
  private readonly wheels: THREE.InstancedMesh;
  private readonly headlights: THREE.InstancedMesh;
  private readonly heads: THREE.InstancedMesh;
  private readonly torsos: THREE.InstancedMesh;
  private readonly limbs: THREE.InstancedMesh;
  private readonly clouds: THREE.InstancedMesh;
  private readonly lamps: THREE.InstancedMesh;
  private readonly signals: THREE.InstancedMesh;
  private readonly aircraft = new THREE.Group();
  private readonly rain: THREE.Points;
  private readonly rainPositions = new Float32Array(540);
  private readonly glass: THREE.MeshStandardMaterial[] = [];
  private readonly glow = new THREE.MeshStandardMaterial({color: '#FFE9AE', emissive: '#FFCF7C', emissiveIntensity: .1, roughness: .5});
  private readonly cloudMaterial = new THREE.MeshStandardMaterial({color: '#EFF1E7', transparent: true, opacity: .16, depthWrite: false, roughness: 1});
  private readonly rainMaterial = new THREE.PointsMaterial({color: '#BBDCE5', transparent: true, opacity: .45, size: .032, depthWrite: false});
  private readonly sunDay = new THREE.Color('#FFF0CE');
  private readonly sunNight = new THREE.Color('#A7BEE6');
  private readonly trafficTime = [0, 0, 0, 0, 0, 0];
  private reduced = false;
  private quality: Quality = 'high';
  private elapsed = 0;
  private last: number | null = null;
  private dirty = true;

  constructor(private readonly scene: THREE.Scene, assets: SceneAssets, private readonly lighting: Lighting) {
    this.root.name = 'city-life'; scene.add(this.root);
    // Instanced city windows share white glass with other board details; isolate only these instances.
    scene.traverse(object => {
      if (object instanceof THREE.InstancedMesh && object.material === assets.material('#FFFFFF', 'glass')) {
        const material = (object.material as THREE.MeshStandardMaterial).clone();
        material.emissive.set('#FFDBAA'); object.material = material; this.glass.push(material);
      }
    });
    const batch = (geometry: THREE.BufferGeometry, material: THREE.Material, count: number, name: string) => {
      const mesh = new THREE.InstancedMesh(geometry, material, count); mesh.name = name;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; this.root.add(mesh); return mesh;
    };
    this.body = batch(assets.box, assets.material('#FFFFFF', 'lacquer'), 6, 'city-traffic');
    this.cabin = batch(assets.box, assets.material('#6EABBC', 'glass'), 6, 'city-car-windows');
    this.wheels = batch(assets.cylinder, assets.material('#263D43'), 24, 'city-car-wheels');
    this.headlights = batch(assets.sphere, this.glow, 12, 'city-headlights');
    ['#D78665', '#CFB467', '#85AAB4', '#567C8A', '#94AB7D', '#B590B9'].forEach((color, i) => this.body.setColorAt(i, new THREE.Color(color)));
    this.heads = batch(assets.sphere, assets.material('#D9AE86'), 8, 'city-pedestrian-heads');
    this.torsos = batch(assets.box, assets.material('#FFFFFF'), 8, 'city-pedestrians');
    this.limbs = batch(assets.box, assets.material('#364C55'), 32, 'city-pedestrian-limbs');
    ['#AB6676', '#E7BD72', '#6D8AA8', '#779D81'].forEach((color, i) => {this.torsos.setColorAt(i, new THREE.Color(color)); this.torsos.setColorAt(i + 4, new THREE.Color(color));});
    this.clouds = batch(assets.sphere, this.cloudMaterial, 12, 'city-clouds');
    this.lamps = batch(assets.sphere, this.glow, 4, 'city-lamp-glow');
    for (const [i, [x, z]] of [[-3.6, -1.02], [-.08, -1.7], [1.04, -1.05], [3.5, -.38]].entries()) {
      this.setPart(this.lamps, i, {x, y: 1.31, z, heading: 0}, [0, 0, 0], [.069, .072, .069]);
    }
    const signalMaterial = new THREE.MeshBasicMaterial({color: '#FFFFFF', toneMapped: false});
    this.signals = batch(assets.sphere, signalMaterial, 2, 'city-traffic-signals');
    for (const [i, [x, z]] of [[-.05, -1.04], [.79, -.43]].entries()) {
      assets.mesh(this.root, assets.cylinder, '#3E5558', [.014, .32, .014], [x, .84, z], 'metal', false);
      assets.mesh(this.root, assets.box, '#263D43', [.075, .13, .055], [x, 1.01, z], 'matte', false);
      this.setPart(this.signals, i, {x, y: 1.035, z, heading: 0}, [0, 0, .033], [.022, .022, .012]);
    }
    this.aircraft.name = 'city-aircraft'; this.root.add(this.aircraft);
    assets.mesh(this.aircraft, assets.sphere, '#F3EEDD', [.46, .072, .072], [0, 0, 0], 'lacquer', false);
    assets.mesh(this.aircraft, assets.box, '#C78665', [.15, .027, .78], [-.07, 0, 0], 'lacquer', false);
    assets.mesh(this.aircraft, assets.box, '#F3EEDD', [.14, .026, .32], [-.32, .025, 0], 'lacquer', false);
    assets.mesh(this.aircraft, assets.box, '#C78665', [.12, .14, .025], [-.32, .06, 0], 'lacquer', false);
    assets.mesh(this.aircraft, assets.sphere, '#507B91', [.11, .043, .068], [.18, .044, 0], 'glass', false);
    for (const z of [-.23, .23]) assets.mesh(this.aircraft, assets.cylinder, '#66808A', [.044, .19, .044], [0, -.045, z], 'metal', false).rotation.z = Math.PI / 2;
    const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.Points(rainGeometry, this.rainMaterial); this.rain.name = 'city-rain'; this.rain.frustumCulled = false; this.root.add(this.rain);
  }

  configure(reduced: boolean, quality: Quality) {
    if (this.reduced === reduced && this.quality === quality) return;
    this.reduced = reduced; this.quality = quality; this.dirty = true; this.last = null;
  }

  /** Called on visibility changes to resume from the current city moment. */
  resetClock() {this.last = null; this.dirty = true;}

  update(now: number): boolean {
    if (!Number.isFinite(now)) return false;
    if (this.reduced && !this.dirty) return false;
    const interval = this.quality === 'low' ? 1000 / 30 : 1000 / 60;
    // A small tolerance avoids losing alternating frames to floating-point timestamps.
    if (!this.dirty && this.last !== null && now - this.last < interval - .5) return false;
    const gap=this.last===null?0:now-this.last;
    // Visibility resets the clock. Ignore long suspended gaps, but retain elapsed
    // time from ordinary dropped frames so traffic/weather never run in slow motion.
    const dt = this.reduced||gap>5000?0:Math.max(0,gap/1000);
    this.last = now; this.dirty = false; this.elapsed += dt * 1000;
    const seconds = this.reduced ? 0 : this.elapsed / 1000, cycle = cityCycle(seconds);
    this.status = `${cycle.period} · ${cycle.weather}`;
    this.lighting.key.intensity = cycle.key; this.lighting.key.color.copy(this.sunNight).lerp(this.sunDay, cycle.daylight);
    this.lighting.fill.intensity = cycle.fill; this.lighting.hemisphere.intensity = cycle.hemisphere;
    this.scene.environmentIntensity = .30 + cycle.daylight * .10;
    this.glow.emissiveIntensity = .10 + (1 - cycle.daylight) * 1.55;
    for (const material of this.glass) material.emissiveIntensity = .015 + (1 - cycle.daylight) * .45;
    const signalTime = wrap(seconds, 40), horizontalGreen = signalTime < 18, verticalGreen = signalTime >= 20 && signalTime < 38;
    this.signals.setColorAt(0, new THREE.Color(horizontalGreen ? '#85DA9C' : '#E97866'));
    this.signals.setColorAt(1, new THREE.Color(verticalGreen ? '#85DA9C' : '#E97866')); this.signals.instanceColor!.needsUpdate = true;
    // Substeps keep signal/queue collision checks reliable at a low rendering FPS.
    const steps=Math.max(1,Math.ceil(dt/.05)),step=dt/steps;
    for(let tick=0;tick<steps;tick++){
     const light=wrap(seconds-dt+step*(tick+1),40),horizontal=light<18,vertical=light>=20&&light<38;
     for(let i=0;i<6;i++){
      const before = trafficPose(this.trafficTime[i], i), next = trafficPose(this.trafficTime[i] + step, i);
      const stop = i < 4 ? !horizontal && ((before.x <= -.18 && next.x > -.18) || (before.x >= .88 && next.x < .88))
        : !vertical && ((before.z <= -1.22 && next.z > -1.22) || (before.z >= -.28 && next.z < -.28));
      // A queued vehicle holds followers back; parallel opposite lanes remain free.
      const queued = this.trafficTime.some((time, j) => {
        if (i === j) return false;
        const other = trafficPose(time, j), dx = other.x - next.x, dz = other.z - next.z;
        const forward = dx * Math.cos(next.heading) - dz * Math.sin(next.heading);
        const side = dx * Math.sin(next.heading) + dz * Math.cos(next.heading);
        return dx * dx + dz * dz < .24 * .24 || (forward > 0 && forward < .60 && Math.abs(side) < .17);
      });
      if (!stop && !queued) this.trafficTime[i] += step;
     }
    }
    for (let i = 0; i < 6; i++) {
      const pose = trafficPose(this.reduced ? 0 : this.trafficTime[i], i), bus = i === 3;
      const length = bus ? .56 : .36;
      this.setPart(this.body, i, pose, [0, .105, 0], [length, bus ? .20 : .12, .19]);
      this.setPart(this.cabin, i, pose, [-.015, bus ? .22 : .19, 0], [bus ? .43 : .18, .085, .167]);
      for (let wheel = 0; wheel < 4; wheel++) this.setPart(this.wheels, i * 4 + wheel, pose,
        [(wheel < 2 ? -1 : 1) * length * .32, .055, wheel % 2 ? .103 : -.103], [.048, .031, .048], 0, Math.PI / 2);
      for (let lamp = 0; lamp < 2; lamp++) this.setPart(this.headlights, i * 2 + lamp, pose, [length / 2, .12, lamp ? .063 : -.063], [.015, .022, .020]);
    }
    for (let i = 0; i < 8; i++) {
      const pose = walkerPose(seconds, i), gait = this.reduced ? 0 : Math.sin(seconds * 5.3 + i * 1.9) * .34;
      this.setPart(this.heads, i, pose, [0, .225, 0], [.040, .046, .040]);
      this.setPart(this.torsos, i, pose, [0, .145, 0], [.068, .10, .075]);
      for (let limb = 0; limb < 4; limb++) {
        const arm = limb < 2, side = limb % 2 ? 1 : -1, swing = gait * side * (arm ? -1 : 1);
        this.setPart(this.limbs, i * 4 + limb, pose, [Math.sin(swing) * .025, arm ? .137 : .057, side * (arm ? .052 : .023)],
          [arm ? .021 : .023, arm ? .083 : .096, .025], swing);
      }
    }
    const plane = aircraftPose(seconds); this.aircraft.position.set(plane.x, plane.y, plane.z); this.aircraft.rotation.set(0, plane.heading, -.06);
    this.cloudMaterial.opacity = .12 + cycle.cloud * .40;
    this.cloudMaterial.color.set(cycle.weather === 'Rain' ? '#A5B8C4' : '#EEF0E5');
    this.clouds.count = this.quality === 'low' ? 8 : 12;
    for (let i = 0; i < 12; i++) {
      const cluster = Math.floor(i / 4), puff = i % 4;
      const x = -2.85 + cluster * 2.45 + Math.sin(seconds / 45 + cluster) * .30 + (puff - 1.5) * .27;
      this.setPart(this.clouds, i, {x, y: 5.15 + cluster * .10 + (puff % 2) * .075, z: -2.85 + cluster * 1.10, heading: 0}, [0, 0, 0], [.43, .18, .27]);
    }
    this.rain.visible = !this.reduced && cycle.rain > .01;
    this.rainMaterial.opacity = cycle.rain * .45;
    if (this.rain.visible) {
      const count = this.quality === 'low' ? 70 : this.quality === 'medium' ? 120 : 180;
      this.rain.geometry.setDrawRange(0, count);
      for (let i = 0; i < count; i++) {
        this.rainPositions[i * 3] = -4.1 + wrap(i * .754877, 1) * 8.2;
        this.rainPositions[i * 3 + 1] = .73 + wrap(i * .618034 - seconds * 1.45, 1) * 4.30;
        this.rainPositions[i * 3 + 2] = -3.95 + wrap(i * .56984, 1) * 4.85;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    for (const mesh of [this.body, this.cabin, this.wheels, this.headlights, this.heads, this.torsos, this.limbs, this.clouds]) mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

  private setPart(mesh: THREE.InstancedMesh, index: number, pose: Pose, offset: number[], scale: number[], roll = 0, pitch = 0) {
    this.poseRoot.position.set(pose.x, pose.y, pose.z); this.poseRoot.rotation.set(0, pose.heading, 0); this.poseRoot.updateMatrix();
    this.dummy.position.set(offset[0], offset[1], offset[2]); this.dummy.scale.set(scale[0], scale[1], scale[2]);
    this.dummy.rotation.set(pitch, 0, roll); this.dummy.updateMatrix();
    this.dummy.matrix.premultiply(this.poseRoot.matrix); mesh.setMatrixAt(index, this.dummy.matrix);
  }
}
