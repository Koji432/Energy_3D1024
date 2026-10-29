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
