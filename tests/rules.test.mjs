import test from "node:test";
import assert from "node:assert/strict";
import { BLOCK, initialPosition, targets, applyTurn, winner, movedBoard, coordinate } from "../dist/rules.mjs";
import { restore, serialize } from "../dist/save.mjs";

test("standard opening and notation", () => {
  const { board, side } = initialPosition();
  assert.equal(side, "white");
  const locations = color => board.flatMap((p, i) => p === color ? [coordinate(i)] : []);
  assert.deepEqual(locations("white"), ["a4", "j4", "d1", "g1"]);
  assert.deepEqual(locations("black"), ["d10", "g10", "a7", "j7"]);
});

test("queen movement respects edges, blockers, and diagonals", () => {
  const board = Array(100).fill(null);
  board[1] = BLOCK; board[22] = "black";
  assert.deepEqual(targets(board, 0).sort((a,b) => a-b), [10,11,20,30,40,50,60,70,80,90]);
  assert.ok(!targets(board, 9).includes(10));
});

test("shoot onto or through the vacated origin", () => {
  const p = initialPosition();
  const next = applyTurn(p, {from:60,to:61,arrow:60});
  assert.equal(next.board[60], BLOCK);
  assert.equal(next.board[61], "white");
  assert.equal(next.side, "black");
  assert.equal(p.board[60], "white");
  assert.equal(applyTurn(p, {from:93,to:83,arrow:93}).board[93], BLOCK);
  assert.equal(applyTurn(p, {from:60,to:50,arrow:70}).board[70], BLOCK);
});

test("reject enemy, stationary, blocked, bent, and out-of-range moves and shots", () => {
  const p = initialPosition();
  for (const [from,to,arrow] of [[3,4,3],[60,60,61],[60,20,60],[93,94,97],[60,72,60],[60,61,61],[60,61,74],[60,61,69],[60,61,101]]) {
    assert.throws(() => applyTurn(p, {from,to,arrow}));
  }
});

test("a full match restores exactly and ends when the next player is trapped", () => {
  let p = initialPosition();
  const moves = [];
  while (!winner(p)) {
    const from = p.board.findIndex((s,i) => s === p.side && targets(p.board,i).length);
    const to = targets(p.board,from)[0];
    const arrow = targets(movedBoard(p.board,from,to),to)[0];
    const move = {from,to,arrow};
    moves.push(move);
    p = applyTurn(p,move);
    assert.ok(moves.length <= 92);
  }
  assert.ok(moves.length > 2);
  assert.notEqual(winner(p),p.side);
  assert.deepEqual(restore(serialize(moves)), {moves,position:p});
  assert.equal(p.board.filter(s => s === BLOCK).length, moves.length);
});

test("invalid saved games are rejected, missing saves start fresh", () => {
  assert.deepEqual(restore(null).position, initialPosition());
  for (const bad of ["{", '{"version":2,"moves":[]}', serialize([{from:60,to:60,arrow:60}])]) {
    assert.throws(() => restore(bad));
  }
});
