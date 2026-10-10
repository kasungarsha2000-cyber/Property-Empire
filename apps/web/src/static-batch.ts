import * as THREE from 'three';

/** Keep source meshes for picking; submit their shared static geometry once. */
export function batchStaticScene(scene:THREE.Scene){
 scene.updateMatrixWorld(true);
 const groups=new Map<string,THREE.Mesh[]>();
 scene.traverse(object=>{
  if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||Array.isArray(object.material))return;
  for(let parent:THREE.Object3D|null=object;parent;parent=parent.parent)if(!parent.visible)return;
  const key=[object.geometry.uuid,object.material.uuid,object.castShadow,object.receiveShadow,object.renderOrder,object.layers.mask].join(':');
  const group=groups.get(key)??[];group.push(object);groups.set(key,group);
 });
 let savedDrawCalls=0,batches=0;
 const inverse=scene.matrixWorld.clone().invert();
 for(const meshes of groups.values()){
  if(meshes.length<2)continue;
  const first=meshes[0],batch=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
  batch.name=`static-batch-${batches++}`;batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
  batch.renderOrder=first.renderOrder;batch.layers.mask=first.layers.mask;
  meshes.forEach((mesh,i)=>{batch.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));mesh.visible=false;});
  batch.computeBoundingBox();batch.computeBoundingSphere();scene.add(batch);savedDrawCalls+=meshes.length-1;
 }
 return{savedDrawCalls,batches};
}
