import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import { gsap } from 'gsap';
import './style.css';

class SimulacionCampoElectrico {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.charges = [];
    this.fieldLines = [];
    this.fieldArrows = [];
    this.equipotentialSurfaces = []; // Inicialización
    this.measurementPoint = null;
    this.k = 8.99e9;
    
    this.settings = {
      mostrarLineasCampo: true,
      mostrarFlechasCampo: true,
      mostrarSuperficiesEquipotenciales: false,
      valorCarga1: "1",
      valorCarga2: "-1",
      distancia: "2",
      potencialElectrico: "0",
      medirX: "0",
      medirY: "0",
      medirZ: "0",
      magnitudCampo: "0",
      agregarPuntoMedicion: () => this.addMeasurementPoint(),
      calidad: "alta"
    };
  
    this.init();
    this.setupGUI();
    this.animate();
    this.setupLoadingScreen();
  }

  setupLoadingScreen() {
    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'loading-screen';
    loadingScreen.innerHTML = `
      <div class="loader"></div>
      <div class="loading-text">Inicializando simulación</div>
    `;
    document.body.appendChild(loadingScreen);

    setTimeout(() => {
      gsap.to(loadingScreen, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => loadingScreen.remove()
      });
    }, 1500);
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(this.renderer.domElement);

    this.camera.position.set(4, 3, 5);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 20;
    this.controls.minDistance = 2;

    this.setupLights();
    this.setupScene();
    this.setupEventListeners();
    this.setupPostProcessing();
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x0a0b2e, 0x000000, 0.3);
    this.scene.add(hemisphereLight);

    // Luces puntuales para efectos dramáticos
    const pointLight1 = new THREE.PointLight(0x4169e1, 1, 10);
    pointLight1.position.set(-2, 2, 2);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff3333, 1, 10);
    pointLight2.position.set(2, -2, -2);
    this.scene.add(pointLight2);
  }

  setupScene() {
    // Grid mejorado
    const grid = new THREE.GridHelper(20, 20, 0x0a0b2e, 0x0a0b2e);
    grid.material.opacity = 0.1;
    grid.material.transparent = true;
    this.scene.add(grid);

    // Fondo estrellado
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.8
    });

    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 100;
      const y = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);

    this.updateChargePositions();
  }

  setupPostProcessing() {
    // Aquí se pueden agregar efectos de post-procesamiento si se desea
  }

  updateChargePositions() {
    this.charges.forEach(charge => this.scene.remove(charge));
    this.charges = [];

    const distance = parseFloat(this.settings.distancia) / 2;
    this.createCharge(parseFloat(this.settings.valorCarga1), new THREE.Vector3(-distance, 0, 0));
    this.createCharge(parseFloat(this.settings.valorCarga2), new THREE.Vector3(distance, 0, 0));

    this.updateVisualization();
  }

  createCharge(value, position) {
    const chargeGroup = new THREE.Group();

    // Esfera principal
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshPhysicalMaterial({
      color: value > 0 ? 0xff3333 : 0x4169e1,
      emissive: value > 0 ? 0xff0000 : 0x0000ff,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    const charge = new THREE.Mesh(geometry, material);
    charge.castShadow = true;
    charge.receiveShadow = true;
    chargeGroup.add(charge);

    // Efecto de brillo
    const glowGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: value > 0 ? 0xff3333 : 0x4169e1,
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    chargeGroup.add(glow);

    // Anillos de energía
    const ringGeometry = new THREE.TorusGeometry(0.4, 0.02, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: value > 0 ? 0xff3333 : 0x4169e1,
      transparent: true,
      opacity: 0.3
    });

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      chargeGroup.add(ring);
      
      // Animación de los anillos
      gsap.to(ring.rotation, {
        x: ring.rotation.x + Math.PI * 2,
        y: ring.rotation.y + Math.PI * 2,
        duration: 3 + i,
        ease: "none",
        repeat: -1
      });
    }

    chargeGroup.position.copy(position);
    chargeGroup.userData.value = value;

    // Animación de aparición
    chargeGroup.scale.set(0, 0, 0);
    gsap.to(chargeGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.5,
      ease: "back.out(1.7)"
    });

    this.charges.push(chargeGroup);
    this.scene.add(chargeGroup);
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

  updateVisualization() {
    this.clearFieldVisualizations();
    
    if (this.settings.mostrarLineasCampo) {
      this.createFieldLines();
    }
    
    if (this.settings.mostrarFlechasCampo) {
      this.createFieldArrows();
    }
    
    if (this.settings.mostrarSuperficiesEquipotenciales) {
      this.createEquipotentialSurfaces();
    }
  }
  

  clearFieldVisualizations() {
    [...this.fieldLines, ...this.fieldArrows, ...this.equipotentialSurfaces].forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.fieldLines = [];
    this.fieldArrows = [];
    this.equipotentialSurfaces = []; // Limpiar la lista
  }
  
  

  createFieldLines() {
    const numLines = this.settings.calidad === "alta" ? 10 : 10;
    const radiusStart = 0.25;

    this.charges.forEach(charge => {
        for (let i = 0; i < numLines; i++) {
            for (let j = 0; j < numLines; j++) {
                const phi = (2 * Math.PI * i) / numLines;
                const theta = (Math.PI * j) / numLines;
                
                const startPoint = new THREE.Vector3(
                    charge.position.x + radiusStart * Math.sin(theta) * Math.cos(phi),
                    charge.position.y + radiusStart * Math.sin(theta) * Math.sin(phi),
                    charge.position.z + radiusStart * Math.cos(theta)
                );
                
                this.traceFieldLine(startPoint, charge.userData.value > 0);
            }
        }
    });
}

traceFieldLine(startPoint, isPositive) {
    const points = [startPoint.clone()];
    let currentPoint = startPoint.clone();
    const maxSteps = 400;
    const stepSize = 0.025;

    for (let i = 0; i < maxSteps; i++) {
        const field = this.calculateField(currentPoint);
        if (field.length() < 0.005) break;

        field.normalize();
        if (!isPositive) field.negate();
        
        currentPoint.add(field.multiplyScalar(stepSize));
        points.push(currentPoint.clone());

        if (currentPoint.length() > 25) break;
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, points.length * 2, 0.015, 12, false);

    const material = new THREE.MeshStandardMaterial({
        color: isPositive ? 0xff0000 : 0x0000ff,
        transparent: true,
        opacity: 0.8,
        emissive: isPositive ? 0xff0000 : 0x0000ff,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.7
    });

    const tube = new THREE.Mesh(geometry, material);
    
    // Capa de brillo constante
    const glowGeometry = new THREE.TubeGeometry(curve, points.length * 2, 0.02, 12, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: isPositive ? 0xff0000 : 0x0000ff,
        transparent: true,
        opacity: 0.2,
        side: THREE.FrontSide
    });
    
    const glowTube = new THREE.Mesh(glowGeometry, glowMaterial);
    tube.add(glowTube);

    this.fieldLines.push(tube);
    this.scene.add(tube);

    // Animación de aparición suave
    tube.material.opacity = 0;
    gsap.to(tube.material, {
        opacity: 0.8,
        duration: 1.5,
        ease: "power2.out"
    });
}



  createFieldArrows() {
    const spacing = this.settings.calidad === "alta" ? 1 : 1.5;
    const range = 4;
    
    for (let x = -range; x <= range; x += spacing) {
      for (let y = -range; y <= range; y += spacing) {
        for (let z = -range; z <= range; z += spacing) {
          const point = new THREE.Vector3(x, y, z);
          const field = this.calculateField(point);
          
          if (field.length() > 0.01) {
            const arrow = new THREE.ArrowHelper(
              field.normalize(),
              point,
              0.5,
              0xff6b6b,
              0.2,
              0.1
            );
            
            // Animación de aparición
            arrow.scale.set(0, 0, 0);
            gsap.to(arrow.scale, {
              x: 1,
              y: 1,
              z: 1,
              duration: 0.5,
              ease: "back.out(1.7)",
              delay: Math.random() * 0.5
            });
            
            this.fieldArrows.push(arrow);
            this.scene.add(arrow);
          }
        }
      }
    }
  }

  createEquipotentialSurfaces() {
    // Niveles de potencial en los que queremos crear superficies equipotenciales
    const potentialLevels = [-50, -20, -10, -5, 5, 10, 20, 50]; // Niveles de potencial más grandes
    const scaleFactor = 0.01; 

    // Cambiar el fondo a negro para mejor contraste
    this.scene.background = new THREE.Color(0x000000); // Fondo negro

    this.charges.forEach(charge => {
        const chargeValue = charge.userData.value;

        // Calcular el potencial total en varios puntos alrededor de la carga
        potentialLevels.forEach(level => {
            if (level === 0) return; // Evitar división por cero

            // Calcular el radio de la esfera para la superficie equipotencial
            const radius = Math.sqrt(Math.abs(this.k * chargeValue / level)) * scaleFactor;

            // Validar que el radio esté dentro de un rango razonable
            if (radius > 0.1 && radius < 500) {
                console.log(`Creando superficie equipotencial con radio: ${radius}`); // Depuración

                const geometry = new THREE.SphereGeometry(radius, 64, 64); // Aumentar segmentos para mayor detalle
                const material = new THREE.MeshPhongMaterial({
                    color: level > 0 ? 0xffff00 : 0x00ff00, // Amarillo y verde para mejor contraste
                    transparent: true,
                    opacity: 0.8, // Aumentar opacidad para mayor visibilidad
                    side: THREE.DoubleSide,
                    shininess: 100, // Aumentar brillo para destacar
                    emissive: level > 0 ? 0xffff00 : 0x00ff00,
                    emissiveIntensity: 0.3, // Ajustar intensidad emisiva
                });

                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.copy(charge.position); // Centrar en la posición de la carga

                // Animación de aparición
                sphere.scale.set(0, 0, 0);
                gsap.to(sphere.scale, {
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 1,
                    ease: "power2.out"
                });

                // Añadir a la escena
                this.scene.add(sphere); // Agregar esfera a la escena
                this.equipotentialSurfaces.push(sphere); // Guarda en el arreglo de superficies
            } else {
                console.log(`Radio fuera de rango: ${radius}`); // Depuración
            }
        });
    });
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

    const measurementGroup = new THREE.Group();

    // Esfera de medición
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.5,
      metalness: 0.5,
      roughness: 0.2,
      clearcoat: 1.0
    });
    
    const sphere = new THREE.Mesh(geometry, material);
    measurementGroup.add(sphere);

    // Anillos de medición
    const ringGeometry = new THREE.RingGeometry(0.15, 0.16, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });

    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring2.rotation.x = Math.PI / 2;
    const ring3 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring3.rotation.y = Math.PI / 2;

    measurementGroup.add(ring1, ring2, ring3);

    // Animaciones de los anillos
    [ring1, ring2, ring3].forEach((ring, i) => {
      gsap.to(ring.rotation, {
        x: ring.rotation.x + Math.PI * 2,
        y: ring.rotation.y + Math.PI * 2,
        duration: 2 + i,
        ease: "none",
        repeat: -1
      });
    });

    measurementGroup.position.copy(position);
    this.measurementPoint = measurementGroup;

    // Animación de aparición
    measurementGroup.scale.set(0, 0, 0);
    gsap.to(measurementGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.5,
      ease: "elastic.out(1, 0.5)"
    });

    this.scene.add(measurementGroup);

    // Calcular y actualizar valores
    const field = this.calculateField(position);
    this.settings.magnitudCampo = field.length().toExponential(2) + " N/C";
    this.settings.potencialElectrico = this.calculatePotential().toExponential(2) + " V";

    // Actualizar GUI
    this.updateGUIDisplays();
  }

  calculatePotential() {
    if (!this.measurementPoint) return 0;
    
    let potential = 0;
    this.charges.forEach(charge => {
      const r = this.measurementPoint.position.distanceTo(charge.position);
      potential += this.k * charge.userData.value / r;
    });
    
    return potential;
  }

  updateGUIDisplays() {
    const magnitudController = this.gui.controllers.find(c => c.property === 'magnitudCampo');
    const potencialController = this.gui.controllers.find(c => c.property === 'potencialElectrico');
    if (magnitudController) magnitudController.updateDisplay();
    if (potencialController) potencialController.updateDisplay();
  }

  setupGUI() {
    this.gui = new dat.GUI({ autoPlace: false });
    
    const container = document.createElement('div');
    container.className = 'gui-container';
    container.appendChild(this.gui.domElement);
    document.body.appendChild(container);
    
    const visualizacionFolder = this.gui.addFolder('Visualización');
    visualizacionFolder.add(this.settings, 'calidad', ['alta', 'media'])
      .name('Calidad Visual')
      .onChange(() => this.updateVisualization());
    
    visualizacionFolder.add(this.settings, 'mostrarLineasCampo')
      .name('Líneas de Campo')
      .onChange(() => this.updateVisualization());
    
    visualizacionFolder.add(this.settings, 'mostrarFlechasCampo')
      .name('Vectores de Campo')
      .onChange(() => this.updateVisualization());

      visualizacionFolder.add(this.settings, 'mostrarSuperficiesEquipotenciales')
  .name('Superficies Equipotenciales')
  .onChange(() => this.updateVisualization());
    
    const cargasFolder = this.gui.addFolder('Configuración de Cargas');
    cargasFolder.add(this.settings, 'valorCarga1')
      .name('Carga 1 (C)')
      .onChange(() => {
        this.updateChargePositions();
        if (this.measurementPoint) this.addMeasurementPoint();
      });
    
    cargasFolder.add(this.settings, 'valorCarga2')
      .name('Carga 2 (C)')
      .onChange(() => {
        this.updateChargePositions();
        if (this.measurementPoint) this.addMeasurementPoint();
      });

    cargasFolder.add(this.settings, 'distancia')
      .name('Distancia (m)')
      .onChange(() => {
        this.updateChargePositions();
        if (this.measurementPoint) this.addMeasurementPoint();
      });

    const medicionFolder = this.gui.addFolder('Punto de Medición');
    medicionFolder.add(this.settings, 'medirX').name('Posición X');
    medicionFolder.add(this.settings, 'medirY').name('Posición Y');
    medicionFolder.add(this.settings, 'medirZ').name('Posición Z');
    medicionFolder.add(this.settings, 'agregarPuntoMedicion').name('Medir en Punto');
    
    const resultadosFolder = this.gui.addFolder('Resultados de Medición');
    resultadosFolder.add(this.settings, 'magnitudCampo')
      .name('Campo Eléctrico')
      .listen();
    resultadosFolder.add(this.settings, 'potencialElectrico')
      .name('Potencial')
      .listen();

    visualizacionFolder.open();
    cargasFolder.open();
    medicionFolder.open();
    resultadosFolder.open();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Animación de las cargas
    this.charges.forEach(charge => {
      charge.rotation.y += 0.01;
    });

    // Actualizar controles
    this.controls.update();
    
    this.renderer.render(this.scene, this.camera);
  }
}

// Iniciar la simulación
new SimulacionCampoElectrico();







// import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import * as dat from 'dat.gui';
// import { gsap } from 'gsap';
// import './style.css';

// class SimulacionCampoElectrico {
//   constructor() {
//     // Configuración inicial
//     this.scene = new THREE.Scene();
//     this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
//     this.renderer = new THREE.WebGLRenderer({ antialias: true });
//     this.charges = [];
//     this.fieldLines = [];
//     this.fieldArrows = [];
//     this.measurementPoint = null;
    
//     // Constantes físicas
//     this.k = 8.99e9; // Constante de Coulomb
    
//     // Configuración de la interfaz
//     this.settings = {
//       mostrarLineasCampo: true,
//       mostrarFlechasCampo: true,
//       valorCarga1: "1",
//       valorCarga2: "-1",
//       distancia: "2",
//       potencialElectrico: "0",
//       medirX: "0",
//       medirY: "0",
//       medirZ: "0",
//       magnitudCampo: "0",
//       agregarPuntoMedicion: () => this.addMeasurementPoint()
//     };

//     this.init();
//     this.setupGUI();
//     this.animate();
//     this.setupLoadingScreen();
//   }

//   setupLoadingScreen() {
//     const loadingScreen = document.createElement('div');
//     loadingScreen.className = 'loading-screen';
//     loadingScreen.innerHTML = '<div class="loader"></div>';
//     document.body.appendChild(loadingScreen);

//     // Ocultar pantalla de carga después de 1 segundo
//     setTimeout(() => {
//       gsap.to(loadingScreen, {
//         opacity: 0,
//         duration: 0.5,
//         onComplete: () => loadingScreen.remove()
//       });
//     }, 1000);
//   }

//   init() {
//     // Configuración del renderer
//     this.renderer.setSize(window.innerWidth, window.innerHeight);
//     this.renderer.setPixelRatio(window.devicePixelRatio);
//     this.renderer.shadowMap.enabled = true;
//     document.body.appendChild(this.renderer.domElement);

//     // Configuración de la cámara
//     this.camera.position.set(0, 2, 5);
//     this.controls = new OrbitControls(this.camera, this.renderer.domElement);
//     this.controls.enableDamping = true;
//     this.controls.dampingFactor = 0.05;

//     // Iluminación
//     this.setupLights();
    
//     // Escena inicial
//     this.setupScene();
    
//     // Event listeners
//     window.addEventListener('resize', () => this.onWindowResize());
//   }

//   setupLights() {
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
//     this.scene.add(ambientLight);

//     const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
//     directionalLight.position.set(5, 5, 5);
//     directionalLight.castShadow = true;
//     this.scene.add(directionalLight);

//     const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
//     this.scene.add(hemisphereLight);
//   }

//   setupScene() {
//     // Grid helper con animación
//     const grid = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
//     this.scene.add(grid);

//     // Fondo gradiente
//     const bgGeometry = new THREE.SphereGeometry(50, 32, 32);
//     const bgMaterial = new THREE.ShaderMaterial({
//       uniforms: {
//         color1: { value: new THREE.Color(0x1a1a1a) },
//         color2: { value: new THREE.Color(0x000000) }
//       },
//       vertexShader: `
//         varying vec2 vUv;
//         void main() {
//           vUv = uv;
//           gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//         }
//       `,
//       fragmentShader: `
//         uniform vec3 color1;
//         uniform vec3 color2;
//         varying vec2 vUv;
//         void main() {
//           gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
//         }
//       `,
//       side: THREE.BackSide
//     });
//     const background = new THREE.Mesh(bgGeometry, bgMaterial);
//     this.scene.add(background);

//     this.updateChargePositions();
//   }

//   updateChargePositions() {
//     // Limpiar cargas existentes
//     this.charges.forEach(charge => this.scene.remove(charge));
//     this.charges = [];

//     const distance = parseFloat(this.settings.distancia) / 2;
    
//     // Crear cargas con efectos visuales mejorados
//     this.createCharge(parseFloat(this.settings.valorCarga1), new THREE.Vector3(-distance, 0, 0));
//     this.createCharge(parseFloat(this.settings.valorCarga2), new THREE.Vector3(distance, 0, 0));

//     this.updateVisualization();
//   }

//   createCharge(value, position) {
//     const geometry = new THREE.SphereGeometry(0.2, 32, 32);
//     const material = new THREE.MeshPhongMaterial({
//       color: value > 0 ? 0xff4444 : 0x4444ff,
//       emissive: value > 0 ? 0xff0000 : 0x0000ff,
//       emissiveIntensity: 0.5,
//       shininess: 100
//     });

//     const charge = new THREE.Mesh(geometry, material);
//     charge.position.copy(position);
//     charge.userData.value = value;
//     charge.castShadow = true;
//     charge.receiveShadow = true;

//     // Añadir efecto de brillo
//     const glowGeometry = new THREE.SphereGeometry(0.3, 32, 32);
//     const glowMaterial = new THREE.MeshBasicMaterial({
//       color: value > 0 ? 0xff0000 : 0x0000ff,
//       transparent: true,
//       opacity: 0.15
//     });
//     const glow = new THREE.Mesh(glowGeometry, glowMaterial);
//     charge.add(glow);

//     // Animación de aparición
//     charge.scale.set(0, 0, 0);
//     gsap.to(charge.scale, {
//       x: 1,
//       y: 1,
//       z: 1,
//       duration: 0.5,
//       ease: "back.out"
//     });

//     this.charges.push(charge);
//     this.scene.add(charge);
//   }

//   calculateField(point) {
//     let field = new THREE.Vector3(0, 0, 0);
    
//     this.charges.forEach(charge => {
//       const r = new THREE.Vector3().subVectors(point, charge.position);
//       const rSquared = r.lengthSq();
//       if (rSquared > 0.01) {
//         const magnitude = this.k * Math.abs(charge.userData.value) / rSquared;
//         const direction = r.normalize();
//         if (charge.userData.value < 0) direction.negate();
//         field.add(direction.multiplyScalar(magnitude));
//       }
//     });
    
//     return field;
//   }

//   updateVisualization() {
//     // Limpiar visualizaciones anteriores
//     this.clearFieldVisualizations();

//     if (this.settings.mostrarLineasCampo) {
//       this.createFieldLines();
//     }

//     if (this.settings.mostrarFlechasCampo) {
//       this.createFieldArrows();
//     }
//   }

//   clearFieldVisualizations() {
//     [...this.fieldLines, ...this.fieldArrows].forEach(obj => {
//       this.scene.remove(obj);
//       if (obj.geometry) obj.geometry.dispose();
//       if (obj.material) obj.material.dispose();
//     });
//     this.fieldLines = [];
//     this.fieldArrows = [];
//   }

//   createFieldLines() {
//     this.charges.forEach(charge => {
//       const numLines = 16;
//       const radius = 0.3;
      
//       for (let i = 0; i < numLines; i++) {
//         for (let j = 0; j < numLines; j++) {
//           const phi = (2 * Math.PI * i) / numLines;
//           const theta = (Math.PI * j) / numLines;
          
//           const startPoint = new THREE.Vector3(
//             charge.position.x + radius * Math.sin(theta) * Math.cos(phi),
//             charge.position.y + radius * Math.sin(theta) * Math.sin(phi),
//             charge.position.z + radius * Math.cos(theta)
//           );
          
//           this.traceFieldLine(startPoint, charge.userData.value > 0);
//         }
//       }
//     });
//   }

//   traceFieldLine(startPoint, isPositive) {
//     const points = [startPoint.clone()];
//     let currentPoint = startPoint.clone();
//     const maxSteps = 100;
//     const stepSize = 0.1;

//     for (let i = 0; i < maxSteps; i++) {
//       const field = this.calculateField(currentPoint);
//       if (field.length() < 0.01) break;

//       field.normalize();
//       if (!isPositive) field.negate();
      
//       currentPoint.add(field.multiplyScalar(stepSize));
//       points.push(currentPoint.clone());

//       if (currentPoint.length() > 10) break;
//     }

//     const geometry = new THREE.BufferGeometry().setFromPoints(points);
//     const material = new THREE.LineBasicMaterial({
//       color: isPositive ? 0xff4444 : 0x4444ff,
//       transparent: true,
//       opacity: 0.6
//     });
//     const line = new THREE.Line(geometry, material);
    
//     this.fieldLines.push(line);
//     this.scene.add(line);
//   }

//   createFieldArrows() {
//     const spacing = 1;
//     const range = 3;
    
//     for (let x = -range; x <= range; x += spacing) {
//       for (let y = -range; y <= range; y += spacing) {
//         for (let z = -range; z <= range; z += spacing) {
//           const point = new THREE.Vector3(x, y, z);
//           const field = this.calculateField(point);
          
//           if (field.length() > 0.01) {
//             const arrow = new THREE.ArrowHelper(
//               field.normalize(),
//               point,
//               0.5,
//               0x00ff00,
//               0.2,
//               0.1
//             );
//             this.fieldArrows.push(arrow);
//             this.scene.add(arrow);
//           }
//         }
//       }
//     }
//   }

//   addMeasurementPoint() {
//     if (this.measurementPoint) {
//       this.scene.remove(this.measurementPoint);
//     }

//     const position = new THREE.Vector3(
//       parseFloat(this.settings.medirX),
//       parseFloat(this.settings.medirY),
//       parseFloat(this.settings.medirZ)
//     );

//     // Crear punto de medición con efecto visual mejorado
//     const geometry = new THREE.SphereGeometry(0.1, 16, 16);
//     const material = new THREE.MeshPhongMaterial({
//       color: 0xffff00,
//       emissive: 0xffff00,
//       emissiveIntensity: 0.5
//     });
//     this.measurementPoint = new THREE.Mesh(geometry, material);
//     this.measurementPoint.position.copy(position);

//     // Añadir efecto de brillo
//     const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
//     const glowMaterial = new THREE.MeshBasicMaterial({
//       color: 0xffff00,
//       transparent: true,
//       opacity: 0.3
//     });
//     const glow = new THREE.Mesh(glowGeometry, glowMaterial);
//     this.measurementPoint.add(glow);

//     // Animación de aparición
//     this.measurementPoint.scale.set(0, 0, 0);
//     gsap.to(this.measurementPoint.scale, {
//       x: 1,
//       y: 1,
//       z: 1,
//       duration: 0.5,
//       ease: "elastic.out(1, 0.5)"
//     });

//     this.scene.add(this.measurementPoint);

//     // Calcular y actualizar valores
//     const field = this.calculateField(position);
//     this.settings.magnitudCampo = field.length().toExponential(2) + " N/C";
//     this.settings.potencialElectrico = this.calculatePotential().toExponential(2) + " V";

//     // Actualizar GUI
//     const magnitudController = this.gui.controllers.find(c => c.property === 'magnitudCampo');
//     const potencialController = this.gui.controllers.find(c => c.property === 'potencialElectrico');
//     if (magnitudController) magnitudController.updateDisplay();
//     if (potencialController) potencialController.updateDisplay();
//   }

//   calculatePotential() {
//     if (!this.measurementPoint) return 0;
    
//     let potential = 0;
//     this.charges.forEach(charge => {
//       const r = this.measurementPoint.position.distanceTo(charge.position);
//       potential += this.k * charge.userData.value / r;
//     });
    
//     return potential;
//   }

//   setupGUI() {
//     this.gui = new dat.GUI({ autoPlace: false });
//     this.gui.domElement.style.marginTop = '20px';
    
//     const container = document.createElement('div');
//     container.className = 'gui-container';
//     container.appendChild(this.gui.domElement);
//     document.body.appendChild(container);
    
//     const visualizacionFolder = this.gui.addFolder('Visualización');
//     visualizacionFolder.add(this.settings, 'mostrarLineasCampo')
//       .name('Líneas de Campo')
//       .onChange(() => this.updateVisualization());
    
//     visualizacionFolder.add(this.settings, 'mostrarFlechasCampo')
//       .name('Flechas de Campo')
//       .onChange(() => this.updateVisualization());
    
//     const cargasFolder = this.gui.addFolder('Configuración de Cargas');
//     cargasFolder.add(this.settings, 'valorCarga1')
//       .name('Carga 1 (C)')
//       .onChange(() => {
//         this.updateChargePositions();
//         if (this.measurementPoint) this.addMeasurementPoint();
//       });
    
//     cargasFolder.add(this.settings, 'valorCarga2')
//       .name('Carga 2 (C)')
//       .onChange(() => {
//         this.updateChargePositions();
//         if (this.measurementPoint) this.addMeasurementPoint();
//       });

//     cargasFolder.add(this.settings, 'distancia')
//       .name('Distancia (m)')
//       .onChange(() => {
//         this.updateChargePositions();
//         if (this.measurementPoint) this.addMeasurementPoint();
//       });

//     const medicionFolder = this.gui.addFolder('Punto de Medición');
//     medicionFolder.add(this.settings, 'medirX').name('Posición X');
//     medicionFolder.add(this.settings, 'medirY').name('Posición Y');
//     medicionFolder.add(this.settings, 'medirZ').name('Posición Z');
//     medicionFolder.add(this.settings, 'agregarPuntoMedicion').name('Medir en Punto');
    
//     const resultadosFolder = this.gui.addFolder('Resultados');
//     resultadosFolder.add(this.settings, 'magnitudCampo')
//       .name('Campo Eléctrico')
//       .listen();
//     resultadosFolder.add(this.settings, 'potencialElectrico')
//       .name('Potencial')
//       .listen();

//     visualizacionFolder.open();
//     cargasFolder.open();
//     medicionFolder.open();
//     resultadosFolder.open();
//   }

//   onWindowResize() {
//     this.camera.aspect = window.innerWidth / window.innerHeight;
//     this.camera.updateProjectionMatrix();
//     this.renderer.setSize(window.innerWidth, window.innerHeight);
//   }

//   animate() {
//     requestAnimationFrame(() => this.animate());
    
//     // Animación de las cargas
//     this.charges.forEach(charge => {
//       charge.rotation.y += 0.01;
//     });

//     // Actualizar controles
//     this.controls.update();
    
//     this.renderer.render(this.scene, this.camera);
//   }
// }

// // Iniciar la simulación
// new SimulacionCampoElectrico();