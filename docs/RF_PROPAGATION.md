# RF Propagation System Documentation

The RF (Radio Frequency) propagation system is a core component of SIGNAL WARFARE, simulating realistic electromagnetic wave propagation for tactical electronic warfare.

## 1. System Overview

The RF propagation system models how radio signals travel through the environment, accounting for:

- **Distance Attenuation**: Signal power loss over distance
- **Frequency Effects**: Different propagation characteristics by frequency
- **Terrain Interaction**: Hills, buildings, and water affecting signals
- **Atmospheric Conditions**: Weather effects on signal propagation
- **Antenna Properties**: Gain, directionality, and polarization
- **Multi-path Effects**: Signal reflections and interference

This creates a realistic electromagnetic battlefield where tactical positioning and frequency selection matter.

## 2. Propagation Models

The system implements three primary propagation models:

### 2.1 Free Space Path Loss (FSPL)

The simplest model, calculating signal loss in an unobstructed environment:

```
FSPL(dB) = 20log₁₀(d) + 20log₁₀(f) + 32.45
```

Where:
- `d` is distance in kilometers
- `f` is frequency in MHz

Implementation:
```javascript
calculateFSPL(distance, frequency) {
    // Convert distance to kilometers
    const distanceKm = distance / 1000;
    
    // Calculate path loss
    const pathLoss = 20 * Math.log10(distanceKm) + 20 * Math.log10(frequency) + 32.45;
    
    // Return negative path loss (signal strength reduction)
    return -pathLoss;
}
```

### 2.2 Two-Ray Ground Reflection

Models ground reflection effects, important for longer distances:

```
PL(dB) = 40log₁₀(d) - 20log₁₀(ht) - 20log₁₀(hr)
```

Where:
- `d` is distance in kilometers
- `ht` is transmitter height in meters
- `hr` is receiver height in meters

Implementation:
```javascript
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
    const pathLoss = 40 * Math.log10(distanceKm) - 
                      20 * Math.log10(heightTx) - 
                      20 * Math.log10(heightRx);
    
    return -pathLoss;
}
```

### 2.3 Log-Distance Path Loss

For urban environments with obstacles:

```
PL(dB) = PL₀ + 10n·log₁₀(d/d₀)
```

Where:
- `PL₀` is path loss at reference distance
- `n` is path loss exponent (2 for free space, 2.7-3.5 for urban areas)
- `d` is distance
- `d₀` is reference distance (usually 1 km)

Implementation:
```javascript
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
    const pathLoss = pl0 + 10 * n * Math.log10(distanceKm / d0);
    
    return -pathLoss;
}
```

## 3. Antenna Modeling

The system models different antenna types with varying gain patterns:

### 3.1 Antenna Types

| Type | Description | Gain (dBi) | Beam Width (°) |
|------|-------------|------------|----------------|
| Omnidirectional | 360° coverage | 2-3 | 360 |
| Helicone | Compact directional | 8-12 | 90 |
| Helix | High gain circular | 12-15 | 45 |
| Horn | Extreme directionality | 15-20 | 30 |

### 3.2 Directional Gain Calculation

For directional antennas, gain varies by angle from centerline:

```javascript
calculateAntennaGain(antenna, sourcePosition, targetPosition) {
    // Get antenna properties
    const antennaType = CONFIG.antennas.types[antenna.type];
    if (!antennaType) return 0;
    
    // Get base gain
    const baseGain = antennaType.gainDbi;
    
    // For omnidirectional antennas, return base gain
    if (antenna.type === 'OMNI') {
        return baseGain;
    }
    
    // Calculate angle between antenna heading and target
    const angleToTarget = this.calculateAngleBetweenPositions(
        sourcePosition, targetPosition
    );
    
    // Calculate angle difference (accounting for antenna heading)
    const heading = antenna.heading || 0;
    let angleDifference = Math.abs(angleToTarget - heading);
    
    // Normalize to 0-180 degrees (for beam pattern)
    if (angleDifference > 180) {
        angleDifference = 360 - angleDifference;
    }
    
    // Calculate gain based on angle from center
    // Gain decreases as angle from center increases
    const beamWidth = antennaType.beamWidth;
    
    let gainFactor;
    if (angleDifference <= beamWidth / 2) {
        // Within main beam
        gainFactor = Math.cos(Math.PI * angleDifference / beamWidth) ** 2;
    } else {
        // Side lobe (simplified model)
        gainFactor = Math.max(0.01, 0.2 * Math.cos(Math.PI * angleDifference / beamWidth) ** 2);
    }
    
    // Apply both angular and elevation factors
    const effectiveGain = baseGain * gainFactor;
    
    return effectiveGain;
}
```

## 4. Environmental Effects

### 4.1 Terrain Effects

Terrain influences signal propagation through:

- **Attenuation**: Signal loss through objects
- **Reflection**: Bouncing off surfaces
- **Diffraction**: Bending around obstacles
- **Scattering**: Signal dispersal by rough surfaces

Implementation (simplified):
```javascript
calculateTerrainEffect(sourcePosition, targetPosition) {
    let terrainPenalty = 0;
    
    // Check line of sight obstruction
    const hasLineOfSight = this.checkLineOfSight(sourcePosition, targetPosition);
    
    if (!hasLineOfSight) {
        // Apply diffraction loss based on obstacle height
        const obstacleHeight = this.getMaxObstacleHeight(sourcePosition, targetPosition);
        terrainPenalty -= this.calculateDiffractionLoss(obstacleHeight);
    }
    
    // Apply terrain type penalties
    const terrainType = this.getTerrainType(sourcePosition, targetPosition);
    switch(terrainType) {
        case 'URBAN':
            terrainPenalty -= 20; // High loss in urban areas
            break;
        case 'FOREST':
            terrainPenalty -= 10; // Moderate loss in forests
            break;
        case 'WATER':
            terrainPenalty += 5; // Slight improvement over water
            break;
    }
    
    return terrainPenalty;
}
```

### 4.2 Atmospheric Conditions

Weather affects signal propagation, especially at higher frequencies:

```javascript
calculateAtmosphericEffect(distance, frequency) {
    // Simplified atmospheric effects (more pronounced at higher frequencies)
    let atmosphericLoss = 0;
    
    // Atmospheric conditions from config
    const conditions = CONFIG.rf.atmosphericConditions;
    
    // Higher frequencies affected more by atmospheric conditions
    const frequencyFactor = Math.min(1, frequency / 10000); // Max effect at 10GHz+
    
    switch (conditions) {
        case 'RAIN':
            // Rain has significant impact on higher frequencies
            atmosphericLoss = -0.05 * distance * frequencyFactor;
            break;
        case 'HUMID':
            // Humidity has moderate impact
            atmosphericLoss = -0.02 * distance * frequencyFactor;
            break;
        case 'CLEAR':
        default:
            // Clear conditions have minimal impact
            atmosphericLoss = -0.005 * distance * frequencyFactor;
    }
    
    return atmosphericLoss;
}
```

## 5. Signal Strength Calculation

The complete signal strength calculation combines all these factors:

```javascript
calculateSignalStrength(transmitter, receiver, model = CONFIG.rf.propagationModel) {
    // Check cache for this calculation
    const cacheKey = this.getCacheKey(transmitter, receiver, model);
    if (this.calculationCache.has(cacheKey)) {
        return this.calculationCache.get(cacheKey);
    }
    
    // Calculate distance
    const distance = this.calculateDistance(transmitter.position, receiver.position);
    
    // Get frequency in MHz
    const frequency = this.getFrequencyValue(transmitter.currentFrequency);
    
    // Calculate base path loss based on selected model
    let signalStrength = 0;
    
    switch (model) {
        case 'FSPL':
            signalStrength = this.calculateFSPL(distance, frequency);
            break;
        case 'TWO_RAY':
            signalStrength = this.calculateTwoRayGround(
                distance, frequency, transmitter.position.z, receiver.position.z
            );
            break;
        case 'LOG_DISTANCE':
            signalStrength = this.calculateLogDistance(distance, frequency);
            break;
    }
    
    // Apply transmitter power
    signalStrength += transmitter.power;
    
    // Apply antenna gains
    if (transmitter.antenna) {
        signalStrength += this.calculateAntennaGain(
            transmitter.antenna, transmitter.position, receiver.position
        );
    }
    
    if (receiver.antenna) {
        signalStrength += this.calculateAntennaGain(
            receiver.antenna, receiver.position, transmitter.position
        );
    }
    
    // Apply terrain effects
    signalStrength += this.calculateTerrainEffect(transmitter.position, receiver.position);
    
    // Apply atmospheric conditions
    signalStrength += this.calculateAtmosphericEffect(distance, frequency);
    
    // Cache the result
    this.calculationCache.set(cacheKey, signalStrength);
    
    return signalStrength;
}
```

## 6. Frequency Bands

The game uses realistic frequency bands with different propagation characteristics:

| Band | Frequency Range | Common Uses | Game Representation |
|------|-----------------|-------------|---------------------|
| UHF | 433-435 MHz | Remote control | Low data rate, good penetration |
| ISM915 | 902-928 MHz | Industrial control | Medium range, decent penetration |
| GPS | 1575.42 MHz | Positioning | Critical for navigation |
| ISM2400 | 2.4-2.483 GHz | Wi-Fi, video | High bandwidth, limited range |
| C-BAND | 5.725-5.85 GHz | High-speed data | Very high bandwidth, poor penetration |

## 7. Signal Visualization

Signals are visualized in 3D space using THREE.js:

### 7.1 For Omnidirectional Antennas

Spherical visualization with gradient opacity:

```javascript
// Create sphere geometry
const radius = source.power * 10; // Scale by power
const geometry = new THREE.SphereGeometry(radius, 32, 32);

// Create gradient material
const material = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
        color: { value: new THREE.Color(color) }
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

visualization = new THREE.Mesh(geometry, material);
```

### 7.2 For Directional Antennas

Cone visualization with directional properties:

```javascript
// Create cone for directional antenna
const height = source.power * 20; // Scale by power
const angle = (antennaType.beamWidth / 2) * Math.PI / 180; // Convert to radians
const radius = height * Math.tan(angle);

const geometry = new THREE.ConeGeometry(radius, height, 32, 1, true);

// Rotate cone to point in heading direction
geometry.rotateX(Math.PI / 2);
if (source.antenna.heading) {
    const headingRad = (source.antenna.heading * Math.PI) / 180;
    geometry.rotateZ(headingRad);
}

// Create gradient material
const material = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
        color: { value: new THREE.Color(color) }
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

visualization = new THREE.Mesh(geometry, material);
```

## 8. Performance Optimizations

Several optimizations are used to maintain performance:

### 8.1 Calculation Caching

```javascript
// Cache for propagation calculations
this.calculationCache = new Map();

// Cache key generation
getCacheKey(transmitter, receiver, model) {
    return `${transmitter.id}_${receiver.id}_${model}_${transmitter.power}_${transmitter.currentFrequency}`;
}
```

### 8.2 Spatial Partitioning

For large scenes with many signal sources:

```javascript
// Divide the world into grid cells
const gridSize = 500; // meters
const grid = new Map();

// Add transmitter to grid
function addToGrid(transmitter) {
    const cellX = Math.floor(transmitter.position.x / gridSize);
    const cellZ = Math.floor(transmitter.position.z / gridSize);
    const key = `${cellX},${cellZ}`;
    
    if (!grid.has(key)) {
        grid.set(key, []);
    }
    
    grid.get(key).push(transmitter);
}

// Find nearby transmitters
function getNearbyTransmitters(position, maxDistance) {
    const nearby = [];
    const cellRadius = Math.ceil(maxDistance / gridSize);
    const centerCellX = Math.floor(position.x / gridSize);
    const centerCellZ = Math.floor(position.z / gridSize);
    
    for (let x = centerCellX - cellRadius; x <= centerCellX + cellRadius; x++) {
        for (let z = centerCellZ - cellRadius; z <= centerCellZ + cellRadius; z++) {
            const key = `${x},${z}`;
            if (grid.has(key)) {
                nearby.push(...grid.get(key));
            }
        }
    }
    
    return nearby;
}
```

### 8.3 Level of Detail

Visualization LOD based on distance:

```javascript
updateSignalVisualization(source, camera) {
    const visualization = this.visualizations.get(source.id);
    
    // Calculate distance to camera
    const distance = this.calculateDistance(
        source.position, 
        { x: camera.position.x, y: 0, z: camera.position.z }
    );
    
    // Adjust detail level based on distance
    if (distance > 1000) {
        // Low detail
        visualization.geometry.dispose();
        visualization.geometry = new THREE.SphereGeometry(radius, 8, 8);
    } else if (distance > 500) {
        // Medium detail
        visualization.geometry.dispose();
        visualization.geometry = new THREE.SphereGeometry(radius, 16, 16);
    } else {
        // High detail
        visualization.geometry.dispose();
        visualization.geometry = new THREE.SphereGeometry(radius, 32, 32);
    }
}
```

## 9. Integration with Game Systems

The RF propagation system integrates with:

### 9.1 Jammer System

```javascript
// Check if a target is jammed
function isTargetJammed(target, jammers) {
    for (const jammer of jammers) {
        if (!jammer.active) continue;
        
        // Calculate signal strength at target
        const signalStrength = rfPropagation.calculateSignalStrength(
            jammer, 
            target
        );
        
        // Check if signal is strong enough to jam
        if (signalStrength > target.jammingThreshold) {
            return true;
        }
    }
    
    return false;
}
```

### 9.2 Drone Navigation

```javascript
// Update drone navigation based on jamming
function updateDroneNavigation(drone, jammers) {
    // Check if drone is jammed
    const isJammed = isTargetJammed(drone, jammers);
    
    if (isJammed) {
        // Switch to inertial navigation (less accurate)
        drone.navigationMode = 'INERTIAL';
        
        // Add position error based on jamming strength
        const errorFactor = CONFIG.drones.ai.jammedErrorFactor;
        drone.positionError = errorFactor * 100; // meters
    } else {
        // Use GPS navigation (accurate)
        drone.navigationMode = 'GPS';
        drone.positionError = 0;
    }
}
```

### 9.3 Tactical Map

```javascript
// Update RF overlay on tactical map
function updateRFOverlay(map, jammers, drones) {
    // Clear existing overlay
    map.clearRFOverlay();
    
    // For each point on the map grid
    for (let x = 0; x < map.width; x += map.resolution) {
        for (let y = 0; y < map.height; y += map.resolution) {
            const position = { x, y, z: 0 };
            
            // Calculate signal strength from all jammers
            let maxSignalStrength = -Infinity;
            for (const jammer of jammers) {
                if (!jammer.active) continue;
                
                const signalStrength = rfPropagation.calculateSignalStrength(
                    jammer, 
                    { position, antenna: null }
                );
                
                maxSignalStrength = Math.max(maxSignalStrength, signalStrength);
            }
            
            // Add to heatmap with color based on strength
            if (maxSignalStrength > -120) { // Minimum threshold
                const color = getColorForSignalStrength(maxSignalStrength);
                map.addRFPoint(x, y, maxSignalStrength, color);
            }
        }
    }
}
```

## 10. Future Enhancements

Potential improvements to the RF system:

1. **Ray Tracing**: More accurate obstacle detection and reflection modeling
2. **Weather Dynamics**: Changing weather conditions affecting signals over time
3. **Interference Patterns**: Modeling constructive/destructive interference between signals
4. **Multipath Fading**: Time-varying fading effects from multiple signal paths
5. **Doppler Effects**: Frequency shifts for moving transmitters and receivers
6. **Advanced Antenna Patterns**: More realistic 3D radiation patterns
7. **MIMO Modeling**: Multiple-input/multiple-output antenna arrays