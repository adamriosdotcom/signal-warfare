/**
 * SIGNAL WARFARE - ECS Systems
 * 
 * This file defines all systems that operate on entities with specific components.
 * Systems implement game logic and behavior.
 */

// Render System - Handles rendering of entities in THREE.js
class RenderSystem extends System {
  constructor(entityManager) {
    super(entityManager);
    this.requiredComponents = [ComponentTypes.TRANSFORM, ComponentTypes.VISUAL];
    this.scene = null;
    this.renderer = null;
    this.camera = null;
  }
  
  initialize(scene, renderer, camera) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    
    // Listen for new entities with visual components
    this.entityManager.addEventListener('componentAdded', (entityId, componentType, component) => {
      if (componentType === ComponentTypes.VISUAL && this.entityManager.hasComponent(entityId, ComponentTypes.TRANSFORM)) {
        this.initializeEntity(entityId);
      }
    });
    
    // Listen for removed entities
    this.entityManager.addEventListener('entityDestroyed', (entityId) => {
      this.removeEntity(entityId);
    });
    
    // Initialize any existing entities
    const entities = this.getProcessableEntities();
    for (const entityId of entities) {
      this.initializeEntity(entityId);
    }
  }
  
  initializeEntity(entityId) {
    const visualComponent = this.entityManager.getComponent(entityId, ComponentTypes.VISUAL);
    
    // Skip if already initialized or not visible
    if (visualComponent.meshObject || !visualComponent.visible) return;
    
    // Get transform component
    const transformComponent = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM);
    
    // Create the visual representation based on the model type
    let mesh;
    
    if (visualComponent.model === 'jammer') {
      // Create a jammer mesh (simple cube for now)
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshLambertMaterial({ 
        color: visualComponent.color,
        opacity: visualComponent.opacity,
        transparent: visualComponent.opacity < 1
      });
      mesh = new THREE.Mesh(geometry, material);
    } 
    else if (visualComponent.model === 'drone') {
      // Create a drone mesh (simple cone for now)
      const geometry = new THREE.ConeGeometry(0.5, 2, 8);
      const material = new THREE.MeshLambertMaterial({ 
        color: visualComponent.color,
        opacity: visualComponent.opacity,
        transparent: visualComponent.opacity < 1
      });
      mesh = new THREE.Mesh(geometry, material);
    }
    else {
      // Default: create a simple sphere
      const geometry = new THREE.SphereGeometry(0.5, 16, 16);
      const material = new THREE.MeshLambertMaterial({ 
        color: visualComponent.color,
        opacity: visualComponent.opacity,
        transparent: visualComponent.opacity < 1
      });
      mesh = new THREE.Mesh(geometry, material);
    }
    
    // Position the mesh
    mesh.position.set(
      transformComponent.position.x,
      transformComponent.position.y,
      transformComponent.position.z
    );
    
    // Apply rotation (convert to radians)
    mesh.rotation.y = THREE.MathUtils.degToRad(transformComponent.rotation);
    
    // Apply scale
    mesh.scale.set(
      transformComponent.scale.x,
      transformComponent.scale.y,
      transformComponent.scale.z
    );
    
    // Store reference and add to scene
    visualComponent.meshObject = mesh;
    this.scene.add(mesh);
  }
  
  removeEntity(entityId) {
    const visualComponent = this.entityManager.getComponent(entityId, ComponentTypes.VISUAL);
    
    // Skip if no mesh or already removed
    if (!visualComponent || !visualComponent.meshObject) return;
    
    // Remove from scene
    this.scene.remove(visualComponent.meshObject);
    
    // Dispose of geometries and materials
    if (visualComponent.meshObject.geometry) {
      visualComponent.meshObject.geometry.dispose();
    }
    
    if (visualComponent.meshObject.material) {
      if (Array.isArray(visualComponent.meshObject.material)) {
        visualComponent.meshObject.material.forEach(material => material.dispose());
      } else {
        visualComponent.meshObject.material.dispose();
      }
    }
    
    visualComponent.meshObject = null;
  }
  
  processEntity(entityId, deltaTime) {
    const visualComponent = this.entityManager.getComponent(entityId, ComponentTypes.VISUAL);
    const transformComponent = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM);
    
    // Skip if no mesh or not visible
    if (!visualComponent.meshObject || !visualComponent.visible) return;
    
    // Update position
    visualComponent.meshObject.position.set(
      transformComponent.position.x,
      transformComponent.position.y,
      transformComponent.position.z
    );
    
    // Update rotation (convert to radians)
    visualComponent.meshObject.rotation.y = THREE.MathUtils.degToRad(transformComponent.rotation);
    
    // Update scale
    visualComponent.meshObject.scale.set(
      transformComponent.scale.x,
      transformComponent.scale.y,
      transformComponent.scale.z
    );
    
    // Update visibility
    visualComponent.meshObject.visible = visualComponent.visible;
    
    // Update opacity and color if material exists
    if (visualComponent.meshObject.material) {
      visualComponent.meshObject.material.opacity = visualComponent.opacity;
      visualComponent.meshObject.material.transparent = visualComponent.opacity < 1;
      visualComponent.meshObject.material.color.set(visualComponent.color);
    }
  }
  
  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// RF Propagation System - Handles RF signal propagation
class RFPropagationSystem extends System {
  constructor(entityManager) {
    super(entityManager);
    this.requiredComponents = [ComponentTypes.TRANSFORM, ComponentTypes.RF_TRANSMITTER];
    this.scene = null;
    this.calculationCache = new Map();
    this.visualizationObjects = new Map();
    
    // Signal colors
    this.signalColors = {
      strong: new THREE.Color(CONFIG.rf.signalColors.strong),
      medium: new THREE.Color(CONFIG.rf.signalColors.medium),
      weak: new THREE.Color(CONFIG.rf.signalColors.weak),
      trace: new THREE.Color(CONFIG.rf.signalColors.trace)
    };
  }
  
  initialize(scene) {
    this.scene = scene;
    
    // Listen for transmitter component changes
    this.entityManager.addEventListener('componentAdded', (entityId, componentType, component) => {
      if (componentType === ComponentTypes.RF_TRANSMITTER) {
        this.updateTransmitterVisualization(entityId);
      }
    });
    
    // Listen for removed entities
    this.entityManager.addEventListener('entityDestroyed', (entityId) => {
      this.removeVisualization(entityId);
    });
  }
  
  updateTransmitterVisualization(entityId) {
    const transmitterComponent = this.entityManager.getComponent(entityId, ComponentTypes.RF_TRANSMITTER);
    const transformComponent = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM);
    
    // Skip if transmitter is not active
    if (!transmitterComponent.active) {
      this.removeVisualization(entityId);
      return;
    }
    
    // Remove existing visualization if any
    this.removeVisualization(entityId);
    
    // Get antenna properties
    const antennaType = CONFIG.antennas.types[transmitterComponent.antenna];
    
    // Choose color based on power level
    let color;
    if (transmitterComponent.power >= -50) {
      color = this.signalColors.strong;
    } else if (transmitterComponent.power >= -70) {
      color = this.signalColors.medium;
    } else if (transmitterComponent.power >= -85) {
      color = this.signalColors.weak;
    } else {
      color = this.signalColors.trace;
    }
    
    // Create geometry based on antenna type
    let visualizationMesh;
    
    if (transmitterComponent.antenna === 'OMNI') {
      // Omnidirectional - create sphere
      const radius = 5 + (transmitterComponent.power + 100) * 0.5; // Scale radius by power
      const geometry = new THREE.SphereGeometry(radius, 32, 16);
      
      const material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          color: { value: color }
        },
        vertexShader: `
          varying float vOpacity;
          void main() {
            vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * modelViewPosition;
            
            // Fade from center to edge
            vOpacity = 1.0 - (length(position) / ${radius.toFixed(1)});
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          varying float vOpacity;
          void main() {
            gl_FragColor = vec4(color, vOpacity * 0.5);
          }
        `
      });
      
      visualizationMesh = new THREE.Mesh(geometry, material);
    } 
    else {
      // Directional antenna - create cone
      const height = 10 + (transmitterComponent.power + 100) * 1.0; // Scale height by power
      const angle = (antennaType.beamWidth / 2) * Math.PI / 180; // Half angle in radians
      const radius = height * Math.tan(angle);
      
      const geometry = new THREE.ConeGeometry(radius, height, 32, 1, true);
      
      // Rotate cone to point in heading direction
      geometry.rotateX(Math.PI / 2);
      geometry.rotateZ(THREE.MathUtils.degToRad(transmitterComponent.antennaHeading));
      
      const material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          color: { value: color }
        },
        vertexShader: `
          varying float vOpacity;
          void main() {
            vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * modelViewPosition;
            
            // Fade from base to tip
            vOpacity = 1.0 - (position.y / ${height.toFixed(1)});
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          varying float vOpacity;
          void main() {
            gl_FragColor = vec4(color, vOpacity * 0.5);
          }
        `
      });
      
      visualizationMesh = new THREE.Mesh(geometry, material);
    }
    
    // Position the visualization
    visualizationMesh.position.set(
      transformComponent.position.x,
      transformComponent.position.y,
      transformComponent.position.z
    );
    
    // Store and add to scene
    transmitterComponent.visualizationObject = visualizationMesh;
    this.visualizationObjects.set(entityId, visualizationMesh);
    this.scene.add(visualizationMesh);
  }
  
  removeVisualization(entityId) {
    // Get existing visualization
    const visualization = this.visualizationObjects.get(entityId);
    
    if (visualization) {
      // Remove from scene
      this.scene.remove(visualization);
      
      // Dispose of resources
      if (visualization.geometry) {
        visualization.geometry.dispose();
      }
      
      if (visualization.material) {
        visualization.material.dispose();
      }
      
      // Remove from maps
      this.visualizationObjects.delete(entityId);
      
      // Clear reference in component
      const transmitterComponent = this.entityManager.getComponent(entityId, ComponentTypes.RF_TRANSMITTER);
      if (transmitterComponent) {
        transmitterComponent.visualizationObject = null;
      }
    }
  }
  
  // Calculate signal strength between transmitter and receiver
  calculateSignalStrength(transmitterId, receiverId) {
    // Create cache key for this calculation
    const cacheKey = `${transmitterId}_${receiverId}`;
    
    // Check cache first
    if (this.calculationCache.has(cacheKey)) {
      return this.calculationCache.get(cacheKey);
    }
    
    // Get components
    const transmitterRF = this.entityManager.getComponent(transmitterId, ComponentTypes.RF_TRANSMITTER);
    const transmitterTransform = this.entityManager.getComponent(transmitterId, ComponentTypes.TRANSFORM);
    const receiverRF = this.entityManager.getComponent(receiverId, ComponentTypes.RF_RECEIVER);
    const receiverTransform = this.entityManager.getComponent(receiverId, ComponentTypes.TRANSFORM);
    
    // Skip if not active or frequency mismatch
    if (!transmitterRF.active || transmitterRF.frequency !== receiverRF.frequency) {
      return -Infinity;
    }
    
    // Handle pulse jamming
    if (transmitterRF.pulseParameters.pulsing && !transmitterRF.pulseParameters.currentlyTransmitting) {
      return -Infinity;
    }
    
    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(transmitterTransform.position.x - receiverTransform.position.x, 2) +
      Math.pow(transmitterTransform.position.y - receiverTransform.position.y, 2) +
      Math.pow(transmitterTransform.position.z - receiverTransform.position.z, 2)
    );
    
    // Skip if distance is zero (same position)
    if (distance === 0) {
      return transmitterRF.power;
    }
    
    // Get frequency in MHz
    const frequency = CONFIG.rf.frequencyBands[transmitterRF.frequency].value;
    
    // Calculate path loss based on selected model
    let pathLoss = 0;
    
    switch (CONFIG.rf.propagationModel) {
      case 'FSPL':
        pathLoss = this.calculateFSPL(distance, frequency);
        break;
      case 'TWO_RAY':
        pathLoss = this.calculateTwoRayGround(
          distance, frequency, 
          transmitterTransform.position.z, 
          receiverTransform.position.z
        );
        break;
      case 'LOG_DISTANCE':
        pathLoss = this.calculateLogDistance(distance, frequency);
        break;
      default:
        pathLoss = this.calculateFSPL(distance, frequency);
    }
    
    // Apply transmitter power
    let signalStrength = transmitterRF.power + pathLoss;
    
    // Apply antenna gains
    const antennaType = CONFIG.antennas.types[transmitterRF.antenna];
    if (antennaType) {
      // Calculate angle between heading and receiver
      let gainFactor = 1.0;
      
      if (transmitterRF.antenna !== 'OMNI') {
        // Calculate angle between transmitter and receiver
        const dx = receiverTransform.position.x - transmitterTransform.position.x;
        const dy = receiverTransform.position.y - transmitterTransform.position.y;
        const angleToReceiver = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
        
        // Calculate angle difference
        let angleDifference = Math.abs(angleToReceiver - transmitterRF.antennaHeading);
        if (angleDifference > 180) {
          angleDifference = 360 - angleDifference;
        }
        
        // Calculate gain factor based on angle
        const beamWidth = antennaType.beamWidth;
        
        if (angleDifference <= beamWidth / 2) {
          // Within main beam
          gainFactor = Math.pow(Math.cos(Math.PI * angleDifference / beamWidth), 2);
        } else {
          // Side lobe (simplified model)
          gainFactor = Math.max(0.01, 0.2 * Math.pow(Math.cos(Math.PI * angleDifference / beamWidth), 2));
        }
      }
      
      // Apply antenna gain
      signalStrength += antennaType.gainDbi * gainFactor;
    }
    
    // Cache the result
    this.calculationCache.set(cacheKey, signalStrength);
    
    return signalStrength;
  }
  
  // Free Space Path Loss model
  calculateFSPL(distance, frequency) {
    // Convert distance to kilometers
    const distanceKm = distance / 1000;
    
    // Calculate path loss in dB
    const pathLossDb = 20 * Math.log10(distanceKm) + 20 * Math.log10(frequency) + 32.45;
    
    // Return negative path loss (attenuation)
    return -pathLossDb;
  }
  
  // Two-Ray Ground Reflection model
  calculateTwoRayGround(distance, frequency, heightTx, heightRx) {
    // Convert to km
    const distanceKm = distance / 1000;
    
    // For short distances, use FSPL
    if (distance < 1000) {
      return this.calculateFSPL(distance, frequency);
    }
    
    // Ensure heights are at least 1m
    heightTx = Math.max(1, heightTx);
    heightRx = Math.max(1, heightRx);
    
    // Two-ray model for longer distances
    const pathLossDb = 40 * Math.log10(distanceKm) - 
                     20 * Math.log10(heightTx) - 
                     20 * Math.log10(heightRx);
    
    return -pathLossDb;
  }
  
  // Log-Distance Path Loss model
  calculateLogDistance(distance, frequency) {
    // Convert to km
    const distanceKm = distance / 1000;
    
    // Reference distance (1km)
    const d0 = 1;
    
    // Path loss exponent (depends on environment)
    // 2 = free space, 2.7-3.5 = urban, 4-6 = indoor
    const n = 2.8; // Urban environment
    
    // Calculate path loss at reference distance
    const pl0 = 20 * Math.log10(d0) + 20 * Math.log10(frequency) + 32.45;
    
    // Calculate path loss
    const pathLossDb = pl0 + 10 * n * Math.log10(distanceKm / d0);
    
    return -pathLossDb;
  }
  
  processEntity(entityId, deltaTime) {
    const transmitterComponent = this.entityManager.getComponent(entityId, ComponentTypes.RF_TRANSMITTER);
    
    // Update pulse timing if pulsing
    if (transmitterComponent.pulseParameters.pulsing) {
      // Toggle transmission state based on timing
      const currentTime = Date.now();
      const cycleTime = transmitterComponent.pulseParameters.onTime + transmitterComponent.pulseParameters.offTime;
      const cyclePosition = currentTime % cycleTime;
      
      const newTransmittingState = cyclePosition < transmitterComponent.pulseParameters.onTime;
      
      // If state changed, update visualization
      if (newTransmittingState !== transmitterComponent.pulseParameters.currentlyTransmitting) {
        transmitterComponent.pulseParameters.currentlyTransmitting = newTransmittingState;
        this.updateTransmitterVisualization(entityId);
      }
    }
    
    // Check if visualization needs update
    const visualizationObject = transmitterComponent.visualizationObject;
    
    if (transmitterComponent.active && !visualizationObject) {
      // Create visualization
      this.updateTransmitterVisualization(entityId);
    } else if (!transmitterComponent.active && visualizationObject) {
      // Remove visualization
      this.removeVisualization(entityId);
    }
  }
  
  // Process all RF receivers
  updateReceivers() {
    // Clear cache for new calculations
    this.calculationCache.clear();
    
    // Get all transmitters and receivers
    const transmitters = this.getProcessableEntities();
    const receivers = this.entityManager.getEntitiesWithComponents(
      ComponentTypes.TRANSFORM, ComponentTypes.RF_RECEIVER
    );
    
    // Reset all receivers
    for (const receiverId of receivers) {
      const receiverRF = this.entityManager.getComponent(receiverId, ComponentTypes.RF_RECEIVER);
      receiverRF.receivedSignals = [];
      receiverRF.currentSignalStrength = null;
      receiverRF.jammedState = false;
    }
    
    // Calculate signal strength for each transmitter-receiver pair
    for (const transmitterId of transmitters) {
      const transmitterRF = this.entityManager.getComponent(transmitterId, ComponentTypes.RF_TRANSMITTER);
      
      // Skip inactive transmitters
      if (!transmitterRF.active) continue;
      
      for (const receiverId of receivers) {
        const receiverRF = this.entityManager.getComponent(receiverId, ComponentTypes.RF_RECEIVER);
        
        // Calculate signal strength
        const signalStrength = this.calculateSignalStrength(transmitterId, receiverId);
        
        // If signal is detectable, add to receiver's signals
        if (signalStrength > receiverRF.sensitivity) {
          receiverRF.receivedSignals.push({
            transmitterId,
            frequency: transmitterRF.frequency,
            strength: signalStrength
          });
          
          // Update current signal strength to strongest signal
          if (receiverRF.currentSignalStrength === null || signalStrength > receiverRF.currentSignalStrength) {
            receiverRF.currentSignalStrength = signalStrength;
          }
          
          // Check if this is a jammer
          if (this.entityManager.hasComponent(transmitterId, ComponentTypes.JAMMER)) {
            const jammerComponent = this.entityManager.getComponent(transmitterId, ComponentTypes.JAMMER);
            if (jammerComponent.active && jammerComponent.targetFrequency === receiverRF.frequency) {
              receiverRF.jammedState = true;
            }
          }
        }
      }
    }
  }
  
  update(deltaTime) {
    super.update(deltaTime);
    
    // Process all entities first
    const entities = this.getProcessableEntities();
    for (const entityId of entities) {
      this.processEntity(entityId, deltaTime);
    }
    
    // Then update all receivers
    this.updateReceivers();
  }
}

// AI System - Manages AI behavior for drones and other entities
class AISystem extends System {
  constructor(entityManager) {
    super(entityManager);
    this.requiredComponents = [ComponentTypes.AI, ComponentTypes.TRANSFORM];
  }
  
  processEntity(entityId, deltaTime) {
    const aiComponent = this.entityManager.getComponent(entityId, ComponentTypes.AI);
    const transformComponent = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM);
    
    // Process based on AI behavior type
    switch (aiComponent.behavior) {
      case 'patrol':
        this.processPatrolBehavior(entityId, aiComponent, transformComponent, deltaTime);
        break;
      case 'defend':
        this.processDefendBehavior(entityId, aiComponent, transformComponent, deltaTime);
        break;
      case 'attack':
        this.processAttackBehavior(entityId, aiComponent, transformComponent, deltaTime);
        break;
      default:
        // Do nothing for unknown behavior
    }
    
    // Process AI state machine
    this.processStateMachine(entityId, aiComponent, deltaTime);
  }
  
  processStateMachine(entityId, aiComponent, deltaTime) {
    // Handle confusion state timing
    if (aiComponent.state === 'confused' && aiComponent.confusionTimer > 0) {
      aiComponent.confusionTimer -= deltaTime;
      
      // Return to normal state if timer expires
      if (aiComponent.confusionTimer <= 0) {
        aiComponent.state = 'idle';
        aiComponent.confusionLevel = 0;
        aiComponent.lastStateChangeTime = Date.now();
      }
    }
    
    // Check if entity has an RF receiver that is jammed
    if (this.entityManager.hasComponent(entityId, ComponentTypes.RF_RECEIVER)) {
      const receiverRF = this.entityManager.getComponent(entityId, ComponentTypes.RF_RECEIVER);
      
      if (receiverRF.jammedState && aiComponent.state !== 'confused') {
        // Enter confused state
        aiComponent.state = 'confused';
        aiComponent.confusionLevel = 100;
        aiComponent.confusionTimer = CONFIG.drones.ai.jammedDuration;
        aiComponent.lastStateChangeTime = Date.now();
      }
    }
    
    // Process drone-specific behavior
    if (this.entityManager.hasComponent(entityId, ComponentTypes.DRONE)) {
      this.processDroneStateMachine(entityId, aiComponent);
    }
  }
  
  processDroneStateMachine(entityId, aiComponent) {
    const droneComponent = this.entityManager.getComponent(entityId, ComponentTypes.DRONE);
    const transformComponent = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM);
    
    // Handle state transitions
    switch (aiComponent.state) {
      case 'confused':
        // Confused drone behavior
        if (CONFIG.drones.ai.confusedBehavior === 'random') {
          // Random movement
          if (Math.random() < 0.05) {
            const randomAngle = Math.random() * 360;
            transformComponent.rotation = randomAngle;
          }
          
          // Move forward
          const moveSpeed = droneComponent.speed * 0.5; // Half speed when confused
          const angleRad = THREE.MathUtils.degToRad(transformComponent.rotation);
          transformComponent.position.x += Math.cos(angleRad) * moveSpeed * 0.01;
          transformComponent.position.y += Math.sin(angleRad) * moveSpeed * 0.01;
        } 
        else if (CONFIG.drones.ai.confusedBehavior === 'circle') {
          // Circular pattern
          const time = Date.now() / 1000;
          const radius = 50;
          const startX = transformComponent.position.x;
          const startY = transformComponent.position.y;
          
          transformComponent.position.x = startX + radius * Math.cos(time);
          transformComponent.position.y = startY + radius * Math.sin(time);
          transformComponent.rotation = (time * 180 / Math.PI) % 360;
        }
        // Hover in place for 'hover' behavior (no movement)
        break;
        
      case 'patrol':
        // Patrol waypoints
        if (droneComponent.waypoints.length > 0) {
          // Check if we've reached the current waypoint
          const currentWaypoint = droneComponent.waypoints[0];
          const distance = Math.sqrt(
            Math.pow(transformComponent.position.x - currentWaypoint.x, 2) + 
            Math.pow(transformComponent.position.y - currentWaypoint.y, 2)
          );
          
          // If reached waypoint, move to next
          if (distance < 5) {
            droneComponent.waypoints.shift();
            if (droneComponent.waypoints.length === 0) {
              // End of patrol route
              if (droneComponent.returnToBaseWhenComplete && droneComponent.baseLocation) {
                aiComponent.state = 'returning';
                droneComponent.target = droneComponent.baseLocation;
              } else {
                aiComponent.state = 'idle';
              }
            }
          } else {
            // Move toward waypoint
            this.moveTowardTarget(transformComponent, currentWaypoint, droneComponent.speed);
          }
        }
        break;
        
      case 'returning':
        // Return to base
        if (droneComponent.baseLocation) {
          const distance = Math.sqrt(
            Math.pow(transformComponent.position.x - droneComponent.baseLocation.x, 2) + 
            Math.pow(transformComponent.position.y - droneComponent.baseLocation.y, 2)
          );
          
          // If reached base
          if (distance < 5) {
            aiComponent.state = 'idle';
          } else {
            // Move toward base
            this.moveTowardTarget(transformComponent, droneComponent.baseLocation, droneComponent.speed);
          }
        }
        break;
        
      case 'disabled':
        // Disabled drones don't move
        break;
        
      default:
        // Idle state
        // If drone has target, move toward it
        if (droneComponent.target) {
          const distance = Math.sqrt(
            Math.pow(transformComponent.position.x - droneComponent.target.x, 2) + 
            Math.pow(transformComponent.position.y - droneComponent.target.y, 2)
          );
          
          // If reached target
          if (distance < 5) {
            droneComponent.target = null;
          } else {
            // Move toward target
            this.moveTowardTarget(transformComponent, droneComponent.target, droneComponent.speed);
          }
        }
    }
    
    // Update remaining time
    droneComponent.remainingTime -= deltaTime;
    if (droneComponent.remainingTime <= 0 && aiComponent.state !== 'disabled') {
      // Drone runs out of power
      aiComponent.state = 'disabled';
    }
  }
  
  moveTowardTarget(transformComponent, target, speed) {
    // Calculate direction to target
    const dx = target.x - transformComponent.position.x;
    const dy = target.y - transformComponent.position.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Update rotation
    transformComponent.rotation = angle;
    
    // Move toward target
    const moveSpeed = speed * 0.01; // Scale speed per frame
    transformComponent.position.x += Math.cos(angle * Math.PI / 180) * moveSpeed;
    transformComponent.position.y += Math.sin(angle * Math.PI / 180) * moveSpeed;
  }
  
  processPatrolBehavior(entityId, aiComponent, transformComponent, deltaTime) {
    // Patrol behavior implementation
  }
  
  processDefendBehavior(entityId, aiComponent, transformComponent, deltaTime) {
    // Defend behavior implementation
  }
  
  processAttackBehavior(entityId, aiComponent, transformComponent, deltaTime) {
    // Attack behavior implementation
  }
}

// Jammer System - Manages jammer entities
class JammerSystem extends System {
  constructor(entityManager) {
    super(entityManager);
    this.requiredComponents = [ComponentTypes.JAMMER, ComponentTypes.RF_TRANSMITTER];
  }
  
  processEntity(entityId, deltaTime) {
    const jammerComponent = this.entityManager.getComponent(entityId, ComponentTypes.JAMMER);
    const transmitterComponent = this.entityManager.getComponent(entityId, ComponentTypes.RF_TRANSMITTER);
    
    // Update cooldown
    if (jammerComponent.cooldownRemaining > 0) {
      jammerComponent.cooldownRemaining -= deltaTime;
      
      // Clamp to zero
      if (jammerComponent.cooldownRemaining < 0) {
        jammerComponent.cooldownRemaining = 0;
      }
    }
    
    // Ensure transmitter settings match jammer configuration
    transmitterComponent.active = jammerComponent.active && jammerComponent.cooldownRemaining === 0;
    transmitterComponent.frequency = jammerComponent.targetFrequency;
    transmitterComponent.power = jammerComponent.powerLevel;
    
    // Handle jammer specific behaviors
    if (jammerComponent.type === 'PULSE' && transmitterComponent.active) {
      // Configure pulsing behavior
      transmitterComponent.pulseParameters.pulsing = true;
      transmitterComponent.pulseParameters.onTime = 200;  // 200ms on
      transmitterComponent.pulseParameters.offTime = 800; // 800ms off
    } else {
      // Non-pulsing jammers
      transmitterComponent.pulseParameters.pulsing = false;
    }
  }
  
  activateJammer(entityId) {
    const jammerComponent = this.entityManager.getComponent(entityId, ComponentTypes.JAMMER);
    
    // Skip if on cooldown
    if (jammerComponent.cooldownRemaining > 0 || jammerComponent.depleted) {
      return false;
    }
    
    // Activate jammer
    jammerComponent.active = true;
    
    return true;
  }
  
  deactivateJammer(entityId) {
    const jammerComponent = this.entityManager.getComponent(entityId, ComponentTypes.JAMMER);
    const transmitterComponent = this.entityManager.getComponent(entityId, ComponentTypes.RF_TRANSMITTER);
    
    // Deactivate jammer
    jammerComponent.active = false;
    transmitterComponent.active = false;
    
    // Apply cooldown based on jammer type
    const jammerConfig = CONFIG.jammers.types[jammerComponent.type];
    jammerComponent.cooldownRemaining = jammerConfig.cooldown;
    
    return true;
  }
  
  setJammerFrequency(entityId, frequency) {
    const jammerComponent = this.entityManager.getComponent(entityId, ComponentTypes.JAMMER);
    
    // Validate frequency
    if (!CONFIG.rf.frequencyBands[frequency]) {
      return false;
    }
    
    // Update frequency
    jammerComponent.targetFrequency = frequency;
    
    return true;
  }
  
  setJammerPower(entityId, power) {
    const jammerComponent = this.entityManager.getComponent(entityId, ComponentTypes.JAMMER);
    const jammerConfig = CONFIG.jammers.types[jammerComponent.type];
    
    // Validate power level
    if (power < jammerConfig.powerLevels.min || power > jammerConfig.powerLevels.max) {
      return false;
    }
    
    // Update power
    jammerComponent.powerLevel = power;
    
    return true;
  }
}

// Physics System - Handles basic physics for moving entities
class PhysicsSystem extends System {
  constructor(entityManager) {
    super(entityManager);
    this.requiredComponents = [ComponentTypes.TRANSFORM];
    this.worldBounds = {
      minX: -CONFIG.terrain.width / 2,
      maxX: CONFIG.terrain.width / 2,
      minY: -CONFIG.terrain.height / 2,
      maxY: CONFIG.terrain.height / 2
    };
  }
  
  processEntity(entityId, deltaTime) {
    const transformComponent = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM);
    
    // Enforce world bounds
    transformComponent.position.x = Math.max(
      this.worldBounds.minX, 
      Math.min(this.worldBounds.maxX, transformComponent.position.x)
    );
    
    transformComponent.position.y = Math.max(
      this.worldBounds.minY, 
      Math.min(this.worldBounds.maxY, transformComponent.position.y)
    );
  }
}