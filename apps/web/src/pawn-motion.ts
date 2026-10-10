/** Continuous travel with a small footfall rather than a stop at every tile. */
export function pawnPose(local:number){
 const t=Math.max(0,Math.min(1,local)),hop=Math.sin(t*Math.PI);
 return{progress:t,height:hop*.18,scaleY:1+hop*.06,scaleXZ:1-hop*.03,lean:Math.sin(t*Math.PI*2)*.025};
}
