/* ============================================================
   DSA VISUALIZER — script.js
   One file, one nav switch (loadAlgo), one module per DSA topic.
   Every animated algorithm is an async function that takes a
   "token" — if the token no longer matches the live runToken
   (user paused? switched page? started a new run?) the loop
   bails out cleanly instead of fighting the new state.
   ============================================================ */

/* ---------------- DOM ---------------- */
const stage        = document.getElementById('stage');
const controls      = document.getElementById('controls');
const algoTitle      = document.getElementById('algoTitle');
const algoDesc      = document.getElementById('algoDesc');
const complexityEl   = document.getElementById('complexity');
const navItems      = document.querySelectorAll('.nav-item[data-algo]');
const menuToggle     = document.getElementById('menuToggle');
const navEl        = document.getElementById('nav');

/* ---------------- shared state ---------------- */
let running    = false;   // true while an algorithm is animating
let paused    = false;
let speed     = 5;      // 1 (slow) .. 10 (fast)
let runToken   = 0;      // bumped on every new run / page switch
let currentAlgo = 'bubble';

function delay(ms) { return new Promise(res => setTimeout(res, ms)); }
function speedMs() { return 1000 - speed * 92; } // ~908ms slow -> ~80ms fast

/** Await one animation beat. Returns false if this run should stop
 *  (a newer run started) so the caller can `return` immediately. */
async function tick(token) {
  await delay(speedMs());
  if (token !== runToken) return false;
  while (paused) {
    await delay(80);
    if (token !== runToken) return false;
  }
  return token === runToken;
}

function navSetEnabled(enabled) {
  navItems.forEach(b => {
    b.disabled = !enabled;
    b.style.opacity = enabled ? '1' : '0.4';
    b.style.pointerEvents = enabled ? 'auto' : 'none';
  });
}

function randomArray(n, min = 5, max = 100) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * (max - min + 1)) + min);
}

/* ============================================================
   SORTING + SEARCHING — shared bar visualization
   ============================================================ */

let array = [];

function renderBars(hl = {}) {
  stage.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'flex-end';
  wrap.style.gap = array.length > 35 ? '2px' : '6px';
  wrap.style.height = '100%';
  wrap.style.width = '100%';
  wrap.style.justifyContent = 'center';

  const max = Math.max(...array, 1);

  array.forEach((v, i) => {
    const col = document.createElement('div');
    col.className = 'bar-col';
    col.style.flex = '1 1 0';
    col.style.maxWidth = '46px';

    const label = document.createElement('div');
    label.className = 'pointer-label';
    label.textContent = pointerLabelFor(i, hl);
    col.appendChild(label);

    if (array.length <= 28) {
      const valEl = document.createElement('div');
      valEl.className = 'bar-val';
      valEl.textContent = v;
      col.appendChild(valEl);
    }

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = (v / max * 100) + '%';

    if (hl.sorted && hl.sorted.has(i)) bar.classList.add('sorted');
    if (hl.compare && hl.compare.includes(i)) bar.classList.add('compare');
    if (hl.swap && hl.swap.includes(i)) bar.classList.add('swap');
    if (hl.pivot === i) bar.classList.add('pivot');
    if (hl.range && (i < hl.range[0] || i > hl.range[1])) bar.classList.add('range-dim');

    col.appendChild(bar);
    wrap.appendChild(col);
  });

  stage.appendChild(wrap);
}

function pointerLabelFor(i, hl) {
  if (!hl.pointers) return '';
  const labels = [];
  for (const [name, idx] of Object.entries(hl.pointers)) {
    if (idx === i) labels.push(name[0].toUpperCase());
  }
  return labels.join(' ');
}

function sortingControls() {
  controls.innerHTML = `
    <div class="ctrl-group"><label>Size</label><input type="range" id="sizeRange" min="5" max="60" value="${array.length}"></div>
    <div class="ctrl-group"><label>Speed</label><input type="range" id="speedRange" min="1" max="10" value="${speed}"></div>
    <button class="btn" id="newArrBtn">↻ New Array</button>
    <button class="btn btn-primary" id="runBtn">▶ Sort</button>
    <button class="btn btn-ghost" id="pauseBtn" disabled>⏸ Pause</button>
    <div class="spacer"></div>
    <div class="legend">
      <span><i style="background:var(--info)"></i>unsorted</span>
      <span><i style="background:var(--bad)"></i>comparing</span>
      <span><i style="background:var(--accent)"></i>swapping</span>
      <span><i style="background:var(--violet)"></i>pivot</span>
      <span><i style="background:var(--good)"></i>sorted</span>
    </div>`;

  const sizeRange = document.getElementById('sizeRange');
  const speedRange = document.getElementById('speedRange');
  const newArrBtn = document.getElementById('newArrBtn');
  const runBtn = document.getElementById('runBtn');
  const pauseBtn = document.getElementById('pauseBtn');

  sizeRange.oninput = e => { if (!running) { array = randomArray(Number(e.target.value)); renderBars(); } };
  speedRange.oninput = e => { speed = Number(e.target.value); };
  newArrBtn.onclick = () => { if (!running) { array = randomArray(Number(sizeRange.value)); renderBars(); } };
  pauseBtn.onclick = () => { paused = !paused; pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause'; };

  runBtn.onclick = async () => {
    if (running) return;
    running = true;
    const token = ++runToken;
    navSetEnabled(false);
    runBtn.disabled = true; newArrBtn.disabled = true; sizeRange.disabled = true; pauseBtn.disabled = false;
    paused = false; pauseBtn.textContent = '⏸ Pause';
    await ALGO_FN[currentAlgo](token);
    if (token === runToken) {
      running = false; navSetEnabled(true);
      runBtn.disabled = false; newArrBtn.disabled = false; sizeRange.disabled = false; pauseBtn.disabled = true;
    }
  };
}

function searchingControls() {
  const t = array.length ? array[Math.floor(Math.random() * array.length)] : 0;
  controls.innerHTML = `
    <div class="ctrl-group"><label>Size</label><input type="range" id="sizeRange" min="5" max="40" value="${array.length}"></div>
    <div class="ctrl-group"><label>Speed</label><input type="range" id="speedRange" min="1" max="10" value="${speed}"></div>
    <div class="ctrl-group"><label>Target</label><input type="number" id="targetInput" value="${t}"></div>
    <button class="btn" id="newArrBtn">↻ New Array</button>
    <button class="btn btn-primary" id="runBtn">▶ Search</button>
    <div class="spacer"></div>
    <p id="resultMsg" class="side-label"></p>`;

  const sizeRange = document.getElementById('sizeRange');
  const speedRange = document.getElementById('speedRange');
  const targetInput = document.getElementById('targetInput');
  const newArrBtn = document.getElementById('newArrBtn');
  const runBtn = document.getElementById('runBtn');

  function regen(n) {
    array = currentAlgo === 'binary' ? randomArray(n).sort((a, b) => a - b) : randomArray(n);
    renderBars();
    targetInput.value = array[Math.floor(Math.random() * array.length)];
  }

  speedRange.oninput = e => { speed = Number(e.target.value); };
  sizeRange.oninput = e => { if (!running) regen(Number(e.target.value)); };
  newArrBtn.onclick = () => { if (!running) regen(Number(sizeRange.value)); };

  runBtn.onclick = async () => {
    if (running) return;
    running = true;
    const token = ++runToken;
    navSetEnabled(false);
    runBtn.disabled = true; newArrBtn.disabled = true; sizeRange.disabled = true; targetInput.disabled = true;
    document.getElementById('resultMsg').textContent = 'searching…';
    renderBars();
    const target = Number(targetInput.value);
    if (currentAlgo === 'linear') await linearSearch(token, target);
    else await binarySearch(token, target);
    if (token === runToken) {
      running = false; navSetEnabled(true);
      runBtn.disabled = false; newArrBtn.disabled = false; sizeRange.disabled = false; targetInput.disabled = false;
    }
  };
}

/* ---------------- sorting algorithms ---------------- */

async function bubbleSort(token) {
  const n = array.length;
  const sortedSet = new Set();
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      renderBars({ compare: [j, j + 1], sorted: sortedSet });
      if (!(await tick(token))) return;
      if (array[j] > array[j + 1]) {
        [array[j], array[j + 1]] = [array[j + 1], array[j]];
        renderBars({ swap: [j, j + 1], sorted: sortedSet });
        if (!(await tick(token))) return;
      }
    }
    sortedSet.add(n - 1 - i);
    renderBars({ sorted: sortedSet });
  }
  for (let k = 0; k < n; k++) sortedSet.add(k);
  renderBars({ sorted: sortedSet });
}

async function selectionSort(token) {
  const n = array.length;
  const sortedSet = new Set();
  for (let i = 0; i < n; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      renderBars({ compare: [min, j], sorted: sortedSet, pivot: min });
      if (!(await tick(token))) return;
      if (array[j] < array[min]) min = j;
    }
    if (min !== i) {
      [array[i], array[min]] = [array[min], array[i]];
      renderBars({ swap: [i, min], sorted: sortedSet });
      if (!(await tick(token))) return;
    }
    sortedSet.add(i);
    renderBars({ sorted: sortedSet });
  }
}

async function insertionSort(token) {
  const n = array.length;
  for (let i = 1; i < n; i++) {
    let j = i;
    renderBars({ compare: [j, j - 1], range: [0, i] });
    if (!(await tick(token))) return;
    while (j > 0 && array[j - 1] > array[j]) {
      [array[j - 1], array[j]] = [array[j], array[j - 1]];
      renderBars({ swap: [j - 1, j], range: [0, i] });
      if (!(await tick(token))) return;
      j--;
    }
  }
  renderBars({ sorted: new Set(array.map((_, i) => i)) });
}

async function mergeSort(token) {
  async function merge(lo, mid, hi) {
    const left = array.slice(lo, mid + 1);
    const right = array.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      renderBars({ compare: [lo + i, mid + 1 + j], range: [lo, hi] });
      if (!(await tick(token))) return false;
      array[k] = left[i] <= right[j] ? (i++, left[i - 1]) : (j++, right[j - 1]);
      renderBars({ swap: [k], range: [lo, hi] });
      if (!(await tick(token))) return false;
      k++;
    }
    while (i < left.length) {
      array[k] = left[i++]; renderBars({ swap: [k], range: [lo, hi] });
      if (!(await tick(token))) return false;
      k++;
    }
    while (j < right.length) {
      array[k] = right[j++]; renderBars({ swap: [k], range: [lo, hi] });
      if (!(await tick(token))) return false;
      k++;
    }
    return true;
  }
  async function sort(lo, hi) {
    if (hi - lo <= 0) return true;
    const mid = Math.floor((lo + hi) / 2);
    if (!(await sort(lo, mid))) return false;
    if (!(await sort(mid + 1, hi))) return false;
    return await merge(lo, mid, hi);
  }
  if (await sort(0, array.length - 1)) {
    renderBars({ sorted: new Set(array.map((_, i) => i)) });
  }
}

async function quickSort(token) {
  async function partition(lo, hi) {
    const pivot = array[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      renderBars({ compare: [j, hi], pivot: hi, range: [lo, hi] });
      if (!(await tick(token))) return null;
      if (array[j] < pivot) {
        i++;
        [array[i], array[j]] = [array[j], array[i]];
        renderBars({ swap: [i, j], pivot: hi, range: [lo, hi] });
        if (!(await tick(token))) return null;
      }
    }
    [array[i + 1], array[hi]] = [array[hi], array[i + 1]];
    renderBars({ swap: [i + 1, hi], range: [lo, hi] });
    if (!(await tick(token))) return null;
    return i + 1;
  }
  async function sort(lo, hi) {
    if (lo < hi) {
      const p = await partition(lo, hi);
      if (p === null) return false;
      if (!(await sort(lo, p - 1))) return false;
      if (!(await sort(p + 1, hi))) return false;
    }
    return true;
  }
  if (await sort(0, array.length - 1)) {
    renderBars({ sorted: new Set(array.map((_, i) => i)) });
  }
}

const ALGO_FN = { bubble: bubbleSort, selection: selectionSort, insertion: insertionSort, merge: mergeSort, quick: quickSort };

/* ---------------- searching algorithms ---------------- */

async function linearSearch(token, target) {
  for (let i = 0; i < array.length; i++) {
    renderBars({ compare: [i] });
    if (!(await tick(token))) return;
    if (array[i] === target) {
      renderBars({ sorted: new Set([i]) });
      document.getElementById('resultMsg').textContent = `found ${target} at index ${i}`;
      return;
    }
  }
  document.getElementById('resultMsg').textContent = `${target} not found in the array`;
}

async function binarySearch(token, target) {
  let lo = 0, hi = array.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    renderBars({ pointers: { low: lo, high: hi, mid }, compare: [mid], range: [lo, hi] });
    if (!(await tick(token))) return;
    if (array[mid] === target) {
      renderBars({ sorted: new Set([mid]) });
      document.getElementById('resultMsg').textContent = `found ${target} at index ${mid}`;
      return;
    } else if (array[mid] < target) { lo = mid + 1; } else { hi = mid - 1; }
  }
  document.getElementById('resultMsg').textContent = `${target} not found — array is sorted, so we can stop here`;
}

/* ============================================================
   STACK
   ============================================================ */

let stackArr = [];

function renderStack() {
  stage.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'stack-wrap';
  if (stackArr.length === 0) {
    wrap.innerHTML = '<p class="empty-msg">stack is empty — push something onto it</p>';
  } else {
    const col = document.createElement('div');
    col.className = 'stack-col';
    stackArr.forEach((v, i) => {
      const box = document.createElement('div');
      box.className = 'node-box';
      box.textContent = v;
      if (i === stackArr.length - 1) {
        const tag = document.createElement('span');
        tag.className = 'side-label';
        tag.style.cssText = 'position:absolute;left:100%;margin-left:8px;top:50%;transform:translateY(-50%);white-space:nowrap;';
        tag.textContent = '← top';
        box.appendChild(tag);
      }
      col.appendChild(box);
    });
    wrap.appendChild(col);
  }
  stage.appendChild(wrap);
}

function stackControls() {
  controls.innerHTML = `
    <div class="ctrl-group"><label>Value</label><input type="number" id="valInput" value="${Math.floor(Math.random() * 90 + 10)}"></div>
    <button class="btn btn-primary" id="pushBtn">Push</button>
    <button class="btn" id="popBtn">Pop</button>
    <button class="btn btn-ghost" id="clearBtn">Clear</button>
    <div class="spacer"></div>
    <p id="resultMsg" class="side-label"></p>`;

  const msg = t => document.getElementById('resultMsg').textContent = t;
  document.getElementById('pushBtn').onclick = () => {
    const v = Number(document.getElementById('valInput').value) || 0;
    stackArr.push(v); renderStack(); msg(`pushed ${v}`);
  };
  document.getElementById('popBtn').onclick = () => {
    if (stackArr.length === 0) { msg('stack underflow — nothing to pop'); return; }
    const v = stackArr.pop(); renderStack(); msg(`popped ${v}`);
  };
  document.getElementById('clearBtn').onclick = () => { stackArr = []; renderStack(); msg(''); };
}

/* ============================================================
   QUEUE
   ============================================================ */

let queueArr = [];

function renderQueue() {
  stage.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'queue-wrap';
  if (queueArr.length === 0) {
    wrap.innerHTML = '<p class="empty-msg">queue is empty — enqueue something</p>';
  } else {
    const front = document.createElement('span'); front.className = 'side-label'; front.textContent = 'front →';
    const row = document.createElement('div'); row.className = 'queue-row';
    queueArr.forEach(v => { const box = document.createElement('div'); box.className = 'node-box'; box.textContent = v; row.appendChild(box); });
    const rear = document.createElement('span'); rear.className = 'side-label'; rear.textContent = '← rear';
    wrap.appendChild(front); wrap.appendChild(row); wrap.appendChild(rear);
  }
  stage.appendChild(wrap);
}

function queueControls() {
  controls.innerHTML = `
    <div class="ctrl-group"><label>Value</label><input type="number" id="valInput" value="${Math.floor(Math.random() * 90 + 10)}"></div>
    <button class="btn btn-primary" id="enqBtn">Enqueue</button>
    <button class="btn" id="deqBtn">Dequeue</button>
    <button class="btn btn-ghost" id="clearBtn">Clear</button>
    <div class="spacer"></div>
    <p id="resultMsg" class="side-label"></p>`;

  const msg = t => document.getElementById('resultMsg').textContent = t;
  document.getElementById('enqBtn').onclick = () => {
    const v = Number(document.getElementById('valInput').value) || 0;
    queueArr.push(v); renderQueue(); msg(`enqueued ${v}`);
  };
  document.getElementById('deqBtn').onclick = () => {
    if (queueArr.length === 0) { msg('queue underflow — nothing to dequeue'); return; }
    const v = queueArr.shift(); renderQueue(); msg(`dequeued ${v}`);
  };
  document.getElementById('clearBtn').onclick = () => { queueArr = []; renderQueue(); msg(''); };
}

/* ============================================================
   LINKED LIST
   ============================================================ */

let llArr = [];

function renderLL(activeIndex = -1, foundIndex = -1) {
  stage.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'list-wrap';
  if (llArr.length === 0) {
    wrap.innerHTML = '<p class="empty-msg">list is empty — insert a node</p>';
  } else {
    const head = document.createElement('span'); head.className = 'side-label'; head.style.marginRight = '8px'; head.textContent = 'head →';
    wrap.appendChild(head);
    llArr.forEach((v, i) => {
      const node = document.createElement('div');
      node.className = 'll-node' + (i === activeIndex ? ' active' : '') + (i === foundIndex ? ' found' : '');
      node.innerHTML = `<span class="val">${v}</span><span class="ptr">•</span>`;
      wrap.appendChild(node);
      if (i < llArr.length - 1) {
        const arrow = document.createElement('span'); arrow.className = 'll-arrow'; arrow.textContent = '→';
        wrap.appendChild(arrow);
      }
    });
    const nullTag = document.createElement('span'); nullTag.className = 'll-null'; nullTag.textContent = ' → NULL';
    wrap.appendChild(nullTag);
  }
  stage.appendChild(wrap);
}

async function llSearch(token, target) {
  for (let i = 0; i < llArr.length; i++) {
    renderLL(i);
    if (!(await tick(token))) return;
    if (llArr[i] === target) {
      renderLL(-1, i);
      document.getElementById('resultMsg').textContent = `found ${target} at position ${i}`;
      return;
    }
  }
  renderLL();
  document.getElementById('resultMsg').textContent = `${target} not found`;
}

function llControls() {
  controls.innerHTML = `
    <div class="ctrl-group"><label>Value</label><input type="number" id="valInput" value="${Math.floor(Math.random() * 90 + 10)}"></div>
    <button class="btn btn-primary" id="headBtn">Insert Head</button>
    <button class="btn btn-primary" id="tailBtn">Insert Tail</button>
    <button class="btn" id="searchBtn">Search</button>
    <button class="btn" id="deleteBtn">Delete</button>
    <button class="btn btn-ghost" id="clearBtn">Clear</button>
    <div class="spacer"></div>
    <p id="resultMsg" class="side-label"></p>`;

  const getVal = () => Number(document.getElementById('valInput').value) || 0;
  const msg = t => document.getElementById('resultMsg').textContent = t;

  document.getElementById('headBtn').onclick = () => { if (!running) { llArr.unshift(getVal()); renderLL(); msg('inserted at head'); } };
  document.getElementById('tailBtn').onclick = () => { if (!running) { llArr.push(getVal()); renderLL(); msg('inserted at tail'); } };
  document.getElementById('clearBtn').onclick = () => { if (!running) { llArr = []; renderLL(); msg(''); } };

  document.getElementById('searchBtn').onclick = async () => {
    if (running) return;
    if (llArr.length === 0) { msg('list is empty'); return; }
    running = true; navSetEnabled(false);
    const token = ++runToken;
    msg('searching…');
    await llSearch(token, getVal());
    if (token === runToken) { running = false; navSetEnabled(true); }
  };

  document.getElementById('deleteBtn').onclick = async () => {
    if (running) return;
    if (llArr.length === 0) { msg('list is empty'); return; }
    running = true; navSetEnabled(false);
    const token = ++runToken;
    const target = getVal();
    let idx = -1;
    for (let i = 0; i < llArr.length; i++) {
      renderLL(i);
      if (!(await tick(token))) { running = false; navSetEnabled(true); return; }
      if (llArr[i] === target) { idx = i; break; }
    }
    if (idx > -1) { llArr.splice(idx, 1); renderLL(); msg(`deleted ${target}`); }
    else { renderLL(); msg(`${target} not found`); }
    if (token === runToken) { running = false; navSetEnabled(true); }
  };
}

/* ============================================================
   GRAPH TRAVERSAL — BFS / DFS on a click-to-draw maze
   ============================================================ */

const ROWS = 10, COLS = 16;
let grid = [];
let startCell = { r: 1, c: 1 };
let endCell = { r: ROWS - 2, c: COLS - 2 };
let placeMode = 'wall'; // 'wall' | 'start' | 'end'

function initGrid() { grid = Array.from({ length: ROWS }, () => Array(COLS).fill(false)); }

function renderMaze() {
  stage.innerHTML = '';
  const outer = document.createElement('div');
  outer.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:100%;';

  const mazeWrap = document.createElement('div');
  mazeWrap.className = 'maze-wrap';
  mazeWrap.style.gridTemplateColumns = `repeat(${COLS}, 26px)`;
  mazeWrap.style.gridTemplateRows = `repeat(${ROWS}, 26px)`;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (grid[r][c]) cell.classList.add('wall');
      if (r === startCell.r && c === startCell.c) cell.classList.add('start');
      if (r === endCell.r && c === endCell.c) cell.classList.add('end');
      cell.dataset.r = r; cell.dataset.c = c;
      cell.onclick = () => handleCellClick(r, c);
      mazeWrap.appendChild(cell);
    }
  }
  outer.appendChild(mazeWrap);

  const hint = document.createElement('p');
  hint.className = 'maze-hint';
  hint.textContent = 'click cells to draw walls · switch mode below to drag start / end';
  outer.appendChild(hint);

  stage.appendChild(outer);
}

function handleCellClick(r, c) {
  if (running) return;
  if (placeMode === 'wall') {
    if ((r === startCell.r && c === startCell.c) || (r === endCell.r && c === endCell.c)) return;
    grid[r][c] = !grid[r][c];
  } else if (placeMode === 'start') {
    if (grid[r][c] || (r === endCell.r && c === endCell.c)) return;
    startCell = { r, c };
  } else if (placeMode === 'end') {
    if (grid[r][c] || (r === startCell.r && c === startCell.c)) return;
    endCell = { r, c };
  }
  renderMaze();
}

function markCell(r, c, cls) {
  const el = stage.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (el && !el.classList.contains('start') && !el.classList.contains('end')) {
    el.classList.remove('frontier');
    el.classList.add(cls);
  }
}

async function tracePath(token, prev) {
  let path = [];
  let cur = `${endCell.r},${endCell.c}`;
  const startKey = `${startCell.r},${startCell.c}`;
  while (cur && cur !== startKey) { path.push(cur); cur = prev[cur]; }
  path.reverse();
  for (const p of path) {
    const [r, c] = p.split(',').map(Number);
    markCell(r, c, 'path');
    if (!(await tick(token))) return false;
  }
  document.getElementById('resultMsg').textContent = `path found — ${path.length} step${path.length === 1 ? '' : 's'}`;
  return true;
}

async function bfs(token) {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const prev = {};
  const q = [[startCell.r, startCell.c]];
  visited[startCell.r][startCell.c] = true;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let found = false;

  while (q.length) {
    const [r, c] = q.shift();
    if (r === endCell.r && c === endCell.c) { found = true; break; }
    markCell(r, c, 'frontier');
    if (!(await tick(token))) return;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc] && !grid[nr][nc]) {
        visited[nr][nc] = true;
        prev[`${nr},${nc}`] = `${r},${c}`;
        q.push([nr, nc]);
        markCell(nr, nc, 'visited');
      }
    }
  }
  if (found) await tracePath(token, prev);
  else document.getElementById('resultMsg').textContent = 'no path exists between start and end';
}

async function dfs(token) {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const prev = {};
  const st = [[startCell.r, startCell.c]];
  visited[startCell.r][startCell.c] = true;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let found = false;

  while (st.length) {
    const [r, c] = st.pop();
    if (r === endCell.r && c === endCell.c) { found = true; break; }
    markCell(r, c, 'frontier');
    if (!(await tick(token))) return;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc] && !grid[nr][nc]) {
        visited[nr][nc] = true;
        prev[`${nr},${nc}`] = `${r},${c}`;
        st.push([nr, nc]);
        markCell(nr, nc, 'visited');
      }
    }
  }
  if (found) await tracePath(token, prev);
  else document.getElementById('resultMsg').textContent = 'no path exists between start and end';
}

function mazeControls(algo) {
  controls.innerHTML = `
    <div class="ctrl-group"><label>Speed</label><input type="range" id="speedRange" min="1" max="10" value="${speed}"></div>
    <button class="btn" id="modeWallBtn">✎ Draw Walls</button>
    <button class="btn" id="modeStartBtn">🟢 Move Start</button>
    <button class="btn" id="modeEndBtn">🔴 Move End</button>
    <button class="btn btn-ghost" id="clearBtn">↻ Clear Walls</button>
    <button class="btn btn-primary" id="runBtn">▶ Run ${algo.toUpperCase()}</button>
    <div class="spacer"></div>
    <p id="resultMsg" class="side-label"></p>`;

  const modeBtns = {
    wall: document.getElementById('modeWallBtn'),
    start: document.getElementById('modeStartBtn'),
    end: document.getElementById('modeEndBtn'),
  };
  const refreshModeBtns = () => Object.entries(modeBtns).forEach(([k, b]) => b.classList.toggle('btn-primary', k === placeMode));
  refreshModeBtns();
  modeBtns.wall.onclick = () => { placeMode = 'wall'; refreshModeBtns(); };
  modeBtns.start.onclick = () => { placeMode = 'start'; refreshModeBtns(); };
  modeBtns.end.onclick = () => { placeMode = 'end'; refreshModeBtns(); };

  document.getElementById('speedRange').oninput = e => { speed = Number(e.target.value); };
  document.getElementById('clearBtn').onclick = () => { if (!running) { initGrid(); renderMaze(); document.getElementById('resultMsg').textContent = ''; } };

  document.getElementById('runBtn').onclick = async () => {
    if (running) return;
    running = true;
    const token = ++runToken;
    navSetEnabled(false);
    document.getElementById('runBtn').disabled = true;
    document.getElementById('clearBtn').disabled = true;
    modeBtns.wall.disabled = true; modeBtns.start.disabled = true; modeBtns.end.disabled = true;
    document.getElementById('resultMsg').textContent = 'running…';
    renderMaze();
    if (algo === 'bfs') await bfs(token); else await dfs(token);
    if (token === runToken) {
      running = false; navSetEnabled(true);
      document.getElementById('runBtn').disabled = false;
      document.getElementById('clearBtn').disabled = false;
      modeBtns.wall.disabled = false; modeBtns.start.disabled = false; modeBtns.end.disabled = false;
    }
  };
}

/* ============================================================
   SHARED SVG HELPER (used by both BST and Heap tree drawings)
   ============================================================ */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgLine(x1, y1, x2, y2) {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', x2); line.setAttribute('y2', y2);
  line.setAttribute('stroke', 'var(--line)'); line.setAttribute('stroke-width', '2');
  return line;
}

function svgNode(x, y, label, stroke, fill, textFill) {
  const g = document.createElementNS(SVG_NS, 'g');
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', x); circle.setAttribute('cy', y); circle.setAttribute('r', 18);
  circle.setAttribute('fill', fill || 'var(--bg-panel)');
  circle.setAttribute('stroke', stroke || 'var(--info)');
  circle.setAttribute('stroke-width', '2');
  g.appendChild(circle);

  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', x); text.setAttribute('y', y + 4);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-family', 'Space Mono, monospace');
  text.setAttribute('font-size', '12');
  text.setAttribute('fill', textFill || 'var(--text)');
  text.textContent = label;
  g.appendChild(text);
  return g;
}

/* ============================================================
   BINARY SEARCH TREE
   ============================================================ */

let bstRoot = null;
let bstNodeId = 0;
function makeBstNode(val) { return { val, left: null, right: null, id: 'n' + (bstNodeId++) }; }

function computeBstLayout() {
  const positions = {};
  let x = 0;
  const spacingX = 46, spacingY = 68;
  (function inorder(node, depth) {
    if (!node) return;
    inorder(node.left, depth + 1);
    positions[node.id] = { x: x * spacingX + 30, y: depth * spacingY + 30, node };
    x++;
    inorder(node.right, depth + 1);
  })(bstRoot, 0);
  return positions;
}

function renderTree(hl = {}) {
  stage.style.display = 'flex';
  stage.style.alignItems = 'center';
  stage.style.justifyContent = 'center';
  stage.innerHTML = '';

  if (!bstRoot) {
    stage.innerHTML = '<p class="empty-msg">tree is empty — insert a value</p>';
    return;
  }

  const positions = computeBstLayout();
  const vals = Object.values(positions);
  const maxX = Math.max(...vals.map(p => p.x)) + 30;
  const maxY = Math.max(...vals.map(p => p.y)) + 30;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', maxX);
  svg.setAttribute('height', maxY);
  svg.style.display = 'block';

  (function drawEdges(node) {
    if (!node) return;
    const p = positions[node.id];
    if (node.left) { svg.appendChild(svgLine(p.x, p.y, positions[node.left.id].x, positions[node.left.id].y)); drawEdges(node.left); }
    if (node.right) { svg.appendChild(svgLine(p.x, p.y, positions[node.right.id].x, positions[node.right.id].y)); drawEdges(node.right); }
  })(bstRoot);

  vals.forEach(({ x, y, node }) => {
    let stroke = 'var(--info)', fill = 'var(--bg-panel)', textFill = 'var(--text)';
    if (hl.active === node.id) stroke = 'var(--accent)';
    if (hl.found === node.id) { stroke = 'var(--good)'; fill = 'var(--good)'; textFill = '#0d1117'; }
    svg.appendChild(svgNode(x, y, node.val, stroke, fill, textFill));
  });

  stage.appendChild(svg);

  if (hl.order) {
    const orderEl = document.createElement('p');
    orderEl.className = 'maze-hint';
    orderEl.style.position = 'absolute';
    orderEl.style.bottom = '10px';
    orderEl.textContent = 'visited: ' + hl.order.join(' → ');
    stage.appendChild(orderEl);
  }
}

async function bstInsert(token, val) {
  if (!bstRoot) { bstRoot = makeBstNode(val); renderTree(); document.getElementById('resultMsg').textContent = `inserted ${val} as the root`; return; }
  let cur = bstRoot;
  while (true) {
    renderTree({ active: cur.id });
    if (!(await tick(token))) return;
    if (val === cur.val) { document.getElementById('resultMsg').textContent = `${val} already exists in the tree`; return; }
    if (val < cur.val) {
      if (!cur.left) { cur.left = makeBstNode(val); renderTree({ active: cur.left.id }); document.getElementById('resultMsg').textContent = `inserted ${val}`; return; }
      cur = cur.left;
    } else {
      if (!cur.right) { cur.right = makeBstNode(val); renderTree({ active: cur.right.id }); document.getElementById('resultMsg').textContent = `inserted ${val}`; return; }
      cur = cur.right;
    }
  }
}

async function bstSearch(token, val) {
  let cur = bstRoot;
  while (cur) {
    renderTree({ active: cur.id });
    if (!(await tick(token))) return;
    if (val === cur.val) { renderTree({ found: cur.id }); document.getElementById('resultMsg').textContent = `found ${val}`; return; }
    cur = val < cur.val ? cur.left : cur.right;
  }
  renderTree();
  document.getElementById('resultMsg').textContent = `${val} not found`;
}

function bstDeleteNode(node, val) {
  if (!node) return null;
  if (val < node.val) node.left = bstDeleteNode(node.left, val);
  else if (val > node.val) node.right = bstDeleteNode(node.right, val);
  else {
    if (!node.left) return node.right;
    if (!node.right) return node.left;
    let succ = node.right;
    while (succ.left) succ = succ.left;
    node.val = succ.val;
    node.right = bstDeleteNode(node.right, succ.val);
  }
  return node;
}

async function bstDelete(token, val) {
  let cur = bstRoot, exists = false;
  while (cur) {
    renderTree({ active: cur.id });
    if (!(await tick(token))) return;
    if (val === cur.val) { exists = true; break; }
    cur = val < cur.val ? cur.left : cur.right;
  }
  if (!exists) { renderTree(); document.getElementById('resultMsg').textContent = `${val} not found`; return; }
  bstRoot = bstDeleteNode(bstRoot, val);
  renderTree();
  document.getElementById('resultMsg').textContent = `deleted ${val}`;
}

async function bstTraverse(token, type) {
  const order = [];
  async function visit(node) {
    if (!node) return true;
    if (type === 'pre') { order.push(node.val); renderTree({ active: node.id, order: [...order] }); if (!(await tick(token))) return false; }
    if (!(await visit(node.left))) return false;
    if (type === 'in') { order.push(node.val); renderTree({ active: node.id, order: [...order] }); if (!(await tick(token))) return false; }
    if (!(await visit(node.right))) return false;
    if (type === 'post') { order.push(node.val); renderTree({ active: node.id, order: [...order] }); if (!(await tick(token))) return false; }
    return true;
  }
  if (await visit(bstRoot)) {
    document.getElementById('resultMsg').textContent = `${type}-order: ${order.join(' → ')}`;
  }
}

function bstControls() {
  controls.innerHTML = `
    <div class="ctrl-group"><label>Value</label><input type="number" id="valInput" value="${Math.floor(Math.random() * 90 + 10)}"></div>
    <div class="ctrl-group"><label>Speed</label><input type="range" id="speedRange" min="1" max="10" value="${speed}"></div>
    <button class="btn btn-primary" id="insertBtn">Insert</button>
    <button class="btn" id="searchBtn">Search</button>
    <button class="btn" id="deleteBtn">Delete</button>
    <div class="ctrl-group">
      <label>Traverse</label>
      <select id="traverseSelect">
        <option value="in">In-order</option>
        <option value="pre">Pre-order</option>
        <option value="post">Post-order</option>
      </select>
    </div>
    <button class="btn" id="traverseBtn">Run</button>
    <button class="btn btn-ghost" id="clearBtn">Clear</button>
    <div class="spacer"></div>
    <p id="resultMsg" class="side-label"></p>`;

  const getVal = () => Number(document.getElementById('valInput').value) || 0;
  const msg = t => document.getElementById('resultMsg').textContent = t;
  document.getElementById('speedRange').oninput = e => { speed = Number(e.target.value); };

  const insertBtn = document.getElementById('insertBtn');
  const searchBtn = document.getElementById('searchBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const traverseBtn = document.getElementById('traverseBtn');
  const clearBtn = document.getElementById('clearBtn');

  function lockUI(lock) {
    [insertBtn, searchBtn, deleteBtn, traverseBtn, clearBtn].forEach(b => b.disabled = lock);
    navSetEnabled(!lock);
  }

  insertBtn.onclick = async () => {
    if (running) return;
    running = true; const token = ++runToken; lockUI(true);
    await bstInsert(token, getVal());
    if (token === runToken) { running = false; lockUI(false); }
  };
  searchBtn.onclick = async () => {
    if (running) return;
    if (!bstRoot) { msg('tree is empty'); return; }
    running = true; const token = ++runToken; lockUI(true);
    await bstSearch(token, getVal());
    if (token === runToken) { running = false; lockUI(false); }
  };
  deleteBtn.onclick = async () => {
    if (running) return;
    if (!bstRoot) { msg('tree is empty'); return; }
    running = true; const token = ++runToken; lockUI(true);
    await bstDelete(token, getVal());
    if (token === runToken) { running = false; lockUI(false); }
  };
  traverseBtn.onclick = async () => {
    if (running) return;
    if (!bstRoot) { msg('tree is empty'); return; }
    running = true; const token = ++runToken; lockUI(true);
    await bstTraverse(token, document.getElementById('traverseSelect').value);
    if (token === runToken) { running = false; lockUI(false); }
  };
  clearBtn.onclick = () => { if (!running) { bstRoot = null; renderTree(); msg(''); } };
}

/* ============================================================
   MIN-HEAP (array-backed binary heap / priority queue)
   ============================================================ */

let heapArr = [];
const heapParent = i => Math.floor((i - 1) / 2);
const heapLeft = i => 2 * i + 1;
const heapRight = i => 2 * i + 2;

function renderHeap(hl = {}) {
  stage.style.display = 'flex';
  stage.style.flexDirection = 'column';
  stage.style.alignItems = 'center';
  stage.style.justifyContent = 'center';
  stage.style.gap = '18px';
  stage.innerHTML = '';

  if (heapArr.length === 0) {
    stage.innerHTML = '<p class="empty-msg">heap is empty — insert a value</p>';
    return;
  }

  const spacingY = 62;
  const width = Math.max(320, heapArr.length * 42);
  const positions = {};
  (function layout(i, depth, xMin, xMax) {
    if (i >= heapArr.length) return;
    const x = (xMin + xMax) / 2;
    positions[i] = { x, y: depth * spacingY + 26 };
    layout(heapLeft(i), depth + 1, xMin, x);
    layout(heapRight(i), depth + 1, x, xMax);
  })(0, 0, 20, width - 20);

  const maxY = Math.max(...Object.values(positions).map(p => p.y)) + 30;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', maxY);

  heapArr.forEach((v, i) => {
    const p = positions[i], l = heapLeft(i), r = heapRight(i);
    if (l < heapArr.length) svg.appendChild(svgLine(p.x, p.y, positions[l].x, positions[l].y));
    if (r < heapArr.length) svg.appendChild(svgLine(p.x, p.y, positions[r].x, positions[r].y));
  });

  heapArr.forEach((v, i) => {
    const p = positions[i];
    let stroke = i === 0 ? 'var(--violet)' : 'var(--info)';
    if (hl.compare && hl.compare.includes(i)) stroke = 'var(--bad)';
    if (hl.swap && hl.swap.includes(i)) stroke = 'var(--accent)';
    svg.appendChild(svgNode(p.x, p.y, v, stroke));
  });
  stage.appendChild(svg);

  const arrRow = document.createElement('div');
  arrRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;';
  heapArr.forEach((v, i) => {
    const box = document.createElement('div');
    box.className = 'node-box';
    let borderColor = i === 0 ? 'var(--violet)' : 'var(--info)';
    if (hl.compare && hl.compare.includes(i)) borderColor = 'var(--bad)';
    if (hl.swap && hl.swap.includes(i)) borderColor = 'var(--accent)';
    box.style.borderColor = borderColor;
    box.textContent = v;
    arrRow.appendChild(box);
  });
  stage.appendChild(arrRow);
}

async function heapInsert(token, val) {
  heapArr.push(val);
  let i = heapArr.length - 1;
  renderHeap({ compare: [i] });
  if (!(await tick(token))) return;
  while (i > 0) {
    const p = heapParent(i);
    renderHeap({ compare: [i, p] });
    if (!(await tick(token))) return;
    if (heapArr[i] < heapArr[p]) {
      [heapArr[i], heapArr[p]] = [heapArr[p], heapArr[i]];
      renderHeap({ swap: [i, p] });
      if (!(await tick(token))) return;
      i = p;
    } else break;
  }
  renderHeap();
  document.getElementById('resultMsg').textContent = `inserted ${val}`;
}

async function heapExtractMin(token) {
  const min = heapArr[0];
  const last = heapArr.pop();
  if (heapArr.length > 0) {
    heapArr[0] = last;
    let i = 0;
    while (true) {
      const l = heapLeft(i), r = heapRight(i);
      let smallest = i;
      renderHeap({ compare: [i, l, r].filter(idx => idx < heapArr.length) });
      if (!(await tick(token))) return;
      if (l < heapArr.length && heapArr[l] < heapArr[smallest]) smallest = l;
      if (r < heapArr.length && heapArr[r] < heapArr[smallest]) smallest = r;
      if (smallest !== i) {
        [heapArr[i], heapArr[smallest]] = [heapArr[smallest], heapArr[i]];
        renderHeap({ swap: [i, smallest] });
        if (!(await tick(token))) return;
        i = smallest;
      } else break;
    }
  }
  renderHeap();
  document.getElementById('resultMsg').textContent = `extracted min: ${min}`;
}

function heapControls() {
  controls.innerHTML = `
    <div class="ctrl-group"><label>Value</label><input type="number" id="valInput" value="${Math.floor(Math.random() * 90 + 10)}"></div>
    <div class="ctrl-group"><label>Speed</label><input type="range" id="speedRange" min="1" max="10" value="${speed}"></div>
    <button class="btn btn-primary" id="insertBtn">Insert</button>
    <button class="btn" id="extractBtn">Extract Min</button>
    <button class="btn btn-ghost" id="clearBtn">Clear</button>
    <div class="spacer"></div>
    <div class="legend">
      <span><i style="background:var(--violet)"></i>root (min)</span>
      <span><i style="background:var(--bad)"></i>comparing</span>
      <span><i style="background:var(--accent)"></i>swapping</span>
    </div>
    <p id="resultMsg" class="side-label" style="width:100%;"></p>`;

  document.getElementById('speedRange').oninput = e => { speed = Number(e.target.value); };
  const insertBtn = document.getElementById('insertBtn');
  const extractBtn = document.getElementById('extractBtn');
  const clearBtn = document.getElementById('clearBtn');
  function lockUI(lock) { insertBtn.disabled = lock; extractBtn.disabled = lock; clearBtn.disabled = lock; navSetEnabled(!lock); }

  insertBtn.onclick = async () => {
    if (running) return;
    running = true; const token = ++runToken; lockUI(true);
    await heapInsert(token, Number(document.getElementById('valInput').value) || 0);
    if (token === runToken) { running = false; lockUI(false); }
  };
  extractBtn.onclick = async () => {
    if (running) return;
    if (heapArr.length === 0) { document.getElementById('resultMsg').textContent = 'heap is empty'; return; }
    running = true; const token = ++runToken; lockUI(true);
    await heapExtractMin(token);
    if (token === runToken) { running = false; lockUI(false); }
  };
  clearBtn.onclick = () => { if (!running) { heapArr = []; renderHeap(); document.getElementById('resultMsg').textContent = ''; } };
}

/* ============================================================
   ALGORITHM METADATA + PAGE SWITCHING
   ============================================================ */

const ALGO_META = {
  bubble:    { title: 'bubble_sort.js',    desc: 'Repeatedly steps through the array, swapping adjacent elements if they are in the wrong order. Each pass "bubbles" the largest remaining value to the end.', complexity: [['Best', 'O(n)'], ['Average', 'O(n²)'], ['Worst', 'O(n²)'], ['Space', 'O(1)']] },
  selection: { title: 'selection_sort.js', desc: 'Splits the array into a sorted and unsorted part, and on every pass selects the minimum of the unsorted part and swaps it into place.', complexity: [['Best', 'O(n²)'], ['Average', 'O(n²)'], ['Worst', 'O(n²)'], ['Space', 'O(1)']] },
  insertion: { title: 'insertion_sort.js', desc: 'Builds the sorted array one element at a time, taking each new element and inserting it into its correct position among the already-sorted ones.', complexity: [['Best', 'O(n)'], ['Average', 'O(n²)'], ['Worst', 'O(n²)'], ['Space', 'O(1)']] },
  merge:     { title: 'merge_sort.js',     desc: 'A divide-and-conquer algorithm: splits the array in half recursively, sorts each half, then merges the two sorted halves back together.', complexity: [['Best', 'O(n log n)'], ['Average', 'O(n log n)'], ['Worst', 'O(n log n)'], ['Space', 'O(n)']] },
  quick:     { title: 'quick_sort.js',     desc: 'Picks a pivot, partitions the array so smaller elements land left and larger ones land right of it, then recursively sorts each side.', complexity: [['Best', 'O(n log n)'], ['Average', 'O(n log n)'], ['Worst', 'O(n²)'], ['Space', 'O(log n)']] },
  linear:    { title: 'linear_search.js',  desc: 'Checks every element one by one from the start until the target is found or the array runs out. Works on any array, sorted or not.', complexity: [['Best', 'O(1)'], ['Average', 'O(n)'], ['Worst', 'O(n)'], ['Space', 'O(1)']] },
  binary:    { title: 'binary_search.js',  desc: 'Requires a sorted array. Repeatedly checks the middle element and discards the half that cannot contain the target, cutting the search space in two each time.', complexity: [['Best', 'O(1)'], ['Average', 'O(log n)'], ['Worst', 'O(log n)'], ['Space', 'O(1)']] },
  stack:     { title: 'stack.js',          desc: 'A Last-In-First-Out (LIFO) structure. push() adds to the top, pop() removes from the top — like a stack of plates, you only touch the one on top.', complexity: [['Push', 'O(1)'], ['Pop', 'O(1)'], ['Peek', 'O(1)'], ['Space', 'O(n)']] },
  queue:     { title: 'queue.js',          desc: 'A First-In-First-Out (FIFO) structure. enqueue() adds to the rear, dequeue() removes from the front — like a line at a checkout counter.', complexity: [['Enqueue', 'O(1)'], ['Dequeue', 'O(1)'], ['Peek', 'O(1)'], ['Space', 'O(n)']] },
  linkedlist:{ title: 'linked_list.js',    desc: 'A chain of nodes where each node points to the next. Insertion at the head is instant, but reaching any other position means walking the chain from the start.', complexity: [['Insert (head)', 'O(1)'], ['Insert (tail)', 'O(n)'], ['Search', 'O(n)'], ['Space', 'O(n)']] },
  bst:       { title: 'binary_search_tree.js', desc: 'Each node has at most two children — everything smaller goes left, everything larger goes right. That ordering is what makes search, insert, and delete all O(log n) on a balanced tree.', complexity: [['Search (avg)', 'O(log n)'], ['Search (worst)', 'O(n)'], ['Insert (avg)', 'O(log n)'], ['Space', 'O(n)']] },
  heap:      { title: 'min_heap.js',           desc: 'A complete binary tree stored flat in an array, where every parent is smaller than its children. The minimum always sits at the root — insert "bubbles up," extract-min "sifts down."', complexity: [['Find-min', 'O(1)'], ['Insert', 'O(log n)'], ['Extract-min', 'O(log n)'], ['Space', 'O(n)']] },
  bfs:       { title: 'bfs_maze.js',       desc: 'Breadth-First Search explores the grid level by level using a queue, guaranteeing the shortest path in an unweighted maze once it reaches the end.', complexity: [['Time', 'O(V + E)'], ['Space', 'O(V)'], ['Guarantees', 'shortest path'], ['Uses', 'queue']] },
  dfs:       { title: 'dfs_maze.js',       desc: 'Depth-First Search commits to one direction and follows it as far as possible using a stack, backtracking only when it hits a dead end. Finds a path, not necessarily the shortest.', complexity: [['Time', 'O(V + E)'], ['Space', 'O(V)'], ['Guarantees', 'a path'], ['Uses', 'stack']] },
};

function setActiveNav(name) { navItems.forEach(b => b.classList.toggle('active', b.dataset.algo === name)); }

function renderComplexity(rows) {
  complexityEl.innerHTML = rows
    ? `<table><thead><tr><th>Metric</th><th class="mono">Value</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="mono">${r[1]}</td></tr>`).join('')}</tbody></table>`
    : '';
}

function loadAlgo(name) {
  if (running) return;
  currentAlgo = name;
  runToken++;
  paused = false;
  stage.style.cssText = ''; // clear any inline layout left by tree/heap views

  setActiveNav(name);
  const meta = ALGO_META[name];
  algoTitle.textContent = meta.title;
  algoDesc.textContent = meta.desc;
  renderComplexity(meta.complexity);

  if (ALGO_FN[name]) {
    array = randomArray(20);
    sortingControls();
    renderBars();
  } else if (name === 'linear') {
    array = randomArray(16);
    searchingControls();
    renderBars();
  } else if (name === 'binary') {
    array = randomArray(16).sort((a, b) => a - b);
    searchingControls();
    renderBars();
  } else if (name === 'stack') {
    stackArr = [];
    stackControls();
    renderStack();
  } else if (name === 'queue') {
    queueArr = [];
    queueControls();
    renderQueue();
  } else if (name === 'linkedlist') {
    llArr = [12, 27, 8];
    llControls();
    renderLL();
  } else if (name === 'bst') {
    bstRoot = null;
    bstControls();
    renderTree();
  } else if (name === 'heap') {
    heapArr = [];
    heapControls();
    renderHeap();
  } else if (name === 'bfs' || name === 'dfs') {
    initGrid();
    startCell = { r: 1, c: 1 };
    endCell = { r: ROWS - 2, c: COLS - 2 };
    placeMode = 'wall';
    mazeControls(name);
    renderMaze();
  }

  if (window.innerWidth <= 860) navEl.classList.remove('open');
}

/* ---------------- wire up nav + boot ---------------- */

navItems.forEach(btn => btn.addEventListener('click', () => loadAlgo(btn.dataset.algo)));
menuToggle.addEventListener('click', () => navEl.classList.toggle('open'));

loadAlgo('bubble');
