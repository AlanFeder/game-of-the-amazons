import { BLOCK, applyTurn, coordinate, initialPosition, movedBoard, replay, targets, winner } from "./rules.mjs";
import { restore, serialize, SAVE_KEY } from "./save.mjs";

const $ = selector => document.querySelector(selector);
const cap = s => s[0].toUpperCase() + s.slice(1);
const boardEl = $("#board");
const cells = [];
const steps = [...document.querySelectorAll(".steps li")];
const dialog = $("#dialog");
// Committed state advances only when a shot lands. The two selections below
// can be backed out independently and never appear in the saved match.
let position = initialPosition();
let moves = [];
let undoDepth = 0;
let from = null;
let to = null;
let focused;

/** Restore the last committed match, or leave a fresh board after a read failure. */
function load() {
  try {
    ({ moves, position, undoDepth } = restore(localStorage.getItem(SAVE_KEY)));
  } catch {
    $("#save-note").textContent = "The saved match could not be loaded. A fresh board is ready.";
  }
}

/** Save without interrupting play when browser storage is unavailable. */
function save() {
  try {
    localStorage.setItem(SAVE_KEY, serialize(moves, position.size, undoDepth));
    $("#save-note").textContent = "";
  } catch {
    $("#save-note").textContent = "Browser storage is unavailable. Keep this tab open to continue your match.";
  }
}

/**
 * Derive the display state from the committed position and current selection.
 * Stages 0, 1, and 2 correspond to choosing a piece, destination, and shot.
 * @returns {{board: import("./rules.mjs").Cell[], legal: number[], stage: number}}
 */
function view() {
  const board = to === null ? position.board : movedBoard(position.board, from, to);
  const legal = from === null ? [] : targets(board, to ?? from);
  return { board, legal, stage: from === null ? 0 : to === null ? 1 : 2 };
}

/** Keep exactly one board square in the tab order. @param {number} index */
function setFocus(index) {
  cells[focused].tabIndex = -1;
  focused = index;
  cells[focused].tabIndex = 0;
}

/** Update the existing square buttons to preserve keyboard focus during play. */
function draw() {
  const { board, legal, stage } = view();
  const won = winner(position);
  const player = cap(won ?? position.side);
  const title = won ? player + " wins" : player + " to play";
  cells.forEach((cell, i) => {
    const piece = board[i];
    const own = !won && stage < 2 && piece === position.side;
    const selected = i === (to ?? from);
    const target = !won && legal.includes(i);
    cell.classList.toggle("blocked", piece === BLOCK);
    cell.classList.toggle("selectable", own);
    cell.classList.toggle("selected", selected);
    cell.classList.toggle("target", target);
    cell.classList.toggle("shot-target", target && stage === 2);
    cell.innerHTML = piece ? '<svg class="piece ' + piece + '" aria-hidden="true"><use href="assets/pieces.svg#' + piece + '"/></svg>'
      : target ? '<span class="target-mark"></span>' : "";
    const description = piece === BLOCK ? "blocked" : piece ? piece + " Amazon" : "empty";
    cell.setAttribute("aria-label", [coordinate(i, position.size), description, selected && "selected",
      target && (stage === 2 ? "legal shot" : "legal destination")].filter(Boolean).join(", "));
  });
  $("#undo").disabled = stage !== 0 || undoDepth === 0;
  $("#turn-title").textContent = title;
  $(".turn-label > span").textContent = won ? "Game over" : "Current turn";
  $("#turn-number").textContent = "Turn " + String(moves.length + (won ? 0 : 1)).padStart(2, "0");
  $("#turn-piece use").setAttribute("href", "assets/pieces.svg#" + (won ?? position.side));
  steps.forEach((step, n) => {
    step.classList.toggle("active", stage === n);
    step.classList.toggle("done", stage > n);
    step.querySelector(".step-num").textContent = n < stage ? "✓" : n + 1;
    if (stage === n) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  });
  $(".steps ol").hidden = !!won;
  $("#change").hidden = !!won || stage === 0;
  $("#change").textContent = stage === 2 ? "Change destination" : "Cancel selection";
  $("#outcome").hidden = !won;
  if (won) $("#outcome p").textContent = cap(position.side) + " has no legal moves.";
  $("#announce").textContent = won ? title + ". " + $("#outcome p").textContent
    : title + ". " + steps[stage].querySelector("strong").textContent + ".";
}

/** Render completed turns in order and scroll the history to the latest one. */
function drawHistory() {
  $("#count").textContent = moves.length + (moves.length === 1 ? " move" : " moves");
  $("#empty-history").hidden = moves.length > 0;
  const log = $("#log");
  log.hidden = !moves.length;
  log.replaceChildren();
  moves.forEach((move, index) => {
    const item = document.createElement("li");
    const side = index % 2 ? "Black" : "White";
    item.innerHTML = '<span>' + (index + 1) + '.</span><b><i class="dot ' + (index % 2 ? "dark" : "light") +
      '"></i>' + side + '</b><span>' + coordinate(move.from, position.size) + '–' + coordinate(move.to, position.size) + ' · ↗ ' + coordinate(move.arrow, position.size) + '</span>';
    item.setAttribute("aria-label", "Turn " + (index + 1) + ", " + side + " from " + coordinate(move.from, position.size) + " to " + coordinate(move.to, position.size) + ", arrow to " + coordinate(move.arrow, position.size));
    log.append(item);
  });
  log.scrollTop = log.scrollHeight;
}

/** Apply a square selection for the current stage. @param {number} i */
function choose(i) {
  if (winner(position)) return;
  const { legal } = view();
  if (to === null && position.board[i] === position.side) {
    from = from === i ? null : i;
  } else if (legal.includes(i)) {
    if (to === null) to = i;
    else {
      const move = { from, to, arrow: i };
      position = applyTurn(position, move);
      moves.push(move);
      // Turns alternate, so the last two eligible turns belong to different players.
      undoDepth = Math.min(2, undoDepth + 1);
      from = to = null;
      save();
      drawHistory();
    }
  } else return;
  draw();
}

/** Back up one provisional selection without changing the committed match. */
function back() {
  if (to !== null) to = null;
  else from = null;
  draw();
}

/** Rebuild the square buttons and coordinate gutters for a loaded or new match. */
function buildBoard() {
  const { size } = position;
  $(".frame").style.setProperty("--size", size);
  boardEl.replaceChildren();
  $(".ranks").replaceChildren();
  $(".files").replaceChildren();
  cells.length = 0;
  focused = position.board.indexOf(position.side);
  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement("button");
    cell.type = "button";
    const x = i % size;
    const y = Math.floor(i / size);
    cell.className = "cell " + ((x + y) % 2 ? "sage" : "pale");
    cell.style.setProperty("--gx", -x * 37 + "px");
    cell.style.setProperty("--gy", -y * 41 + "px");
    cell.tabIndex = i === focused ? 0 : -1;
    cell.addEventListener("focus", () => setFocus(i));
    cell.addEventListener("click", () => { setFocus(i); choose(i); });
    cell.addEventListener("keydown", event => {
      const direction = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[event.key];
      if (event.key === "Escape") { event.preventDefault(); back(); return; }
      if (!direction) return;
      event.preventDefault();
      const clamp = v => Math.min(size - 1, Math.max(v, 0));
      cells[clamp(y + direction[0]) * size + clamp(x + direction[1])].focus();
    });
    cells.push(cell);
    boardEl.append(cell);
  }
  for (let i = 0; i < size; i++) {
    for (const [selector, label] of [[".ranks", size - i], [".files", String.fromCharCode(97 + i)]]) {
      const span = document.createElement("span");
      span.textContent = label;
      $(selector).append(span);
    }
  }
}
/** Replace the saved match with a fresh opening and reset the board tab stop. */
function reset(size = position.size) {
  position = initialPosition(size);
  moves = [];
  undoDepth = 0;
  from = to = null;
  buildBoard();
  save(); draw(); drawHistory();
}
/** Open a modal with trusted, caller-supplied markup. @param {string} content */
function openDialog(content) {
  $("#dialog-content").innerHTML = content;
  dialog.showModal();
}
$("#guide").onclick = () => openDialog('<h2 id="dialog-title">How to play</h2><p>White goes first. Trap the other player by leaving all of their Amazons without a legal move.</p><ol><li><b>Select</b> one of your Amazons.</li><li><b>Move</b> any distance horizontally, vertically, or diagonally through empty squares.</li><li><b>Shoot</b> an arrow from the new square along any clear line. Its landing square is blocked for the rest of the game. You can shoot back through, or onto, the square you left.</li></ol><p>Before shooting, use <b>Change destination</b> to revise your move. The first player unable to move loses.</p><p>Use <b>Undo last turn</b> in move history to take back a completed move and its arrow. Each player can take back their latest turn, most recent first.</p><p><b>Keyboard:</b> Use arrow keys to explore the board, Enter or Space to select, and Escape to go back one step.</p>');
$("#new-game").onclick = () => {
  openDialog(`<h2 id="dialog-title">New game</h2>
    <p>Starting a game replaces the current match.</p>
    <fieldset><legend>Board size</legend>
      <label><input type="radio" name="size" value="10"> 10×10 · 4 Amazons per side</label>
      <label><input type="radio" name="size" value="8"> 8×8 · 3 Amazons per side</label>
    </fieldset>
    <div class="actions"><button class="new" id="keep">Cancel</button>
    <button class="new primary" id="restart">Start game</button></div>`);
  dialog.querySelector(`input[value="${position.size}"]`).checked = true;
  $("#keep").onclick = () => dialog.close();
  $("#restart").onclick = () => {
    const size = Number(dialog.querySelector("input:checked").value);
    dialog.close();
    reset(size);
    cells[focused].focus();
  };
};
$("#close").onclick = () => dialog.close();
dialog.onclick = event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
};
/** Restore the position before the latest eligible move, including its arrow. */
function undoTurn() {
  if (!undoDepth || from !== null) return;
  const move = moves.pop();
  undoDepth--;
  position = replay(moves, position.size);
  save();
  drawHistory();
  draw();
  cells[move.from].focus();
  $("#announce").textContent = "Turn undone. " + cap(position.side) + " to play.";
}
$("#undo").onclick = undoTurn;
$("#rematch").onclick = () => { reset(); cells[focused].focus(); };
$("#change").onclick = () => { const i = from; back(); cells[i].focus(); };

load(); buildBoard(); draw(); drawHistory();
