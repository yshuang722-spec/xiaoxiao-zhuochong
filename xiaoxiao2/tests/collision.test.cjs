'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { decodeShape, solveMotion } = require('../engine-patch/collision-link.cjs');

function silhouette(rows, cellSize, flip = false) {
  const runs = [];
  rows.forEach((row, y) => {
    for (const run of row.matchAll(/#+/g)) {
      runs.push(y, run.index, run.index + run[0].length);
    }
  });
  return decodeShape({
    x: 0, y: 0, w: rows[0].length * cellSize, h: rows.length * cellSize,
    cols: rows[0].length, rows: rows.length, flip, runs: Buffer.from(runs).toString('base64'),
  });
}

const moving = {
  shape: silhouette(['##', '##'], 10), size: 100, bottomPad: 0,
  x: 0, y: 0, vx: 2400, vy: 0, enabled: true, flying: true, held: false,
};
const target = { ...moving, x: 50, vx: 0, flying: false };

test('a fast throw first makes contact at the visible edge', () => {
  assert.equal(solveMotion(moving, { ...moving, x: 29.9 }, target), null);
  const touch = solveMotion(moving, { ...moving, x: 30 }, target);
  assert.equal(touch.time, 1);
  const hit = solveMotion(moving, { ...moving, x: 2000 }, target);
  assert.equal(2000 + hit.a.dx, 30);
  assert(hit.b.vx > 0);
  assert.equal(solveMotion({ ...moving, y: 20 }, { ...moving, x: 2000, y: 20 }, target), null);
});

test('the alpha mask preserves holes and follows mirrored artwork', () => {
  const ring = { ...target, x: 0, shape: silhouette(['########', '##....##', '##....##', '########'], 10) };
  const pin = { ...moving, x: 30, y: 14, shape: silhouette(['#'], 4) };
  assert.equal(solveMotion(pin, { ...pin, x: 55 }, ring), null);
  assert.equal(70 + solveMotion(pin, { ...pin, x: 70 }, ring).a.dx, 56);
  const mirrored = { ...target, shape: silhouette(['....##'], 10, true) };
  assert.equal(solveMotion(moving, { ...moving, x: 30 }, mirrored).time, 1);
  const original = { ...target, shape: silhouette(['....##'], 10) };
  assert.equal(solveMotion(moving, { ...moving, x: 30 }, original), null);
});

test('vertical sweeps stop at contact and a held pet ignores impacts', () => {
  const falling = { ...moving, x: 50, y: -200, vx: 0, vy: 3000 };
  const end = { ...falling, y: 300 };
  assert.equal(end.y + solveMotion(falling, end, target).a.dy, -20);
  assert.equal(solveMotion(falling, end, { ...target, held: true }), null);
});
