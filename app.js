/**
 * IECM - Visualizador 3D Sistema de Monitoreo Hídrico
 * Simulador completo con fondo realista
 */

class Visualizer3D {
  constructor() {
    this.canvas = document.getElementById('c');
    this.ctx = this.canvas.getContext('2d');
    
    this.W = this.canvas.width;
    this.H = this.canvas.height;
    
    this.rotX = 0.45;
    this.rotY = 0.55;
    this.scale = 1.2;
    this.autoRot = false;
    
    this.dragging = false;
    this.lastMX = 0;
    this.lastMY = 0;
    
    this.viewTarget = { rx: 0.45, ry: 0.55 };
    this.viewAnimating = false;
    
    this.lightPos = { x: 0.7, y: 0.3, z: 1 };
    this.advLighting = true;
    
    this.S = 0.5;
    
    this.exploded = false;
    this.explosionAmount = 0;
    this.explosionTarget = 0;
    
    this.clickableParts = [];
    this.hoveredPart = null;
    this.mouseX = -1;
    this.mouseY = -1;
    
    this.selectedPart = null;
    this.animationProgress = 0;
    this.animating = false;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.startRenderLoop();
  }

  setupEventListeners() {
    document.querySelectorAll('button[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => this.setView(e.target.dataset.view, e.target));
    });

    const lightBtn = document.getElementById('lightToggle');
    if (lightBtn) {
      lightBtn.addEventListener('click', (e) => this.toggleLight(e));
    }

    const explodeBtn = document.getElementById('explodeToggle');
    if (explodeBtn) {
      explodeBtn.addEventListener('click', (e) => this.toggleExplode(e));
    }

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('dblclick', () => this.onDoubleClick());

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this.onTouchEnd());
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
    e.target.style.opacity = this.advLighting ? '1' : '0.5';
  }

  toggleExplode(e) {
    this.exploded = !this.exploded;
    this.explosionTarget = this.exploded ? 1 : 0;
    e.target.classList.toggle('active');
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
    this.scale = Math.max(0.5, Math.min(2.5, this.scale));
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

  applyExplosion(x, y, z) {
    const cx = 0, cy = 0, cz = 0;
    const dx = x - cx;
    const dy = y - cy;
    const dz = z - cz;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.1;
    
    const explosionForce = 1.5;
    return {
      x: x + (dx / dist) * this.explosionAmount * explosionForce * 100,
      y: y + (dy / dist) * this.explosionAmount * explosionForce * 80,
      z: z + (dz / dist) * this.explosionAmount * explosionForce * 100
    };
  }

  project(x, y, z) {
    if (this.explosionAmount > 0) {
      const exploded = this.applyExplosion(x, y, z);
      x = exploded.x;
      y = exploded.y;
      z = exploded.z;
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

  face(pts, color, alpha = 1, partName = null) {
    if (pts.length < 3) return null;
    const avgDepth = pts.reduce((a, p) => a + p.depth, 0) / pts.length;
    const normal = this.calculateNormal(pts);
    const face = {
      pts, color, alpha, depth: avgDepth,
      nx: normal.x, ny: normal.y, nz: normal.z, name: partName
    };
    if (partName && partName.trim()) {
      this.clickableParts.push({
        name: partName, pts: pts, color: color, depth: avgDepth
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
      this.ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(this.animationProgress * Math.PI * 2) * 0.2})`;
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

    const verts = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]
    ].map(v => this.project(v[0], v[1], v[2]));

    return [
      this.face([verts[0], verts[1], verts[2], verts[3]], col, alpha, partName),
      this.face([verts[4], verts[5], verts[6], verts[7]], col, alpha, partName),
      this.face([verts[0], verts[1], verts[5], verts[4]], col, alpha, partName),
      this.face([verts[2], verts[3], verts[7], verts[6]], col, alpha, partName),
      this.face([verts[0], verts[3], verts[7], verts[4]], col, alpha, partName),
      this.face([verts[1], verts[2], verts[6], verts[5]], col, alpha, partName),
    ].filter(f => f);
  }

  cylinder(cx, cy, cz, r, h, col, segs = 32, partName = null) {
    const faces = [];
    const y0 = cy - h / 2, y1 = cy + h / 2;

    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const p = [
        this.project(cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r),
        this.project(cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r),
        this.project(cx + Math.cos(a1) * r, y1, cz + Math.sin(a1) * r),
        this.project(cx + Math.cos(a0) * r, y1, cz + Math.sin(a0) * r),
      ];
      const f = this.face(p, col, 1, partName);
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

    faces.push(...this.box(-150 * S, 280 * S, 0, 200 * S, 100 * S, 350 * S, '#0066CC', 1, 'Flotador Izquierdo'));
    faces.push(...this.box(0, 280 * S, 0, 100 * S, 100 * S, 350 * S, '#0088ff', 1, 'Flotador Central'));
    faces.push(...this.box(150 * S, 280 * S, 0, 200 * S, 100 * S, 350 * S, '#0066CC', 1, 'Flotador Derecho'));

    faces.push(...this.cylinder(0, 500 * S, 0, 60 * S * 0.4, 30 * S, '#666', 20, 'Polea de Anclaje'));
    faces.push(...this.cylinder(0, 350 * S, 0, 6 * S, 170 * S, '#777', 16, 'Cuerda de Amarre'));

    faces.push(...this.box(0, 60 * S, 0, 450 * S, 280 * S, 350 * S, '#4A90E2', 0.88, 'Caja Principal'));

    faces.push(...this.box(0, 60 * S, 0, 450 * S, 5 * S, 350 * S, '#2a2a2a', 0.95, 'Divisor Horizontal'));
    faces.push(...this.box(0, 60 * S, 0, 5 * S, 280 * S, 350 * S, '#2a2a2a', 0.95, 'Divisor Vertical'));

    faces.push(...this.cylinder(-100 * S, 30 * S, -100 * S, 22 * S, 85 * S, '#E05252', 32, 'Sensor pH'));
    faces.push(...this.cylinder(100 * S, 30 * S, -100 * S, 22 * S, 85 * S, '#FFD700', 32, 'Sensor Turbidez'));
    faces.push(...this.cylinder(-100 * S, -30 * S, 100 * S, 22 * S, 85 * S, '#ffcc00', 32, 'Sensor TDS'));
    faces.push(...this.cylinder(100 * S, -30 * S, 100 * S, 22 * S, 85 * S, '#FFD700', 32, 'Sensor Nivel'));

    faces.push(...this.cylinder(0, 220 * S, 0, 10 * S, 85 * S, '#8B5E3C', 20, 'Tubería Principal'));
    faces.push(...this.cylinder(-80 * S, 80 * S, 0, 8 * S, 40 * S, '#9d6e3d', 16, 'Tubería Auxiliar Izq'));
    faces.push(...this.cylinder(80 * S, 80 * S, 0, 8 * S, 40 * S, '#9d6e3d', 16, 'Tubería Auxiliar Der'));

    faces.push(...this.box(0, -230 * S, 0, 450 * S, 120 * S, 350 * S, '#999999', 0.9, 'Zona Electrónica'));
    faces.push(...this.box(-100 * S, -230 * S, -80 * S, 50 * S, 30 * S, 80 * S, '#1a1a1a', 1, 'Microcontrolador ESP32'));
    faces.push(...this.box(80 * S, -230 * S, 80 * S, 80 * S, 50 * S, 60 * S, '#8B3A3A', 1, 'Batería 12V'));

    faces.push(...this.cylinder(-200 * S, -310 * S, -150 * S, 5 * S, 160 * S, '#C0C0C0', 16, 'Antena WiFi'));

    const ledColors = ['#E05252', '#FFD700', '#ffcc00', '#0066CC'];
    const ledNames = ['LED pH', 'LED Turbidez', 'LED TDS', 'LED WiFi'];
    const ledPos = [[-80, -80], [-30, -80], [-80, 80], [-30, 80]];
    ledPos.forEach(([lx, lz], i) => {
      faces.push(...this.cylinder(lx * S, -270 * S, lz * S, 10 * S, 8 * S, ledColors[i], 20, ledNames[i]));
    });

    faces.push(...this.box(0, -60 * S, 0, 455 * S, 4 * S, 355 * S, '#1a6bb5', 0.4, 'Línea de Flotación'));

    return faces;
  }

  render() {
    this.clickableParts = [];

    const grad = this.ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, 'rgba(240,245,250,1)');
    grad.addColorStop(1, 'rgba(250,250,250,1)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.W, this.H);

    if (document.body.classList.contains('simulator-mode')) {
      this.drawSimulatorBackground();
    }

    if (this.explosionAmount !== this.explosionTarget) {
      const diff = this.explosionTarget - this.explosionAmount;
      this.explosionAmount += diff * 0.1;
      if (Math.abs(diff) < 0.01) {
        this.explosionAmount = this.explosionTarget;
      }
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
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
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

    this.ctx.font = '14px var(--font-sans)';
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    const labels = [
      { x: 0, y: -230, z: 0, text: 'Electrónica', sz: 13 },
      { x: 0, y: 60, z: 0, text: 'Sensores', sz: 13 },
      { x: 0, y: 280, z: 0, text: 'Icopor', sz: 12 },
    ];
    labels.forEach(lb => {
      const p = this.project(lb.x * this.S, lb.y * this.S, lb.z * this.S);
      this.ctx.font = lb.sz + 'px var(--font-sans)';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(lb.text, p.sx, p.sy + 4);
    });

    this.ctx.fillStyle = 'rgba(0, 58, 112, 0.7)';
    this.ctx.font = '11px var(--font-sans)';
    this.ctx.textAlign = 'right';
    this.ctx.fillText('Draft: 16.1 cm', this.W - 30, 40);
  }

  drawSimulatorBackground() {
    if (!document.body.classList.contains('simulator-mode')) return;

    // CIELO CON GRADIENTE
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.H * 0.35);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.6, '#ADD8E6');
    skyGradient.addColorStop(1, '#E0F6FF');
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, this.W, this.H * 0.35);

    // NUBES
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.drawCloud(this.W * 0.15, this.H * 0.08, 90);
    this.drawCloud(this.W * 0.75, this.H * 0.12, 110);
    this.drawCloud(this.W * 0.5, this.H * 0.18, 80);

    // RAYOS DE SOL
    this.drawSunrays();

    // AGUA CON 3 CAPAS
    const waterGradient = this.ctx.createLinearGradient(0, this.H * 0.35, 0, this.H * 0.65);
    waterGradient.addColorStop(0, '#5DADE2');
    waterGradient.addColorStop(0.5, '#2E7FA3');
    waterGradient.addColorStop(1, '#1A5578');
    this.ctx.fillStyle = waterGradient;
    this.ctx.fillRect(0, this.H * 0.35, this.W, this.H * 0.3);

    // ONDAS DE AGUA
    this.drawWaterWaves();

    // PARTÍCULAS FLOTANDO EN EL AGUA
    this.drawWaterParticles();

    // ROCAS/ALGAS (Fondo)
    const rockGradient = this.ctx.createLinearGradient(0, this.H * 0.65, 0, this.H);
    rockGradient.addColorStop(0, '#3d8659');
    rockGradient.addColorStop(0.3, '#2d5a47');
    rockGradient.addColorStop(0.7, '#1a3a2e');
    rockGradient.addColorStop(1, '#0d1e1a');
    this.ctx.fillStyle = rockGradient;
    this.ctx.fillRect(0, this.H * 0.65, this.W, this.H * 0.35);

    // ROCAS MÚLTIPLES
    this.drawRock(this.W * 0.08, this.H * 0.68, 150, 100);
    this.drawRock(this.W * 0.25, this.H * 0.72, 100, 70);
    this.drawRock(this.W * 0.4, this.H * 0.75, 80, 60);
    this.drawRock(this.W * 0.68, this.H * 0.70, 120, 80);
    this.drawRock(this.W * 0.85, this.H * 0.76, 90, 65);

    // ALGAS ANIMADAS MÚLTIPLES
    this.drawAlgae(this.W * 0.12, this.H * 0.65, 'A');
    this.drawAlgae(this.W * 0.35, this.H * 0.64, 'B');
    this.drawAlgae(this.W * 0.55, this.H * 0.67, 'C');
    this.drawAlgae(this.W * 0.72, this.H * 0.65, 'D');
    this.drawAlgae(this.W * 0.9, this.H * 0.68, 'E');

    // PLANTAS EN EL FONDO
    this.drawSeaPlants();

    // PECES PEQUEÑOS
    this.drawFish();

    // BURBUJAS
    this.drawBubbles();
  }

  drawSunrays() {
    this.ctx.strokeStyle = 'rgba(255, 255, 200, 0.15)';
    this.ctx.lineWidth = 2;
    const sunX = this.W * 0.8;
    const sunY = this.H * 0.1;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x1 = sunX + Math.cos(angle) * 30;
      const y1 = sunY + Math.sin(angle) * 30;
      const x2 = sunX + Math.cos(angle) * 150;
      const y2 = sunY + Math.sin(angle) * 150;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }

  drawCloud(x, y, size) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, size * 0.9, size * 0.45, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(x + size * 0.5, y - size * 0.1, size * 0.7, size * 0.4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(x - size * 0.5, y - size * 0.1, size * 0.65, size * 0.35, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawWaterWaves() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1.5;

    for (let wave = 0; wave < 4; wave++) {
      this.ctx.beginPath();
      const offsetY = this.H * 0.35 + (wave * 6);
      this.ctx.moveTo(0, offsetY);

      for (let x = 0; x <= this.W; x += 25) {
        const y = offsetY + Math.sin((x * 0.01) + (Date.now() * 0.004) + wave) * 2;
        this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }
  }

  drawWaterParticles() {
    const time = Date.now() * 0.0003;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    
    for (let i = 0; i < 15; i++) {
      const x = (this.W / 15) * i + Math.sin(time + i) * 30;
      const y = this.H * 0.4 + Math.sin(time * 0.7 + i) * 50;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawRock(x, y, width, height) {
    this.ctx.fillStyle = 'rgba(60, 90, 120, 0.8)';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, width / 2, height / 2, 0.15, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(40, 60, 80, 0.6)';
    this.ctx.beginPath();
    this.ctx.ellipse(x + width * 0.2, y + height * 0.2, width / 2.5, height / 2.5, 0.15, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, width / 2, height / 2, 0.15, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  drawAlgae(x, startY, id) {
    const time = Date.now() * 0.002 + (id.charCodeAt(0) * 0.5);
    
    this.ctx.strokeStyle = 'rgba(45, 130, 80, 0.85)';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x, startY);

    for (let y = startY; y < startY + 100; y += 4) {
      const waveX = x + Math.sin((y * 0.04) + time) * 12;
      this.ctx.lineTo(waveX, y);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(70, 150, 100, 0.7)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x + 6, startY);

    for (let y = startY; y < startY + 95; y += 4) {
      const waveX = x + 6 + Math.sin((y * 0.05) + time + 2) * 10;
      this.ctx.lineTo(waveX, y);
    }
    this.ctx.stroke();
  }

  drawSeaPlants() {
    const time = Date.now() * 0.0015;
    
    this.ctx.fillStyle = 'rgba(35, 80, 60, 0.7)';
    for (let i = 0; i < 6; i++) {
      const x = (this.W / 6) * (i + 0.5);
      const y = this.H * 0.72;
      const height = 40 + Math.sin(time + i) * 5;
      
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, 8, height / 2, 0.3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawFish() {
    const time = Date.now() * 0.001;
    const fishCount = 3;
    
    for (let i = 0; i < fishCount; i++) {
      const x = (this.W / fishCount) * i + Math.sin(time + i * 2) * 60;
      const y = this.H * 0.48 + Math.sin(time * 0.7 + i) * 30;
      
      this.ctx.fillStyle = 'rgba(150, 200, 100, 0.6)';
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, 12, 6, 0.2, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = 'rgba(200, 220, 150, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(x + 8, y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawBubbles() {
    const time = Date.now() * 0.0004;
    const bubbleCount = 12;

    for (let i = 0; i < bubbleCount; i++) {
      const x = (this.W / bubbleCount) * i + Math.sin(time + i) * 25;
      const y = this.H * 0.35 + (Math.sin(time * 0.6 + i) * 150);
      const size = 2 + Math.sin(time * 0.5 + i) * 1.5;
      const opacity = 0.2 + Math.sin(time + i) * 0.1;

      this.ctx.fillStyle = `rgba(200, 220, 255, ${opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
      this.ctx.lineWidth = 0.5;
      this.ctx.stroke();
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
    for (let face of this.buildScene()) {
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
