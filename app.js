/**
 * Sistema de Monitoreo Hídrico Flotante - Visualizador 3D HD Ultra
 * Modelo interactivo con iluminación avanzada, detección de clics y nombres de partes
 */

class Visualizer3D {
  constructor() {
    this.canvas = document.getElementById('c');
    this.ctx = this.canvas.getContext('2d');
    
    // Dimensiones
    this.W = this.canvas.width;
    this.H = this.canvas.height;
    
    // Estado de rotación y visualización
    this.rotX = 0.45;
    this.rotY = 0.55;
    this.scale = 1.2;
    this.autoRot = false;
    
    // Estado de interacción
    this.dragging = false;
    this.lastMX = 0;
    this.lastMY = 0;
    
    // Animación de vistas
    this.viewTarget = { rx: 0.45, ry: 0.55 };
    this.viewAnimating = false;
    
    // Iluminación
    this.lightPos = { x: 0.7, y: 0.3, z: 1 };
    this.advLighting = true;
    
    // Factor de escala del modelo
    this.S = 0.5;
    
    // Partes clickeables
    this.clickableParts = [];
    this.hoveredPart = null;
    this.selectedPart = null;
    
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
    document.getElementById('lightToggle').addEventListener('click', (e) => this.toggleLight(e));

    // Canvas - Mouse
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('dblclick', () => this.onDoubleClick());
    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));

    // Touch support
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
      
      // Actualizar botón activo
      document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
      buttonEl.classList.add('active');
    }
  }

  toggleLight(e) {
    this.advLighting = !this.advLighting;
    e.target.style.opacity = this.advLighting ? '1' : '0.5';
  }

  onMouseDown(e) {
    this.dragging = true;
    this.lastMX = e.offsetX;
    this.lastMY = e.offsetY;
    this.autoRot = false;
    this.canvas.classList.add('grabbing');
  }

  onMouseUp() {
    this.dragging = false;
    this.canvas.classList.remove('grabbing');
  }

  onMouseLeave() {
    this.dragging = false;
    this.canvas.classList.remove('grabbing');
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
      // Detectar hover sobre partes
      this.hoveredPart = this.detectPart(e.offsetX, e.offsetY);
      this.canvas.style.cursor = this.hoveredPart ? 'pointer' : 'grab';
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

  onCanvasClick(e) {
    if (this.dragging) return;
    
    const part = this.detectPart(e.offsetX, e.offsetY);
    if (part) {
      this.selectedPart = part;
      this.showPartInfo(part);
    }
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

  // Detectar si se hizo clic en una parte
  detectPart(mouseX, mouseY) {
    // Buscar de atrás hacia adelante (profundidad)
    for (let i = this.clickableParts.length - 1; i >= 0; i--) {
      const part = this.clickableParts[i];
      if (this.pointInPolygon(mouseX, mouseY, part.vertices)) {
        return part;
      }
    }
    return null;
  }

  // Verificar si un punto está dentro de un polígono
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

  // Mostrar información de la parte
  showPartInfo(part) {
    const infoBar = document.getElementById('infobar');
    infoBar.textContent = `✓ ${part.name}`;
    infoBar.style.color = part.color || 'var(--color-text-secondary)';
    infoBar.style.fontWeight = 'bold';
    
    setTimeout(() => {
      infoBar.textContent = 'Arrastra para rotar · Rueda para zoom · Doble-clic para vista frontal';
      infoBar.style.fontWeight = 'normal';
      infoBar.style.color = 'var(--color-text-secondary)';
    }, 3000);
  }

  // Proyección 3D a 2D
  project(x, y, z) {
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

  // Calcular normal de cara para iluminación
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

  // Calcular iluminación
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

  // Crear cara poligonal con info de clickabilidad
  face(pts, color, alpha = 1, partName = null) {
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
      name: partName
    };

    // Registrar para clickabilidad si tiene nombre
    if (partName) {
      this.clickableParts.push({
        name: partName,
        vertices: pts,
        color: color,
        face: face
      });
    }

    return face;
  }

  // Dibujar una cara
  drawFace(f) {
    this.ctx.save();
    this.ctx.globalAlpha = f.alpha;
    
    const c = this.calculateLight(0, 0, 0, f.nx, f.ny, f.nz, f.color);
    this.ctx.fillStyle = c;
    
    this.ctx.beginPath();
    this.ctx.moveTo(f.pts[0].sx, f.pts[0].sy);
    for (let i = 1; i < f.pts.length; i++) {
      this.ctx.lineTo(f.pts[i].sx, f.pts[i].sy);
    }
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    this.ctx.lineWidth = 0.4;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  // Crear caja 3D
  box(cx, cy, cz, w, h, d, col, alpha = 1, partName = null) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const y0 = cy - h / 2, y1 = cy + h / 2;
    const z0 = cz - d / 2, z1 = cz + d / 2;

    const verts = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]
    ].map(v => this.project(v[0], v[1], v[2]));

    return [
      this.face([verts[0], verts[1], verts[2], verts[3]], col, alpha, partName ? `${partName} (frente)` : null),
      this.face([verts[4], verts[5], verts[6], verts[7]], col, alpha, partName ? `${partName} (atrás)` : null),
      this.face([verts[0], verts[1], verts[5], verts[4]], col, alpha, partName ? `${partName} (abajo)` : null),
      this.face([verts[2], verts[3], verts[7], verts[6]], col, alpha, partName ? `${partName} (arriba)` : null),
      this.face([verts[0], verts[3], verts[7], verts[4]], col, alpha, partName ? `${partName} (izquierda)` : null),
      this.face([verts[1], verts[2], verts[6], verts[5]], col, alpha, partName ? `${partName} (derecha)` : null),
    ].filter(f => f);
  }

  // Crear cilindro 3D
  cylinder(cx, cy, cz, r, h, col, segs = 24, partName = null) {
    const faces = [];
    const y0 = cy - h / 2, y1 = cy + h / 2;

    // Lados
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

  // Ajustar luminosidad de color
  shadeColor(hex, factor) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.min(255, Math.round(r * factor));
    g = Math.min(255, Math.round(g * factor));
    b = Math.min(255, Math.round(b * factor));

    return `rgb(${r},${g},${b})`;
  }

  // Construir escena
  buildScene() {
    const faces = [];
    const S = this.S;

    // ICOPOR - 3 bloques flotadores
    faces.push(...this.box(-150 * S, 280 * S, 0, 200 * S, 100 * S, 350 * S, '#e8e8e8', 1, 'Flotador Izquierdo'));
    faces.push(...this.box(0, 280 * S, 0, 100 * S, 100 * S, 350 * S, '#f0f0f0', 1, 'Flotador Central'));
    faces.push(...this.box(150 * S, 280 * S, 0, 200 * S, 100 * S, 350 * S, '#e8e8e8', 1, 'Flotador Derecho'));

    // SISTEMA DE ANCLAJE
    faces.push(...this.cylinder(0, 500 * S, 0, 60 * S * 0.4, 30 * S, '#666', 16, 'Polea de Anclaje'));
    faces.push(...this.cylinder(0, 350 * S, 0, 6 * S, 170 * S, '#8B7355', 12, 'Cuerda de Amarre'));

    // CAJA PRINCIPAL - Zona de Sensores (Azul)
    faces.push(...this.box(0, 60 * S, 0, 450 * S, 280 * S, 350 * S, '#4A90E2', 0.88, 'Caja Principal'));

    // DIVISIONES INTERNAS
    faces.push(...this.box(0, 60 * S, 0, 450 * S, 5 * S, 350 * S, '#2a2a2a', 0.95, 'Divisor Horizontal'));
    faces.push(...this.box(0, 60 * S, 0, 5 * S, 280 * S, 350 * S, '#2a2a2a', 0.95, 'Divisor Vertical'));

    // SENSORES DE AGUA - Cilindros grandes
    faces.push(...this.cylinder(-100 * S, 30 * S, -100 * S, 22 * S, 85 * S, '#E05252', 20, 'Sensor pH'));
    faces.push(...this.cylinder(100 * S, 30 * S, -100 * S, 22 * S, 85 * S, '#52B452', 20, 'Sensor Turbidez'));
    faces.push(...this.cylinder(-100 * S, -30 * S, 100 * S, 22 * S, 85 * S, '#E0C030', 20, 'Sensor TDS'));
    faces.push(...this.cylinder(100 * S, -30 * S, 100 * S, 22 * S, 85 * S, '#E07830', 20, 'Sensor Nivel'));

    // TUBERÍAS DE ENTRADA - Principal y secundarias
    faces.push(...this.cylinder(0, 220 * S, 0, 10 * S, 85 * S, '#8B5E3C', 16, 'Tubería Principal'));
    faces.push(...this.cylinder(-80 * S, 80 * S, 0, 8 * S, 40 * S, '#8B5E3C', 12, 'Tubería Auxiliar Izq'));
    faces.push(...this.cylinder(80 * S, 80 * S, 0, 8 * S, 40 * S, '#8B5E3C', 12, 'Tubería Auxiliar Der'));

    // ZONA ELECTRÓNICA - Caja superior gris
    faces.push(...this.box(0, -230 * S, 0, 450 * S, 120 * S, 350 * S, '#999999', 0.9, 'Zona Electrónica'));

    // MICROCONTROLADOR - ESP32
    faces.push(...this.box(-100 * S, -230 * S, -80 * S, 50 * S, 30 * S, 80 * S, '#1a1a1a', 1, 'Microcontrolador ESP32'));

    // BATERÍA 12V
    faces.push(...this.box(80 * S, -230 * S, 80 * S, 80 * S, 50 * S, 60 * S, '#8B3A3A', 1, 'Batería 12V'));

    // ANTENA WiFi
    faces.push(...this.cylinder(-200 * S, -310 * S, -150 * S, 5 * S, 160 * S, '#C0C0C0', 12, 'Antena WiFi'));

    // LEDs de Estado
    const ledColors = ['#E05252', '#52B452', '#E0C030', '#4A90E2'];
    const ledNames = ['LED pH', 'LED Turbidez', 'LED TDS', 'LED WiFi'];
    const ledPos = [[-80, -80], [-30, -80], [-80, 80], [-30, 80]];
    ledPos.forEach(([lx, lz], i) => {
      faces.push(...this.cylinder(lx * S, -270 * S, lz * S, 10 * S, 8 * S, ledColors[i], 16, ledNames[i]));
    });

    // LÍNEA DE FLOTACIÓN - Visual reference
    faces.push(...this.box(0, -60 * S, 0, 455 * S, 4 * S, 355 * S, '#1a6bb5', 0.4, 'Línea de Flotación'));

    return faces;
  }

  // Renderizar frame
  render() {
    // Limpiar lista de partes clickeables
    this.clickableParts = [];

    // Fondo con gradiente
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, 'rgba(240,245,250,1)');
    grad.addColorStop(1, 'rgba(250,250,250,1)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.W, this.H);

    // Animar vista si es necesario
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

    // Construir y renderizar escena
    const faces = this.buildScene();
    faces.sort((a, b) => b.depth - a.depth);
    faces.forEach(f => this.drawFace(f));

    // Resaltar parte hovereada
    if (this.hoveredPart) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255,200,0,0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.hoveredPart.vertices[0].sx, this.hoveredPart.vertices[0].sy);
      for (let i = 1; i < this.hoveredPart.vertices.length; i++) {
        this.ctx.lineTo(this.hoveredPart.vertices[i].sx, this.hoveredPart.vertices[i].sy);
      }
      this.ctx.closePath();
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Etiquetas principales
    this.ctx.font = '12px var(--font-sans)';
    this.ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const labels = [
      { x: 0, y: -230, z: 0, text: 'Electrónica', sz: 11 },
      { x: 0, y: 60, z: 0, text: 'Sensores', sz: 11 },
      { x: 0, y: 280, z: 0, text: 'Icopor', sz: 10 },
    ];
    labels.forEach(lb => {
      const p = this.project(lb.x * this.S, lb.y * this.S, lb.z * this.S);
      this.ctx.font = lb.sz + 'px var(--font-sans)';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(lb.text, p.sx, p.sy + 4);
    });

    // Etiqueta de draft
    this.ctx.fillStyle = 'rgba(26,107,181,0.7)';
    this.ctx.font = '10px var(--font-sans)';
    this.ctx.textAlign = 'right';
    this.ctx.fillText('Draft: 16.1 cm', this.W - 30, 40);

    // Instrucción de clickabilidad
    this.ctx.fillStyle = 'rgba(100,100,100,0.5)';
    this.ctx.font = '9px var(--font-sans)';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Haz clic en cualquier parte para ver su nombre', 10, 25);
  }

  // Loop de renderizado
  startRenderLoop() {
    const loop = () => {
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new Visualizer3D();
});
