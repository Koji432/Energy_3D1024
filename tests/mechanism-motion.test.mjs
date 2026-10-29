import test from 'node:test';
import assert from 'node:assert/strict';
import { wingMechanismPose } from '../dist/mechanism-motion.js';

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
