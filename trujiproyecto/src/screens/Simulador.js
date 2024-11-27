import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';

export const Simulador = () => {    

class ElectricFieldSimulation {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.charges = [];
    this.fieldLines = [];
    this.fieldArrows = [];
    this.measurementPoint = null;
    this.clock = new THREE.Clock();
    this.settings = {
      showFieldLines: true,
      showFieldArrows: true,
      charge1Value: "1",
      charge2Value: "-1",
      distance: "2",
      electricPotential: "0",
      measureX: "0",
      measureY: "0",
      measureZ: "0",
      fieldMagnitude: "0",
      addMeasurePoint: () => this.addMeasurementPoint()
    };

    this.init();
    this.setupGUI();
    this.animate();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.camera.position.z = 5;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    this.scene.add(pointLight);

    this.updateChargePositions();

    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.createFieldLines();
    this.createFieldArrows();
  }

  updateChargePositions() {
    // Remove existing charges
    this.charges.forEach(charge => this.scene.remove(charge));
    this.charges = [];

    const distance = parseFloat(this.settings.distance) / 2;
    this.createCharge(parseFloat(this.settings.charge1Value), new THREE.Vector3(-distance, 0, 0));
    this.createCharge(parseFloat(this.settings.charge2Value), new THREE.Vector3(distance, 0, 0));
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

  addMeasurementPoint() {
    if (this.measurementPoint) {
      this.scene.remove(this.measurementPoint);
    }

    const x = parseFloat(this.settings.measureX);
    const y = parseFloat(this.settings.measureY);
    const z = parseFloat(this.settings.measureZ);
    const position = new THREE.Vector3(x, y, z);

    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    this.measurementPoint = new THREE.Mesh(geometry, material);
    this.measurementPoint.position.copy(position);
    this.scene.add(this.measurementPoint);

    const field = this.calculateField(position);
    this.settings.fieldMagnitude = field.length().toExponential(2) + " N/C";
    
    const controller = this.gui.controllers.find(c => c.property === 'fieldMagnitude');
    if (controller) controller.updateDisplay();
  }

  calculateField(point) {
    let field = new THREE.Vector3(0, 0, 0);
    const k = 8.99e9; // Coulomb's constant
    
    this.charges.forEach(charge => {
      const r = new THREE.Vector3().subVectors(point, charge.position);
      const rSquared = r.lengthSq();
      if (rSquared > 0.01) {
        field.add(r.normalize().multiplyScalar(k * charge.userData.value / rSquared));
      }
    });
    return field;
  }

  createFieldArrows() {
    this.fieldArrows.forEach(arrow => this.scene.remove(arrow));
    this.fieldArrows = [];

    if (!this.settings.showFieldArrows) return;

    const spacing = 1;
    const range = 4;
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
    arrowHelper.userData.originalDirection = direction.clone().normalize();
    arrowHelper.userData.position = origin.clone();
    arrowHelper.userData.rotationDirection = this.calculateRotationDirection(origin);
    this.fieldArrows.push(arrowHelper);
    this.scene.add(arrowHelper);
  }

  calculateRotationDirection(point) {
    let netEffect = 0;
    this.charges.forEach(charge => {
      const distance = point.distanceTo(charge.position);
      netEffect += charge.userData.value / (distance * distance);
    });
    return Math.sign(netEffect);
  }

  createFieldLines() {
    this.fieldLines.forEach(line => this.scene.remove(line));
    this.fieldLines = [];

    if (!this.settings.showFieldLines) return;

    this.charges.forEach(charge => {
      const numLines = 16;
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

  calculateElectricPotential() {
    const k = 8.99e9; // Coulomb's constant
    const distance = parseFloat(this.settings.distance);
    const q1 = parseFloat(this.settings.charge1Value);
    const q2 = parseFloat(this.settings.charge2Value);
    const potential = k * (q1 + q2) / distance;
    this.settings.electricPotential = potential.toExponential(2) + " V";
    
    const controller = this.gui.controllers.find(c => c.property === 'electricPotential');
    if (controller) controller.updateDisplay();
  }

  setupGUI() {
    this.gui = new dat.GUI();
    
    this.gui.add(this.settings, 'showFieldLines').onChange(() => this.createFieldLines());
    this.gui.add(this.settings, 'showFieldArrows').onChange(() => this.createFieldArrows());
    
    this.gui.add(this.settings, 'charge1Value').name('Charge 1 (C)').onChange(value => {
      this.charges[0].userData.value = parseFloat(value);
      this.createFieldLines();
      this.createFieldArrows();
      this.calculateElectricPotential();
    });
    
    this.gui.add(this.settings, 'charge2Value').name('Charge 2 (C)').onChange(value => {
      this.charges[1].userData.value = parseFloat(value);
      this.createFieldLines();
      this.createFieldArrows();
      this.calculateElectricPotential();
    });

    this.gui.add(this.settings, 'distance').name('Distance (m)').onChange(value => {
      this.updateChargePositions();
      this.createFieldLines();
      this.createFieldArrows();
      this.calculateElectricPotential();
    });

    this.gui.add(this.settings, 'electricPotential').name('Electric Potential').listen();

    const measureFolder = this.gui.addFolder('Measurement Point');
    measureFolder.add(this.settings, 'measureX').name('X Position');
    measureFolder.add(this.settings, 'measureY').name('Y Position');
    measureFolder.add(this.settings, 'measureZ').name('Z Position');
    measureFolder.add(this.settings, 'addMeasurePoint').name('Add/Update Point');
    measureFolder.add(this.settings, 'fieldMagnitude').name('Field Magnitude').listen();
    measureFolder.open();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    const time = this.clock.getElapsedTime();
    const rotationSpeed = 0.2;
    
    this.fieldArrows.forEach(arrow => {
      if (arrow.userData.originalDirection && arrow.userData.rotationDirection !== undefined) {
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationAxis(
          arrow.userData.originalDirection,
          time * rotationSpeed * arrow.userData.rotationDirection
        );
        
        const direction = arrow.userData.originalDirection.clone();
        direction.applyMatrix4(rotationMatrix);
        arrow.setDirection(direction);
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new ElectricFieldSimulation();
  
}
