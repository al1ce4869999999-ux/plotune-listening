/* Phase 2 opt-in motif identity: no changes to the legacy composition path. */
(function(root){'use strict';
const round=n=>Math.round(n*1000)/1000;
function capture(events){
 if(!Array.isArray(events)||!events.length)throw new TypeError('motif needs events');
 const notes=events.map(e=>({
  position:Number(e.position),durationUnits:Number(e.durationUnits),
  degree:Number(e.degree),rest:!!e.rest
 }));
 if(notes.some(n=>![n.position,n.durationUnits,n.degree].every(Number.isFinite)||n.position<0||n.position>=16||n.durationUnits<=0||n.position+n.durationUnits>16.001))
  throw new RangeError('invalid motif event');
 const anchors=notes.filter(n=>!n.rest);
 if(!anchors.length)throw new RangeError('motif must contain an audible note');
 const first=anchors[0].degree;
 return {version:1,events:notes,contour:anchors.map((n,i)=>i?Math.sign(n.degree-anchors[i-1].degree):0),
  intervals:anchors.map((n,i)=>i?n.degree-anchors[i-1].degree:0),
  anchors:[{position:anchors[0].position,degree:first},{position:anchors[anchors.length-1].position,degree:anchors[anchors.length-1].degree}]};
}
function transform(motif,kind){
 if(!motif||motif.version!==1||!Array.isArray(motif.events))throw new TypeError('invalid motif');
 if(!['statement','variation','contrast','return'].includes(kind))throw new RangeError('unknown transformation');
 const origin=motif.anchors[0].degree;
 const events=motif.events.map((e,i)=>{
  let degree=e.degree,position=e.position,durationUnits=e.durationUnits,rest=e.rest;
  if(kind==='variation'){
   if(!rest&&i%3===1)degree=Math.min(8,degree+1);
   if(i%4===2)durationUnits=Math.min(durationUnits*1.25,16-position);
  }
  if(kind==='contrast'){
   if(!rest)degree=Math.max(0,Math.min(8,origin-(degree-origin)));
   if(i%4===1)rest=true;
  }
  if(kind==='return'&&i===motif.events.length-1){degree=origin;rest=false;}
  return {position:round(position),durationUnits:round(durationUnits),degree,rest};
 });
 if(!events.some(e=>!e.rest))events[0].rest=false;
 return {kind,events,sourceVersion:motif.version};
}
root.PlotuneMotifPlanner={capture,transform};
})(typeof window!=='undefined'?window:globalThis);
