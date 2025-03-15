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
    
    console.log('SIGNAL WARFARE initialized');
  }
  
  // Initialize THREE.js
  initializeTHREE() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1116);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 10000
    );
    this.camera.position.set(0, 0, 800);
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
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 1500;
    directionalLight.shadow.camera.left = -1000;
    directionalLight.shadow.camera.right = 1000;
    directionalLight.shadow.camera.top = 1000;
    directionalLight.shadow.camera.bottom = -1000;
    
    this.scene.add(directionalLight);
    
    // Add hemisphere light for better ambient illumination
    const hemisphereLight = new THREE.HemisphereLight(0x0c1841, 0x283848, 0.8);
    this.scene.add(hemisphereLight);
    
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
  
  // Setup post-processing effects
  setupPostProcessing() {
    try {
      // Check if the necessary classes are available
      if (!window.THREE || !window.THREE.EffectComposer) {
        console.warn('Post-processing classes not available');
        return;
      }
      
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
        const type = button.id.split('-')[0].toUpperCase();
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
  
  // Initialize panel positions based on config
  initializePanelPositions() {
    const panels = CONFIG.ui.panels;
    
    for (const [panelId, position] of Object.entries(panels)) {
      const panel = document.getElementById(`${panelId}-panel`);
      if (panel) {
        for (const [prop, value] of Object.entries(position)) {
          panel.style[prop] = value;
        }
      }
    }
  }
  
  // Create terrain
  createTerrain() {
    // Create enhanced terrain with detail
    const geometry = new THREE.PlaneGeometry(
      CONFIG.terrain.width, 
      CONFIG.terrain.height, 
      128, 128 // More divisions for detail
    );
    
    // Create terrain height map
    this.generateTerrainHeightMap(geometry);
    
    // Load terrain textures
    const textureLoader = new THREE.TextureLoader();
    
    // For now use color and basic materials, will add textures when assets are available
    const material = new THREE.MeshPhongMaterial({
      color: 0x1e293b,
      shininess: 0,
      flatShading: true,
      wireframe: false,
      side: THREE.DoubleSide,
      // We would normally add these textures:
      // map: textureLoader.load('assets/textures/terrain/diffuse.jpg'),
      // bumpMap: textureLoader.load('assets/textures/terrain/bump.jpg'),
      // bumpScale: 0.5,
    });
    
    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.rotation.x = Math.PI / 2;
    this.terrain.receiveShadow = true;
    
    this.scene.add(this.terrain);
    
    // Add grid
    const gridSize = CONFIG.terrain.width;
    const gridDivisions = gridSize / 100;
    const gridHelper = new THREE.GridHelper(
      gridSize, gridDivisions, 0x405060, 0x283848
    );
    gridHelper.position.y = 1;
    gridHelper.rotation.x = Math.PI / 2;
    
    this.scene.add(gridHelper);
    
    // Add skybox
    this.createSkybox();
  }
  
  // Generate terrain height map using simplex noise
  generateTerrainHeightMap(geometry) {
    // Simple heightmap for demonstration
    // Will be enhanced with proper noise functions later
    const vertices = geometry.attributes.position.array;
    
    for (let i = 0; i < vertices.length; i += 3) {
      // Get x and z coordinates
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Generate simple height based on position
      // This creates a basic undulating terrain
      const distance = Math.sqrt(x * x + z * z) / 1000;
      const height = Math.sin(distance * 5) * 20 + 
                     Math.cos(x / 100) * 10 + 
                     Math.sin(z / 120) * 15;
      
      // Apply height to y coordinate
      vertices[i + 1] = height;
    }
    
    // Update geometry
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
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
    
    document.getElementById(`${type.toLowerCase()}-jammer`).classList.add('selected');
    
    // Create temporary visual indicator
    this.placementData = {
      indicator: new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
        new THREE.MeshBasicMaterial({ 
          color: 0x0084ff,
          transparent: true,
          opacity: 0.7
        })
      )
    };
    
    this.scene.add(this.placementData.indicator);
    
    // Show instructions
    this.showAlert(`Select position to place ${CONFIG.jammers.types[type].name}`, 'info');
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
      }
    }
  }
  
  // Reset camera to default position
  resetCamera() {
    if (this.cameraState) {
      this.cameraState.target.set(0, 0, 0);
      this.cameraState.zoom = 1.0;
      this.cameraState.rotationAngle = 0;
      
      // Set camera position
      this.camera.position.set(0, 0, 800);
      this.camera.lookAt(this.cameraState.target);
      
      this.showAlert('Camera reset to default position', 'info');
    }
  }
  
  // Handle mouse down
  handleMouseDown(event) {
    // Handle placement mode
    if (this.assetPlacementMode === 'JAMMER' && this.mouse.button === 0) {
      const position = { ...this.mouse.worldPosition };
      
      // Create jammer
      const jammerId = gameState.createJammer(
        this.selectedAssetType,
        position
      );
      
      if (jammerId) {
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
  
  // Handle mouse up
  handleMouseUp(event) {
    // Nothing for now
  }
  
  // Handle mouse move
  handleMouseMove(event) {
    // Update placement indicator position
    if (this.assetPlacementMode && this.placementData && this.placementData.indicator) {
      this.placementData.indicator.position.set(
        this.mouse.worldPosition.x,
        this.mouse.worldPosition.y,
        this.mouse.worldPosition.z + 0.5 // Slight offset
      );
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