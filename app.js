/**
 * Sistema de Monitoreo Hídrico Flotante - Visualizador 3D
 * Modelo interactivo con rotación, zoom y vistas preestablecidas
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
    this.scale = 1;
    this.animating = true;
    
    // Estado de interacción
    this.dragging = false;
    this.lastMX = 0;
    this.lastMY = 0;
    
    // Animación de vistas
    this.viewTarget = { rx: 0.45, ry: 0.55 };
    this.viewAnimating = false;
    
    // Factor de escala del modelo
    this.S = 0.55;
    
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

    // Botón de pausa
    document.getElementById('animToggle').addEventListener('click', () => this.toggleAnim());

    // Canvas - Mouse
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // Canvas - Zoom
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this.onTouchEnd());
  }

  setView(viewName, buttonEl) {
    const views = {
      iso: { rx: 0.45, ry: 0.55 },
      front: { rx: 0.01, ry: 0.01 },
      top: { rx: 1.4, ry: 0.01 },
      side: { rx: 0.01, ry: 1.57 }
    };

    if (views[viewName]) {
      this.viewTarget = views[viewName];
      this.viewAnimating = true;
      
      // Actualizar botón activo
      document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
      buttonEl.classList.add('active');
    }
  }

  toggleAnim() {
    this.animating = !this.animating;
    const btn = document.getElementById('animToggle');
    btn.textContent = this.animating ? '⏸ Pausar rotación' : '▶ Reanudar rotación';
  }

  onMouseDown(e) {
    this.dragging = true;
    this.lastMX = e.offsetX;
    this.lastMY = e.offsetY;
    this.animating = false;
    this.canvas.classList.add('grabbing');
  }

  onMouseUp() {
    this.dragging = false;
    this.canvas.classList.remove('grabbing');
  }

  onMouseLeave() {
    this.dragging = false;
    this.canvas.classList.remove('grabbing');
  }

  onMouseMove(e) {
    if (!this.dragging) return;
    
    this.rotY += (e.offsetX - this.lastMX) * 0.008;
    this.rotX += (e.offsetY - this.lastMY) * 0.008;
    
    // Limitar rotación vertical
    this.rotX = Math.max(-1.2, Math.min(1.5, this.rotX));
    
    this.lastMX = e.offsetX;
    this.lastMY = e.offsetY;
  }

  onWheel(e) {
    e.preventDefault();
    this.scale *= e.deltaY > 0 ? 0.9 : 1.1;
    this.scale = Math.max(0.5, Math.min(2.5, this.scale));
  }

  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.dragging = true;
      this.lastMX = e.touches[0].clientX;
      this.lastMY = e.touches[0].clientY;
      this.animating = false;
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

  // Proyección 3D a 2D
  project(x, y, z) {
    const cosX = Math.cos(this.rotX);
    const sinX = Math.sin(this.rotX);
    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);

    // Rotación X
    const y2 = y * cosX - z * sinX;
    const z2 = y * sinX + z * cosX;

    // Rotación Y
    const x2 = x * cosY + z2 * sinY;
    const z3 = -x * sinY + z2 * cosY;

    // Perspectiva
    const fov = 400;
    const pz = fov / (fov + z3 + 200);

    return {
      sx: x2 * pz * this.scale + this.W / 2,
      sy: y2 * pz * this.scale + this.H / 2 - 20,
      depth: z3
    };
  }

  // Crear cara poligonal
  face(pts, color, alpha = 1) {
    if (pts.length < 3) return null;
    const avgDepth = pts.reduce((a, p) => a + p.depth, 0) / pts.length;
    return { pts, color, alpha, depth: avgDepth };
  }

  // Dibujar una cara
  drawFace(f) {
    this.ctx.save();
    this.ctx.globalAlpha = f.alpha;
    this.ctx.beginPath();
    this.ctx.moveTo(f.pts[0].sx, f.pts[0].sy);
    for (let i = 1; i < f.pts.length; i++) {
      this.ctx.lineTo(f.pts[i].sx, f.pts[i].sy);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = f.color;
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    this.ctx.lineWidth = 0.5;
    this.ctx.stroke();
    this.ctx.restore();
  }

  // Crear caja 3D
  box(cx, cy, cz, w, h, d, col, alpha = 1) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const y0 = cy - h / 2, y1 = cy + h / 2;
    const z0 = cz - d / 2, z1 = cz + d / 2;

    const verts = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]
    ].map(v => this.project(v[0], v[1], v[2]));

    const light = (f) => {
      const l = Math.max(0.6, 1 - f * 0.15);
      return this.shadeColor(col, l);
    };

    return [
      this.face([verts[0], verts[1], verts[2], verts[3]], light(0), alpha),
      this.face([verts[4], verts[5], verts[6], verts[7]], light(1), alpha),
      this.face([verts[0], verts[1], verts[5], verts[4]], light(2), alpha),
      this.face([verts[2], verts[3], verts[7], verts[6]], light(3), alpha),
      this.face([verts[0], verts[3], verts[7], verts[4]], light(4), alpha),
      this.face([verts[1], verts[2], verts[6], verts[5]], light(0.5), alpha),
    ].filter(f => f !== null);
  }

  // Crear cilindro 3D
  cylinder(cx, cy, cz, r, h, col, segs = 12) {
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
      const f = this.face(p, col, 1);
      if (f) faces.push(f);
    }

    // Tapa superior e inferior
    const top = [], bot = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      top.push(this.project(cx + Math.cos(a) * r, y1, cz + Math.sin(a) * r));
      bot.push(this.project(cx + Math.cos(a) * r, y0, cz + Math.sin(a) * r));
    }

    const topFace = this.face(top, this.shadeColor(col, 1.15));
    const botFace = this.face(bot.reverse(), this.shadeColor(col, 0.7));

    if (topFace) faces.push(topFace);
    if (botFace) faces.push(botFace);

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

    // Icopor blocks (flotadores)
    faces.push(...this.box(-150 * S, 250 * S, 0, 200 * S, 100 * S, 350 * S, '#e8e8e8'));
    faces.push(...this.box(0, 250 * S, 0, 100 * S, 100 * S, 350 * S, '#f0f0f0'));
    faces.push(...this.box(150 * S, 250 * S, 0, 200 * S, 100 * S, 350 * S, '#e8e8e8'));

    // Ancla y cuerda
    faces.push(...this.cylinder(0, 440 * S, 0, 60 * S * 0.4, 30 * S, '#666'));
    faces.push(...this.box(0, 340 * S, 0, 6 * S, 160 * S, 6 * S, '#8B7355'));

    // Caja principal (zona sensores)
    faces.push(...this.box(0, 60 * S, 0, 450 * S, 280 * S, 350 * S, '#4A90D9', 0.85));

    // Divisiones internas
    faces.push(...this.box(0, 60 * S, 0, 450 * S, 5 * S, 350 * S, '#222', 0.9));
    faces.push(...this.box(0, 60 * S, 0, 5 * S, 280 * S, 350 * S, '#222', 0.9));

    // Sensores (cilindros)
    faces.push(...this.cylinder(-100 * S, 30 * S, -100 * S, 20 * S, 80 * S, '#E05252')); // pH
    faces.push(...this.cylinder(100 * S, 30 * S, -100 * S, 20 * S, 80 * S, '#52B452')); // Turbidez
    faces.push(...this.cylinder(-100 * S, -30 * S, 100 * S, 20 * S, 80 * S, '#E0C030')); // TDS
    faces.push(...this.cylinder(100 * S, -30 * S, 100 * S, 20 * S, 80 * S, '#E07830')); // Nivel

    // Tuberías entrada
    faces.push(...this.cylinder(0, 210 * S, 0, 10 * S, 80 * S, '#8B5E3C'));

    // Zona electrónica
    faces.push(...this.box(0, -230 * S, 0, 450 * S, 120 * S, 350 * S, '#888'));

    // ESP32
    faces.push(...this.box(-100 * S, -230 * S, -80 * S, 50 * S, 30 * S, 80 * S, '#222'));

    // Batería
    faces.push(...this.box(80 * S, -230 * S, 80 * S, 80 * S, 50 * S, 60 * S, '#8B3A3A'));

    // Antena WiFi
    faces.push(...this.cylinder(-200 * S, -300 * S, -150 * S, 5 * S, 150 * S, '#C0C0C0'));

    // LEDs
    const ledColors = ['#E05252', '#52B452', '#E0C030', '#4A90D9'];
    const ledPos = [[-80, -80], [-30, -80], [-80, 80], [-30, 80]];
    ledPos.forEach(([lx, lz], i) => {
      faces.push(...this.cylinder(lx * S, -265 * S, lz * S, 10 * S, 5 * S, ledColors[i]));
    });

    // Línea de flotación
    faces.push(...this.box(0, -60 * S, 0, 455 * S, 4 * S, 355 * S, '#1a6bb5', 0.3));

    return faces;
  }

  // Renderizar frame
  render() {
    // Limpiar canvas
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-background-secondary');
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
    } else if (this.animating && !this.dragging) {
      this.rotY += 0.004;
    }

    // Construir y renderizar escena
    const faces = this.buildScene();
    faces.sort((a, b) => b.depth - a.depth);
    faces.forEach(f => this.drawFace(f));

    // Etiquetas
    this.ctx.font = '12px var(--font-sans)';
    this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const labels = [
      { x: 0, y: -230, z: 0, text: 'Electrónica' },
      { x: 0, y: 60, z: 0, text: 'Sensores' },
      { x: 0, y: 250, z: 0, text: 'Icopor' },
    ];
    labels.forEach(lb => {
      const p = this.project(lb.x * this.S, lb.y * this.S, lb.z * this.S);
      this.ctx.textAlign = 'center';
      this.ctx.fillText(lb.text, p.sx, p.sy + 4);
    });
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
