import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';

class ElectricFieldSimulation {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.charges = [];
    this.fieldLines = [];
    this.fieldArrows = [];
    this.settings = {
      showFieldLines: true,
      showEquipotentials: false,
      charge1Value: "1",
      charge2Value: "-1",
      distance: "2",
      electricPotential: "0"
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

    const distance = parseFloat(this.settings.distance) / 2;
    this.createCharge(parseFloat(this.settings.charge1Value), new THREE.Vector3(-distance, 0, 0));
    this.createCharge(parseFloat(this.settings.charge2Value), new THREE.Vector3(distance, 0, 0));

    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.calculateElectricPotential();
    this.createFieldArrows();
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

  createFieldArrows() {
    // Remove existing arrows
    this.fieldArrows.forEach(arrow => this.scene.remove(arrow));
    this.fieldArrows = [];

    // Create grid of arrows
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
        field.add(r.normalize().multiplyScalar(charge.userData.value / rSquared));
      }
    });
    return field;
  }

  calculateElectricPotential() {
    const k = 8.99e9;
    const q1 = parseFloat(this.settings.charge1Value);
    const q2 = parseFloat(this.settings.charge2Value);
    const distance = parseFloat(this.settings.distance);
    
    //Err
    const potential = k * (q1 / (distance/2) + q2 / (distance/2));
    // Format to scientific notation with 2 decimal places
    this.settings.electricPotential = potential.toExponential(2) + " V";
    
    if (this.gui) {
      const controller = this.gui.controllers.find(c => c.property === 'electricPotential');
      if (controller) controller.updateDisplay();
    }
  }

  updateChargePositions() {
    const distance = parseFloat(this.settings.distance) / 2;
    this.charges[0].position.x = -distance;
    this.charges[1].position.x = distance;
    this.createFieldLines();
    this.calculateElectricPotential();
    this.createFieldArrows();
  }

  createFieldLines() {
    this.fieldLines.forEach(line => this.scene.remove(line));
    this.fieldLines = [];

    if (!this.settings.showFieldLines) return;

    this.charges.forEach((charge, index) => {
      if (charge.userData.value > 0) {
        const numLines = 16;
        const lineColor = index === 0 ? 0xff6b6b : 0x4dabf7; // Red lines for first charge, blue for second
        for (let i = 0; i < numLines; i++) {
          for (let j = 0; j < numLines; j++) {
            const phi = (2 * Math.PI * i) / numLines;
            const theta = (Math.PI * j) / numLines;
            const startPoint = new THREE.Vector3(
              charge.position.x + 0.3 * Math.sin(theta) * Math.cos(phi),
              charge.position.y + 0.3 * Math.sin(theta) * Math.sin(phi),
              charge.position.z + 0.3 * Math.cos(theta)
            );
            this.traceFieldLine(startPoint, lineColor);
          }
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

      field.normalize().multiplyScalar(stepSize);
      currentPoint.add(field);
      points.push(currentPoint.clone());

      if (this.charges.some(charge => 
        charge.userData.value < 0 && 
        currentPoint.distanceTo(charge.position) < 0.3
      )) break;
    }

    if (points.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: color });
      const line = new THREE.Line(geometry, material);
      this.fieldLines.push(line);
      this.scene.add(line);
    }
  }

  updateCharge(index, value) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      this.charges[index].userData.value = numValue;
      this.charges[index].material.color.setHex(numValue > 0 ? 0xff0000 : 0x0000ff);
      this.createFieldLines();
      this.calculateElectricPotential();
      this.createFieldArrows();
    }
  }

  setupGUI() {
    this.gui = new dat.GUI({ autoPlace: true });
    this.gui.domElement.id = 'gui';

    this.gui.add(this.settings, 'showFieldLines').onChange(() => this.createFieldLines());
    this.gui.add(this.settings, 'showEquipotentials');
    
    const charge1Controller = this.gui.add(this.settings, 'charge1Value').name('Charge 1 (C)');
    charge1Controller.onChange((value) => this.updateCharge(0, value));
    
    const charge2Controller = this.gui.add(this.settings, 'charge2Value').name('Charge 2 (C)');
    charge2Controller.onChange((value) => this.updateCharge(1, value));

    const distanceController = this.gui.add(this.settings, 'distance').name('Distance (m)');
    distanceController.onChange(() => this.updateChargePositions());

    const potentialController = this.gui.add(this.settings, 'electricPotential')
      .name('Electric Potential')
      .listen();
    potentialController.domElement.style.pointerEvents = 'none';
    potentialController.domElement.querySelector('input').readOnly = true;

    const inputs = document.querySelectorAll('.dg .c input[type="text"]');
    inputs.forEach(input => {
      if (!input.readOnly) {
        input.setAttribute('type', 'number');
        input.setAttribute('step', 'any');
      }
      input.style.width = '100%';
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new ElectricFieldSimulation();