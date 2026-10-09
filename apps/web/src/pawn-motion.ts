/** Smooth forward travel, a clear hop, and stable transforms at each tile. */
export function pawnPose(local:number){
 const t=Math.max(0,Math.min(1,local)),hop=Math.sin(t*Math.PI);
 return{progress:(1-Math.cos(t*Math.PI))/2,height:hop*.34,scaleY:1+hop*.14,scaleXZ:1-hop*.07,lean:Math.sin(t*Math.PI*2)*.08};
}
