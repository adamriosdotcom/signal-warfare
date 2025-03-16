/**
 * SIGNAL WARFARE - Main Game Engine
 * 
 * This file implements the core game engine including:
 * - THREE.js initialization
 * - Game loop and timing
 * - Input handling
 * - Terrain generation
 * - Main initialization and setup
 */

class GameEngine {
  constructor() {
    // THREE.js objects
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;
    this.terrain = null;
    
    // Game loop
    this.lastTime = 0;
    this.isRunning = false;
    
    // Input state
    this.keys = {};
    this.mouse = {
      position: { x: 0, y: 0 },
      worldPosition: { x: 0, y: 0, z: 0 },
      isDown: false,
      button: -1
    };
    
    // Game state
    this.ecs = null;
    this.assetPlacementMode = null;
    this.selectedAssetType = null;
    this.placementData = null;
  }
  
  // Initialize the game engine
  initialize() {
    // Initialize THREE.js
    this.initializeTHREE();
    
    // Initialize ECS
    this.initializeECS();
    
    // Initialize game state
    gameState.initialize(this.ecs);
    
    // Initialize input handlers
    this.initializeInput();
    
    // Initialize UI elements
    this.initializeUI();
    
    // Create terrain
    this.createTerrain();
    
    // Start game loop
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
    
    console.log('ECHO ZERO initialized');
  }
  
  // Initialize THREE.js
  initializeTHREE() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1116);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 20000
    );
    // Position camera to view terrain from an angle (elevated position)
    this.camera.position.set(0, -2000, 1500);
    this.camera.lookAt(0, 0, 0);
    
    // Create renderer
    const container = document.getElementById('battlefield-view');
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: container,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Enable shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add enhanced lighting system for 3D terrain
    
    // Base ambient light for overall visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    this.scene.add(ambientLight);
    
    // Main directional light representing the sun
    const directionalLight = new THREE.DirectionalLight(0xfffaf0, 1.2); // Warm sunlight
    directionalLight.position.set(2000, 2000, 2000); // Position from NE
    directionalLight.castShadow = true;
    
    // Configure shadow properties for better quality with 3D terrain
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 5000;
    directionalLight.shadow.camera.left = -2500;
    directionalLight.shadow.camera.right = 2500;
    directionalLight.shadow.camera.top = 2500;
    directionalLight.shadow.camera.bottom = -2500;
    directionalLight.shadow.bias = -0.0005;
    
    this.scene.add(directionalLight);
    
    // Add hemisphere light for better terrain illumination
    // Blue-ish from sky, greenish from ground bouncing
    const hemisphereLight = new THREE.HemisphereLight(0x0c1841, 0x283848, 1.2);
    this.scene.add(hemisphereLight);
    
    // Add a secondary fill light from the opposite direction
    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.4); // Bluish fill light
    fillLight.position.set(-1500, -1500, 1000);
    this.scene.add(fillLight);
    
    // Add subtle bloom post-processing
    if (window.THREE && THREE.EffectComposer) {
      this.setupPostProcessing();
    }
    
    // Setup camera controls
    this.setupCameraControls();
    
    // Create clock for timing
    this.clock = new THREE.Clock();
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  // Setup post-processing effects - simplified for now
  setupPostProcessing() {
    // For now, we're disabling post-processing to ensure basic functionality works
    console.log('Post-processing disabled for compatibility');
    
    /*
    try {
      // Set up composer
      this.composer = new THREE.EffectComposer(this.renderer);
      
      // Add render pass
      const renderPass = new THREE.RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      
      // Add bloom pass for glow effects
      const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.3,    // strength
        0.4,    // radius
        0.9     // threshold
      );
      this.composer.addPass(bloomPass);
      
      // Final output pass
      const outputPass = new THREE.ShaderPass(THREE.GammaCorrectionShader);
      outputPass.renderToScreen = true;
      this.composer.addPass(outputPass);
      
      console.log('Post-processing initialized successfully');
    } catch (error) {
      console.warn('Post-processing initialization failed:', error);
      // Fall back to standard rendering
    }
    */
  }
  
  // Setup enhanced camera controls
  setupCameraControls() {
    // Camera state
    this.cameraState = {
      target: new THREE.Vector3(0, 0, 0),
      position: new THREE.Vector3(0, 0, 800),
      zoom: 1.0,
      minZoom: 0.5,
      maxZoom: 2.0,
      zoomSpeed: 0.1,
      moveSpeed: 10,
      rotateSpeed: 0.3,
      isRotating: false,
      isPanning: false,
      dragStartPosition: { x: 0, y: 0 },
      rotationAngle: 0
    };
    
    // Set initial camera position
    this.camera.position.copy(this.cameraState.position);
    this.camera.lookAt(this.cameraState.target);
    
    // Mouse wheel for zoom
    this.renderer.domElement.addEventListener('wheel', (event) => {
      event.preventDefault();
      
      // Adjust zoom level
      const zoomChange = Math.sign(event.deltaY) * this.cameraState.zoomSpeed;
      this.cameraState.zoom = Math.max(
        this.cameraState.minZoom,
        Math.min(this.cameraState.maxZoom, this.cameraState.zoom + zoomChange)
      );
      
      // Apply zoom to camera
      const direction = new THREE.Vector3().subVectors(
        this.camera.position,
        this.cameraState.target
      ).normalize();
      
      const distance = this.cameraState.target.distanceTo(this.camera.position);
      const newDistance = (800 / this.cameraState.zoom);
      
      this.camera.position.copy(this.cameraState.target).add(
        direction.multiplyScalar(newDistance)
      );
      
      // Update camera
      this.camera.updateProjectionMatrix();
    });
    
    // Middle mouse button for rotation
    this.renderer.domElement.addEventListener('mousedown', (event) => {
      if (event.button === 1) { // Middle mouse button
        event.preventDefault();
        this.cameraState.isRotating = true;
        this.cameraState.dragStartPosition.x = event.clientX;
        this.cameraState.dragStartPosition.y = event.clientY;
      } else if (event.button === 2) { // Right mouse button
        event.preventDefault();
        this.cameraState.isPanning = true;
        this.cameraState.dragStartPosition.x = event.clientX;
        this.cameraState.dragStartPosition.y = event.clientY;
      }
    });
    
    // Mouse move for rotation/panning
    this.renderer.domElement.addEventListener('mousemove', (event) => {
      if (this.cameraState.isRotating) {
        // Calculate rotation
        const deltaX = event.clientX - this.cameraState.dragStartPosition.x;
        const deltaY = event.clientY - this.cameraState.dragStartPosition.y;
        
        // Update rotation angles
        this.cameraState.rotationAngle -= deltaX * this.cameraState.rotateSpeed * 0.01;
        
        // Calculate new camera position
        const distance = this.cameraState.target.distanceTo(this.camera.position);
        const height = this.camera.position.y;
        
        this.camera.position.x = this.cameraState.target.x + distance * Math.sin(this.cameraState.rotationAngle);
        this.camera.position.z = this.cameraState.target.z + distance * Math.cos(this.cameraState.rotationAngle);
        
        // Look at target
        this.camera.lookAt(this.cameraState.target);
        
        // Update start position
        this.cameraState.dragStartPosition.x = event.clientX;
        this.cameraState.dragStartPosition.y = event.clientY;
      } else if (this.cameraState.isPanning) {
        // Calculate pan amount
        const deltaX = (event.clientX - this.cameraState.dragStartPosition.x) * 0.5;
        const deltaY = (event.clientY - this.cameraState.dragStartPosition.y) * 0.5;
        
        // Calculate camera right and up vectors
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);
        right.crossVectors(up, this.camera.getWorldDirection(new THREE.Vector3()));
        
        // Apply movement
        this.cameraState.target.add(right.multiplyScalar(-deltaX));
        this.cameraState.target.add(up.multiplyScalar(-deltaY));
        
        // Move camera
        this.camera.position.add(right.multiplyScalar(-deltaX));
        this.camera.position.add(up.multiplyScalar(-deltaY));
        
        // Update start position
        this.cameraState.dragStartPosition.x = event.clientX;
        this.cameraState.dragStartPosition.y = event.clientY;
      }
    });
    
    // Mouse up to stop rotation
    window.addEventListener('mouseup', (event) => {
      this.cameraState.isRotating = false;
      this.cameraState.isPanning = false;
    });
    
    // Prevent context menu on right-click
    this.renderer.domElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }
  
  // Initialize Entity-Component-System
  initializeECS() {
    // Create ECS
    this.ecs = new ECS();
    
    // Register systems
    this.ecs.registerSystem(RenderSystem, 'render');
    this.ecs.registerSystem(RFPropagationSystem, 'rfPropagation');
    this.ecs.registerSystem(JammerSystem, 'jammer');
    this.ecs.registerSystem(AISystem, 'ai');
    this.ecs.registerSystem(PhysicsSystem, 'physics');
    
    // Initialize systems
    const renderSystem = this.ecs.getSystem('render');
    renderSystem.initialize(this.scene, this.renderer, this.camera);
    
    const rfPropagationSystem = this.ecs.getSystem('rfPropagation');
    rfPropagationSystem.initialize(this.scene);
  }
  
  // Initialize input handlers
  initializeInput() {
    // Keyboard input
    window.addEventListener('keydown', (event) => {
      this.keys[event.key] = true;
      this.handleKeyPress(event.key);
    });
    
    window.addEventListener('keyup', (event) => {
      this.keys[event.key] = false;
    });
    
    // Mouse input
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', (event) => {
      this.mouse.isDown = true;
      this.mouse.button = event.button;
      this.handleMouseDown(event);
    });
    
    canvas.addEventListener('mouseup', (event) => {
      this.mouse.isDown = false;
      this.mouse.button = -1;
      this.handleMouseUp(event);
    });
    
    canvas.addEventListener('mousemove', (event) => {
      // Update mouse position
      const rect = canvas.getBoundingClientRect();
      this.mouse.position.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
      this.mouse.position.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
      
      // Update world position
      this.updateMouseWorldPosition();
      
      // Handle mouse move
      this.handleMouseMove(event);
    });
  }
  
  // Initialize UI elements
  initializeUI() {
    // Jammer buttons
    const jammerButtons = document.querySelectorAll('.jammer-button');
    jammerButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Map short button ID to full jammer type name
        const buttonId = button.id.split('-')[0].toUpperCase();
        const jammerTypeMap = {
          'STD': 'STANDARD',
          'DIR': 'PRECISION',
          'PLS': 'PULSE',
          'MOB': 'MOBILE'
        };
        const type = jammerTypeMap[buttonId] || buttonId;
        this.startJammerPlacement(type);
      });
    });
    
    // Cancel and clear buttons
    document.getElementById('cancel-placement').addEventListener('click', () => {
      this.cancelAssetPlacement();
    });
    
    document.getElementById('clear-jammers').addEventListener('click', () => {
      this.clearAllJammers();
    });
    
    // Layer toggle buttons
    const layerButtons = document.querySelectorAll('.map-toggle');
    layerButtons.forEach(button => {
      button.addEventListener('click', () => {
        const layer = button.dataset.layer;
        this.toggleMapLayer(layer, button);
      });
    });
    
    // Asset tabs
    const assetTabs = document.querySelectorAll('.asset-tab');
    assetTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchAssetTab(tab.dataset.tab);
      });
    });
    
    // RAVEN send button
    document.getElementById('raven-send')?.addEventListener('click', () => {
      const input = document.getElementById('raven-input');
      if (input && input.value.trim()) {
        this.processRavenCommand(input.value.trim());
        input.value = '';
      }
    });
    
    // RAVEN input enter key
    document.getElementById('raven-input')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const input = document.getElementById('raven-input');
        if (input.value.trim()) {
          this.processRavenCommand(input.value.trim());
          input.value = '';
        }
      }
    });
    
    // Initialize panel positions
    this.initializePanelPositions();
  }
  
  // Panel positions are now defined in CSS
  initializePanelPositions() {
    // Not needed anymore - we're using CSS to position panels
    console.log('Panel positions defined in CSS');
  }
  
  // Create terrain
  createTerrain() {
    // Create enhanced terrain with detail
    const geometry = new THREE.PlaneGeometry(
      CONFIG.terrain.width, 
      CONFIG.terrain.height, 
      256, 256 // More divisions for detailed terrain
    );
    
    // Generate terrain height map and texture data
    const terrainData = this.generateTerrainData(geometry);
    
    // Create terrain material with vertex colors for biome visualization
    const material = new THREE.MeshPhongMaterial({
      color: 0x1e293b,
      shininess: 0.1,
      flatShading: false, // Enable smooth shading
      wireframe: false,
      side: THREE.DoubleSide,
      vertexColors: true // Enable vertex colors for biome visualization
    });
    
    // Create terrain mesh
    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.rotation.x = Math.PI / 2;
    this.terrain.receiveShadow = true;
    
    // Store terrain data for later use (e.g. for height-based calculations)
    this.terrain.userData.heightData = terrainData.heightData;
    this.terrain.userData.biomeData = terrainData.biomeData;
    
    this.scene.add(this.terrain);
    
    // Add grid
    const gridSize = CONFIG.terrain.width;
    const gridDivisions = gridSize / 500; // Every 500 meters
    const gridHelper = new THREE.GridHelper(
      gridSize, gridDivisions, 0x405060, 0x283848
    );
    gridHelper.position.y = 1;
    gridHelper.rotation.x = Math.PI / 2;
    
    this.scene.add(gridHelper);
    
    // Add skybox
    this.createSkybox();
  }
  
  // Generate terrain data (height and biome information)
  generateTerrainData(geometry) {
    // 2D arrays to store height and biome data
    const gridSize = Math.sqrt(geometry.attributes.position.count);
    const heightData = new Array(gridSize).fill().map(() => new Array(gridSize).fill(0));
    const biomeData = new Array(gridSize).fill().map(() => new Array(gridSize).fill('OPEN'));
    
    // Scale factors for noise
    const mountainScale = 0.0005;
    const hillScale = 0.001;
    const detailScale = 0.01;
    
    // We'll use simple mathematical functions to simulate noise
    const vertices = geometry.attributes.position.array;
    const colors = new Float32Array(vertices.length);
    
    for (let i = 0, j = 0; i < vertices.length; i += 3, j += 3) {
      // Get x and z coordinates
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Index in the grid
      const ix = Math.floor((x / CONFIG.terrain.width + 0.5) * (gridSize - 1));
      const iz = Math.floor((z / CONFIG.terrain.height + 0.5) * (gridSize - 1));
      
      // Generate height with multiple noise layers
      // Base mountain range layer
      const mountainNoise = this.simpleNoise(x * mountainScale, z * mountainScale);
      
      // Hills layer
      const hillNoise = this.simpleNoise(x * hillScale, z * hillScale) * 0.3;
      
      // Small details layer
      const detailNoise = this.simpleNoise(x * detailScale, z * detailScale) * 0.05;
      
      // Valley in the middle - create a large depression
      const centerX = 0;
      const centerZ = 0;
      const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
      const valleyFactor = Math.max(0, 1 - Math.pow(distanceFromCenter / 2000, 2));
      const valleyDepression = valleyFactor * 50;
      
      // River system - create a meandering river
      const riverWidth = 100;
      const riverDepth = 30;
      const riverMeander = Math.sin(z * 0.001) * 500; // Meandering factor
      const distanceFromRiver = Math.abs(x - riverMeander);
      const riverFactor = Math.max(0, 1 - distanceFromRiver / riverWidth);
      const riverDepression = riverFactor * riverDepth;
      
      // Combine all height factors
      let height = mountainNoise * CONFIG.terrain.maxElevation * 0.8 + // Main mountains
                 hillNoise * CONFIG.terrain.maxElevation * 0.5 +    // Hills
                 detailNoise * CONFIG.terrain.maxElevation * 0.1 -  // Small details
                 valleyDepression -                                  // Valley
                 riverDepression;                                    // River
      
      // Ensure minimum height (for water bodies)
      height = Math.max(-20, height);
      
      // Store height data in bounds-checked manner
      if (ix >= 0 && ix < gridSize && iz >= 0 && iz < gridSize) {
        heightData[ix][iz] = height;
      }
      
      // Determine biome type based on height and position
      let biomeType = 'OPEN'; // Default
      let biomeColor = new THREE.Color(0.3, 0.5, 0.2); // Default green
      
      if (height < 0) {
        // Water
        biomeType = 'WATER';
        biomeColor = new THREE.Color(0.1, 0.2, 0.8);
      } else if (height < 20) {
        // Lowlands - mix of open areas and forest
        const forestNoise = this.simpleNoise(x * 0.002, z * 0.002);
        if (forestNoise > 0.2) {
          biomeType = 'FOREST';
          biomeColor = new THREE.Color(0.1, 0.4, 0.1);
        }
      } else if (height < 100) {
        // Hills - mostly forest
        biomeType = 'FOREST';
        biomeColor = new THREE.Color(0.1, 0.4, 0.1);
      } else if (height < 300) {
        // Mountains - rocky terrain
        biomeType = 'URBAN'; // Using urban for rocky areas
        biomeColor = new THREE.Color(0.5, 0.5, 0.5);
      } else {
        // High mountains - snow-capped
        biomeType = 'OPEN'; // Representing snow
        biomeColor = new THREE.Color(0.9, 0.9, 0.9);
      }
      
      // Store biome data in bounds-checked manner
      if (ix >= 0 && ix < gridSize && iz >= 0 && iz < gridSize) {
        biomeData[ix][iz] = biomeType;
      }
      
      // Set vertex color for biome visualization
      colors[j] = biomeColor.r;
      colors[j + 1] = biomeColor.g;
      colors[j + 2] = biomeColor.b;
      
      // Set y position to height
      vertices[i + 1] = height;
    }
    
    // Update geometry
    geometry.attributes.position.needsUpdate = true;
    
    // Add vertex colors
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Compute normals for proper lighting
    geometry.computeVertexNormals();
    
    return { heightData, biomeData };
  }
  
  // Simple noise function (approximation of Perlin/Simplex noise)
  simpleNoise(x, y) {
    // This is a very basic approximation using sine waves
    // In a production environment, you'd use a proper noise library
    return (Math.sin(x * 12.9898 + y * 78.233) * 0.5 + 0.5) * 
           (Math.cos(x * 43.332 + y * 12.79) * 0.5 + 0.5) * 
           (Math.sin(x * 23.434 + y * 26.547) * 0.5 + 0.5);
  }
  
  // Create skybox
  createSkybox() {
    // Create simple color gradient skybox
    const vertexShader = `
      varying vec3 vWorldPosition;
      
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      
      varying vec3 vWorldPosition;
      
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;
    
    const uniforms = {
      topColor: { value: new THREE.Color(0x0c1841) },     // Dark blue
      bottomColor: { value: new THREE.Color(0x102030) },  // Darker blue/black
      offset: { value: 400 },
      exponent: { value: 0.6 }
    };
    
    const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.BackSide
    });
    
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }
  
  // Update mouse world position based on current mouse screen position
  updateMouseWorldPosition() {
    // Create ray from mouse position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.mouse.position, this.camera);
    
    // Check intersection with terrain
    const intersects = raycaster.intersectObject(this.terrain);
    
    if (intersects.length > 0) {
      // Update world position
      this.mouse.worldPosition = intersects[0].point;
    }
  }
  
  // Handle window resize
  onWindowResize() {
    // Update camera
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    // Update renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // Start jammer placement mode
  startJammerPlacement(type) {
    // Cancel any existing placement
    this.cancelAssetPlacement();
    
    // Check if we have available jammers
    if (gameState.playerAssets.jammers.available[type] <= 0) {
      this.showAlert(`No ${type} jammers available`, 'warning');
      return;
    }
    
    // Enter jammer placement mode
    this.assetPlacementMode = 'JAMMER';
    this.selectedAssetType = type;
    
    // Highlight selected button
    document.querySelectorAll('.jammer-button').forEach(button => {
      button.classList.remove('selected');
    });
    
    // Map full jammer type back to button ID
    const reverseTypeMap = {
      'STANDARD': 'std',
      'PRECISION': 'dir',
      'PULSE': 'pls',
      'MOBILE': 'mob'
    };
    
    const buttonId = reverseTypeMap[type] || type.toLowerCase();
    const buttonElement = document.getElementById(`${buttonId}-jammer`);
    
    if (buttonElement) {
      buttonElement.classList.add('selected');
    } else {
      console.warn(`Button element not found for jammer type: ${type}`);
    }
    
    // Create jammer placement indicator
    this.createJammerIndicator(type);
    
    // Show placement guidance tooltip
    this.showAlert(`Click to place a ${CONFIG.jammers.types[type].name}`, 'info');
  }
  
  // Create a visual indicator for jammer placement
  createJammerIndicator(type) {
    const jammerConfig = CONFIG.jammers.types[type];
    if (!jammerConfig) return;
    
    // Create indicator container
    const indicator = new THREE.Group();
    
    // Create jammer model
    const modelGeometry = new THREE.CylinderGeometry(0.5, 0.7, 1.5, 8);
    const modelMaterial = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color('#00a3ff'),
      transparent: true,
      opacity: 0.8
    });
    const model = new THREE.Mesh(modelGeometry, modelMaterial);
    model.position.y = 0.75; // Half height
    indicator.add(model);
    
    // Create range visualization
    const range = jammerConfig.range;
    const rangeIndicator = new THREE.Mesh(
      new THREE.CircleGeometry(range / 100, 64), // Scale down range for visualization
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#00a3ff'),
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
      })
    );
    rangeIndicator.rotation.x = -Math.PI / 2; // Lay flat
    rangeIndicator.position.y = 0.1; // Slightly above ground
    indicator.add(rangeIndicator);
    
    // Add directional indicator for directional jammers
    if (jammerConfig.defaultAntenna === 'HORN' || jammerConfig.defaultAntenna === 'HELIX') {
      const antennaConfig = CONFIG.antennas.types[jammerConfig.defaultAntenna];
      const beamWidth = antennaConfig.beamWidth * Math.PI / 180; // Convert to radians
      
      // Create directional cone
      const coneGeometry = new THREE.ConeGeometry(1, range / 50, 32, 1, true);
      const coneMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#00a3ff'),
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
      });
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      
      // Position and scale cone
      cone.rotation.x = Math.PI / 2; // Point forward
      cone.scale.set(
        Math.tan(beamWidth / 2) * (range / 50), // Width based on beam angle
        Math.tan(beamWidth / 2) * (range / 50), // Height based on beam angle
        1 // Keep length
      );
      
      indicator.add(cone);
    }
    
    // Store placement data
    this.placementData = {
      indicator: indicator,
      type: type,
      isValid: true,
      model: model,
      rangeIndicator: rangeIndicator
    };
    
    // Add to scene
    this.scene.add(indicator);
    
    // Position indicator at mouse position
    if (this.mouse.worldPosition) {
      indicator.position.set(
        this.mouse.worldPosition.x,
        this.mouse.worldPosition.y,
        this.mouse.worldPosition.z + 0.1 // Slight offset
      );
    }
    
    // Add information panel above model
    this.createJammerPlacementInfo(type, indicator);
  }
  
  // Create information display for jammer placement
  createJammerPlacementInfo(type, indicator) {
    const jammerConfig = CONFIG.jammers.types[type];
    
    // Create floating text with jammer info
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create panel material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    // Create sprite
    const infoSprite = new THREE.Sprite(material);
    infoSprite.scale.set(5, 2.5, 1);
    infoSprite.position.y = 3; // Position above jammer
    
    // Add to indicator
    indicator.add(infoSprite);
    
    // Update texture with jammer info
    this.updateJammerInfoTexture(context, jammerConfig);
    texture.needsUpdate = true;
    
    // Store reference
    this.placementData.infoSprite = infoSprite;
    this.placementData.infoTexture = texture;
    this.placementData.infoContext = context;
  }
  
  // Update the jammer info display
  updateJammerInfoTexture(context, jammerConfig) {
    if (!context) return;
    
    // Clear canvas
    context.clearRect(0, 0, 256, 128);
    
    // Background
    context.fillStyle = 'rgba(20, 29, 38, 0.8)';
    context.fillRect(0, 0, 256, 128);
    context.strokeStyle = '#00a3ff';
    context.lineWidth = 2;
    context.strokeRect(0, 0, 256, 128);
    
    // Header
    context.fillStyle = '#ffffff';
    context.font = 'bold 16px sans-serif';
    context.textAlign = 'center';
    context.fillText(jammerConfig.name, 128, 20);
    
    // Info
    context.font = '12px sans-serif';
    context.textAlign = 'left';
    context.fillText(`Range: ${jammerConfig.range}m`, 15, 45);
    context.fillText(`Frequency: ${jammerConfig.defaultFrequency}`, 15, 65);
    context.fillText(`Antenna: ${CONFIG.antennas.types[jammerConfig.defaultAntenna].name}`, 15, 85);
    context.fillText(`Power: ${jammerConfig.powerLevels.default}dBm`, 15, 105);
    
    // Validity status
    if (this.placementData && this.placementData.isValid) {
      context.fillStyle = '#4ade80'; // Green for valid
      context.fillText('Valid placement', 180, 105);
    } else {
      context.fillStyle = '#f87171'; // Red for invalid
      context.fillText('Invalid placement', 180, 105);
    }
  }
  
  // Cancel asset placement
  cancelAssetPlacement() {
    if (!this.assetPlacementMode) {
      return;
    }
    
    // Remove indicator
    if (this.placementData && this.placementData.indicator) {
      this.scene.remove(this.placementData.indicator);
    }
    
    // Reset state
    this.assetPlacementMode = null;
    this.selectedAssetType = null;
    this.placementData = null;
    
    // Deselect all buttons
    document.querySelectorAll('.jammer-button').forEach(button => {
      button.classList.remove('selected');
    });
  }
  
  // Clear all jammers
  clearAllJammers() {
    const jammers = [...gameState.playerAssets.jammers.deployed];
    
    for (const jammerId of jammers) {
      gameState.removeJammer(jammerId);
    }
    
    this.showAlert('All jammers removed', 'info');
  }
  
  // Toggle map layer
  toggleMapLayer(layer, button) {
    // Toggle button state
    button.classList.toggle('active');
    
    // Update game state
    const isActive = button.classList.contains('active');
    
    if (isActive) {
      gameState.uiState.visibleLayers.push(layer);
    } else {
      const index = gameState.uiState.visibleLayers.indexOf(layer);
      if (index !== -1) {
        gameState.uiState.visibleLayers.splice(index, 1);
      }
    }
    
    // TODO: Update map display
  }
  
  // Switch asset tab
  switchAssetTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.asset-tab').forEach(t => {
      t.classList.remove('active');
    });
    
    document.querySelector(`.asset-tab[data-tab="${tab}"]`).classList.add('active');
    
    // TODO: Show corresponding asset panel content
  }
  
  // Process RAVEN command
  processRavenCommand(command) {
    // Add user message to chat
    this.addChatMessage('user', command);
    
    // Placeholder simple command handling
    // In a complete implementation, this would connect to Claude AI
    // For now, use simple pattern matching
    if (command.toLowerCase().includes('deploy') && command.toLowerCase().includes('jammer')) {
      setTimeout(() => {
        this.addChatMessage('raven', 'Initiating jammer placement mode. Please select a location on the tactical map to deploy your jammer.');
        this.startJammerPlacement('STANDARD');
      }, 500);
    } 
    else if (command.toLowerCase().includes('start mission')) {
      setTimeout(() => {
        gameState.startMission();
        this.addChatMessage('raven', 'Mission initiated. Deploying assets and beginning deployment phase. You have 2 minutes to establish your electronic defense posture.');
      }, 500);
    }
    else if (command.toLowerCase().includes('analyze') && command.toLowerCase().includes('signals')) {
      setTimeout(() => {
        // Get active signals
        let signalReport = 'Signal analysis complete:\n\n';
        
        // Check for enemy jammers
        if (gameState.enemyAssets.jammers.length > 0) {
          signalReport += '• Detected enemy jamming on GPS frequencies\n';
        }
        
        // Check for enemy drones
        if (gameState.enemyAssets.drones.length > 0) {
          signalReport += '• Multiple UAV control signals detected in 2.4GHz band\n';
        }
        
        signalReport += '\nRecommendation: Deploy GPS jammers to disrupt enemy navigation systems.';
        
        this.addChatMessage('raven', signalReport);
      }, 800);
    }
    else {
      setTimeout(() => {
        this.addChatMessage('raven', 'I understand your request, but that functionality is not yet implemented in this training simulation.');
      }, 500);
    }
  }
  
  // Add message to RAVEN chat
  addChatMessage(sender, text) {
    const outputElement = document.getElementById('raven-output');
    if (!outputElement) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;
    messageElement.textContent = text;
    
    outputElement.appendChild(messageElement);
    
    // Scroll to bottom
    outputElement.scrollTop = outputElement.scrollHeight;
  }
  
  // Show alert message
  showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    
    alertContainer.appendChild(alert);
    
    // Remove alert after duration
    setTimeout(() => {
      if (alert && alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, 5000);
  }
  
  // Handle key press
  handleKeyPress(key) {
    console.log(`Key pressed: ${key}`);
    
    // Handle escape to cancel placement
    if (key === 'Escape' && this.assetPlacementMode) {
      this.cancelAssetPlacement();
    }
    
    // Handle camera controls
    if (key === 'r') {
      // Reset camera to default position
      this.resetCamera();
    } else if (key === 'f') {
      // Toggle terrain wireframe mode
      if (this.terrain && this.terrain.material) {
        this.terrain.material.wireframe = !this.terrain.material.wireframe;
        this.showAlert(`Wireframe mode ${this.terrain.material.wireframe ? 'enabled' : 'disabled'}`, 'info');
      }
    } else if (key === 't') {
      // Toggle RF visualization
      const rfSystem = this.ecs.getSystem('rfPropagation');
      if (rfSystem) {
        rfSystem.enabled = !rfSystem.enabled;
        
        // Show/hide all visualizations
        rfSystem.visualizationObjects.forEach(obj => {
          obj.visible = rfSystem.enabled;
        });
        
        this.showAlert(`RF visualization ${rfSystem.enabled ? 'enabled' : 'disabled'}`, 'info');
        
        // Add a special effect when enabling RF visualization
        if (rfSystem.enabled) {
          // Create temporary flash effect
          this.createRFToggleEffect();
        }
      }
    }
    
    // Enhanced 3D terrain camera controls
    // WASD movement
    const moveSpeed = 100;
    if (key === 'w') {
      // Move forward
      this.camera.position.y += moveSpeed;
      if (this.cameraState) this.cameraState.target.y += moveSpeed;
    } else if (key === 's') {
      // Move backward
      this.camera.position.y -= moveSpeed;
      if (this.cameraState) this.cameraState.target.y -= moveSpeed;
    } else if (key === 'a') {
      // Move left
      this.camera.position.x -= moveSpeed;
      if (this.cameraState) this.cameraState.target.x -= moveSpeed;
    } else if (key === 'd') {
      // Move right
      this.camera.position.x += moveSpeed;
      if (this.cameraState) this.cameraState.target.x += moveSpeed;
    }
    
    // Camera elevation controls
    else if (key === 'q') {
      // Move up
      this.camera.position.z += moveSpeed;
      this.camera.lookAt(this.cameraState ? this.cameraState.target : new THREE.Vector3(0, 0, 0));
    } else if (key === 'e') {
      // Move down (with limit to prevent going below terrain)
      if (this.camera.position.z > 300) {
        this.camera.position.z -= moveSpeed;
        this.camera.lookAt(this.cameraState ? this.cameraState.target : new THREE.Vector3(0, 0, 0));
      }
    }
    
    // Terrain visualization modes
    else if (key === 'b') {
      // Toggle between normal and biome coloring
      if (this.terrain && this.terrain.material) {
        this.terrain.material.vertexColors = !this.terrain.material.vertexColors;
        this.showAlert(`Biome visualization ${this.terrain.material.vertexColors ? 'enabled' : 'disabled'}`, 'info');
      }
    }
    
    // Add "Help" message for camera controls
    else if (key === 'h') {
      this.showAlert('Camera Controls: WASD to move, QE to adjust height, R to reset, F for wireframe, B for biome view', 'info');
    }
  }
  
  // Create a special effect when toggling RF visualization
  createRFToggleEffect() {
    // Create a temporary flash effect to indicate RF visualization mode change
    const flashEffect = document.createElement('div');
    flashEffect.className = 'rf-toggle-flash';
    document.body.appendChild(flashEffect);
    
    // Add CSS for flash effect if not already in stylesheet
    if (!document.getElementById('rf-toggle-style')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'rf-toggle-style';
      styleElement.innerHTML = `
        .rf-toggle-flash {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(0, 132, 255, 0.2) 0%, rgba(0, 0, 0, 0) 70%);
          z-index: 9999;
          pointer-events: none;
          opacity: 0;
          animation: rf-flash 1s ease-out forwards;
        }
        
        @keyframes rf-flash {
          0% { opacity: 0; }
          20% { opacity: 0.8; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    // Create spatial RF "pulse" effect in the 3D scene
    const createRFPulse = () => {
      // Create a sphere geometry for the pulse
      const geometry = new THREE.SphereGeometry(10, 32, 16);
      
      // Create a shader material for the pulse
      const material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(0x0084ff) }, // Electric blue
          pulseRadius: { value: 0 }
        },
        vertexShader: `
          varying vec3 vPosition;
          
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float time;
          uniform float pulseRadius;
          
          varying vec3 vPosition;
          
          void main() {
            // Calculate distance from center
            float dist = length(vPosition);
            
            // Create a ring effect
            float ringWidth = 20.0;
            float ringEdge = pulseRadius;
            float ringOpacity = 1.0 - smoothstep(ringEdge - ringWidth, ringEdge, dist);
            
            // Sharp falloff at the expanding edge
            float edgeOpacity = 1.0 - smoothstep(ringEdge - 5.0, ringEdge, dist);
            
            // Combine for final opacity
            float opacity = ringOpacity * edgeOpacity * 0.6;
            
            // Final color
            vec3 finalColor = color + vec3(0.2, 0.5, 1.0) * edgeOpacity;
            
            gl_FragColor = vec4(finalColor, opacity);
          }
        `
      });
      
      // Create mesh and add to scene
      const pulse = new THREE.Mesh(geometry, material);
      
      // Place at the center of the map
      pulse.position.set(0, 0, 0);
      pulse.scale.set(1, 1, 1);
      
      // Add to scene
      this.scene.add(pulse);
      
      // Animation
      const startTime = performance.now();
      const duration = 2000; // 2 seconds
      const maxRadius = 800; // Max pulse radius
      
      const animatePulse = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Update uniform
        pulse.material.uniforms.time.value = progress;
        pulse.material.uniforms.pulseRadius.value = progress * maxRadius;
        
        // Scale the pulse
        const scale = 1 + progress * 20;
        pulse.scale.set(scale, scale, scale);
        
        // Update material opacity
        material.opacity = 1 - progress;
        
        if (progress < 1) {
          requestAnimationFrame(animatePulse);
        } else {
          // Remove from scene when done
          this.scene.remove(pulse);
          // Dispose of resources
          geometry.dispose();
          material.dispose();
        }
      };
      
      // Start animation
      animatePulse();
    };
    
    // Create multiple pulses
    createRFPulse();
    setTimeout(() => createRFPulse(), 200);
    setTimeout(() => createRFPulse(), 400);
    
    // Remove the flash effect after animation completes
    setTimeout(() => {
      document.body.removeChild(flashEffect);
    }, 1000);
  
  }
  
  // Reset camera to default position
  resetCamera() {
    if (this.cameraState) {
      this.cameraState.target.set(0, 0, 0);
      this.cameraState.zoom = 1.0;
      this.cameraState.rotationAngle = 0;
      
      // Set camera position for better 3D terrain view
      this.camera.position.set(0, -2000, 1500);
      this.camera.lookAt(this.cameraState.target);
      
      this.showAlert('Camera reset to overview position', 'info');
    }
  }
  
  // Handle mouse down
  handleMouseDown(event) {
    // Handle jammer placement mode
    if (this.assetPlacementMode === 'JAMMER' && this.mouse.button === 0) {
      // Check if placement is valid
      if (this.placementData && !this.placementData.isValid) {
        this.showAlert('Cannot place jammer at current location', 'warning');
        return;
      }
      
      const position = { ...this.mouse.worldPosition };
      
      // Create jammer
      const jammerId = gameState.createJammer(
        this.selectedAssetType,
        position
      );
      
      if (jammerId) {
        // Add visual deployment effect
        this.createJammerDeploymentEffect(position);
        
        // Activate jammer
        gameState.activateJammer(jammerId);
        
        this.showAlert(`${CONFIG.jammers.types[this.selectedAssetType].name} deployed`, 'success');
        
        // Exit placement mode if no more jammers available
        if (gameState.playerAssets.jammers.available[this.selectedAssetType] <= 0) {
          this.cancelAssetPlacement();
          this.showAlert(`No more ${this.selectedAssetType} jammers available`, 'info');
        }
      } else {
        this.showAlert('Failed to deploy jammer', 'error');
      }
    }
  }
  
  // Create a visual effect when a jammer is deployed
  createJammerDeploymentEffect(position) {
    // Create particles
    const particleCount = 30;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    // Initialize particles in a circle around jammer
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 1 + Math.random() * 2;
      
      particlePositions[i * 3] = position.x + Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = position.y + Math.sin(angle) * radius;
      particlePositions[i * 3 + 2] = position.z + 0.1;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    // Create material
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    // Create particle system
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);
    
    // Animate particles
    const startTime = Date.now();
    const duration = 1000; // 1 second
    
    const animateParticles = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Update positions - expand outward
      const positions = particleGeometry.attributes.position.array;
      
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = (1 + Math.random() * 2) * (1 + progress * 5);
        
        positions[i * 3] = position.x + Math.cos(angle) * radius;
        positions[i * 3 + 1] = position.y + Math.sin(angle) * radius;
        positions[i * 3 + 2] = position.z + 0.1 + progress * 3;
      }
      
      particleGeometry.attributes.position.needsUpdate = true;
      
      // Fade out
      particleMaterial.opacity = 0.8 * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(animateParticles);
      } else {
        // Remove particles
        this.scene.remove(particles);
        
        // Dispose resources
        particleGeometry.dispose();
        particleMaterial.dispose();
      }
    };
    
    // Start animation
    requestAnimationFrame(animateParticles);
  }
  
  // Handle mouse up
  handleMouseUp(event) {
    // Nothing for now
  }
  
  // Handle mouse move
  handleMouseMove(event) {
    // Update placement indicator position
    if (this.assetPlacementMode === 'JAMMER' && this.placementData && this.placementData.indicator) {
      // Update indicator position
      this.placementData.indicator.position.set(
        this.mouse.worldPosition.x,
        this.mouse.worldPosition.y,
        this.mouse.worldPosition.z + 0.1 // Slight offset for visibility
      );
      
      // Check placement validity
      this.checkJammerPlacementValidity();
      
      // Update info display
      if (this.placementData.infoContext && this.placementData.infoTexture) {
        const jammerConfig = CONFIG.jammers.types[this.selectedAssetType];
        if (jammerConfig) {
          this.updateJammerInfoTexture(this.placementData.infoContext, jammerConfig);
          this.placementData.infoTexture.needsUpdate = true;
        }
      }
    }
  }
  
  // Check if the current jammer placement is valid
  checkJammerPlacementValidity() {
    if (!this.placementData) return;
    
    // Get current position
    const position = this.placementData.indicator.position.clone();
    position.z -= 0.1; // Remove offset
    
    // Set default valid state
    let isValid = true;
    let invalidReason = '';
    
    // Check terrain boundaries
    const terrainBounds = {
      minX: -CONFIG.terrain.width / 2,
      maxX: CONFIG.terrain.width / 2,
      minY: -CONFIG.terrain.height / 2,
      maxY: CONFIG.terrain.height / 2
    };
    
    if (position.x < terrainBounds.minX || position.x > terrainBounds.maxX || 
        position.y < terrainBounds.minY || position.y > terrainBounds.maxY) {
      isValid = false;
      invalidReason = 'Out of bounds';
    }
    
    // Check proximity to other jammers (prevent stacking/overlap)
    const minDistance = 5; // Minimum distance between jammers in meters
    for (const jammerId of gameState.playerAssets.jammers.deployed) {
      const jammerTransform = gameState.ecs.getComponent(jammerId, ComponentTypes.TRANSFORM);
      if (jammerTransform) {
        const jammerPos = jammerTransform.position;
        const distance = Math.sqrt(
          Math.pow(position.x - jammerPos.x, 2) + 
          Math.pow(position.y - jammerPos.y, 2)
        );
        
        if (distance < minDistance) {
          isValid = false;
          invalidReason = 'Too close to another jammer';
          break;
        }
      }
    }
    
    // Update visual feedback based on validity
    if (isValid !== this.placementData.isValid) {
      this.placementData.isValid = isValid;
      
      // Update model color
      if (this.placementData.model) {
        if (isValid) {
          this.placementData.model.material.color.set('#00a3ff'); // Valid - blue
        } else {
          this.placementData.model.material.color.set('#ff3030'); // Invalid - red
        }
      }
      
      // Update range indicator color
      if (this.placementData.rangeIndicator) {
        if (isValid) {
          this.placementData.rangeIndicator.material.color.set('#00a3ff'); // Valid - blue
          this.placementData.rangeIndicator.material.opacity = 0.2;
        } else {
          this.placementData.rangeIndicator.material.color.set('#ff3030'); // Invalid - red
          this.placementData.rangeIndicator.material.opacity = 0.3;
        }
      }
      
      // Show tooltip with reason if invalid
      if (!isValid) {
        this.showAlert(`Invalid placement: ${invalidReason}`, 'warning');
      }
    }
  }
  
  // Main game loop
  gameLoop(now) {
    if (!this.isRunning) {
      return;
    }
    
    // Calculate delta time in seconds
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    // Update game state
    gameState.update(deltaTime);
    
    // Update ECS
    this.ecs.update(deltaTime);
    
    // Render scene
    const renderSystem = this.ecs.getSystem('render');
    renderSystem.render();
    
    // Request next frame
    requestAnimationFrame(this.gameLoop.bind(this));
  }
}

// Initialize game on window load
window.addEventListener('load', () => {
  // Create and initialize game engine
  const gameEngine = new GameEngine();
  gameEngine.initialize();
  
  // Store reference globally
  window.gameEngine = gameEngine;
});