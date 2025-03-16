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
      // Use standard rendering for now
      this.renderer.render(this.scene, this.camera);
      
      // Post-processing disabled for compatibility
      /*
      // Check if we have a composer (for post-processing)
      if (window.gameEngine && window.gameEngine.composer) {
        window.gameEngine.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
      */
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
      
      // Create advanced shader material for pulsing effect
      const material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          color: { value: color },
          time: { value: 0.0 },
          pulseSpeed: { value: 1.0 },
          pulseIntensity: { value: 0.1 },
          noiseScale: { value: 5.0 }  // Add noise scale for more complex animation
        },
        vertexShader: `
          varying float vOpacity;
          varying vec3 vPosition;
          varying vec2 vUv;
          
          void main() {
            vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * modelViewPosition;
            
            // Pass position to fragment shader
            vPosition = position;
            vUv = uv;
            
            // Fade from center to edge
            vOpacity = 1.0 - (length(position) / ${radius.toFixed(1)});
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float time;
          uniform float pulseSpeed;
          uniform float pulseIntensity;
          uniform float noiseScale;
          
          varying float vOpacity;
          varying vec3 vPosition;
          varying vec2 vUv;
          
          // Improved noise function for more organic look
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }
          
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }
          
          void main() {
            // Create complex pulsing effect with sin wave and noise
            float pulse = pulseIntensity * sin(time * pulseSpeed);
            
            // Add noise variation
            float noiseValue = noise(vUv * noiseScale + time * 0.5) * 0.2;
            
            // Apply pulse and noise to opacity
            float opacity = vOpacity * (0.5 + pulse + noiseValue);
            
            // Apply radial gradient with noise variation
            float gradient = smoothstep(0.0, 1.0, vOpacity + noiseValue);
            
            // Create edge glow effect with time variation
            float edgeGlow = smoothstep(0.4 + 0.1 * sin(time), 0.5, vOpacity) * 0.5;
            
            // Final color with edge highlight
            vec3 finalColor = mix(color * 1.8, color, gradient);
            
            // Add subtle electric blue highlights
            finalColor += vec3(0.0, 0.1, 0.2) * edgeGlow * (0.8 + 0.2 * sin(time * 2.0));
            
            gl_FragColor = vec4(finalColor, opacity);
          }
        `
      });
      
      // Create animation update function
      const clock = new THREE.Clock();
      
      // Attach update function to material
      material.userData = {
        update: function() {
          this.uniforms.time.value = clock.getElapsedTime();
        }
      };
      
      visualizationMesh = new THREE.Mesh(geometry, material);
      
      // Create additional effect - multiple rings pulsing outward
      const createRing = (size, speed, delay) => {
        const ringGeometry = new THREE.RingGeometry(radius * size, radius * (size + 0.03), 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        
        // Animation for ring
        ring.userData = {
          initialScale: 0.1,
          speed: speed,
          timeOffset: delay,
          update: function(delta) {
            const time = clock.getElapsedTime() + this.timeOffset;
            
            // Pulsing scale based on sin wave
            this.scale.x = 0.1 + Math.abs(Math.sin(time * this.speed)) * 2.5;
            this.scale.y = 0.1 + Math.abs(Math.sin(time * this.speed)) * 2.5;
            this.scale.z = 1;
            
            // Pulsing opacity
            this.material.opacity = 0.4 * (1 - Math.abs(Math.sin(time * this.speed)) / 3);
          }
        };
        
        // Initialize scale
        ring.scale.set(0.1, 0.1, 1);
        
        return ring;
      };
      
      // Add multiple rings with different speeds and delays
      visualizationMesh.add(createRing(0.8, 0.5, 0));
      visualizationMesh.add(createRing(0.85, 0.7, 1));
      visualizationMesh.add(createRing(0.9, 0.4, 2));
      
      // Add particle effect for omnidirectional signal
      const particleCount = 80;
      const particleGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      const particleSizes = new Float32Array(particleCount);
      
      // Create spherical particle distribution
      for (let i = 0; i < particleCount; i++) {
        // Spherical coordinates
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = (0.7 + Math.random() * 0.3) * radius;
        
        // Convert to Cartesian
        particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        particlePositions[i * 3 + 2] = r * Math.cos(phi);
        
        // Varying particle sizes
        particleSizes[i] = 2 + Math.random() * 3;
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
      
      // Create glowing particle material
      const particleMaterial = new THREE.PointsMaterial({
        color: color,
        transparent: true,
        opacity: 0.6,
        size: 3,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
      });
      
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      
      // Animation for particles
      particles.userData = {
        startPositions: particlePositions.slice(), // Clone initial positions
        speeds: Array(particleCount).fill().map(() => 0.2 + Math.random() * 0.3),
        update: function(delta) {
          const time = clock.getElapsedTime();
          const positions = this.geometry.attributes.position.array;
          
          for (let i = 0; i < particleCount; i++) {
            // Create pulsing movement based on sine waves with different frequencies
            const xFactor = Math.sin(time * this.speeds[i] + i * 0.1);
            const yFactor = Math.sin(time * this.speeds[i] + i * 0.2 + 1.3);
            const zFactor = Math.sin(time * this.speeds[i] + i * 0.3 + 2.6);
            
            // Apply slight position variation around original position
            positions[i * 3] = this.startPositions[i * 3] + xFactor * 5;
            positions[i * 3 + 1] = this.startPositions[i * 3 + 1] + yFactor * 5;
            positions[i * 3 + 2] = this.startPositions[i * 3 + 2] + zFactor * 5;
          }
          
          // Make particles "breathe" by adjusting size
          const sizes = this.geometry.attributes.size.array;
          for (let i = 0; i < particleCount; i++) {
            sizes[i] = 2 + Math.random() * 3 + Math.sin(time * 2 + i) * 1;
          }
          
          this.geometry.attributes.position.needsUpdate = true;
          this.geometry.attributes.size.needsUpdate = true;
        }
      };
      
      // Add particles to visualization
      visualizationMesh.add(particles);
      
      // Add central light source
      const light = new THREE.PointLight(color, 1, radius * 2);
      light.intensity = 0.8;
      light.position.set(0, 0, 0);
      
      // Animation for light
      light.userData = {
        update: function(delta) {
          const time = clock.getElapsedTime();
          this.intensity = 0.6 + Math.sin(time * 2) * 0.2;
        }
      };
      
      visualizationMesh.add(light);
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
      
      // Create advanced shader material with wave pattern
      const material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          color: { value: color },
          time: { value: 0.0 },
          waveSpeed: { value: 2.0 },
          waveFrequency: { value: 6.0 },
          waveAmplitude: { value: 0.1 },
          noiseIntensity: { value: 0.15 }
        },
        vertexShader: `
          varying float vOpacity;
          varying vec3 vPosition;
          varying vec2 vUv;
          
          void main() {
            vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * modelViewPosition;
            
            // Pass values to fragment shader
            vPosition = position;
            vUv = uv;
            
            // Fade from base to tip
            vOpacity = 1.0 - (position.y / ${height.toFixed(1)});
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float time;
          uniform float waveSpeed;
          uniform float waveFrequency;
          uniform float waveAmplitude;
          uniform float noiseIntensity;
          
          varying float vOpacity;
          varying vec3 vPosition;
          varying vec2 vUv;
          
          // Improved noise function
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }
          
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }
          
          void main() {
            // Create wave pattern with traveling waves
            float wave = sin(vPosition.y * waveFrequency - time * waveSpeed) * waveAmplitude;
            
            // Add noise variation for more organic look
            float noiseValue = noise(vUv * 5.0 + time * 0.5) * noiseIntensity;
            
            // Multiple wave patterns for complexity
            float wave2 = cos(vPosition.y * waveFrequency * 1.5 - time * waveSpeed * 0.7) * waveAmplitude * 0.7;
            
            // Apply waves and noise to opacity
            float opacity = vOpacity * (0.5 + wave + wave2 + noiseValue);
            
            // Create dynamic edge glow
            float edge = smoothstep(0.0, 0.2 + 0.05 * sin(time), vOpacity) * 0.8;
            
            // Final color with edge glow and directional fading
            vec3 finalColor = mix(color * 1.8, color, edge);
            
            // Add electric highlights based on position and time
            float highlight = pow(vOpacity, 2.0) * (0.8 + 0.3 * sin(time * 3.0 + vPosition.y * 0.2));
            finalColor += vec3(0.0, 0.1, 0.3) * highlight;
            
            gl_FragColor = vec4(finalColor, opacity);
          }
        `
      });
      
      // Create animation update function
      const clock = new THREE.Clock();
      
      // Attach update function to material
      material.userData = {
        update: function() {
          this.uniforms.time.value = clock.getElapsedTime();
        }
      };
      
      visualizationMesh = new THREE.Mesh(geometry, material);
      
      // Add directional light inside cone for glow effect
      const light = new THREE.SpotLight(color, 2, height, angle * 2, 0.5, 2);
      light.position.set(0, 0, 0);
      light.target.position.set(0, height, 0);
      visualizationMesh.add(light);
      visualizationMesh.add(light.target);
      
      // Animation for light
      light.userData = {
        update: function(delta) {
          const time = clock.getElapsedTime();
          this.intensity = 1.5 + Math.sin(time * 3) * 0.5;
        }
      };
      
      // Add enhanced particle effects - 3 different particle systems
      
      // 1. Directional beam particles
      const beamParticleCount = 80;
      const beamGeometry = new THREE.BufferGeometry();
      const beamPositions = new Float32Array(beamParticleCount * 3);
      const beamSizes = new Float32Array(beamParticleCount);
      const beamColors = new Float32Array(beamParticleCount * 3);
      
      // Create directional particles along cone
      for (let i = 0; i < beamParticleCount; i++) {
        const progress = i / beamParticleCount;
        const distFromCenter = Math.random() * progress * radius * 0.8;
        const angle = Math.random() * Math.PI * 2;
        const xOffset = Math.cos(angle) * distFromCenter;
        const zOffset = Math.sin(angle) * distFromCenter;
        
        beamPositions[i * 3] = xOffset;
        beamPositions[i * 3 + 1] = progress * height * 0.97; // Distribute along height
        beamPositions[i * 3 + 2] = zOffset;
        
        // Size decreases toward the tip
        beamSizes[i] = (1 - progress) * 6 + 2;
        
        // Color variation based on signal strength
        if (progress < 0.3) {
          // Brightest near source (white-ish)
          beamColors[i * 3] = color.r + 0.3;
          beamColors[i * 3 + 1] = color.g + 0.3;
          beamColors[i * 3 + 2] = color.b + 0.3;
        } else {
          // Transition to signal color
          beamColors[i * 3] = color.r;
          beamColors[i * 3 + 1] = color.g;
          beamColors[i * 3 + 2] = color.b;
        }
      }
      
      beamGeometry.setAttribute('position', new THREE.BufferAttribute(beamPositions, 3));
      beamGeometry.setAttribute('size', new THREE.BufferAttribute(beamSizes, 1));
      beamGeometry.setAttribute('color', new THREE.BufferAttribute(beamColors, 3));
      
      // Create particle material with custom shader for glowing particles
      const beamParticleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          pointTexture: { value: null } // We'll use a simple programmatic texture
        },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          uniform float time;
          
          void main() {
            vColor = color;
            
            // Calculate position with slight movement
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            // Size attenuation
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          
          void main() {
            // Create circular particle with soft edge
            float r = 0.5;
            vec2 uv = gl_PointCoord - vec2(0.5);
            float dist = length(uv);
            
            if (dist > r) {
                discard;
            }
            
            // Soft gradient for particle
            float alpha = 1.0 - smoothstep(0.0, r, dist);
            
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
        blending: THREE.AdditiveBlending
      });
      
      const beamParticles = new THREE.Points(beamGeometry, beamParticleMaterial);
      
      // Animation for beam particles
      beamParticles.userData = {
        originalPositions: beamPositions.slice(),
        speeds: Array(beamParticleCount).fill().map(() => Math.random() * 0.3 + 0.1),
        update: function(delta) {
          const time = clock.getElapsedTime();
          const positions = this.geometry.attributes.position.array;
          
          // Update particle positions with flowing motion
          for (let i = 0; i < beamParticleCount; i++) {
            const progress = i / beamParticleCount;
            
            // Original position
            const baseX = this.originalPositions[i * 3];
            const baseY = this.originalPositions[i * 3 + 1];
            const baseZ = this.originalPositions[i * 3 + 2];
            
            // Add flowing motion
            const flowSpeed = this.speeds[i] * 50;
            positions[i * 3 + 1] += flowSpeed * delta;
            
            // Spiral motion
            const spiralFactor = Math.sin(time * 2 + i * 0.1) * 0.2;
            positions[i * 3] = baseX + spiralFactor * (1 - progress) * radius * 0.3;
            positions[i * 3 + 2] = baseZ + spiralFactor * (1 - progress) * radius * 0.3;
            
            // Reset when reaching the end
            if (positions[i * 3 + 1] > height * 1.1) {
              const distFromCenter = Math.random() * 0.2 * radius;
              const angle = Math.random() * Math.PI * 2;
              
              positions[i * 3] = Math.cos(angle) * distFromCenter;
              positions[i * 3 + 1] = 0; // Start at base
              positions[i * 3 + 2] = Math.sin(angle) * distFromCenter;
            }
          }
          
          // Make sizes pulse slightly
          const sizes = this.geometry.attributes.size.array;
          for (let i = 0; i < beamParticleCount; i++) {
            const progress = i / beamParticleCount;
            sizes[i] = (1 - progress) * 6 + 2 + Math.sin(time * 3 + i * 0.2) * 1;
          }
          
          // Update shader time
          this.material.uniforms.time.value = time;
          
          // Update geometry
          this.geometry.attributes.position.needsUpdate = true;
          this.geometry.attributes.size.needsUpdate = true;
        }
      };
      
      // 2. Wave rings at base of cone
      const createWaveRing = (size, speed, delay, opacity) => {
        const ringGeometry = new THREE.RingGeometry(radius * size, radius * (size + 0.05), 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: opacity,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        
        // Animation for ring
        ring.userData = {
          speed: speed,
          timeOffset: delay,
          update: function(delta) {
            const time = clock.getElapsedTime() + this.timeOffset;
            
            // Pulsing opacity
            this.material.opacity = opacity * (0.5 + Math.sin(time * this.speed) * 0.5);
            
            // Slight size variation
            const scaleFactor = 1 + Math.sin(time * this.speed * 0.5) * 0.1;
            this.scale.set(scaleFactor, scaleFactor, 1);
          }
        };
        
        return ring;
      };
      
      // Create multiple wave rings and position at base of cone
      const waveRings = new THREE.Group();
      waveRings.position.set(0, 0, 0);
      
      // Add several rings with different speeds
      waveRings.add(createWaveRing(0.7, 1.5, 0, 0.4));
      waveRings.add(createWaveRing(0.85, 2.2, 0.5, 0.3));
      waveRings.add(createWaveRing(1.0, 1.8, 1.0, 0.2));
      
      // Rotate rings to face direction of cone
      waveRings.rotation.x = Math.PI / 2;
      
      visualizationMesh.add(waveRings);
      
      // Rotate particles to match cone orientation
      beamParticles.rotation.x = Math.PI / 2;
      beamParticles.rotation.z = THREE.MathUtils.degToRad(transmitterComponent.antennaHeading);
      
      // Disable raycasting for particles
      beamParticles.raycast = () => {};
      
      // Add particles to visualization mesh
      visualizationMesh.add(beamParticles);
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
    
    // Update visualization animations
    this.updateVisualizations(deltaTime);
  }
  
  // Update all visualization animations
  updateVisualizations(deltaTime) {
    // Update each visualization mesh
    this.visualizationObjects.forEach((mesh) => {
      // Update main mesh material if it has an update function
      if (mesh.material && mesh.material.userData && mesh.material.userData.update) {
        mesh.material.userData.update(deltaTime);
      }
      
      // Update child objects (rings, particles, etc.)
      mesh.children.forEach(child => {
        if (child.userData && child.userData.update) {
          child.userData.update(deltaTime);
        }
      });
    });
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
    const visualComponent = this.entityManager.getComponent(entityId, ComponentTypes.VISUAL);
    
    // Update cooldown
    if (jammerComponent.cooldownRemaining > 0) {
      jammerComponent.cooldownRemaining -= deltaTime;
      
      // Clamp to zero
      if (jammerComponent.cooldownRemaining < 0) {
        jammerComponent.cooldownRemaining = 0;
      }
      
      // Update cooldown visualization
      if (visualComponent && visualComponent.meshObject) {
        // Calculate cooldown progress (0 to 1)
        const cooldownDuration = CONFIG.jammers.types[jammerComponent.type].cooldown;
        const cooldownProgress = jammerComponent.cooldownRemaining / cooldownDuration;
        
        // Apply pulsing effect to jammer during cooldown
        if (cooldownProgress > 0) {
          // Pulse color between normal and red
          const pulseRate = 3; // Pulses per second
          const pulsePhase = (Math.sin(Date.now() * 0.01 * pulseRate) + 1) / 2; // 0 to 1
          
          // Increase red component based on pulse
          const baseColor = CONFIG.jammers.types[jammerComponent.type].color;
          const cooldownColor = new THREE.Color(
            Math.min(1.0, baseColor.r + 0.3 * pulsePhase),
            Math.max(0.0, baseColor.g - 0.2 * pulsePhase),
            Math.max(0.0, baseColor.b - 0.2 * pulsePhase)
          );
          
          // Apply color to jammer mesh
          visualComponent.color = cooldownColor.getHex();
          
          // Add or update cooldown indicator (moving progress ring)
          this.updateCooldownIndicator(entityId, cooldownProgress);
        } else {
          // Remove cooldown indicator when done
          this.removeCooldownIndicator(entityId);
          
          // Reset to base color
          visualComponent.color = CONFIG.jammers.types[jammerComponent.type].color;
        }
      }
    }
    
    // Check for active state change
    const wasActive = transmitterComponent.active;
    
    // Ensure transmitter settings match jammer configuration
    transmitterComponent.active = jammerComponent.active && jammerComponent.cooldownRemaining === 0;
    transmitterComponent.frequency = jammerComponent.targetFrequency;
    transmitterComponent.power = jammerComponent.powerLevel;
    
    // Handle activation/deactivation effects
    if (wasActive !== transmitterComponent.active) {
      if (transmitterComponent.active) {
        // Jammer activated effect
        this.createJammerActivationEffect(entityId);
      } else {
        // Jammer deactivated effect
        this.createJammerDeactivationEffect(entityId);
      }
    }
    
    // Handle jammer specific behaviors
    if (jammerComponent.type === 'PULSE' && transmitterComponent.active) {
      // Configure pulsing behavior
      transmitterComponent.pulseParameters.pulsing = true;
      transmitterComponent.pulseParameters.onTime = 200;  // 200ms on
      transmitterComponent.pulseParameters.offTime = 800; // 800ms off
      
      // Add pulse visualization effect
      this.updatePulseEffect(entityId, deltaTime);
    } else {
      // Non-pulsing jammers
      transmitterComponent.pulseParameters.pulsing = false;
      
      // Remove pulse effect if it exists
      this.removePulseEffect(entityId);
    }
    
    // Add dynamic lighting for active jammers
    this.updateJammerLighting(entityId, deltaTime);
  }
  
  // Create activation effect when jammer turns on
  createJammerActivationEffect(entityId) {
    const transformComponent = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM);
    const jammerComponent = this.entityManager.getComponent(entityId, ComponentTypes.JAMMER);
    
    if (!transformComponent) return;
    
    // Get position
    const position = transformComponent.position;
    
    // Create activation ring effect
    const ringGeometry = new THREE.RingGeometry(0, 10, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: CONFIG.jammers.types[jammerComponent.type].color,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const activationRing = new THREE.Mesh(ringGeometry, ringMaterial);
    activationRing.position.set(position.x, position.y, position.z + 0.5); // Slightly above ground
    activationRing.rotation.x = Math.PI / 2; // Flat on ground
    
    // Add to scene
    if (window.gameEngine && window.gameEngine.scene) {
      window.gameEngine.scene.add(activationRing);
      
      // Animation
      const startTime = Date.now();
      const duration = 1000; // 1 second
      
      const animateRing = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Scale outward
        const scale = progress * 5;
        activationRing.scale.set(scale, scale, 1);
        
        // Fade out
        activationRing.material.opacity = 1 - progress;
        
        if (progress < 1) {
          requestAnimationFrame(animateRing);
        } else {
          // Remove from scene
          window.gameEngine.scene.remove(activationRing);
          // Dispose resources
          ringGeometry.dispose();
          ringMaterial.dispose();
        }
      };
      
      // Start animation
      animateRing();
    }
    
    // Create light flash
    if (window.gameEngine && window.gameEngine.scene) {
      const jammerLight = new THREE.PointLight(
        CONFIG.jammers.types[jammerComponent.type].color,
        2, // Intensity
        50 // Range
      );
      
      jammerLight.position.set(position.x, position.y, position.z + 5);
      window.gameEngine.scene.add(jammerLight);
      
      // Light animation
      const startTime = Date.now();
      const duration = 800; // ms
      
      const animateLight = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Flash pattern
        const intensity = 2 * (1 - progress) * (0.5 + 0.5 * Math.sin(progress * Math.PI * 10));
        jammerLight.intensity = intensity;
        
        if (progress < 1) {
          requestAnimationFrame(animateLight);
        } else {
          // Remove light
          window.gameEngine.scene.remove(jammerLight);
        }
      };
      
      // Start animation
      animateLight();
    }
  }
  
  // Create deactivation effect when jammer turns off
  createJammerDeactivationEffect(entityId) {
    const transformComponent = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM);
    const jammerComponent = this.entityManager.getComponent(entityId, ComponentTypes.JAMMER);
    
    if (!transformComponent) return;
    
    // Get position
    const position = transformComponent.position;
    
    // Create shutdown particles
    if (window.gameEngine && window.gameEngine.scene) {
      const particleCount = 30;
      const particleGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      const particleSizes = new Float32Array(particleCount);
      
      // Generate particles around jammer
      for (let i = 0; i < particleCount; i++) {
        // Random position around jammer
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 5;
        const height = Math.random() * 8;
        
        particlePositions[i * 3] = position.x + Math.cos(angle) * radius;
        particlePositions[i * 3 + 1] = position.y + Math.sin(angle) * radius;
        particlePositions[i * 3 + 2] = position.z + height;
        
        // Random sizes
        particleSizes[i] = 1 + Math.random() * 2;
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
      
      // Create particle material
      const particleMaterial = new THREE.PointsMaterial({
        color: CONFIG.jammers.types[jammerComponent.type].color,
        transparent: true,
        opacity: 0.7,
        size: 2,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
      });
      
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      window.gameEngine.scene.add(particles);
      
      // Particle animation
      const startTime = Date.now();
      const duration = 800; // ms
      
      const animateParticles = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const positions = particleGeometry.attributes.position.array;
        
        // Move particles outward and upward
        for (let i = 0; i < particleCount; i++) {
          const baseX = particlePositions[i * 3];
          const baseY = particlePositions[i * 3 + 1];
          const baseZ = particlePositions[i * 3 + 2];
          
          // Direction from center
          const dx = baseX - position.x;
          const dy = baseY - position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0) {
            // Normalize direction
            const dirX = dx / dist;
            const dirY = dy / dist;
            
            // Move outward
            positions[i * 3] = baseX + dirX * progress * 10;
            positions[i * 3 + 1] = baseY + dirY * progress * 10;
          }
          
          // Move upward
          positions[i * 3 + 2] = baseZ + progress * 10;
        }
        
        // Update geometry
        particleGeometry.attributes.position.needsUpdate = true;
        
        // Fade out
        particleMaterial.opacity = 0.7 * (1 - progress);
        
        if (progress < 1) {
          requestAnimationFrame(animateParticles);
        } else {
          // Remove particles
          window.gameEngine.scene.remove(particles);
          // Dispose resources
          particleGeometry.dispose();
          particleMaterial.dispose();
        }
      };
      
      // Start animation
      animateParticles();
    }
  }
  
  // Update cooldown indicator ring
  updateCooldownIndicator(entityId, progress) {
    const transformComponent = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM);
    
    if (!transformComponent) return;
    
    // Get existing cooldown indicator or create new one
    let indicator = this.entityManager.components.get(entityId, 'cooldownIndicator');
    
    if (!indicator) {
      // Create new indicator
      const geometry = new THREE.RingGeometry(3, 3.5, 32, 1, 0, Math.PI * 2);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff3030,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      
      indicator = new THREE.Mesh(geometry, material);
      indicator.rotation.x = Math.PI / 2; // Flat on ground
      
      // Store reference
      this.entityManager.components.set(entityId, 'cooldownIndicator', indicator);
      
      // Add to scene
      if (window.gameEngine && window.gameEngine.scene) {
        window.gameEngine.scene.add(indicator);
      }
    }
    
    // Update position
    indicator.position.set(
      transformComponent.position.x,
      transformComponent.position.y,
      transformComponent.position.z + 0.2 // Slightly above ground
    );
    
    // Update indicator progress
    // Modify the geometry to show a progress ring
    if (indicator.geometry) {
      indicator.geometry.dispose();
    }
    
    // Create new ring geometry showing progress (1.0 = empty, 0.0 = full)
    const angle = Math.PI * 2 * (1 - progress);
    indicator.geometry = new THREE.RingGeometry(3, 3.5, 32, 1, 0, angle);
  }
  
  // Remove cooldown indicator
  removeCooldownIndicator(entityId) {
    const indicator = this.entityManager.components.get(entityId, 'cooldownIndicator');
    
    if (indicator) {
      // Remove from scene
      if (window.gameEngine && window.gameEngine.scene) {
        window.gameEngine.scene.remove(indicator);
      }
      
      // Dispose resources
      if (indicator.geometry) {
        indicator.geometry.dispose();
      }
      if (indicator.material) {
        indicator.material.dispose();
      }
      
      // Remove reference
      this.entityManager.components.delete(entityId, 'cooldownIndicator');
    }
  }
  
  // Update pulse jammer effects
  updatePulseEffect(entityId, deltaTime) {
    const transformComponent = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM);
    const jammerComponent = this.entityManager.getComponent(entityId, ComponentTypes.JAMMER);
    const transmitterComponent = this.entityManager.getComponent(entityId, ComponentTypes.RF_TRANSMITTER);
    
    if (!transformComponent || !transmitterComponent.active) return;
    
    // Get existing pulse effect or create new one
    let pulseEffect = this.entityManager.components.get(entityId, 'pulseEffect');
    
    if (!pulseEffect) {
      // Create pulse effect container
      pulseEffect = {
        mesh: null,
        pulseTime: 0,
        rings: []
      };
      
      // Store reference
      this.entityManager.components.set(entityId, 'pulseEffect', pulseEffect);
    }
    
    // Update pulse timing
    pulseEffect.pulseTime += deltaTime;
    
    // Create new pulse ring on each pulse
    if (transmitterComponent.pulseParameters.currentlyTransmitting && 
        pulseEffect.lastPulseState === false) {
      
      // Create new pulse ring
      this.createPulseRing(entityId, transformComponent.position);
    }
    
    // Update last pulse state
    pulseEffect.lastPulseState = transmitterComponent.pulseParameters.currentlyTransmitting;
    
    // Update existing rings
    for (let i = pulseEffect.rings.length - 1; i >= 0; i--) {
      const ring = pulseEffect.rings[i];
      
      // Update ring properties
      ring.age += deltaTime;
      const progress = Math.min(ring.age / ring.lifespan, 1);
      
      // Scale outward
      const scale = 1 + progress * 15;
      ring.mesh.scale.set(scale, scale, 1);
      
      // Fade out
      ring.mesh.material.opacity = 0.7 * (1 - progress);
      
      // Remove completed rings
      if (progress >= 1) {
        // Remove from scene
        if (window.gameEngine && window.gameEngine.scene) {
          window.gameEngine.scene.remove(ring.mesh);
        }
        
        // Dispose resources
        ring.mesh.geometry.dispose();
        ring.mesh.material.dispose();
        
        // Remove from array
        pulseEffect.rings.splice(i, 1);
      }
    }
  }
  
  // Create a new pulse ring
  createPulseRing(entityId, position) {
    const jammerComponent = this.entityManager.getComponent(entityId, ComponentTypes.JAMMER);
    const pulseEffect = this.entityManager.components.get(entityId, 'pulseEffect');
    
    if (!pulseEffect) return;
    
    // Create ring geometry
    const geometry = new THREE.RingGeometry(1, 2, 32);
    const material = new THREE.MeshBasicMaterial({
      color: CONFIG.jammers.types[jammerComponent.type].color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const ringMesh = new THREE.Mesh(geometry, material);
    ringMesh.position.set(position.x, position.y, position.z + 0.5); // Slightly above ground
    ringMesh.rotation.x = Math.PI / 2; // Flat on ground
    
    // Add to scene
    if (window.gameEngine && window.gameEngine.scene) {
      window.gameEngine.scene.add(ringMesh);
    }
    
    // Add to pulse effect
    pulseEffect.rings.push({
      mesh: ringMesh,
      age: 0,
      lifespan: 1.0 // 1 second lifespan
    });
  }
  
  // Remove pulse effect
  removePulseEffect(entityId) {
    const pulseEffect = this.entityManager.components.get(entityId, 'pulseEffect');
    
    if (pulseEffect) {
      // Remove all rings
      for (const ring of pulseEffect.rings) {
        // Remove from scene
        if (window.gameEngine && window.gameEngine.scene) {
          window.gameEngine.scene.remove(ring.mesh);
        }
        
        // Dispose resources
        ring.mesh.geometry.dispose();
        ring.mesh.material.dispose();
      }
      
      // Clear array
      pulseEffect.rings = [];
      
      // Remove reference
      this.entityManager.components.delete(entityId, 'pulseEffect');
    }
  }
  
  // Update jammer dynamic lighting
  updateJammerLighting(entityId, deltaTime) {
    const transformComponent = this.entityManager.getComponent(entityId, ComponentTypes.TRANSFORM);
    const jammerComponent = this.entityManager.getComponent(entityId, ComponentTypes.JAMMER);
    const transmitterComponent = this.entityManager.getComponent(entityId, ComponentTypes.RF_TRANSMITTER);
    
    if (!transformComponent) return;
    
    // Check if jammer is active
    const isActive = transmitterComponent.active;
    
    // Get existing lighting or create new
    let jammerLighting = this.entityManager.components.get(entityId, 'jammerLighting');
    
    // Create light if needed
    if (isActive && !jammerLighting) {
      // Create point light
      const light = new THREE.PointLight(
        CONFIG.jammers.types[jammerComponent.type].color,
        1.5, // Intensity
        30  // Range
      );
      
      // Add slight flicker
      light.userData.baseIntensity = 1.5;
      light.userData.time = Math.random() * 100; // Random starting phase
      
      // Position light
      light.position.set(
        transformComponent.position.x,
        transformComponent.position.y,
        transformComponent.position.z + 2 // Above jammer
      );
      
      // Add to scene
      if (window.gameEngine && window.gameEngine.scene) {
        window.gameEngine.scene.add(light);
      }
      
      // Store reference
      jammerLighting = { light };
      this.entityManager.components.set(entityId, 'jammerLighting', jammerLighting);
    } 
    // Update existing light
    else if (isActive && jammerLighting) {
      const light = jammerLighting.light;
      
      // Update position
      light.position.set(
        transformComponent.position.x,
        transformComponent.position.y,
        transformComponent.position.z + 2 // Above jammer
      );
      
      // Update light color if frequency changed
      light.color.set(CONFIG.jammers.types[jammerComponent.type].color);
      
      // Add subtle flicker effect
      light.userData.time += deltaTime;
      const flicker = Math.sin(light.userData.time * 5) * 0.1 + 
                      Math.sin(light.userData.time * 13) * 0.05 +
                      Math.sin(light.userData.time * 27) * 0.025;
      
      light.intensity = light.userData.baseIntensity * (1 + flicker);
      
      // For pulsing jammers, sync light with pulse
      if (jammerComponent.type === 'PULSE') {
        if (transmitterComponent.pulseParameters.currentlyTransmitting) {
          light.intensity = light.userData.baseIntensity * 2.5;
        } else {
          light.intensity = light.userData.baseIntensity * 0.3;
        }
      }
    }
    // Remove light if jammer is inactive
    else if (!isActive && jammerLighting) {
      // Remove from scene
      if (window.gameEngine && window.gameEngine.scene && jammerLighting.light) {
        window.gameEngine.scene.remove(jammerLighting.light);
      }
      
      // Remove reference
      this.entityManager.components.delete(entityId, 'jammerLighting');
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