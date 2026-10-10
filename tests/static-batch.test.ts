import {it,expect} from 'vitest';
import * as THREE from 'three';
import {batchStaticScene} from '../apps/web/src/static-batch';
it('batches repeated static meshes without changing geometry, materials or world transforms',()=>{
 const scene=new THREE.Scene(),group=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();group.position.set(3,1,-2);scene.add(group);
 const meshes=Array.from({length:40},(_,i)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.x=i/2;group.add(mesh);return mesh;});scene.updateMatrixWorld(true);const expected=meshes.map(mesh=>mesh.matrixWorld.clone());
 const result=batchStaticScene(scene);expect(result.savedDrawCalls).toBe(39);
 const batch=scene.getObjectByName('static-batch-0') as THREE.InstancedMesh;expect(batch.count).toBe(40);expect(batch.geometry).toBe(geometry);expect(batch.material).toBe(material);
 for(let i=0;i<40;i++){const matrix=new THREE.Matrix4();batch.getMatrixAt(i,matrix);expect(matrix.elements).toEqual(expected[i].elements);expect(meshes[i].visible).toBe(false);}
});
it('keeps hidden owners, existing instances, unique labels and original tile raycasts intact',()=>{
 const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();
 const a=new THREE.Mesh(geometry,material),b=a.clone();b.position.x=3;scene.add(a,b);a.userData.index=1;
 const owner=a.clone();owner.visible=false;scene.add(owner);const label=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());scene.add(label);
 const existing=new THREE.InstancedMesh(geometry,material,3);scene.add(existing);batchStaticScene(scene);scene.updateMatrixWorld(true);
 expect(owner.visible).toBe(false);expect(label.visible).toBe(true);expect(existing.visible).toBe(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,0,3),new THREE.Vector3(0,0,-1));expect(ray.intersectObjects([a],true)[0].object.userData.index).toBe(1);
});
