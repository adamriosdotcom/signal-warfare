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
    this.clock = new THREE.Clock(); // Add clock for animation
    this.terrain = null;
    this.terrain2 = null; // Second terrain for infinite scrolling
    this.composer = null; // Effect composer for post-processing
    
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
    this.userHasInteracted = false; // Track if user has ever interacted with controls
    this.introAnimationActive = true; // Track if intro scrolling animation should be shown
    
    // Game state
    this.ecs = null;
    this.assetPlacementMode = null;
    this.selectedAssetType = null;
    this.placementData = null;
    
    // Visualization objects for animation/updates
    this.visualizationObjects = new Map();
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
    
    console.log('ECHO ZERO initialized with 3D terrain');
    
    // Show welcome message with navigation tips for 3D terrain
    setTimeout(() => {
      this.showAlert('Welcome to ECHO ZERO with 3D terrain! Press H for control help.', 'info');
    }, 1500);
  }
  
  // Initialize THREE.js
  initializeTHREE() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1116);
    
    // Create camera with positioning for vaporwave terrain
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 30000 // Higher FOV for vaporwave style
    );
    // Position camera at maximum height for best tactical overview
    this.camera.position.set(0, 5000, 1200); // Higher above ground for a superior tactical view
    this.camera.lookAt(0, 0, -CONFIG.terrain.height * 0.5); // Look ahead down the grid
    
    // Store initial camera state for orbital controls
    this.initialCameraPosition = this.camera.position.clone();
    this.initialCameraTarget = new THREE.Vector3(0, 0, -CONFIG.terrain.height * 0.5);
    
    console.log("Camera positioned for 3D terrain view");
    
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
  
  // Setup 360-degree camera controls
  setupCameraControls() {
    // Import OrbitControls from Three.js if available
    try {
      // Check if THREE.OrbitControls or OrbitControls exists
      if (typeof THREE.OrbitControls !== 'undefined') {
        console.log("Using Three.js OrbitControls for camera");
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.rotateSpeed = 0.5;
        this.controls.panSpeed = 0.8;
        this.controls.zoomSpeed = 1.2;
        this.controls.minDistance = 1000;
        this.controls.maxDistance = 20000;
        
        // Add controls to visualization objects for updates
        this.visualizationObjects.set('orbitControls', {
          userData: {
            update: (deltaTime) => {
              this.controls.update();
            }
          }
        });
        
        // Don't set up custom controls if OrbitControls is available
        return;
      }
    } catch (e) {
      console.log("OrbitControls not available, using custom controls");
    }
  
    // Camera state with pitch control
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
      yawAngle: 0,  // Horizontal rotation (left-right)
      pitchAngle: 0, // Vertical rotation (up-down)
      minPitchAngle: -Math.PI * 0.45, // Limit looking up
      maxPitchAngle: Math.PI * 0.45   // Limit looking down
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
      
      // Calculate spherical coordinates
      this.updateCameraPosition();
      
      // Update camera
      this.camera.updateProjectionMatrix();
    });
    
    // Middle mouse button for rotation
    this.renderer.domElement.addEventListener('mousedown', (event) => {
      if (event.button === 1 || event.button === 0) { // Middle or Left mouse button
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
    
    // Mouse move for 360-degree rotation/panning
    this.renderer.domElement.addEventListener('mousemove', (event) => {
      if (this.cameraState.isRotating) {
        // Calculate rotation deltas
        const deltaX = event.clientX - this.cameraState.dragStartPosition.x;
        const deltaY = event.clientY - this.cameraState.dragStartPosition.y;
        
        // Update yaw (horizontal) and pitch (vertical) angles
        this.cameraState.yawAngle -= deltaX * this.cameraState.rotateSpeed * 0.01;
        
        // Update pitch with limits to prevent flipping
        this.cameraState.pitchAngle -= deltaY * this.cameraState.rotateSpeed * 0.01;
        this.cameraState.pitchAngle = Math.max(
          this.cameraState.minPitchAngle, 
          Math.min(this.cameraState.maxPitchAngle, this.cameraState.pitchAngle)
        );
        
        // Update camera position using spherical coordinates
        this.updateCameraPosition();
        
        // Update start position
        this.cameraState.dragStartPosition.x = event.clientX;
        this.cameraState.dragStartPosition.y = event.clientY;
      } else if (this.cameraState.isPanning) {
        // Calculate pan amount
        const deltaX = (event.clientX - this.cameraState.dragStartPosition.x) * 0.5;
        const deltaY = (event.clientY - this.cameraState.dragStartPosition.y) * 0.5;
        
        // Calculate camera right and up vectors for panning
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        
        const right = new THREE.Vector3();
        right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
        
        const up = new THREE.Vector3();
        up.crossVectors(forward, right).normalize();
        
        // Apply movement
        const moveX = right.multiplyScalar(-deltaX);
        const moveY = up.multiplyScalar(-deltaY);
        
        this.cameraState.target.add(moveX);
        this.cameraState.target.add(moveY);
        this.camera.position.add(moveX);
        this.camera.position.add(moveY);
        
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
    
    // Add a key handler for resetting camera
    window.addEventListener('keydown', (event) => {
      // Press 'R' to reset camera
      if (event.key === 'r' || event.key === 'R') {
        this.resetCamera();
      }
    });
  }
  
  // Update camera position using spherical coordinates for 360-degree rotation
  updateCameraPosition() {
    // Get distance between camera and target
    const distance = this.cameraState.target.distanceTo(this.camera.position) / this.cameraState.zoom;
    
    // Convert spherical coordinates to Cartesian (corrected formula)
    // In standard spherical coordinates:
    // x = r * sin(θ) * cos(φ)
    // y = r * sin(θ) * sin(φ)
    // z = r * cos(θ)
    // But for camera control, we're using pitch and yaw:
    // pitch = theta (up/down angle from y-axis)
    // yaw = phi (angle around y-axis)
    const x = distance * Math.cos(this.cameraState.pitchAngle) * Math.sin(this.cameraState.yawAngle);
    const y = distance * Math.sin(this.cameraState.pitchAngle);
    const z = distance * Math.cos(this.cameraState.pitchAngle) * Math.cos(this.cameraState.yawAngle);
    
    // Set camera position
    this.camera.position.set(
      this.cameraState.target.x + x,
      this.cameraState.target.y + y,
      this.cameraState.target.z + z
    );
    
    // Look at target
    this.camera.lookAt(this.cameraState.target);
  }
  
  // Reset camera to initial vaporwave position
  resetCamera() {
    if (this.controls) {
      // If using OrbitControls
      this.controls.reset();
    } else {
      // If using custom controls
      this.cameraState.yawAngle = 0;
      this.cameraState.pitchAngle = 0;
      this.cameraState.zoom = 1.0;
      this.cameraState.target = this.initialCameraTarget || new THREE.Vector3(0, 0, -CONFIG.terrain.height * 0.5);
      this.updateCameraPosition();
    }
    
    // Reset position directly if needed - use maximum height camera position
    this.camera.position.copy(this.initialCameraPosition || new THREE.Vector3(0, 5000, 1200));
    this.camera.lookAt(this.initialCameraTarget || new THREE.Vector3(0, 0, -CONFIG.terrain.height * 0.5));
    
    // Only restore intro animation if mission is not active
    if (!gameState.missionActive) {
      this.introAnimationActive = true;
      console.log("Restored intro animation on camera reset");
    }
    
    console.log("Camera reset to vaporwave view position");
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
      
      // Once user interacts with mouse, stop intro animation permanently
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        console.log("User has taken control, stopping intro animation");
      }
      this.userHasInteracted = true;
      
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
  
  // Create vaporwave 3D terrain
  createTerrain() {
    console.log("Creating vaporwave 3D terrain...");
    
    // Define the dimensions of the terrain - expanded for vaporwave effect
    this.terrainWidth = CONFIG.terrain.width * 1.5; // Wider to prevent seeing edges
    this.terrainHeight = CONFIG.terrain.height * 2.5; // Longer for better infinite effect
    
    // Create a higher resolution terrain for tactical military look
    const resolution = 48; // Higher resolution for finer grid and more detailed terrain
    const geometry = new THREE.PlaneGeometry(
      this.terrainWidth, 
      this.terrainHeight, 
      resolution, 
      resolution
    );
    
    // Create a texture canvas for the grid
    const gridTexture = this.createVaporwaveGridTexture(resolution);
    
    // Create metalness map for reflective squares
    const metalnessTexture = this.createMetalnessMap(resolution);
    
    // Create displacement map for terrain edges
    const displacementTexture = this.createDisplacementMap(resolution);
    
    // Add material with tactical military aesthetic
    const material = new THREE.MeshStandardMaterial({
      map: gridTexture,
      displacementMap: displacementTexture,
      displacementScale: 600, // Slightly reduced displacement for more realistic terrain
      metalnessMap: metalnessTexture,
      metalness: 0.3, // Much less metallic for non-reflective tactical look
      roughness: 0.8, // Much rougher for matte finish
      emissive: 0x001100, // Very subtle dark green glow
      emissiveIntensity: 0.02, // Much less emissive
      side: THREE.DoubleSide,
      normalScale: new THREE.Vector2(1.2, 1.2), // Slightly reduced surface detail
      wireframe: false
    });
    
    console.log("Created vaporwave terrain material");
    
    // Create primary terrain mesh
    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.rotation.x = -Math.PI / 2; // Rotate to face up
    this.terrain.position.y = -1000; // Much lower position to ensure it's well below camera
    this.terrain.position.z = 0;
    this.terrain.receiveShadow = true;
    
    // Create second terrain for infinite scrolling effect
    this.terrain2 = new THREE.Mesh(geometry, material);
    this.terrain2.rotation.x = -Math.PI / 2;
    this.terrain2.position.y = -1000; // Same much lower position as first terrain
    this.terrain2.position.z = -this.terrainHeight; // Position behind first terrain
    this.terrain2.receiveShadow = true;
    
    // Add tactical atmosphere fog - subtle bluish-green night vision tint
    this.scene.fog = new THREE.Fog('#0a1410', this.terrainHeight * 0.35, this.terrainHeight * 0.85);
    this.scene.background = new THREE.Color('#0a1410');
    
    // Add terrains to scene
    this.scene.add(this.terrain);
    this.scene.add(this.terrain2);
    
    // Add spotlights for vaporwave lighting with enhanced colors
    this.createVaporwaveLighting();
    
    // Store terrain for animation
    this.visualizationObjects.set('vaporwave-terrain1', this.terrain);
    this.visualizationObjects.set('vaporwave-terrain2', this.terrain2);
    
    // Add post-processing effects if Three.js EffectComposer is available
    this.setupPostProcessing();
    
    console.log("Vaporwave 3D terrain creation complete");
  }
  
  // Create tactical military lighting setup
  createVaporwaveLighting() {
    // Add ambient light for base visibility - neutral gray
    const ambientLight = new THREE.AmbientLight(0x444444, 0.7);
    this.scene.add(ambientLight);
    
    // Add directional light to simulate sun/moonlight - subtle bluish tint for night operations
    const directionalLight = new THREE.DirectionalLight(0xc0d8ff, 0.6);
    directionalLight.position.set(-500, 1000, 200);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.far = 3500;
    directionalLight.shadow.bias = -0.0001;
    this.scene.add(directionalLight);
    
    // Add right tactical floodlight - greenish tint for night vision
    const spotlightRight = new THREE.SpotLight(0x3a5f41, 10, this.terrainWidth * 1.0, Math.PI * 0.15, 0.8);
    spotlightRight.position.set(this.terrainWidth * 0.2, 800, 300);
    spotlightRight.target.position.set(0, -100, -this.terrainHeight * 0.3);
    this.scene.add(spotlightRight);
    this.scene.add(spotlightRight.target);
    
    // Add left tactical floodlight - also greenish but less intense
    const spotlightLeft = new THREE.SpotLight(0x3a5f41, 8, this.terrainWidth * 1.0, Math.PI * 0.15, 0.8);
    spotlightLeft.position.set(-this.terrainWidth * 0.2, 800, 300);
    spotlightLeft.target.position.set(0, -100, -this.terrainHeight * 0.3);
    this.scene.add(spotlightLeft);
    this.scene.add(spotlightLeft.target);
    
    // Add area illuminators - simulating flares or tactical lighting
    const tacticalLights = [
      { color: 0xf4fcc3, intensity: 2, range: 1000, position: [this.terrainWidth * 0.4, 400, -this.terrainHeight * 0.2] },
      { color: 0xd8e8c0, intensity: 3, range: 1200, position: [-this.terrainWidth * 0.4, 350, -this.terrainHeight * 0.5] },
      { color: 0xffffff, intensity: 1, range: 800, position: [0, 500, -this.terrainHeight * 0.7] }
    ];
    
    // Add tactical illumination points - more subtle and utilitarian
    for (let i = 0; i < tacticalLights.length; i++) {
      const light = tacticalLights[i];
      const pointLight = new THREE.PointLight(light.color, light.intensity, light.range);
      pointLight.position.set(...light.position);
      this.scene.add(pointLight);
      
      // Add subtle animation for flares/illuminators
      if (i > 0) { // Skip first light for stability
        this.visualizationObjects.set(`tactical-light-${i}`, {
          userData: {
            update: (deltaTime) => {
              // Subtle flickering for realism
              const flickerAmount = Math.sin(deltaTime * 0.5 + i) * 0.1 + 0.9;
              pointLight.intensity = light.intensity * flickerAmount;
              
              // Subtle position changes for flares/illumination rounds
              if (i === 1) { // Only animate the second light
                const time = deltaTime * 0.2;
                const driftX = Math.sin(time) * 50;
                const driftZ = Math.cos(time * 0.7) * 50;
                pointLight.position.x = light.position[0] + driftX;
                pointLight.position.z = light.position[2] + driftZ;
              }
            }
          }
        });
      }
    }
    
    // Add some vehicle or equipment lights - very small and subtle
    const equipmentLights = [
      { color: 0xff3300, intensity: 0.5, range: 100 }, // Red warning light
      { color: 0x33ff00, intensity: 0.3, range: 80 },  // Green indicator
      { color: 0xffaa00, intensity: 0.4, range: 90 }   // Amber caution light
    ];
    
    // Place equipment lights strategically
    for (let i = 0; i < equipmentLights.length; i++) {
      const light = equipmentLights[i];
      const pointLight = new THREE.PointLight(light.color, light.intensity, light.range);
      
      // Position them in tactical locations
      const positionX = (i - 1) * this.terrainWidth * 0.15;
      pointLight.position.set(
        positionX,
        20, // Low to the ground
        -this.terrainHeight * 0.3 + (i * 100)
      );
      this.scene.add(pointLight);
      
      // Add light animation for tactical equipment lights
      this.visualizationObjects.set(`equipment-light-${i}`, {
        userData: {
          update: (deltaTime) => {
            // Blink effect for tactical equipment
            const blinkSpeed = i === 0 ? 1.0 : i === 1 ? 0.5 : 0.7; // Different blink rates
            const blinkState = ((Math.sin(deltaTime * blinkSpeed) + 1) / 2) > 0.7;
            pointLight.intensity = blinkState ? light.intensity : 0;
            const time = deltaTime * 0.3;
            const y = 300 + Math.sin(time + i) * 100;
            pointLight.position.y = y;
          }
        }
      });
    }
  }
  
  // Create tactical military grid texture
  createVaporwaveGridTexture(resolution) {
    const textureSize = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');
    
    // Fill background with dark tactical colors
    ctx.fillStyle = '#0a1410'; // Very dark greenish
    ctx.fillRect(0, 0, textureSize, textureSize);
    
    // Add some subtle noise texture for terrain
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * textureSize;
      const y = Math.random() * textureSize;
      const size = Math.random() * 2;
      // Use terrain-like colors
      const colorValue = Math.floor(Math.random() * 40 + 20);
      ctx.fillStyle = `rgb(${colorValue}, ${colorValue + 10}, ${colorValue - 5})`;
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1.0;
    
    // Calculate grid cell size
    const cellSize = textureSize / resolution;
    
    // Draw tactical grid lines without glow
    const drawGridLine = (x1, y1, x2, y2, color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    
    // Primary grid color for tactical look
    const primaryGridColor = 'rgba(35, 120, 80, 0.4)'; // Subdued green
    const secondaryGridColor = 'rgba(35, 120, 80, 0.2)'; // Very faint green
    const tertiaryGridColor = 'rgba(50, 80, 60, 0.15)'; // Barely visible detail lines
    
    // Draw horizontal grid lines (tactical style)
    for (let i = 0; i <= resolution; i++) {
      const y = i * cellSize;
      
      // Determine line type based on position
      if (i % 8 === 0) {
        // Major grid line
        drawGridLine(0, y, textureSize, y, primaryGridColor, 1.0);
      } else if (i % 4 === 0) {
        // Medium grid line
        drawGridLine(0, y, textureSize, y, secondaryGridColor, 0.7);
      } else {
        // Minor grid line
        drawGridLine(0, y, textureSize, y, tertiaryGridColor, 0.5);
      }
    }
    
    // Draw vertical grid lines (tactical style)
    for (let i = 0; i <= resolution; i++) {
      const x = i * cellSize;
      
      // Determine line type based on position
      if (i % 8 === 0) {
        // Major grid line
        drawGridLine(x, 0, x, textureSize, primaryGridColor, 1.0);
      } else if (i % 4 === 0) {
        // Medium grid line
        drawGridLine(x, 0, x, textureSize, secondaryGridColor, 0.7);
      } else {
        // Minor grid line
        drawGridLine(x, 0, x, textureSize, tertiaryGridColor, 0.5);
      }
    }
    
    // Draw occasional coordinate markings (like a tactical map)
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(60, 160, 120, 0.5)';
    
    for (let i = 0; i <= resolution; i += 8) {
      for (let j = 0; j <= resolution; j += 8) {
        const x = i * cellSize;
        const y = j * cellSize;
        
        // Add coordinate text at intersections of major grid lines
        if (i > 0 && j > 0) {
          const coordText = `${String.fromCharCode(65 + (i % 26))}-${j / 8}`;
          ctx.fillText(coordText, x + 2, y - 2);
        }
      }
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    
    return texture;
  }
  
  // Create metalness map for tactical look with minimal reflective surfaces
  createMetalnessMap(resolution) {
    const textureSize = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');
    
    // Fill with black (non-metallic)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, textureSize, textureSize);
    
    // Calculate grid cell size
    const cellSize = textureSize / resolution;
    
    // Add very few slightly reflective areas (equipment, water features, etc.)
    ctx.fillStyle = '#777777'; // Medium gray for less reflectivity
    
    // Add occasional metallic surfaces with patterns that look intentional/tactical
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Make cells slightly reflective with just 5% probability
        // Cluster them together to look like intentional features
        if ((x + y) % 17 === 0 && Math.random() < 0.5) {
          // Create a small cluster
          const clusterSize = Math.floor(Math.random() * 2) + 1;
          
          // Draw a small group of reflective cells
          for (let cx = 0; cx < clusterSize; cx++) {
            for (let cy = 0; cy < clusterSize; cy++) {
              const nx = x + cx;
              const ny = y + cy;
              
              if (nx < resolution && ny < resolution) {
                // Add some variation to reflection
                const alpha = 0.5 + Math.random() * 0.3;
                ctx.globalAlpha = alpha;
                ctx.fillRect(nx * cellSize, ny * cellSize, cellSize, cellSize);
              }
            }
          }
        }
      }
    }
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    
    return texture;
  }
  
  // Create displacement map for tactical military terrain
  createDisplacementMap(resolution) {
    const textureSize = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');
    
    // Fill with black (base displacement)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, textureSize, textureSize);
    
    // Create gradient for terrain elevation - more realistic
    const gradient = ctx.createLinearGradient(0, 0, textureSize, 0);
    gradient.addColorStop(0, '#ffffff'); // High on the left
    gradient.addColorStop(0.25, '#333333'); // More gradual slope
    gradient.addColorStop(0.35, '#222222'); // Plateau transition
    gradient.addColorStop(0.5, '#111111'); // Lower in the middle
    gradient.addColorStop(0.65, '#222222'); // Plateau transition
    gradient.addColorStop(0.75, '#333333'); // More gradual slope
    gradient.addColorStop(1, '#ffffff'); // High on the right
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, textureSize, textureSize);
    
    // Add strategic terrain features - more organized and realistic
    const cellSize = textureSize / resolution;
    
    // Create strategic mountain ranges and hills for tactical landscape
    for (let range = 0; range < 3; range++) {
      // Create 3 distinct mountain ranges at different positions
      // Randomize the starting position
      let startX, startY;
      let dirX, dirY;
      
      // Left/right side ranges
      if (range === 0) {
        // Left side mountain range
        startX = textureSize * 0.1 + Math.random() * textureSize * 0.1;
        startY = textureSize * 0.2 + Math.random() * textureSize * 0.6;
        dirX = 0.2;
        dirY = Math.random() * 2 - 1;
      } else if (range === 1) {
        // Right side mountain range
        startX = textureSize * 0.8 + Math.random() * textureSize * 0.1;
        startY = textureSize * 0.2 + Math.random() * textureSize * 0.6;
        dirX = -0.2;
        dirY = Math.random() * 2 - 1;
      } else {
        // Distant background range
        startX = textureSize * 0.3 + Math.random() * textureSize * 0.4;
        startY = textureSize * 0.1;
        dirX = Math.random() * 0.4 - 0.2;
        dirY = 0.3;
      }
      
      // Add length to range based on position
      const rangeLength = 10 + Math.floor(Math.random() * 15);
      
      // Create the mountain range
      for (let i = 0; i < rangeLength; i++) {
        // Skip center channel for clear tactical path
        const normalizedX = startX / textureSize;
        if (normalizedX > 0.4 && normalizedX < 0.6) continue;
        
        // Create ridgeline mountain
        const mountainWidth = 20 + Math.random() * 30;
        const mountainHeight = 80 + Math.random() * 120;
        
        // Draw mountain ridge with elongated shape
        ctx.fillStyle = `rgba(255, 255, 255, ${mountainHeight/255})`;
        
        // Draw elongated ellipse for ridge
        ctx.beginPath();
        ctx.ellipse(
          startX, startY,
          mountainWidth, mountainWidth * 0.5,
          Math.atan2(dirY, dirX),
          0, Math.PI * 2
        );
        ctx.fill();
        
        // Move position along range direction
        startX += dirX * (30 + Math.random() * 15);
        startY += dirY * (30 + Math.random() * 15);
        
        // Slight random direction change
        dirX += (Math.random() * 0.2 - 0.1);
        dirY += (Math.random() * 0.2 - 0.1);
        
        // Normalize direction
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        dirX /= len;
        dirY /= len;
      }
    }
    
    // Add tactical mounds, craters and terrain irregularities
    for (let y = 0; y < resolution; y += 2) {
      for (let x = 0; x < resolution; x += 2) {
        // Skip the middle path for a tactical corridor
        if (x > resolution * 0.4 && x < resolution * 0.6) continue;
        
        // More sparse, deliberate terrain features
        if (Math.random() < 0.05) {
          // Size of feature correlates to distance from center
          const distanceFromCenter = Math.abs(x - resolution/2) / (resolution/2);
          const featureSize = 1 + Math.floor(Math.random() * 4 * distanceFromCenter);
          
          // Height is higher further from center 
          const baseHeight = 50 + 100 * distanceFromCenter;
          const height = baseHeight + Math.random() * 50;
          
          // Draw terrain feature
          const centerX = x * cellSize + cellSize/2;
          const centerY = y * cellSize + cellSize/2;
          const radius = featureSize * cellSize;
          
          // 20% chance for crater instead of hill
          if (Math.random() < 0.2) {
            // Create crater (depression)
            const craterGradient = ctx.createRadialGradient(
              centerX, centerY, 0,
              centerX, centerY, radius
            );
            
            craterGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
            craterGradient.addColorStop(0.4, 'rgba(40, 40, 40, 0.5)');
            craterGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = craterGradient;
          } else {
            // Create hill or ridge
            const hillGradient = ctx.createRadialGradient(
              centerX, centerY, 0,
              centerX, centerY, radius
            );
            
            hillGradient.addColorStop(0, `rgba(255, 255, 255, ${height/255})`);
            hillGradient.addColorStop(0.7, 'rgba(100, 100, 100, 0.2)');
            hillGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = hillGradient;
          }
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
    
    // Add fine texture details - small terrain roughness
    for (let i = 0; i < textureSize * 0.05; i++) {
      const x = Math.random() * textureSize;
      const y = Math.random() * textureSize;
      
      // Don't add texture in center corridor
      const normalizedX = x / textureSize;
      if (normalizedX > 0.4 && normalizedX < 0.6) continue;
      
      const size = 1 + Math.random() * 3; // Much smaller bumps
      
      // Draw small terrain irregularities
      ctx.fillStyle = Math.random() < 0.5 ? 
        'rgba(180, 180, 180, 0.1)' : // Small mounds
        'rgba(30, 30, 30, 0.1)';     // Small depressions
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    
    return texture;
  }
  
  // Setup post-processing effects for RGB shift
  setupPostProcessing() {
    if (typeof THREE.EffectComposer !== 'undefined') {
      console.log('Setting up post-processing effects');
      
      // Create effect composer
      this.composer = new THREE.EffectComposer(this.renderer);
      
      // Add render pass
      const renderPass = new THREE.RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      
      // Add RGB shift pass if available
      if (typeof THREE.ShaderPass !== 'undefined' && typeof THREE.RGBShiftShader !== 'undefined') {
        const rgbShiftPass = new THREE.ShaderPass(THREE.RGBShiftShader);
        rgbShiftPass.uniforms['amount'].value = 0.0015;
        this.composer.addPass(rgbShiftPass);
        
        // Add gamma correction pass
        if (typeof THREE.GammaCorrectionShader !== 'undefined') {
          const gammaCorrectionPass = new THREE.ShaderPass(THREE.GammaCorrectionShader);
          this.composer.addPass(gammaCorrectionPass);
        }
      }
    }
  }
  
  // Create water surface
  createWaterSurface() {
    // Create a water plane slightly below sea level
    const waterGeometry = new THREE.PlaneGeometry(
      CONFIG.terrain.width * 1.5, // Make larger than terrain
      CONFIG.terrain.height * 1.5,
      1, 1 // We don't need many segments for water
    );
    
    // Create water material with animated shader
    const waterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0066cc,
      metalness: 0.0,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
      envMapIntensity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.FrontSide
    });
    
    // Create water mesh
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2; // Align with terrain
    water.position.y = -20; // Set at sea level (negative because we'll flip the terrain)
    
    // Add to scene
    this.scene.add(water);
    
    // Store reference
    this.water = water;
    
    // Animate water with shader
    const clock = new THREE.Clock();
    water.userData = {
      update: function(delta, water) {
        if (water && water.material) {
          const time = clock.getElapsedTime() * 0.5;
          water.position.y = -20 + Math.sin(time * 0.2) * 2; // Gentle bobbing motion
          water.material.opacity = 0.8 + Math.sin(time * 0.5) * 0.05; // Subtle opacity changes
        }
      }
    };
    
    // Add to visualization objects for animation updates
    this.visualizationObjects.set('water', water);
  }
  
  // Add terrain details like trees, rocks based on biome data
  addTerrainDetails(terrainData) {
    // Number of details to add - don't add too many or it will hurt performance
    const detailCount = 200;
    
    // Create detail objects container
    const detailsGroup = new THREE.Group();
    
    // Function to get height at specific world position
    const getHeightAt = (x, z) => {
      const gridSize = terrainData.heightData.length;
      const ix = Math.floor((x / CONFIG.terrain.width + 0.5) * (gridSize - 1));
      const iz = Math.floor((z / CONFIG.terrain.height + 0.5) * (gridSize - 1));
      
      if (ix >= 0 && ix < gridSize && iz >= 0 && iz < gridSize) {
        return terrainData.heightData[ix][iz];
      }
      return 0;
    };
    
    // Create tree geometry once and reuse
    const treeGeometry = new THREE.ConeGeometry(15, 50, 5);
    const treeTrunkGeometry = new THREE.CylinderGeometry(5, 5, 20, 5);
    
    // Create rock geometry once and reuse
    const rockGeometry = new THREE.DodecahedronGeometry(10, 0);
    
    // Add details randomly according to biome
    for (let i = 0; i < detailCount; i++) {
      // Random position
      const x = (Math.random() - 0.5) * CONFIG.terrain.width * 0.9; // Stay away from edges
      const z = (Math.random() - 0.5) * CONFIG.terrain.height * 0.9;
      
      // Get terrain height and biome at this position
      const y = getHeightAt(x, z);
      
      // Skip if underwater or too high
      if (y < 0 || y > 400) continue;
      
      // Get biome type at this position
      const gridSize = terrainData.biomeData.length;
      const ix = Math.floor((x / CONFIG.terrain.width + 0.5) * (gridSize - 1));
      const iz = Math.floor((z / CONFIG.terrain.height + 0.5) * (gridSize - 1));
      
      let biome = 'OPEN';
      if (ix >= 0 && ix < gridSize && iz >= 0 && iz < gridSize) {
        biome = terrainData.biomeData[ix][iz];
      }
      
      // Create different objects based on biome
      let detailObject;
      
      if (biome === 'FOREST' && Math.random() < 0.7) {
        // Create tree
        const treeTop = new THREE.Mesh(
          treeGeometry,
          new THREE.MeshLambertMaterial({ color: 0x006633 })
        );
        treeTop.position.y = 35; // Position top relative to trunk
        
        const treeTrunk = new THREE.Mesh(
          treeTrunkGeometry,
          new THREE.MeshLambertMaterial({ color: 0x663300 })
        );
        treeTrunk.position.y = 10; // Position trunk at base
        
        // Create tree group
        detailObject = new THREE.Group();
        detailObject.add(treeTop);
        detailObject.add(treeTrunk);
        
        // Scale by random amount for variety
        const scale = 0.5 + Math.random() * 1.0;
        detailObject.scale.set(scale, scale, scale);
      } 
      else if ((biome === 'OPEN' || biome === 'URBAN') && Math.random() < 0.3) {
        // Create rock
        detailObject = new THREE.Mesh(
          rockGeometry,
          new THREE.MeshLambertMaterial({ color: 0x888888 })
        );
        
        // Randomize rock rotation for variety
        detailObject.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        // Scale by random amount for variety
        const scale = 0.5 + Math.random() * 1.5;
        detailObject.scale.set(scale, scale * 0.7, scale);
      }
      
      // If we created an object, position it on terrain
      if (detailObject) {
        detailObject.position.set(x, y, z);
        detailObject.castShadow = true;
        detailObject.receiveShadow = true;
        detailsGroup.add(detailObject);
      }
    }
    
    // Add details group to scene
    this.scene.add(detailsGroup);
    
    // Store reference
    this.terrainDetails = detailsGroup;
  }
  
  // Generate advanced terrain data with improved algorithms
  generateAdvancedTerrainData(geometry, resolution) {
    console.log("Generating advanced 3D terrain with multi-layered noise");
    
    // 2D arrays to store height and biome data
    const heightData = new Array(resolution).fill().map(() => new Array(resolution).fill(0));
    const biomeData = new Array(resolution).fill().map(() => new Array(resolution).fill('OPEN'));
    
    // More dramatic scale factors
    const scales = {
      continent: 0.00008, // Very large features (mountains, valleys)
      mountains: 0.0003,  // Large mountain ranges
      hills: 0.0015,      // Hills and medium features
      details: 0.008,     // Small terrain details
      microDetails: 0.03  // Very small details like rocks
    };
    
    // Scale modifiers for different features
    const amplitudes = {
      continent: CONFIG.terrain.maxElevation * 1.0,
      mountains: CONFIG.terrain.maxElevation * 0.8,
      hills: CONFIG.terrain.maxElevation * 0.4,
      details: CONFIG.terrain.maxElevation * 0.1,
      microDetails: CONFIG.terrain.maxElevation * 0.05
    };
    
    // We'll use simplex-like noise and multiple layers
    const vertices = geometry.attributes.position.array;
    const colors = new Float32Array(vertices.length);
    
    // Create additional feature maps
    const riverMap = this.generateRiverMap(resolution);
    const mountainRanges = this.generateMountainRanges(resolution);
    const temperatureMap = this.generateTemperatureMap(resolution);
    const moistureMap = this.generateMoistureMap(resolution, riverMap);
    
    // Process each vertex
    for (let i = 0, j = 0; i < vertices.length; i += 3, j += 3) {
      // Get x and z coordinates
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Index in the grid
      const ix = Math.floor((x / CONFIG.terrain.width + 0.5) * (resolution - 1));
      const iz = Math.floor((z / CONFIG.terrain.height + 0.5) * (resolution - 1));
      
      // Get noise values at different scales
      const continentNoise = this.improvedNoise(x * scales.continent, z * scales.continent, 0.1);
      const mountainsNoise = this.improvedNoise(x * scales.mountains, z * scales.mountains, 0.5);
      const hillsNoise = this.improvedNoise(x * scales.hills, z * scales.hills, 0.7);
      const detailsNoise = this.improvedNoise(x * scales.details, z * scales.details, 1.2);
      const microNoise = this.improvedNoise(x * scales.microDetails, z * scales.microDetails, 2.0);
      
      // Mountain ranges - use 'ridge' noise for more realistic mountains
      const mountainRidgeNoise = this.ridgedNoise(x * scales.mountains, z * scales.mountains) * 
                                mountainRanges[ix][iz];
      
      // Get features at this position
      const riverValue = riverMap[ix][iz];
      const temperatureValue = temperatureMap[ix][iz];
      const moistureValue = moistureMap[ix][iz];
      
      // Add crater/caldera in one spot for a volcano/impact crater
      const craterCenterX = CONFIG.terrain.width * 0.2;
      const craterCenterZ = CONFIG.terrain.height * -0.3;
      const craterRadius = CONFIG.terrain.width * 0.1;
      const distToCrater = Math.sqrt(Math.pow(x - craterCenterX, 2) + Math.pow(z - craterCenterZ, 2));
      const craterValue = Math.max(0, 1 - Math.pow(distToCrater / craterRadius, 2));
      const craterHeight = craterValue > 0.3 ? 
        (-Math.pow((craterValue - 0.7) / 0.3, 2) + 1) * 120 : 0;
      
      // Calculate combined height
      let height = (
        continentNoise * amplitudes.continent +
        mountainsNoise * amplitudes.mountains +
        hillsNoise * amplitudes.hills +
        detailsNoise * amplitudes.details +
        microNoise * amplitudes.microDetails +
        mountainRidgeNoise * amplitudes.mountains * 1.2 +
        craterHeight
      );
      
      // Apply river carving
      const riverDepth = 50;
      const riverWidth = 100;
      if (riverValue > 0) {
        const riverFactor = Math.pow(riverValue, 0.5);
        height -= riverFactor * riverDepth;
      }
      
      // Apply erosion - lower heights near steep slopes for more realistic terrain
      let avgNeighborHeight = 0;
      let neighborCount = 0;
      
      // Check neighboring heights in a small sampling
      for (let nx = -2; nx <= 2; nx += 2) {
        for (let nz = -2; nz <= 2; nz += 2) {
          const nix = ix + nx;
          const niz = iz + nz;
          
          if (nix >= 0 && nix < resolution && niz >= 0 && niz < resolution) {
            // We may not have calculated this neighbor's height yet
            if (heightData[nix][niz] !== 0) {
              avgNeighborHeight += heightData[nix][niz];
              neighborCount++;
            }
          }
        }
      }
      
      if (neighborCount > 0) {
        avgNeighborHeight /= neighborCount;
        // Apply erosion to high areas
        if (height > avgNeighborHeight + 50 && height > 100) {
          const erosionFactor = Math.min(1, (height - avgNeighborHeight) / 200);
          height -= erosionFactor * 30;
        }
      }
      
      // Set minimum height for water bodies
      height = Math.max(-30, height);
      
      // Store height in data array
      if (ix >= 0 && ix < resolution && iz >= 0 && iz < resolution) {
        heightData[ix][iz] = height;
      }
      
      // Set y position to height
      vertices[i + 1] = height;
      
      // Determine biome based on height, temperature and moisture
      let biomeType = 'OPEN';
      let biomeColor;
      
      if (height < 0) {
        // Water areas
        biomeType = 'WATER';
        const depthFactor = Math.min(1, Math.abs(height) / 50);
        biomeColor = new THREE.Color(
          0.1 - depthFactor * 0.1,
          0.2 - depthFactor * 0.15,
          0.8 - depthFactor * 0.3
        );
      } 
      else if (height < 5 && riverValue > 0.7) {
        // River
        biomeType = 'WATER';
        biomeColor = new THREE.Color(0.1, 0.4, 0.8);
      }
      else {
        // Land biomes based on temperature and moisture
        if (height > 300) {
          // High mountains - snow
          biomeType = 'OPEN';
          const snowAmount = Math.min(1, (height - 300) / 200);
          biomeColor = new THREE.Color(
            0.9 + snowAmount * 0.1,
            0.9 + snowAmount * 0.1,
            0.9 + snowAmount * 0.1
          );
        }
        else if (height > 150) {
          // Mountain/rock
          biomeType = 'URBAN'; // Using urban type for rocky areas
          const rockGray = 0.4 + (height - 150) / 150 * 0.3;
          biomeColor = new THREE.Color(rockGray, rockGray, rockGray);
        }
        else if (moistureValue > 0.6 && temperatureValue > 0.4) {
          // Forest
          biomeType = 'FOREST';
          const forestGreen = 0.2 + temperatureValue * 0.1;
          biomeColor = new THREE.Color(0.05, forestGreen, 0.05);
        }
        else if (moistureValue < 0.3 && temperatureValue > 0.6) {
          // Desert
          biomeType = 'OPEN';
          biomeColor = new THREE.Color(0.85, 0.8, 0.5);
        }
        else if (moistureValue > 0.5 && temperatureValue < 0.4) {
          // Tundra
          biomeType = 'OPEN';
          biomeColor = new THREE.Color(0.7, 0.7, 0.65);
        }
        else {
          // Grassland/plains
          biomeType = 'OPEN';
          const grassGreen = 0.3 + moistureValue * 0.2;
          biomeColor = new THREE.Color(0.2, grassGreen, 0.1);
        }
      }
      
      // Store biome in data array
      if (ix >= 0 && ix < resolution && iz >= 0 && iz < resolution) {
        biomeData[ix][iz] = biomeType;
      }
      
      // Set vertex color
      colors[j] = biomeColor.r;
      colors[j + 1] = biomeColor.g;
      colors[j + 2] = biomeColor.b;
    }
    
    // Update geometry
    geometry.attributes.position.needsUpdate = true;
    
    // Add vertex colors
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Compute normals for proper lighting
    geometry.computeVertexNormals();
    
    console.log("Advanced terrain generation complete");
    return { heightData, biomeData };
  }
  
  // Better noise function for improved terrain
  improvedNoise(x, y, persistence) {
    // A better noise function using multiple octaves
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    // Add several octaves of noise for more natural results
    for (let i = 0; i < 6; i++) {
      total += this.simpleNoise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    
    // Return normalized result
    return total / maxValue;
  }
  
  // Ridge noise for mountain ranges
  ridgedNoise(x, y) {
    // Create ridged noise (sharp peaks) for mountain ranges
    const noise = this.simpleNoise(x, y);
    return 1 - Math.abs(noise - 0.5) * 2;
  }
  
  // Generate a river map
  generateRiverMap(resolution) {
    const map = new Array(resolution).fill().map(() => new Array(resolution).fill(0));
    
    // Generate several rivers
    const riverCount = 5;
    for (let r = 0; r < riverCount; r++) {
      // Random starting position
      let x = Math.floor(Math.random() * resolution);
      let y = Math.floor(Math.random() * resolution);
      
      // Random direction bias
      const dirBiasX = Math.random() * 2 - 1;
      const dirBiasY = Math.random() * 2 - 1;
      
      // River length
      const length = Math.floor(resolution * (0.3 + Math.random() * 0.5));
      
      // River width factor
      let width = 3 + Math.random() * 5;
      
      // Create the river
      for (let i = 0; i < length; i++) {
        // Mark current position as river
        if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
          // Draw river with width
          for (let wx = -width; wx <= width; wx++) {
            for (let wy = -width; wy <= width; wy++) {
              const nx = Math.floor(x + wx);
              const ny = Math.floor(y + wy);
              
              if (nx >= 0 && nx < resolution && ny >= 0 && ny < resolution) {
                const distToCenter = Math.sqrt(wx * wx + wy * wy);
                if (distToCenter <= width) {
                  // Stronger river in center, weaker at edges
                  const strength = 1 - (distToCenter / width);
                  map[nx][ny] = Math.max(map[nx][ny], strength);
                }
              }
            }
          }
          
          // Change width occasionally
          if (i % 20 === 0) {
            width = Math.max(2, width + (Math.random() * 4 - 2));
          }
        }
        
        // Move in a somewhat random direction with bias
        const dirX = dirBiasX * 0.5 + Math.random() - 0.5;
        const dirY = dirBiasY * 0.5 + Math.random() - 0.5;
        
        // Normalize direction
        const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
        const nx = dirX / dirLength;
        const ny = dirY / dirLength;
        
        // Move by a random distance
        const moveAmount = 1 + Math.random() * 2;
        x += Math.floor(nx * moveAmount);
        y += Math.floor(ny * moveAmount);
      }
    }
    
    return map;
  }
  
  // Generate mountain ranges
  generateMountainRanges(resolution) {
    const map = new Array(resolution).fill().map(() => new Array(resolution).fill(0));
    
    // Generate several mountain ranges
    const rangeCount = 3;
    for (let r = 0; r < rangeCount; r++) {
      // Random starting position
      let x = Math.floor(Math.random() * resolution);
      let y = Math.floor(Math.random() * resolution);
      
      // Random direction for the range
      const dirX = Math.random() * 2 - 1;
      const dirY = Math.random() * 2 - 1;
      
      // Range length
      const length = Math.floor(resolution * (0.3 + Math.random() * 0.4));
      
      // Range width factor
      let width = 20 + Math.random() * 30;
      
      // Create the mountain range
      for (let i = 0; i < length; i++) {
        // Mark current position as mountain
        if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
          // Draw mountain range with width
          for (let wx = -width; wx <= width; wx++) {
            for (let wy = -width; wy <= width; wy++) {
              const nx = Math.floor(x + wx);
              const ny = Math.floor(y + wy);
              
              if (nx >= 0 && nx < resolution && ny >= 0 && ny < resolution) {
                const distToCenter = Math.sqrt(wx * wx + wy * wy);
                if (distToCenter <= width) {
                  // Stronger in center, weaker at edges
                  const strength = 1 - (distToCenter / width);
                  map[nx][ny] = Math.max(map[nx][ny], strength);
                }
              }
            }
          }
          
          // Change width occasionally
          if (i % 10 === 0) {
            width = Math.max(15, width + (Math.random() * 15 - 7.5));
          }
        }
        
        // Move in the range direction with some randomness
        const moveX = dirX + (Math.random() * 0.4 - 0.2);
        const moveY = dirY + (Math.random() * 0.4 - 0.2);
        
        // Normalize direction
        const moveLength = Math.sqrt(moveX * moveX + moveY * moveY);
        const nx = moveX / moveLength;
        const ny = moveY / moveLength;
        
        // Move
        x += Math.floor(nx * (2 + Math.random() * 3));
        y += Math.floor(ny * (2 + Math.random() * 3));
      }
    }
    
    return map;
  }
  
  // Generate temperature map
  generateTemperatureMap(resolution) {
    const map = new Array(resolution).fill().map(() => new Array(resolution).fill(0));
    
    // Generate temperature with gradient and noise
    for (let x = 0; x < resolution; x++) {
      for (let y = 0; y < resolution; y++) {
        // Base temperature from y position (north-south gradient)
        const baseTemp = 1 - (y / resolution);
        
        // Add noise for local variations
        const noiseTemp = this.simpleNoise(x * 0.01, y * 0.01) * 0.3;
        
        // Combine
        map[x][y] = Math.max(0, Math.min(1, baseTemp + noiseTemp - 0.15));
      }
    }
    
    return map;
  }
  
  // Generate moisture map
  generateMoistureMap(resolution, riverMap) {
    const map = new Array(resolution).fill().map(() => new Array(resolution).fill(0));
    
    // Generate moisture with noise and river influence
    for (let x = 0; x < resolution; x++) {
      for (let y = 0; y < resolution; y++) {
        // Base moisture from noise
        const baseMoisture = this.simpleNoise(x * 0.005, y * 0.005);
        
        // Add river influence - higher moisture near rivers
        const riverInfluence = riverMap[x][y];
        
        // Calculate distance to nearest river
        let minDistance = resolution;
        const searchRadius = 20;
        
        for (let nx = -searchRadius; nx <= searchRadius; nx++) {
          for (let ny = -searchRadius; ny <= searchRadius; ny++) {
            const rx = x + nx;
            const ry = y + ny;
            
            if (rx >= 0 && rx < resolution && ry >= 0 && ry < resolution && riverMap[rx][ry] > 0.5) {
              const dist = Math.sqrt(nx * nx + ny * ny);
              minDistance = Math.min(minDistance, dist);
            }
          }
        }
        
        // River proximity factor
        const riverProximity = Math.max(0, 1 - (minDistance / searchRadius));
        
        // Combine factors
        map[x][y] = Math.max(0, Math.min(1, 
          baseMoisture * 0.6 + 
          riverInfluence * 0.2 + 
          riverProximity * 0.2
        ));
      }
    }
    
    return map;
  }
  
  // Create detailed terrain texture canvas
  createTerrainTextureCanvas(terrainData, resolution) {
    // Create a canvas for the terrain texture
    const textureResolution = 1024; // Higher res for better detail
    const canvas = document.createElement('canvas');
    canvas.width = textureResolution;
    canvas.height = textureResolution;
    const ctx = canvas.getContext('2d');
    
    // Fill with base color
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, textureResolution, textureResolution);
    
    // Create texture from height and biome data
    const imageData = ctx.getImageData(0, 0, textureResolution, textureResolution);
    const data = imageData.data;
    
    // Helper function to set pixel color
    const setPixel = (x, y, r, g, b, a = 255) => {
      const index = (y * textureResolution + x) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = a;
    };
    
    // Texture generation
    for (let x = 0; x < textureResolution; x++) {
      for (let y = 0; y < textureResolution; y++) {
        // Map texture coordinates to terrain data coordinates
        const terrainX = Math.floor((x / textureResolution) * resolution);
        const terrainY = Math.floor((y / textureResolution) * resolution);
        
        // Get height and biome data
        let height = 0;
        let biome = 'OPEN';
        
        if (terrainX >= 0 && terrainX < resolution && terrainY >= 0 && terrainY < resolution) {
          height = terrainData.heightData[terrainX][terrainY];
          biome = terrainData.biomeData[terrainX][terrainY];
        }
        
        // Base colors for different biomes
        let r, g, b;
        
        if (height < 0) {
          // Water - deep blue
          const depth = Math.min(1, Math.abs(height) / 50);
          r = 10 + (1 - depth) * 20;
          g = 50 + (1 - depth) * 50;
          b = 150 + (1 - depth) * 50;
        }
        else if (height > 300) {
          // Snow - white with slight blue tint
          const snowAmount = Math.min(1, (height - 300) / 200);
          r = 220 + snowAmount * 35;
          g = 220 + snowAmount * 35;
          b = 230 + snowAmount * 25;
        }
        else if (height > 150) {
          // Mountains - gray
          const rockHeight = (height - 150) / 150;
          r = 100 + rockHeight * 50;
          g = 100 + rockHeight * 50;
          b = 100 + rockHeight * 50;
        }
        else if (biome === 'FOREST') {
          // Forest - green
          r = 20 + Math.random() * 10;
          g = 70 + Math.random() * 30;
          b = 20 + Math.random() * 10;
        }
        else if (biome === 'OPEN') {
          // Grassland - lighter green
          r = 50 + Math.random() * 20;
          g = 120 + Math.random() * 30;
          b = 30 + Math.random() * 20;
        }
        else if (biome === 'URBAN') {
          // Rocky/urban - brownish gray
          r = 120 + Math.random() * 20;
          g = 110 + Math.random() * 20;
          b = 100 + Math.random() * 20;
        }
        else {
          // Default - light brown
          r = 150 + Math.random() * 20;
          g = 140 + Math.random() * 20;
          b = 100 + Math.random() * 20;
        }
        
        // Add some noise for texture
        const noise = Math.random() * 20 - 10;
        r = Math.max(0, Math.min(255, r + noise));
        g = Math.max(0, Math.min(255, g + noise));
        b = Math.max(0, Math.min(255, b + noise));
        
        // Set pixel
        setPixel(x, y, r, g, b);
      }
    }
    
    // Update canvas with new image data
    ctx.putImageData(imageData, 0, 0);
    
    // Add some fine texture with canvas operations
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.3;
    
    // Add noise pattern
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * textureResolution;
      const y = Math.random() * textureResolution;
      const size = 1 + Math.random() * 3;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(x, y, size, size);
    }
    
    return canvas;
  }
  
  // Create normal map for terrain texturing
  createTerrainNormalMap(terrainData, resolution) {
    // Create a canvas for the normal map
    const textureResolution = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = textureResolution;
    canvas.height = textureResolution;
    const ctx = canvas.getContext('2d');
    
    // Fill with neutral normal (0.5, 0.5, 1) - represents "up"
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, textureResolution, textureResolution);
    
    // Calculate normals from height data
    const imageData = ctx.getImageData(0, 0, textureResolution, textureResolution);
    const data = imageData.data;
    
    // Helper function to set normal map pixel
    const setNormal = (x, y, nx, ny, nz) => {
      // Convert normal from -1,1 range to 0,1 range for RGB
      const r = Math.floor((nx * 0.5 + 0.5) * 255);
      const g = Math.floor((ny * 0.5 + 0.5) * 255);
      const b = Math.floor((nz * 0.5 + 0.5) * 255);
      
      const index = (y * textureResolution + x) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    };
    
    // Calculate normals from height data
    for (let x = 0; x < textureResolution; x++) {
      for (let y = 0; y < textureResolution; y++) {
        // Map texture coordinates to terrain data coordinates
        const tx = Math.floor((x / textureResolution) * resolution);
        const ty = Math.floor((y / textureResolution) * resolution);
        
        // Get height at this point and neighboring points
        let height = 0;
        let heightL = 0; // left
        let heightR = 0; // right
        let heightT = 0; // top
        let heightB = 0; // bottom
        
        if (tx >= 0 && tx < resolution && ty >= 0 && ty < resolution) {
          height = terrainData.heightData[tx][ty];
          
          // Get neighboring heights with bounds checking
          heightL = (tx > 0) ? terrainData.heightData[tx-1][ty] : height;
          heightR = (tx < resolution-1) ? terrainData.heightData[tx+1][ty] : height;
          heightT = (ty > 0) ? terrainData.heightData[tx][ty-1] : height;
          heightB = (ty < resolution-1) ? terrainData.heightData[tx][ty+1] : height;
        }
        
        // Calculate normal
        const scale = 1.0; // Scale factor for normal strength
        let nx = (heightL - heightR) * scale;
        let ny = (heightT - heightB) * scale;
        let nz = 1.0;
        
        // Normalize
        const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= length;
        ny /= length;
        nz /= length;
        
        // Add some small random variation for texture
        nx += (Math.random() * 0.1 - 0.05);
        ny += (Math.random() * 0.1 - 0.05);
        
        // Renormalize
        const length2 = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= length2;
        ny /= length2;
        nz /= length2;
        
        // Set pixel
        setNormal(x, y, nx, ny, nz);
      }
    }
    
    // Update canvas with new image data
    ctx.putImageData(imageData, 0, 0);
    
    return canvas;
  }
  
  // Create advanced skybox with stars
  createAdvancedSkybox() {
    // Create a more impressive skybox with stars and gradients
    const skyboxSize = 15000;
    
    // Create the skybox geometry
    const skyGeometry = new THREE.BoxGeometry(skyboxSize, skyboxSize, skyboxSize);
    
    // Create skybox cube map - we'll create a uniform sky with stars for simplicity
    const skyMaterial = [];
    
    for (let i = 0; i < 6; i++) {
      // Create a canvas for each face
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      // Create gradient background - from dark blue to black
      let gradient;
      if (i === 2) { // top
        gradient = ctx.createLinearGradient(0, 0, 0, 1024);
        gradient.addColorStop(0, '#000510');
        gradient.addColorStop(1, '#000025');
      } else if (i === 3) { // bottom
        gradient = ctx.createLinearGradient(0, 0, 0, 1024);
        gradient.addColorStop(0, '#000025');
        gradient.addColorStop(1, '#000510');
      } else {
        gradient = ctx.createLinearGradient(0, 0, 0, 1024);
        gradient.addColorStop(0, '#000025');
        gradient.addColorStop(0.5, '#000816');
        gradient.addColorStop(1, '#000025');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 1024);
      
      // Add stars
      const starCount = 500;
      ctx.fillStyle = 'white';
      
      for (let s = 0; s < starCount; s++) {
        const x = Math.floor(Math.random() * 1024);
        const y = Math.floor(Math.random() * 1024);
        const size = Math.random() * 2;
        const brightness = Math.random();
        
        ctx.globalAlpha = 0.4 + brightness * 0.6;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add a few larger stars with glow
      const bigStarCount = 20;
      for (let s = 0; s < bigStarCount; s++) {
        const x = Math.floor(Math.random() * 1024);
        const y = Math.floor(Math.random() * 1024);
        const size = 1 + Math.random() * 2;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(x, y, size, x, y, size * 4);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Star center
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Create material from canvas
      const texture = new THREE.CanvasTexture(canvas);
      skyMaterial.push(new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
      }));
    }
    
    // Create and add skybox to scene
    const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(skybox);
    
    return skybox;
  }
  
  // Original simple terrain generator (keeping for backward compatibility)
  generateTerrainData(geometry) {
    console.log("Generating enhanced 3D terrain data");
    
    // 2D arrays to store height and biome data
    const gridSize = Math.sqrt(geometry.attributes.position.count);
    const heightData = new Array(gridSize).fill().map(() => new Array(gridSize).fill(0));
    const biomeData = new Array(gridSize).fill().map(() => new Array(gridSize).fill('OPEN'));
    
    // Scale factors for noise - increase values for more dramatic terrain
    const mountainScale = 0.0003; // Larger scale mountains
    const hillScale = 0.0008;    // More defined hills
    const detailScale = 0.005;   // Less micro-detail to emphasize larger features
    
    // We'll use simple mathematical functions to simulate noise
    const vertices = geometry.attributes.position.array;
    const colors = new Float32Array(vertices.length);
    
    for (let i = 0, j = 0; i < vertices.length; i += 3, j += 3) {
      // Get x and z coordinates
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Index in the grid - ensure it's within bounds
      const ix = Math.floor((x / CONFIG.terrain.width + 0.5) * (gridSize - 1));
      const iz = Math.floor((z / CONFIG.terrain.height + 0.5) * (gridSize - 1));
      
      // Generate height with multiple noise layers
      // Base mountain range layer - much more dramatic
      const mountainNoise = this.simpleNoise(x * mountainScale, z * mountainScale);
      
      // Hills layer
      const hillNoise = this.simpleNoise(x * hillScale, z * hillScale) * 0.4;
      
      // Small details layer
      const detailNoise = this.simpleNoise(x * detailScale, z * detailScale) * 0.1;
      
      // Make mountain formations more dramatic with some ridges
      const ridgeFactor = Math.pow(Math.abs(0.5 - mountainNoise) * 2, 1.5);
      
      // Valley in the middle - create a large depression
      const centerX = 0;
      const centerZ = 0;
      const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
      const valleyFactor = Math.max(0, 1 - Math.pow(distanceFromCenter / 1500, 2));
      const valleyDepression = valleyFactor * 100; // Deeper valley
      
      // River system - create a meandering river
      const riverWidth = 150;
      const riverDepth = 60; // Deeper river
      const riverMeander = Math.sin(z * 0.001) * 500 + Math.cos(z * 0.0005) * 250; // More meandering
      const distanceFromRiver = Math.abs(x - riverMeander);
      const riverFactor = Math.max(0, 1 - distanceFromRiver / riverWidth);
      const riverDepression = riverFactor * riverDepth;
      
      // Combine all height factors - scale up for more dramatic heights
      let height = (mountainNoise * CONFIG.terrain.maxElevation * 1.5 - ridgeFactor * 60 + // Main mountains with ridges
                   hillNoise * CONFIG.terrain.maxElevation * 0.7 +    // Hills
                   detailNoise * CONFIG.terrain.maxElevation * 0.2 -  // Small details
                   valleyDepression -                                  // Valley
                   riverDepression) * 3;                              // River - scale everything up
      
      // Add occasional spikes in mountain areas for more interesting terrain
      if (mountainNoise > 0.6 && Math.random() < 0.02) {
        height += Math.random() * 150;
      }
      
      // Ensure minimum height (for water bodies)
      height = Math.max(-40, height); // Deeper water
      
      // Store height data in bounds-checked manner
      if (ix >= 0 && ix < gridSize && iz >= 0 && iz < gridSize) {
        heightData[ix][iz] = height;
      }
      
      // Determine biome type based on height and position - more extreme coloring
      let biomeType = 'OPEN'; // Default
      let biomeColor = new THREE.Color(0.4, 0.6, 0.3); // Brighter green
      
      if (height < 0) {
        // Water - more vibrant blue
        biomeType = 'WATER';
        biomeColor = new THREE.Color(0.0, 0.4, 0.8);
      } else if (height < 40) {
        // Lowlands - mix of open areas and forest
        const forestNoise = this.simpleNoise(x * 0.002, z * 0.002);
        if (forestNoise > 0.4) {
          biomeType = 'FOREST';
          biomeColor = new THREE.Color(0.1, 0.5, 0.1); // More vibrant forest
        }
      } else if (height < 150) {
        // Hills - mostly forest
        biomeType = 'FOREST';
        biomeColor = new THREE.Color(0.05, 0.4, 0.05); // Darker forest for hills
      } else if (height < 400) {
        // Mountains - rocky terrain
        biomeType = 'URBAN'; // Using urban for rocky areas
        biomeColor = new THREE.Color(0.6, 0.6, 0.6); // Lighter gray
      } else {
        // High mountains - snow-capped
        biomeType = 'OPEN'; // Representing snow
        biomeColor = new THREE.Color(1.0, 1.0, 1.0); // Pure white for snow
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
    
    console.log("3D terrain generation complete");
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
    
    // Check intersection with terrain (try both terrains)
    const intersects = raycaster.intersectObjects([this.terrain, this.terrain2]);
    
    if (intersects.length > 0) {
      // Update world position
      this.mouse.worldPosition = intersects[0].point;
      
      // Adjust Y position to account for terrain height adjustment
      // We need to add a small offset to ensure jammers are placed on top of the terrain
      this.mouse.worldPosition.y += 5; // Add 5 units offset to ensure visibility
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
    
    // Note: Camera movement and rotation keys (WASD, arrows, Z/X, Q/E) are now handled 
    // in the processKeysInput method for continuous processing and multi-key support
    
    // Terrain visualization modes
    else if (key === 'b') {
      // Toggle between normal and biome coloring
      if (this.terrain && this.terrain.material) {
        this.terrain.material.vertexColors = !this.terrain.material.vertexColors;
        if (!this.terrain.material.vertexColors) {
          // Reset to base color
          this.terrain.material.color.set(0x1e293b);
        } else {
          // Set to white to show vertex colors properly
          this.terrain.material.color.set(0xffffff);
        }
        this.showAlert(`Biome visualization ${this.terrain.material.vertexColors ? 'enabled' : 'disabled'}`, 'info');
      }
    }
    
    // Debug terrain features
    else if (key === 'd') {
      // Toggle between different rendering modes to debug terrain
      if (this.terrain && this.terrain.material) {
        // Cycle through: normal > wireframe > flat shading > normal
        if (!this.terrain.material.wireframe && !this.terrain.material.flatShading) {
          // Switch to wireframe
          this.terrain.material.wireframe = true;
          this.showAlert('Terrain debug: Wireframe mode', 'info');
        } else if (this.terrain.material.wireframe) {
          // Switch to flat shading
          this.terrain.material.wireframe = false;
          this.terrain.material.flatShading = true;
          this.terrain.material.needsUpdate = true;
          this.showAlert('Terrain debug: Flat shading mode', 'info');
        } else {
          // Back to normal
          this.terrain.material.flatShading = false;
          this.terrain.material.needsUpdate = true;
          this.showAlert('Terrain debug: Normal rendering mode', 'info');
        }
      }
    }
    
    // Add "Help" message for camera controls
    else if (key === 'h') {
      this.showAlert('Camera Controls: WASD=position, Z/X=forward/back, QE=height, Arrows=rotate, Shift=sprint, R=reset, B=biome view, M=start mission (multiple keys work simultaneously)', 'info');
    }
    
    // Start mission with 'M' key
    else if (key === 'm' || key === 'M') {
      if (!gameState.missionActive) {
        // Stop intro animation when mission starts
        this.introAnimationActive = false;
        
        gameState.startMission();
        this.showAlert('Mission initiated. Deploying assets and beginning deployment phase.', 'success');
        // Create a deployment effect
        this.createRFToggleEffect();
      } else {
        this.showAlert('Mission already in progress', 'info');
      }
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
      
      // Set camera position for better tactical overview
      this.camera.position.set(0, 3000, 2000);
      this.camera.lookAt(this.cameraState.target);
      
      this.showAlert('Camera reset to terrain overview position', 'info');
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
    
    // Make sure the deployment effect position is consistent with the jammer
    const effectPosition = { ...position };
    
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
  
  // Process multiple keypresses for simultaneous movement & rotation
  processKeysInput(deltaTime) {
    // Skip if camera state isn't initialized
    if (!this.cameraState) return;
    
    // Movement constants
    const baseMoveSpeed = 100;
    const moveSpeed = baseMoveSpeed * deltaTime; // Scale with delta time
    const forwardSpeed = baseMoveSpeed * 4 * deltaTime; // 4x faster forward/backward movement
    
    // Check for sprint modifier (Shift key)
    const sprintMultiplier = this.keys['Shift'] ? 2.5 : 1.0; // 2.5x speed when Shift is pressed
    const actualMoveSpeed = moveSpeed * sprintMultiplier;
    const actualForwardSpeed = forwardSpeed * sprintMultiplier;
    
    const rotateSpeed = 0.05 * deltaTime * 60; // Scale with delta time
    const MIN_CAMERA_HEIGHT = 1000;
    const TERRAIN_HEIGHT = -1000;
    const SAFE_DISTANCE = MIN_CAMERA_HEIGHT - TERRAIN_HEIGHT;
    
    // Check for camera movement keys (WASD)
    if (this.keys['w']) {
      // Move forward (faster speed with sprint modifier)
      this.camera.position.y += actualForwardSpeed;
      this.cameraState.target.y += actualForwardSpeed;
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
      }
    }
    
    if (this.keys['s']) {
      // Move backward with height check (faster speed)
      if (this.camera.position.y > TERRAIN_HEIGHT + SAFE_DISTANCE) {
        this.camera.position.y -= actualForwardSpeed;
        this.cameraState.target.y -= actualForwardSpeed;
      }
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
      }
    }
    
    if (this.keys['a']) {
      // Move left
      this.camera.position.x -= actualMoveSpeed;
      this.cameraState.target.x -= actualMoveSpeed;
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
      }
    }
    
    if (this.keys['d']) {
      // Move right
      this.camera.position.x += actualMoveSpeed;
      this.cameraState.target.x += actualMoveSpeed;
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
      }
    }
    
    // Forward/backward in camera direction with Z/X
    if (this.keys['z']) {
      // Move forward in camera direction (faster speed)
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      
      // Scale the direction vector and move both camera and target
      direction.multiplyScalar(actualForwardSpeed);
      this.camera.position.add(direction);
      this.cameraState.target.add(direction);
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
      }
    }
    
    if (this.keys['x']) {
      // Move backward in camera direction (faster speed)
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      
      // Scale the direction vector and move both camera and target
      direction.multiplyScalar(-actualForwardSpeed);
      this.camera.position.add(direction);
      this.cameraState.target.add(direction);
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
      }
    }
    
    // Camera elevation with Q/E
    if (this.keys['q']) {
      // Move up
      this.camera.position.z += actualMoveSpeed;
      this.camera.lookAt(this.cameraState.target);
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
      }
    }
    
    if (this.keys['e']) {
      // Move down (with limit)
      if (this.camera.position.z > 300) {
        this.camera.position.z -= actualMoveSpeed;
        this.camera.lookAt(this.cameraState.target);
      }
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
      }
    }
    
    // Rotation with arrow keys (now works simultaneously with movement)
    if (this.keys['ArrowLeft']) {
      // Rotate left (increase yaw)
      this.cameraState.yawAngle += rotateSpeed;
      this.updateCameraPosition();
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
      }
    }
    
    if (this.keys['ArrowRight']) {
      // Rotate right (decrease yaw)
      this.cameraState.yawAngle -= rotateSpeed;
      this.updateCameraPosition();
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
      }
    }
    
    if (this.keys['ArrowUp']) {
      // Rotate up (increase pitch, with limit)
      this.cameraState.pitchAngle = Math.min(
        this.cameraState.maxPitchAngle,
        this.cameraState.pitchAngle + rotateSpeed
      );
      this.updateCameraPosition();
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
      }
    }
    
    if (this.keys['ArrowDown']) {
      // Rotate down (decrease pitch, with limit)
      this.cameraState.pitchAngle = Math.max(
        this.cameraState.minPitchAngle,
        this.cameraState.pitchAngle - rotateSpeed
      );
      this.updateCameraPosition();
      
      // Stop intro animation when moving
      if (this.introAnimationActive) {
        this.introAnimationActive = false;
        this.userHasInteracted = true;
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
    
    // Process multi-key input
    this.processKeysInput(deltaTime);
    
    // Get elapsed time from clock (for vaporwave terrain animation)
    const elapsedTime = this.clock.getElapsedTime();
    
    // Update game state
    gameState.update(deltaTime);
    
    // Update ECS
    this.ecs.update(deltaTime);
    
    // Update visualizations (water animations, etc.)
    this.visualizationObjects.forEach((object, key) => {
      if (object.userData && object.userData.update) {
        object.userData.update(deltaTime, object);
      }
    });
    
    // Update vaporwave terrain animation only during intro before user interaction
    if (this.terrain && this.terrain2 && this.terrainHeight && this.introAnimationActive) {
      const speed = 0.04; // Slightly slower for smoother effect with larger terrain
      
      // When the first terrain reaches the end, reset it
      this.terrain.position.z = (elapsedTime * this.terrainHeight * speed) % this.terrainHeight;
      // Position the second terrain behind the first
      this.terrain2.position.z = ((elapsedTime * this.terrainHeight * speed) % this.terrainHeight) - this.terrainHeight;
    } else if (this.terrain && this.terrain2) {
      // Stop terrain at fixed positions after user interaction or when mission is active
      this.terrain.position.z = 0;
      this.terrain2.position.z = -this.terrainHeight;
    }
    
    // Render scene with post-processing if available
    if (this.composer) {
      this.composer.render();
    } else {
      const renderSystem = this.ecs.getSystem('render');
      renderSystem.render();
    }
    
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