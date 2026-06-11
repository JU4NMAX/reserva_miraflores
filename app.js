/**
 * IECM - Sistema de Monitoreo Hídrico Flotante
 * Visualizador 3D HD v4.0 - Con Vista Explosionada y Modo Simulador
 */

class Visualizer3D {
  constructor() {
    this.canvas = document.getElementById('c');
    this.ctx = this.canvas.getContext('2d');
    
    this.W = this.canvas.width;
    this.H = this.canvas.height;
    
    // Rotación y visualización
    this.rotX = 0.45;
    this.rotY = 0.55;
    this.scale = 1.2;
    this.autoRot = false;
    
    // Interacción
    this.dragging = false;
    this.lastMX = 0;
    this.lastMY = 0;
    
    // Animación de vistas
    this.viewTarget = { rx: 0.45, ry: 0.55 };
    this.viewAnimating = false;
    
    // Iluminación
    this.lightPos = { x: 0.7, y: 0.3, z: 1 };
    this.advLighting = true;
    
    // Factor de escala
    this.S = 0.5;
    
    // Partes clickeables
    this.clickableParts = [];
    this.hoveredPart = null;
    this.mouseX = -1;
    this.mouseY = -1;
    
    // NUEVA: Animación de selección
    this.selectedPart = null;
    this.animationProgress = 0;
    this.animating = false;
    
    // NUEVA: Modo explosionada
    this.explodedMode = false;
    this.explodeAmount = 0;
    
    // NUEVA: Modo simulador
    this.simulatorMode = false;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.startRenderLoop();
  }

  setupEventListeners() {
    // Botones de vista
    document.querySelectorAll('button[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => this.setView(e.target.dataset.view, e.target));
    });

    // Botón de iluminación
    const lightBtn = document.getElementById('lightToggle');
    if (lightBtn) {
      lightBtn.addEventListener('click', (e) => this.toggleLight(e));
    }

    // Botón explosionada
    const explodeBtn = document.getElementById('explodeToggle');
    if (explodeBtn) {
      explodeBtn.addEventListener('click', (e) => this.toggleExploded(e));
    }

    // Botón simulador
    const simBtn = document.getElementById('simulatorToggle');
    if (simBtn) {
      simBtn.addEventListener('click', (e) => this.toggleSimulator(e));
    }

    // Canvas
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('dblclick', () => this.onDoubleClick());

    // Touch
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this.onTouchEnd());
  }

  toggleExploded(e) {
    this.explodedMode = !this.explodedMode;
    e.target.classList.toggle('active', this.explodedMode);
  }

  toggleSimulator(e) {
    this.simulatorMode = !this.simulatorMode;
    e.target.classList.toggle('active', this.simulatorMode);
  }

  setView(viewName, buttonEl) {
    const views = {
      iso: { rx: 0.45, ry: 0.55 },
      front: { rx: 0.0, ry: 0.0 },
      top: { rx: 1.4, ry: 0.0 },
      side: { rx: 0.0, ry: 1.57 }
    };

    this.autoRot = (viewName === 'rotate');

    if (views[viewName]) {
      this.viewTarget = views[viewName];
      if (viewName !== 'rotate') {
        this.viewAnimating = true;
      }
      
      document.querySelectorAll('.btn-view').forEach(b => b.classList.remove('active'));
      buttonEl.classList.add('active');
    }
  }

  toggleLight(e) {
    this.advLighting = !this.advLighting;
    e.target.classList.toggle('active', this.advLighting);
  }

  onMouseDown(e) {
    this.dragging = true;
    this.lastMX = e.offsetX;
    this.lastMY = e.offsetY;
    this.autoRot = false;
  }

  onMouseUp() {
    this.dragging = false;
  }

  onMouseLeave() {
    this.dragging = false;
    this.hoveredPart = null;
  }

  onMouseMove(e) {
    if (this.dragging) {
      this.rotY += (e.offsetX - this.lastMX) * 0.008;
      this.rotX += (e.offsetY - this.lastMY) * 0.008;
      this.rotX = Math.max(-1.2, Math.min(1.5, this.rotX));
      
      this.lastMX = e.offsetX;
      this.lastMY = e.offsetY;
    } else {
      this.mouseX = e.offsetX;
      this.mouseY = e.offsetY;
    }
  }

  onWheel(e) {
    e.preventDefault();
    this.scale *= e.deltaY > 0 ? 0.92 : 1.08;
    this.scale = Math.max(0.5, Math.min(2.2, this.scale));
  }

  onDoubleClick() {
    this.viewTarget = { rx: 0, ry: 0 };
    this.viewAnimating = true;
  }

  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.dragging = true;
      this.lastMX = e.touches[0].clientX;
      this.lastMY = e.touches[0].clientY;
      this.autoRot = false;
    }
  }

  onTouchMove(e) {
    if (!this.dragging || e.touches.length !== 1) return;
    e.preventDefault();
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    this.rotY += (currentX - this.lastMX) * 0.008;
    this.rotX += (currentY - this.lastMY) * 0.008;
    this.rotX = Math.max(-1.2, Math.min(1.5, this.rotX));
    
    this.lastMX = currentX;
    this.lastMY = currentY;
  }

  onTouchEnd() {
    this.dragging = false;
  }

  detectPart(mouseX, mouseY) {
    for (let i = this.clickableParts.length - 1; i >= 0; i--) {
      const part = this.clickableParts[i];
      if (this.pointInPolygon(mouseX, mouseY, part.pts)) {
        return part;
      }
    }
    return null;
  }

  pointInPolygon(x, y, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].sx, yi = vertices[i].sy;
      const xj = vertices[j].sx, yj = vertices[j].sy;
      
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  project(x, y, z, explodeDir = { x: 0, y: 0, z: 0 }) {
    // Aplicar explosión
    if (this.explodedMode) {
      const explodeFactor = 0.5;
      x += explodeDir.x * explodeFactor;
      y += explodeDir.y * explodeFactor;
      z += explodeDir.z * explodeFactor;
    }

    const cosX = Math.cos(this.rotX);
    const sinX = Math.sin(this.rotX);
    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);

    const y2 = y * cosX - z * sinX;
    const z2 = y * sinX + z * cosX;

    const x2 = x * cosY + z2 * sinY;
    const z3 = -x * sinY + z2 * cosY;

    const fov = 500;
    const pz = fov / (fov + z3 + 300);

    return {
      sx: x2 * pz * this.scale + this.W / 2,
      sy: y2 * pz * this.scale + this.H / 2 - 30,
      depth: z3,
      z3: z3
    };
  }

  calculateNormal(pts) {
    if (pts.length < 3) return { x: 0, y: 0, z: 0 };
    
    const n = pts.length;
    let nX = 0, nY = 0, nZ = 0;
    
    for (let i = 0; i < n; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      nX += (p1.sy - p2.sy) * (p1.depth + p2.depth);
      nY += (p1.depth - p2.depth) * 50;
      nZ += (p1.sx - p2.sx) * (p1.depth + p2.depth);
    }
    
    const len = Math.sqrt(nX * nX + nY * nY + nZ * nZ) + 0.001;
    return { x: nX / len, y: nY / len, z: nZ / len };
  }

  calculateLight(x, y, z, nX, nY, nZ, baseColor) {
    const lx = this.lightPos.x - x * 0.004;
    const ly = this.lightPos.y - y * 0.003;
    const lz = this.lightPos.z - z * 0.004;
    
    const llen = Math.sqrt(lx * lx + ly * ly + lz * lz);
    let bright = Math.max(0.1, (nX * lx + nY * ly + nZ * lz) / llen);
    
    if (!this.advLighting) {
      bright = Math.max(0.6, (bright + 1) * 0.5);
    }
    
    return this.shadeColor(baseColor, 0.4 + bright * 0.6);
  }

  face(pts, color, alpha = 1, partName = null, explodeDir = { x: 0, y: 0, z: 0 }) {
    if (pts.length < 3) return null;
    
    const avgDepth = pts.reduce((a, p) => a + p.depth, 0) / pts.length;
    const normal = this.calculateNormal(pts);
    
    const face = {
      pts,
      color,
      alpha,
      depth: avgDepth,
      nx: normal.x,
      ny: normal.y,
      nz: normal.z,
      name: partName,
      explodeDir
    };

    if (partName && partName.trim()) {
      this.clickableParts.push({
        name: partName,
        pts: pts,
        color: color,
        depth: avgDepth
      });
    }

    return face;
  }

  drawFace(f, isSelected = false) {
    this.ctx.save();
    this.ctx.globalAlpha = f.alpha;
    
    let c = this.calculateLight(0, 0, 0, f.nx, f.ny, f.nz, f.color);
    
    if (isSelected && this.animating) {
      const brightness = 1 + (Math.sin(this.animationProgress * Math.PI * 2) * 0.3);
      c = this.shadeColor(f.color, brightness);
    }
    
    this.ctx.fillStyle = c;
    
    this.ctx.beginPath();
    this.ctx.moveTo(f.pts[0].sx, f.pts[0].sy);
    for (let i = 1; i < f.pts.length; i++) {
      this.ctx.lineTo(f.pts[i].sx, f.pts[i].sy);
    }
    this.ctx.closePath();
    this.ctx.fill();
    
    if (isSelected && this.animating) {
      this.ctx.strokeStyle = `rgba(255, 200, 0, ${0.3 + Math.sin(this.animationProgress * Math.PI * 2) * 0.2})`;
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();
    } else {
      this.ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      this.ctx.lineWidth = 0.4;
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  box(cx, cy, cz, w, h, d, col, alpha = 1, partName = null) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const y0 = cy - h / 2, y1 = cy + h / 2;
    const z0 = cz - d / 2, z1 = cz + d / 2;

    const explodeDir = { x: cx * 0.5, y: cy * 0.5, z: cz * 0.5 };
    const len = Math.sqrt(explodeDir.x ** 2 + explodeDir.y ** 2 + explodeDir.z ** 2);
    if (len > 0) {
      explodeDir.x /= len;
      explodeDir.y /= len;
      explodeDir.z /= len;
    }

    const verts = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]
    ].map(v => this.project(v[0], v[1], v[2], explodeDir));

    return [
      this.face([verts[0], verts[1], verts[2], verts[3]], col, alpha, partName, explodeDir),
      this.face([verts[4], verts[5], verts[6], verts[7]], col, alpha, partName, explodeDir),
      this.face([verts[0], verts[1], verts[5], verts[4]], col, alpha, partName, explodeDir),
      this.face([verts[2], verts[3], verts[7], verts[6]], col, alpha, partName, explodeDir),
      this.face([verts[0], verts[3], verts[7], verts[4]], col, alpha, partName, explodeDir),
      this.face([verts[1], verts[2], verts[6], verts[5]], col, alpha, partName, explodeDir),
    ].filter(f => f);
  }

  cylinder(cx, cy, cz, r, h, col, segs = 32, partName = null) {
    const faces = [];
    const y0 = cy - h / 2, y1 = cy + h / 2;

    const explodeDir = { x: cx * 0.5, y: cy * 0.5, z: cz * 0.5 };
    const len = Math.sqrt(explodeDir.x ** 2 + explodeDir.y ** 2 + explodeDir.z ** 2);
    if (len > 0) {
      explodeDir.x /= len;
      explodeDir.y /= len;
      explodeDir.z /= len;
    }

    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      
      const p = [
        this.project(cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r, explodeDir),
        this.project(cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r, explodeDir),
        this.project(cx + Math.cos(a1) * r, y1, cz + Math.sin(a1) * r, explodeDir),
        this.project(cx + Math.cos(a0) * r, y1, cz + Math.sin(a0) * r, explodeDir),
      ];
      
      const f = this.face(p, col, 1, partName, explodeDir);
      if (f) faces.push(f);
    }

    return faces;
  }

  shadeColor(hex, factor) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.min(255, Math.round(r * factor));
    g = Math.min(255, Math.round(g * factor));
    b = Math.min(255, Math.round(b * factor));

    return `rgb(${r},${g},${b})`;
  }

  buildScene() {
    const faces = [];
    const S = this.S;

    // FLOTADORES
    faces.push(...this.box(-150 * S, 280 * S, 0, 200 * S, 100 * S, 350 * S, '#0066CC', 1, 'Flotador Izquierdo'));
    faces.push(...this.box(0, 280 * S, 0, 100 * S, 100 * S, 350 * S, '#0099ff', 1, 'Flotador Central'));
    faces.push(...this.box(150 * S, 280 * S, 0, 200 * S, 100 * S, 350 * S, '#0066CC', 1, 'Flotador Derecho'));

    // ANCLAJE
    faces.push(...this.cylinder(0, 500 * S, 0, 60 * S * 0.4, 30 * S, '#003D7A', 20, 'Polea de Anclaje'));
    faces.push(...this.cylinder(0, 350 * S, 0, 6 * S, 170 * S, '#003D7A', 16, 'Cuerda de Amarre'));

    // CAJA PRINCIPAL
    faces.push(...this.box(0, 60 * S, 0, 450 * S, 280 * S, 350 * S, '#0066CC', 0.88, 'Caja Principal'));

    // DIVISIONES
    faces.push(...this.box(0, 60 * S, 0, 450 * S, 5 * S, 350 * S, '#003D7A', 0.95, 'Divisor Horizontal'));
    faces.push(...this.box(0, 60 * S, 0, 5 * S, 280 * S, 350 * S, '#003D7A', 0.95, 'Divisor Vertical'));

    // SENSORES
    faces.push(...this.cylinder(-100 * S, 30 * S, -100 * S, 22 * S, 85 * S, '#FFD700', 32, 'Sensor pH'));
    faces.push(...this.cylinder(100 * S, 30 * S, -100 * S, 22 * S, 85 * S, '#FFD700', 32, 'Sensor Turbidez'));
    faces.push(...this.cylinder(-100 * S, -30 * S, 100 * S, 22 * S, 85 * S, '#FFD700', 32, 'Sensor TDS'));
    faces.push(...this.cylinder(100 * S, -30 * S, 100 * S, 22 * S, 85 * S, '#FFD700', 32, 'Sensor Nivel'));

    // TUBERÍAS
    faces.push(...this.cylinder(0, 220 * S, 0, 10 * S, 85 * S, '#8B5E3C', 20, 'Tubería Principal'));
    faces.push(...this.cylinder(-80 * S, 80 * S, 0, 8 * S, 40 * S, '#9d6e3d', 16, 'Tubería Auxiliar Izq'));
    faces.push(...this.cylinder(80 * S, 80 * S, 0, 8 * S, 40 * S, '#9d6e3d', 16, 'Tubería Auxiliar Der'));

    // ELECTRÓNICA
    faces.push(...this.box(0, -230 * S, 0, 450 * S, 120 * S, 350 * S, '#4CAF50', 0.9, 'Zona Electrónica'));
    faces.push(...this.box(-100 * S, -230 * S, -80 * S, 50 * S, 30 * S, 80 * S, '#003D7A', 1, 'Microcontrolador ESP32'));
    faces.push(...this.box(80 * S, -230 * S, 80 * S, 80 * S, 50 * S, 60 * S, '#8B3A3A', 1, 'Batería 12V'));

    // ANTENA
    faces.push(...this.cylinder(-200 * S, -310 * S, -150 * S, 5 * S, 160 * S, '#C0C0C0', 16, 'Antena WiFi'));

    // LEDs
    const ledColors = ['#FFD700', '#FFD700', '#FFD700', '#0066CC'];
    const ledNames = ['LED pH', 'LED Turbidez', 'LED TDS', 'LED WiFi'];
    const ledPos = [[-80, -80], [-30, -80], [-80, 80], [-30, 80]];
    ledPos.forEach(([lx, lz], i) => {
      faces.push(...this.cylinder(lx * S, -270 * S, lz * S, 10 * S, 8 * S, ledColors[i], 20, ledNames[i]));
    });

    // LÍNEA DE FLOTACIÓN
    faces.push(...this.box(0, -60 * S, 0, 455 * S, 4 * S, 355 * S, '#4CAF50', 0.4, 'Línea de Flotación'));

    return faces;
  }

  render() {
    this.clickableParts = [];

    // Fondo - Simulador o Normal
    if (this.simulatorMode) {
      // Simulación en reserva - Agua y naturaleza
      const grad = this.ctx.createLinearGradient(0, 0, 0, this.H);
      grad.addColorStop(0, 'rgba(135, 206, 235, 0.8)'); // Cielo azul
      grad.addColorStop(0.5, 'rgba(100, 180, 200, 0.7)'); // Transición
      grad.addColorStop(1, 'rgba(60, 140, 160, 0.9)'); // Agua
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.W, this.H);

      // Línea de agua
      this.ctx.strokeStyle = 'rgba(100, 160, 200, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.H * 0.6);
      this.ctx.lineTo(this.W, this.H * 0.6);
      this.ctx.stroke();
    } else {
      // Modo normal - Fondo neutro
      const grad = this.ctx.createLinearGradient(0, 0, 0, this.H);
      grad.addColorStop(0, 'rgba(240, 245, 250, 1)');
      grad.addColorStop(1, 'rgba(250, 250, 250, 1)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.W, this.H);
    }

    if (this.viewAnimating) {
      const dx = this.viewTarget.rx - this.rotX;
      const dy = this.viewTarget.ry - this.rotY;
      this.rotX += dx * 0.12;
      this.rotY += dy * 0.12;
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
        this.viewAnimating = false;
      }
    } else if (this.autoRot) {
      this.rotY += 0.003;
    }

    if (this.animating) {
      this.animationProgress += 0.05;
      if (this.animationProgress >= 1) {
        this.animationProgress = 0;
      }
    }

    const faces = this.buildScene();
    faces.sort((a, b) => b.depth - a.depth);
    
    faces.forEach(f => {
      const isSelected = this.selectedPart && f.name === this.selectedPart.name;
      this.drawFace(f, isSelected);
    });

    if (this.mouseX >= 0 && this.mouseY >= 0) {
      this.hoveredPart = this.detectPart(this.mouseX, this.mouseY);
      this.canvas.style.cursor = this.hoveredPart ? 'pointer' : 'grab';
    }

    if (this.hoveredPart) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(0, 102, 204, 0.9)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(this.hoveredPart.pts[0].sx, this.hoveredPart.pts[0].sy);
      for (let i = 1; i < this.hoveredPart.pts.length; i++) {
        this.ctx.lineTo(this.hoveredPart.pts[i].sx, this.hoveredPart.pts[i].sy);
      }
      this.ctx.closePath();
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Etiqueta explosionada
    if (this.explodedMode) {
      this.ctx.fillStyle = 'rgba(0, 102, 204, 0.7)';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('VISTA EXPLOSIONADA', this.W / 2, 30);
    }
  }

  startRenderLoop() {
    const loop = () => {
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  selectPart(partName) {
    this.selectedPart = null;
    const faces = this.buildScene();
    for (let face of faces) {
      if (face && face.name === partName) {
        this.selectedPart = face;
        break;
      }
    }
    
    if (this.selectedPart) {
      this.animating = true;
      this.animationProgress = 0;
      this.rotY += Math.random() * 0.1 - 0.05;
    }
  }
}

// Funciones auxiliares
function closeSplash() {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('hidden');
  }
}

const componentCategories = {
  'Flotador Izquierdo': 'btn-floaters',
  'Flotador Central': 'btn-floaters',
  'Flotador Derecho': 'btn-floaters',
  'Polea de Anclaje': 'btn-anchors',
  'Cuerda de Amarre': 'btn-anchors',
  'Caja Principal': 'btn-sensors',
  'Divisor Horizontal': 'btn-sensors',
  'Divisor Vertical': 'btn-sensors',
  'Sensor pH': 'btn-sensors',
  'Sensor Turbidez': 'btn-sensors',
  'Sensor TDS': 'btn-sensors',
  'Sensor Nivel': 'btn-sensors',
  'Tubería Principal': 'btn-pipes',
  'Tubería Auxiliar Izq': 'btn-pipes',
  'Tubería Auxiliar Der': 'btn-pipes',
  'Zona Electrónica': 'btn-electronics',
  'Microcontrolador ESP32': 'btn-electronics',
  'Batería 12V': 'btn-electronics',
  'Antena WiFi': 'btn-electronics',
  'LED pH': 'btn-sensors',
  'LED Turbidez': 'btn-sensors',
  'LED TDS': 'btn-sensors',
  'LED WiFi': 'btn-electronics',
  'Línea de Flotación': 'btn-floaters'
};

function createComponentsGrid() {
  const components = Object.keys(componentCategories);
  const grid = document.getElementById('componentsGrid');
  if (!grid) return;

  grid.innerHTML = '';

  components.forEach(component => {
    const btn = document.createElement('button');
    btn.className = `component-btn ${componentCategories[component] || ''}`;
    btn.textContent = component;
    btn.setAttribute('data-component', component);
    
    btn.addEventListener('click', () => {
      document.querySelectorAll('.component-btn').forEach(b => {
        b.classList.remove('active');
      });
      
      btn.classList.add('active');
      
      const infoBar = document.getElementById('infobar');
      if (infoBar) {
        infoBar.textContent = `✓ ${component}`;
      }
      
      if (window.visualizer) {
        window.visualizer.selectPart(component);
      }
      
      if (typeof audioManager !== 'undefined') {
        audioManager.speak(component);
      }
    });

    grid.appendChild(btn);
  });
}

let visualizer;

document.addEventListener('DOMContentLoaded', () => {
  createComponentsGrid();
  
  const splash = document.getElementById('splash');
  if (splash) {
    setTimeout(() => {
      if (!splash.classList.contains('hidden')) {
        closeSplash();
      }
    }, 10000);
  }
  
  visualizer = new Visualizer3D();
  window.visualizer = visualizer;
});
