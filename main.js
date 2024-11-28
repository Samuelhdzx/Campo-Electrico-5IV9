import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';

class SimulacionCampoElectrico {
  constructor() {
    // Constantes físicas
    this.k = 8.99e9; // Constante de Coulomb

    // Configuración de Three.js
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    
    // Arrays para almacenar objetos
    this.charges = [];
    this.fieldLines = [];
    this.fieldArrows = [];
    this.measurementPoint = null;

    // Configuración de la interfaz
    this.settings = {
      mostrarLineasCampo: true,
      mostrarFlechasCampo: true,
      valorCarga1: "1",
      valorCarga2: "-1",
      distancia: "2",
      potencialElectrico: "0",
      medirX: "0",
      medirY: "0",
      medirZ: "0",
      magnitudCampo: "0",
      agregarPuntoMedicion: () => this.addMeasurementPoint()
    };

    this.initScene();
    this.setupGUI();
    this.animate();
  }

  initScene() {
    // Configuración básica
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    this.camera.position.z = 5;

    // Controles
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    this.scene.add(pointLight);

    // Grilla de referencia
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);

    // Evento de redimensión
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.updateChargePositions();
    this.createFieldLines();
    this.createFieldArrows();
  }

  updateChargePositions() {
    this.charges.forEach(charge => this.scene.remove(charge));
    this.charges = [];

    const distance = parseFloat(this.settings.distancia) / 2;
    this.createCharge(parseFloat(this.settings.valorCarga1), new THREE.Vector3(-distance, 0, 0));
    this.createCharge(parseFloat(this.settings.valorCarga2), new THREE.Vector3(distance, 0, 0));
  }

  createCharge(value, position) {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: value > 0 ? 0xff0000 : 0x0000ff
    });
    const charge = new THREE.Mesh(geometry, material);
    charge.position.copy(position);
    charge.userData.value = value;
    this.charges.push(charge);
    this.scene.add(charge);
  }

  calculateField(point) {
    let field = new THREE.Vector3(0, 0, 0);
    
    this.charges.forEach(charge => {
      const r = new THREE.Vector3().subVectors(point, charge.position);
      const rSquared = r.lengthSq();
      if (rSquared > 0.01) {
        const magnitude = this.k * Math.abs(charge.userData.value) / rSquared;
        const direction = r.normalize();
        if (charge.userData.value < 0) direction.negate();
        field.add(direction.multiplyScalar(magnitude));
      }
    });
    return field;
  }

  createFieldArrows() {
    this.fieldArrows.forEach(arrow => this.scene.remove(arrow));
    this.fieldArrows = [];

    if (!this.settings.mostrarFlechasCampo) return;

    const spacing = 1.5; // Espaciado aumentado para reducir la densidad
    const range = 3; // Rango reducido
    for (let x = -range; x <= range; x += spacing) {
      for (let y = -range; y <= range; y += spacing) {
        for (let z = -range; z <= range; z += spacing) {
          const point = new THREE.Vector3(x, y, z);
          const field = this.calculateField(point);
          if (field.length() > 0.01) {
            this.createArrowHelper(point, field, 0.5, 0x00ff00);
          }
        }
      }
    }
  }

  createArrowHelper(origin, direction, length, color) {
    const arrowHelper = new THREE.ArrowHelper(
      direction.normalize(),
      origin,
      length,
      color,
      length * 0.2,
      length * 0.1
    );
    this.fieldArrows.push(arrowHelper);
    this.scene.add(arrowHelper);
  }

  createFieldLines() {
    this.fieldLines.forEach(line => this.scene.remove(line));
    this.fieldLines = [];

    if (!this.settings.mostrarLineasCampo) return;

    this.charges.forEach(charge => {
      const numLines = 8; // Número reducido de líneas
      const radius = 0.3;
      
      for (let i = 0; i < numLines; i++) {
        for (let j = 0; j < numLines; j++) {
          const phi = (2 * Math.PI * i) / numLines;
          const theta = (Math.PI * j) / numLines;
          const startPoint = new THREE.Vector3(
            charge.position.x + radius * Math.sin(theta) * Math.cos(phi),
            charge.position.y + radius * Math.sin(theta) * Math.sin(phi),
            charge.position.z + radius * Math.cos(theta)
          );
          this.traceFieldLine(startPoint, charge.userData.value > 0 ? 0xff0000 : 0x0000ff);
        }
      }
    });
  }

  traceFieldLine(startPoint, color) {
    const points = [startPoint.clone()];
    let currentPoint = startPoint.clone();
    const stepSize = 0.1;
    const maxSteps = 50;

    for (let i = 0; i < maxSteps; i++) {
      const field = this.calculateField(currentPoint);
      if (field.length() < 0.01) break;

      const direction = field.normalize();
      if (color === 0x0000ff) direction.multiplyScalar(-1);
      direction.multiplyScalar(stepSize);
      currentPoint.add(direction);
      points.push(currentPoint.clone());

      if (this.charges.some(charge => 
        currentPoint.distanceTo(charge.position) < 0.3
      )) break;
    }

    if (points.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color });
      const line = new THREE.Line(geometry, material);
      this.fieldLines.push(line);
      this.scene.add(line);
    }
  }

  calculatePotential(point) {
    let potential = 0;
    this.charges.forEach(charge => {
      const r = point.distanceTo(charge.position);
      potential += this.k * charge.userData.value / r;
    });
    return potential;
  }

  addMeasurementPoint() {
    if (this.measurementPoint) {
      this.scene.remove(this.measurementPoint);
    }

    const position = new THREE.Vector3(
      parseFloat(this.settings.medirX),
      parseFloat(this.settings.medirY),
      parseFloat(this.settings.medirZ)
    );

    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    this.measurementPoint = new THREE.Mesh(geometry, material);
    this.measurementPoint.position.copy(position);
    this.scene.add(this.measurementPoint);

    this.updateMeasurements();
  }

  updateMeasurements() {
    if (!this.measurementPoint) return;

    const field = this.calculateField(this.measurementPoint.position);
    this.settings.magnitudCampo = field.length().toExponential(2) + " N/C";
    
    const potential = this.calculatePotential(this.measurementPoint.position);
    this.settings.potencialElectrico = potential.toExponential(2) + " V";
    
    for (const controller of this.gui.controllers) {
      controller.updateDisplay();
    }
  }

  setupGUI() {
    this.gui = new dat.GUI();
    
    this.gui.add(this.settings, 'mostrarLineasCampo')
      .name('Mostrar Líneas de Campo')
      .onChange(() => {
        this.createFieldLines();
        this.updateMeasurements();
      });
    
    this.gui.add(this.settings, 'mostrarFlechasCampo')
      .name('Mostrar Flechas de Campo')
      .onChange(() => {
        this.createFieldArrows();
        this.updateMeasurements();
      });
    
    this.gui.add(this.settings, 'valorCarga1')
      .name('Carga 1 (C)')
      .onChange(() => {
        this.updateChargePositions();
        this.createFieldLines();
        this.createFieldArrows();
        this.updateMeasurements();
      });
    
    this.gui.add(this.settings, 'valorCarga2')
      .name('Carga 2 (C)')
      .onChange(() => {
        this.updateChargePositions();
        this.createFieldLines();
        this.createFieldArrows();
        this.updateMeasurements();
      });

    this.gui.add(this.settings, 'distancia')
      .name('Distancia (m)')
      .onChange(() => {
        this.updateChargePositions();
        this.createFieldLines();
        this.createFieldArrows();
        this.updateMeasurements();
      });

    this.gui.add(this.settings, 'potencialElectrico')
      .name('Potencial Eléctrico')
      .listen();

    const measureFolder = this.gui.addFolder('Punto de Medición');
    measureFolder.add(this.settings, 'medirX').name('Posición X');
    measureFolder.add(this.settings, 'medirY').name('Posición Y');
    measureFolder.add(this.settings, 'medirZ').name('Posición Z');
    measureFolder.add(this.settings, 'agregarPuntoMedicion').name('Agregar/Actualizar Punto');
    measureFolder.add(this.settings, 'magnitudCampo').name('Magnitud del Campo').listen();
    measureFolder.open();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new SimulacionCampoElectrico();