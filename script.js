const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size to fill screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Optional: Resize with window
window.addEventListener('resize', () => {
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.putImageData(img, 0, 0);
});

let drawing = false;
let currentTool = 'pen';
let startX, startY;
let history = [];
let redoStack = [];
let currentColor = '#000000';
let scale = 1;
const scaleStep = 0.1;
let textInput = document.getElementById('textInput');

// Tool buttons
['pen', 'eraser', 'rectangle', 'circle', 'line', 'triangle', 'arrow', 'text'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => currentTool = id);
});

// Color Picker
document.getElementById('colorPicker').addEventListener('change', e => {
  currentColor = e.target.value;
});

// Undo/Redo/Clear/Save
document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);
document.getElementById('clear').addEventListener('click', () => {
  saveState();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
document.getElementById('save').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'whiteboard.png';
  link.href = canvas.toDataURL();
  link.click();
});

// Zoom
document.getElementById('zoomIn').addEventListener('click', () => zoomCanvas(1 + scaleStep));
document.getElementById('zoomOut').addEventListener('click', () => zoomCanvas(1 - scaleStep));
document.getElementById('resetZoom').addEventListener('click', () => zoomCanvas(1, true));

// Theme
['lightTheme', 'darkTheme', 'colorfulTheme'].forEach(theme => {
  document.getElementById(theme).addEventListener('click', () => {
    document.body.className = theme.replace('Theme', '');
  });
});

// Drawing
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', endDraw);

function getPos(e) {
  if (e.touches) e = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left),
    y: (e.clientY - rect.top)
  };
}

function startDraw(e) {
  e.preventDefault();
  const pos = getPos(e);
  startX = pos.x;
  startY = pos.y;
  drawing = true;
  if (currentTool === 'text') {
    ctx.fillStyle = currentColor;
    ctx.fillText(textInput.value, startX, startY);
    saveState();
    drawing = false;
  } else if (currentTool === 'pen' || currentTool === 'eraser') {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
  }
}

function draw(e) {
  if (!drawing) return;
  const pos = getPos(e);
  if (currentTool === 'pen') {
    ctx.strokeStyle = currentColor;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  } else if (currentTool === 'eraser') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }
}

function endDraw(e) {
  if (!drawing) return;
  const pos = getPos(e);
  drawing = false;
  const w = pos.x - startX;
  const h = pos.y - startY;

  ctx.strokeStyle = currentColor;
  ctx.fillStyle = currentColor;

  if (currentTool === 'rectangle') ctx.strokeRect(startX, startY, w, h);
  if (currentTool === 'circle') {
    ctx.beginPath();
    ctx.ellipse(startX + w/2, startY + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (currentTool === 'line') {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }
  if (currentTool === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(startX + w / 2, startY);
    ctx.lineTo(startX, startY + h);
    ctx.lineTo(startX + w, startY + h);
    ctx.closePath();
    ctx.stroke();
  }
  if (currentTool === 'arrow') drawArrow(ctx, startX, startY, pos.x, pos.y);

  saveState();
}

function drawArrow(ctx, fromX, fromY, toX, toY) {
  const headlen = 10;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function saveState() {
  history.push(canvas.toDataURL());
  if (history.length > 50) history.shift();
  redoStack = [];
}

function undo() {
  if (history.length === 0) return;
  redoStack.push(canvas.toDataURL());
  const img = new Image();
  img.src = history.pop();
  img.onload = () => ctx.drawImage(img, 0, 0);
}

function redo() {
  if (redoStack.length === 0) return;
  history.push(canvas.toDataURL());
  const img = new Image();
  img.src = redoStack.pop();
  img.onload = () => ctx.drawImage(img, 0, 0);
}

function zoomCanvas(factor, reset = false) {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (reset) scale = 1;
  else scale *= factor;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imgData, 0, 0);

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tempCanvas, 0, 0);
}
