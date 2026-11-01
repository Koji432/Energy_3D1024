// A representative slider-crank, rather than a proprietary actuator geometry.
export function wingMechanismPose(amount) {
 const progress=Math.max(0,Math.min(1,Number(amount)||0));
 const wingAngleDeg=-12*progress,angle=wingAngleDeg*Math.PI/180;
 const pivot={x:846,y:213};
 const crank={x:pivot.x-56*Math.cos(angle)+30*Math.sin(angle),y:pivot.y-56*Math.sin(angle)-30*Math.cos(angle)};
 const rodBall={x:crank.x-Math.sqrt(70**2-(crank.y-pivot.y)**2),y:pivot.y};
 const referenceX=790-Math.sqrt(4000),referenceAngle=Math.atan2(-30,Math.sqrt(4000));
 const linkAngleDeg=(Math.atan2(crank.y-rodBall.y,crank.x-rodBall.x)-referenceAngle)*180/Math.PI;
 return {wingAngleDeg,rodOffsetX:rodBall.x-referenceX,linkAngleDeg,crank,rodBall,pivot};
}

const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=(time,start,end)=>{const t=clamp((time-start)/(end-start));return t*t*(3-2*t);};

// Teaching ratios: 24-tooth sun, 12-tooth planets, fixed 48-tooth ring.
// Planet spin is relative to the rotating carrier that contains each planet.
export function driveMechanismPose(time) {
 const t=Math.max(0,Number(time)||0),run=Math.max(0,t-.8);
 const motorAngleDeg=180*run,carrierAngleDeg=motorAngleDeg/3;
 return {motorAngleDeg,fieldAngleDeg:motorAngleDeg*1.08,sunAngleDeg:motorAngleDeg,
  carrierAngleDeg,planetAngleDeg:15-4*motorAngleDeg/3,wheelAngleDeg:carrierAngleDeg,
  electric:smooth(t,0,.5),field:smooth(t,.4,.9),mechanical:smooth(t,.8,1.3)};
}

// One repeating valve → gas flow → rise → controlled landing sequence.
export function thrustMechanismPose(time) {
 const t=Math.max(0,Number(time)||0)%8;
 const valve=smooth(t,.7,1.4)*(1-smooth(t,5.8,6.5));
 const gas=smooth(t,1.1,1.6)*(1-smooth(t,6,6.5));
 const lift=smooth(t,1.6,3.2)*(1-smooth(t,4.5,6));
 return {valve,gas,lift,electric:smooth(t,.2,.7)*(1-smooth(t,6.5,7))};
}

export function suctionMechanismPose(time) {
 const t=Math.max(0,Number(time)||0);
 return {fanAngleDeg:Math.max(0,t-.2)*360,air:smooth(t,.5,1.4),compression:smooth(t,1.3,2.5)};
}
