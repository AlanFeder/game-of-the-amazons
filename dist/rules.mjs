export const SIZE = 10;
export const BLOCK = "arrow";
export const otherSide = side => side === "white" ? "black" : "white";
export const coordinate = i => String.fromCharCode(97 + i % SIZE) + (SIZE - Math.floor(i / SIZE));

export function initialPosition() {
  const board = Array(SIZE * SIZE).fill(null);
  for (const i of [60, 69, 93, 96]) board[i] = "white";
  for (const i of [3, 6, 30, 39]) board[i] = "black";
  return { board, side: "white" };
}

export function targets(board, origin) {
  const result = [];
  if (!Number.isInteger(origin) || origin < 0 || origin >= board.length) return result;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dy && !dx) continue;
      let x = origin % SIZE + dx;
      let y = Math.floor(origin / SIZE) + dy;
      while (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
        const i = y * SIZE + x;
        if (board[i] !== null) break;
        result.push(i);
        x += dx;
        y += dy;
      }
    }
  }
  return result;
}

export function movedBoard(board, from, to) {
  const moved = board.slice();
  moved[to] = board[from];
  moved[from] = null;
  return moved;
}

export function applyTurn(position, move) {
  const { from, to, arrow } = move;
  if (position.board[from] !== position.side || !targets(position.board, from).includes(to)) {
    throw new Error("Illegal Amazon move");
  }
  const board = movedBoard(position.board, from, to);
  if (!targets(board, to).includes(arrow)) throw new Error("Illegal arrow");
  board[arrow] = BLOCK;
  return { board, side: otherSide(position.side) };
}

export function winner(position) {
  return position.board.some((piece, i) => piece === position.side && targets(position.board, i).length)
    ? null : otherSide(position.side);
}

export function replay(moves) {
  return moves.reduce(applyTurn, initialPosition());
}
