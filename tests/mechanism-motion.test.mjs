import test from 'node:test';
import assert from 'node:assert/strict';
import { wingMechanismPose, driveMechanismPose, thrustMechanismPose } from '../dist/mechanism-motion.js';

test('the wing slider-crank keeps its joints connected throughout its clamped travel', () => {
  const start = wingMechanismPose(0), end = wingMechanismPose(1);
  const crankRadius = Math.hypot(56, 30);
  assert.notDeepEqual(start, end, 'The wing mechanism must move between its endpoints');
  for (let sample = 0; sample <= 100; sample++) {
    const pose = wingMechanismPose(sample / 100);
    for (const value of [pose.wingAngleDeg, pose.rodOffsetX, pose.linkAngleDeg,
      pose.crank.x, pose.crank.y, pose.rodBall.x, pose.rodBall.y, pose.pivot.x, pose.pivot.y]) {
      assert.ok(Number.isFinite(value), `Nonfinite kinematics at sample ${sample}`);
    }
    assert.deepEqual(pose.pivot, start.pivot, 'The support pivot must remain fixed');
    assert.ok(Math.abs(pose.rodBall.y - 213) < 1e-9, 'The rod joint must stay on its horizontal guide');
    assert.ok(Math.abs(Math.hypot(pose.crank.x - pose.pivot.x, pose.crank.y - pose.pivot.y) - crankRadius) < 1e-9, 'The crank must remain rigid');
    assert.ok(Math.abs(Math.hypot(pose.crank.x - pose.rodBall.x, pose.crank.y - pose.rodBall.y) - 70) < 1e-9, 'The connecting link must remain rigid');
  }
  for (const amount of [-100, -1, -.01]) assert.deepEqual(wingMechanismPose(amount), start, 'Travel below zero must clamp to its start');
  for (const amount of [1.01, 2, 100]) assert.deepEqual(wingMechanismPose(amount), end, 'Travel above one must clamp to its end');
});

test('the EV drive starts electrically and obeys fixed-ring planetary motion through the carrier output', () => {
  const sunTeeth = 24, ringTeeth = 48, planetTeeth = 12;
  const planetInitialAngle = driveMechanismPose(0).planetAngleDeg;
  const firstActive = {};
  for (let sample = 0; sample <= 600; sample++) {
    const time = sample / 100, pose = driveMechanismPose(time);
    assert.ok(Object.values(pose).every(Number.isFinite), `Nonfinite drive state at ${time}`);
    for (const key of ['electric', 'field', 'mechanical']) {
      assert.ok(pose[key] >= 0 && pose[key] <= 1, `${key} must remain within its activation range`);
      if (pose[key] > 0 && firstActive[key] === undefined) firstActive[key] = time;
    }
    const sunRelative = pose.sunAngleDeg - pose.carrierAngleDeg;
    const planetRelative = pose.planetAngleDeg - planetInitialAngle;
    // Willis equation, with the outer ring held still.
    assert.ok(Math.abs(sunTeeth * sunRelative + ringTeeth * (0 - pose.carrierAngleDeg)) < 1e-8, 'The carrier violates the fixed-ring gear constraint');
    // The child planet angle is measured inside its rotating carrier, not in the world frame.
    assert.ok(Math.abs(planetTeeth * planetRelative + sunTeeth * sunRelative) < 1e-8, 'The nested planet spin must be relative to its carrier');
    assert.equal(pose.wheelAngleDeg, pose.carrierAngleDeg, 'The wheel must be driven by the carrier');
    assert.equal(pose.sunAngleDeg, pose.motorAngleDeg, 'The motor must drive the sun gear');
    if (pose.motorAngleDeg > 0) {
      assert.ok(pose.electric > 0 && pose.field > 0, 'The rotor must not start before electrical activation');
      assert.ok(pose.fieldAngleDeg > pose.motorAngleDeg, 'The induction rotor must follow behind the rotating field');
      assert.ok(pose.carrierAngleDeg > 0 && pose.carrierAngleDeg < pose.sunAngleDeg, 'The carrier must reduce speed without reversing direction');
    }
  }
  assert.ok(firstActive.electric < firstActive.field && firstActive.field < firstActive.mechanical, 'The visible startup must progress from electrical supply to field to mechanical motion');
  assert.deepEqual(driveMechanismPose(-1), driveMechanismPose(0));
});

test('the thrust cycle opens its valve before gas flow and keeps supplying gas until after landing', () => {
  const first = {}, last = {};
  for (let sample = 0; sample <= 1600; sample++) {
    const time = sample / 200, pose = thrustMechanismPose(time);
    for (const key of ['electric', 'valve', 'gas', 'lift']) {
      assert.ok(Number.isFinite(pose[key]) && pose[key] >= 0 && pose[key] <= 1, `Invalid ${key} at ${time}`);
      if (pose[key] > 1e-9) {
        first[key] ??= time;
        last[key] = time;
      }
    }
    if (pose.gas > 1e-9) assert.ok(pose.valve > 0, 'Gas must not flow through a closed valve');
    if (pose.lift > 1e-9) assert.ok(pose.valve > 0 && pose.gas > 0, 'Lift must be supported by an open valve and gas flow');
    if (time >= 7) assert.deepEqual(pose, { valve: 0, gas: 0, lift: 0, electric: 0 }, 'The cycle must end at rest');
  }
  assert.ok(first.electric < first.valve && first.valve < first.gas && first.gas < first.lift, 'The startup sequence must reach the valve before the gas and lift');
  assert.ok(last.lift < last.gas && last.lift < last.valve, 'The vehicle must land before gas flow and the valve close');
  assert.deepEqual(thrustMechanismPose(-1), thrustMechanismPose(0));
});
