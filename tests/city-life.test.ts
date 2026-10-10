import {afterEach, describe, expect, it, vi} from 'vitest';
import * as THREE from 'three';
import {SceneAssets} from '../apps/web/src/scene-assets';
import {CityLife, cityCycle, trafficPose, walkerPose, aircraftPose} from '../apps/web/src/city-life';

afterEach(() => vi.unstubAllGlobals());

function fixture() {
  // Only the constructor's contact-shadow canvas needs a browser API here;
  // all geometry, materials, transforms and lights are the real Three objects.
  vi.stubGlobal('document', {createElement: () => ({width: 128, height: 128, getContext: () => ({
    createRadialGradient: () => ({addColorStop() {}}), fillRect() {},
  })})});
  const assets = new SceneAssets(), scene = new THREE.Scene();
  const windowMaterial = assets.material('#FFFFFF', 'glass');
  const windows = new THREE.InstancedMesh(assets.box, windowMaterial, 2);
  const dummy = new THREE.Object3D(); dummy.position.set(1, 2, -2); dummy.scale.set(.14, .20, .019); dummy.updateMatrix();
  windows.setMatrixAt(0, dummy.matrix); windows.setColorAt(0, new THREE.Color('#E8C888'));
  windows.setMatrixAt(1, dummy.matrix); windows.setColorAt(1, new THREE.Color('#9AC5CE')); scene.add(windows);
  const lighting = {key: new THREE.DirectionalLight('#FFF0CE', 1.8), fill: new THREE.DirectionalLight('#B8D8EA', .45), hemisphere: new THREE.HemisphereLight('#FFF2DA', '#577A85', .65)};
  return {scene, assets, lighting, windowMaterial, windows, life: new CityLife(scene, assets, lighting)};
}

describe('living city cycles and movement', () => {
  it('cycles through daylight, night and every weather without going dark', () => {
    expect(cityCycle(0)).toMatchObject({period: 'Day', weather: 'Clear', daylight: 1});
    expect(cityCycle(90).weather).toBe('Cloudy');
    expect(cityCycle(55).period).toBe('Dusk'); expect(cityCycle(185).period).toBe('Dawn');
    expect(cityCycle(120)).toMatchObject({period: 'Night', weather: 'Rain', daylight: 0});
    expect(cityCycle(240).daylight).toBe(1);
    for (let second = 0; second < 720; second += 3) {
      const cycle = cityCycle(second);
      expect(cycle.key).toBeGreaterThanOrEqual(.55);
      expect(cycle.hemisphere).toBeGreaterThanOrEqual(.60);
      expect(cycle.cloud).toBeGreaterThanOrEqual(0); expect(cycle.cloud).toBeLessThanOrEqual(1);
      expect(cycle.rain).toBeGreaterThanOrEqual(0); expect(cycle.rain).toBeLessThanOrEqual(1);
    }
  });

  it('keeps cars on road lanes and away from the board playing ring', () => {
    for (let second = 0; second < 220; second += .37) for (let i = 0; i < 6; i++) {
      const car = trafficPose(second, i);
      expect(car.y).toBe(.69);
      if (i < 4) {expect(Math.abs(car.x)).toBeLessThanOrEqual(4.15); expect(Math.abs(car.z + .75)).toBeLessThanOrEqual(.151);}
      else {expect(car.z).toBeGreaterThanOrEqual(-2.65); expect(car.z).toBeLessThanOrEqual(.59); expect(Math.abs(car.x - .35)).toBeLessThanOrEqual(.151);}
      expect(Number.isFinite(car.heading)).toBe(true);
    }
    expect(trafficPose(0, 0).x).not.toBe(trafficPose(5, 0).x);
  });

  it('keeps pedestrians off the road and aircraft above the tallest tower', () => {
    for (let second = 0; second < 180; second += .79) {
      for (let i = 0; i < 8; i++) {
        const walker = walkerPose(second, i);
        expect(walker.x).toBeGreaterThanOrEqual(-3.8); expect(walker.x).toBeLessThanOrEqual(3.8);
        expect(Math.abs(walker.z + .75)).toBeGreaterThanOrEqual(.34);
        expect(walker.y).toBe(.69);
      }
      const plane = aircraftPose(second);
      expect(plane.y).toBeGreaterThan(5);
      expect(Math.abs(plane.x)).toBeLessThan(5); expect(Math.abs(plane.z)).toBeLessThan(5);
    }
  });

  it('throttles ambient frames to configured quality', () => {
    const {life} = fixture(); life.configure(false, 'low');
    expect(life.update(0)).toBe(true); expect(life.update(16)).toBe(false); expect(life.update(34)).toBe(true);
    life.configure(false, 'high'); expect(life.update(35)).toBe(true); expect(life.update(43)).toBe(false); expect(life.update(52)).toBe(true);
  });

  it('keeps the city clock and aircraft at real speed when render frames drop',()=>{
    const {life,scene}=fixture();life.update(0);life.update(1000);
    const aircraft=scene.getObjectByName('city-aircraft')!,pose=aircraftPose(1);
    expect(aircraft.position.x).toBeCloseTo(pose.x);expect(aircraft.position.z).toBeCloseTo(pose.z);
  });

  it('does not lose alternate frames at a 60 Hz browser cadence',()=>{
    const {life}=fixture();life.configure(false,'high');let frames=0;
    for(let frame=0;frame<=120;frame++)if(life.update(frame*1000/60))frames++;
    expect(frames).toBeGreaterThanOrEqual(119);
  });

  it('freezes all ambient transforms and weather under reduced motion', () => {
    const {life, scene} = fixture(); life.update(0); life.update(1000); life.configure(true, 'high');
    expect(life.update(1001)).toBe(true);
    scene.updateMatrixWorld(true); const frozen = scene.children.map(object => object.matrixWorld.toArray());
    expect(life.update(300000)).toBe(false); scene.updateMatrixWorld(true);
    expect(scene.children.map(object => object.matrixWorld.toArray())).toEqual(frozen);
    expect(life.status).toBe('Day · Clear');
    const rain = scene.getObjectByName('city-rain'); expect(rain?.visible).toBe(false);
  });

  it('caps resume deltas so hidden-tab gaps do not skip weather cycles', () => {
    const {life} = fixture(); life.update(0); life.update(1000); life.update(900000);
    expect(life.status).toBe('Day · Clear');
  });

  it('resumes from the same traffic positions when its visibility clock is reset', () => {
    const {life, scene} = fixture(); life.update(0); life.update(100);
    const traffic = scene.getObjectByName('city-traffic') as THREE.InstancedMesh;
    const before = Array.from(traffic.instanceMatrix.array);
    life.resetClock(); expect(life.update(900000)).toBe(true);
    expect(Array.from(traffic.instanceMatrix.array)).toEqual(before);
    expect(life.update(900100)).toBe(true);
    expect(Array.from(traffic.instanceMatrix.array)).not.toEqual(before);
  });

  it('stops vertical traffic at the red intersection and lets it cross on green', () => {
    const {life, scene} = fixture(); life.update(0);
    for (let now = 100; now <= 10000; now += 100) life.update(now);
    const traffic = scene.getObjectByName('city-traffic') as THREE.InstancedMesh, matrix = new THREE.Matrix4();
    traffic.getMatrixAt(4, matrix); const stopped = new THREE.Vector3().setFromMatrixPosition(matrix);
    expect(stopped.z).toBeGreaterThanOrEqual(-.28); expect(stopped.z).toBeLessThan(-.23);
    for (let now = 10100; now <= 16000; now += 100) life.update(now);
    traffic.getMatrixAt(4, matrix); expect(new THREE.Vector3().setFromMatrixPosition(matrix).z).toBeCloseTo(stopped.z);
    for (let now = 16100; now <= 23000; now += 100) life.update(now);
    traffic.getMatrixAt(4, matrix); expect(new THREE.Vector3().setFromMatrixPosition(matrix).z).toBeLessThan(-.75);
  });

  it('keeps following vehicles from running into queues at a red light', () => {
    const {life, scene} = fixture(); life.update(0);
    const traffic = scene.getObjectByName('city-traffic') as THREE.InstancedMesh, matrix = new THREE.Matrix4();
    for (let now = 100; now <= 120000; now += 100) {
      life.update(now);
      const centers = Array.from({length: 6}, (_, i) => {traffic.getMatrixAt(i, matrix); return new THREE.Vector3().setFromMatrixPosition(matrix);});
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
        expect(centers[i].distanceTo(centers[j])).toBeGreaterThan(.19);
      }
    }
  });

  it('lights city windows using a private material without changing shared glass', () => {
    const {life, scene, windowMaterial, windows, lighting} = fixture();
    life.update(0); for (let now = 100; now <= 120000; now += 100) life.update(now);
    expect(life.status).toBe('Night · Rain');
    expect(windows.material).not.toBe(windowMaterial);
    expect(windowMaterial.emissiveIntensity).toBe(1); expect(windowMaterial.emissive.getHex()).toBe(0);
    expect((windows.material as THREE.MeshStandardMaterial).emissiveIntensity).toBeGreaterThan(.2);
    expect(lighting.key.intensity).toBeGreaterThanOrEqual(.55);
    expect(scene.getObjectByName('city-rain')?.visible).toBe(true);
  });
});
