/**
 * SIGNAL WARFARE - Game State Manager
 * 
 * This file implements the central game state manager that tracks:
 * - Mission state and phases
 * - Available assets and resources
 * - Player and enemy status
 * - Tactical advantage metrics
 * - Game settings and configuration
 */

class GameState {
  constructor() {
    // Mission state
    this.missionActive = false;
    this.missionPhase = 'DEPLOYMENT';  // DEPLOYMENT, INTEL, OPERATION, DEFEND
    this.missionTime = 0;  // Seconds elapsed in current mission
    this.missionTimeRemaining = 0;  // Seconds remaining in current phase
    this.missionComplete = false;
    this.missionFailed = false;
    
    // Player assets
    this.playerAssets = {
      jammers: {
        available: { ...CONFIG.mission.defaultAssets.jammers },
        deployed: []
      },
      drones: {
        available: { ...CONFIG.mission.defaultAssets.drones },
        deployed: []
      },
      sensors: {
        available: 2,
        deployed: []
      }
    };
    
    // Enemy assets
    this.enemyAssets = {
      jammers: [],
      drones: [],
      commandCenters: []
    };
    
    // RF environment
    this.rfEnvironment = {
      activeBands: new Set(),
      detectedSignals: [],
      signalDominance: 0.5  // 0 = enemy, 1 = player
    };
    
    // Tactical advantage (0-100, higher is better for player)
    this.tacticalAdvantage = 50;
    
    // Performance metrics
    this.metrics = {
      signalDominance: 0.5,  // 0-1 scale
      assetStatus: { active: 0, total: 0 },
      targetLock: { achieved: 0, total: 0 }
    };
    
    // UI state
    this.uiState = {
      activePanel: null,
      mapZoom: CONFIG.ui.map.defaultZoom,
      mapCenter: { x: 0, y: 0 },
      selectedAsset: null,
      visibleLayers: ['terrain']
    };
    
    // Action history for replay/analytics
    this.actionHistory = [];
    
    // Entity management
    this.ecs = null;
    this.systems = {};
    
    // Events
    this.eventListeners = {};
  }
  
  initialize(ecs) {
    this.ecs = ecs;
    
    // Store references to systems
    this.systems.jammer = ecs.getSystem('jammer');
    this.systems.rfPropagation = ecs.getSystem('rfPropagation');
    this.systems.render = ecs.getSystem('render');
    this.systems.ai = ecs.getSystem('ai');
    
    // Initialize default tactical situation
    this.resetGame();
  }
  
  resetGame() {
    // Reset mission state
    this.missionActive = false;
    this.missionPhase = 'DEPLOYMENT';
    this.missionTime = 0;
    this.missionTimeRemaining = CONFIG.mission.phases.DEPLOYMENT.duration;
    this.missionComplete = false;
    this.missionFailed = false;
    
    // Reset player assets
    this.playerAssets = {
      jammers: {
        available: { ...CONFIG.mission.defaultAssets.jammers },
        deployed: []
      },
      drones: {
        available: { ...CONFIG.mission.defaultAssets.drones },
        deployed: []
      },
      sensors: {
        available: 2,
        deployed: []
      }
    };
    
    // Reset enemy assets
    this.enemyAssets = {
      jammers: [],
      drones: [],
      commandCenters: []
    };
    
    // Reset tactical advantage
    this.tacticalAdvantage = 50;
    
    // Reset metrics
    this.metrics = {
      signalDominance: 0.5,
      assetStatus: { active: 0, total: 0 },
      targetLock: { achieved: 0, total: 0 }
    };
    
    // Reset RF environment
    this.rfEnvironment = {
      activeBands: new Set(),
      detectedSignals: [],
      signalDominance: 0.5
    };
    
    // Reset action history
    this.actionHistory = [];
    
    // Reset UI state
    this.uiState = {
      activePanel: null,
      mapZoom: CONFIG.ui.map.defaultZoom,
      mapCenter: { x: 0, y: 0 },
      selectedAsset: null,
      visibleLayers: ['terrain']
    };
    
    // Remove all existing entities
    if (this.ecs) {
      // Get all entities to destroy
      const entities = [...this.ecs.entityManager.entities.keys()];
      
      // Destroy each entity
      for (const entityId of entities) {
        this.ecs.destroyEntity(entityId);
      }
    }
    
    // Trigger reset event
    this.triggerEvent('gameReset');
  }
  
  startMission() {
    if (this.missionActive) {
      return false;
    }
    
    this.missionActive = true;
    this.missionPhase = 'DEPLOYMENT';
    this.missionTime = 0;
    this.missionTimeRemaining = CONFIG.mission.phases.DEPLOYMENT.duration;
    this.missionComplete = false;
    this.missionFailed = false;
    
    // Spawn initial enemy assets based on mission
    this.spawnEnemies();
    
    // Trigger mission start event
    this.triggerEvent('missionStart');
    
    return true;
  }
  
  endMission(success = false) {
    if (!this.missionActive) {
      return false;
    }
    
    this.missionActive = false;
    
    if (success) {
      this.missionComplete = true;
      this.triggerEvent('missionComplete');
    } else {
      this.missionFailed = true;
      this.triggerEvent('missionFailed');
    }
    
    return true;
  }
  
  // Update game state (called each frame)
  update(deltaTime) {
    if (!this.missionActive) {
      return;
    }
    
    // Update mission time
    this.missionTime += deltaTime;
    this.missionTimeRemaining -= deltaTime;
    
    // Check for phase transition
    if (this.missionTimeRemaining <= 0) {
      this.advanceMissionPhase();
    }
    
    // Update tactical advantage
    this.updateTacticalAdvantage();
    
    // Update metrics
    this.updateMetrics();
    
    // Check victory/defeat conditions
    this.checkMissionStatus();
    
    // Trigger update event
    this.triggerEvent('gameUpdate', deltaTime);
  }
  
  // Advance to next mission phase
  advanceMissionPhase() {
    const phases = Object.keys(CONFIG.mission.phases);
    const currentIndex = phases.indexOf(this.missionPhase);
    
    if (currentIndex < phases.length - 1) {
      // Advance to next phase
      const nextPhase = phases[currentIndex + 1];
      this.missionPhase = nextPhase;
      this.missionTimeRemaining = CONFIG.mission.phases[nextPhase].duration;
      
      // Trigger phase change event
      this.triggerEvent('phaseChange', this.missionPhase);
    } else {
      // End of mission
      this.endMission(this.tacticalAdvantage >= CONFIG.mission.defaultVictoryScore);
    }
  }
  
  // Update tactical advantage based on current game state
  updateTacticalAdvantage() {
    // Calculate signal dominance (0-1, higher means player dominance)
    const signalDominance = this.calculateSignalDominance();
    
    // Calculate asset status (0-1, higher means more player assets operational)
    const assetStatus = this.calculateAssetStatus();
    
    // Calculate target lock (0-1, higher means more targets under player control)
    const targetLock = this.calculateTargetLock();
    
    // Update metrics
    this.metrics.signalDominance = signalDominance;
    this.metrics.assetStatus = assetStatus;
    this.metrics.targetLock = targetLock;
    
    // Calculate overall tactical advantage (0-100 scale)
    this.tacticalAdvantage = Math.round(
      (signalDominance * 0.5 + assetStatus.ratio * 0.3 + targetLock.ratio * 0.2) * 100
    );
    
    // Clamp to 0-100
    this.tacticalAdvantage = Math.max(0, Math.min(100, this.tacticalAdvantage));
    
    // Trigger tactical advantage change event
    this.triggerEvent('tacticalAdvantageChange', this.tacticalAdvantage);
  }
  
  // Calculate signal dominance based on jammer coverage
  calculateSignalDominance() {
    // If no RF propagation system, return neutral
    if (!this.systems.rfPropagation) {
      return 0.5;
    }
    
    // Count jammed frequencies
    const jammedByPlayer = new Set();
    const jammedByEnemy = new Set();
    
    // Check all jammers
    for (const jammerId of this.playerAssets.jammers.deployed) {
      const jammerComponent = this.ecs.getComponent(jammerId, ComponentTypes.JAMMER);
      if (jammerComponent && jammerComponent.active) {
        jammedByPlayer.add(jammerComponent.targetFrequency);
      }
    }
    
    for (const jammerId of this.enemyAssets.jammers) {
      const jammerComponent = this.ecs.getComponent(jammerId, ComponentTypes.JAMMER);
      if (jammerComponent && jammerComponent.active) {
        jammedByEnemy.add(jammerComponent.targetFrequency);
      }
    }
    
    // Calculate signal dominance ratio
    const playerDominance = jammedByPlayer.size;
    const enemyDominance = jammedByEnemy.size;
    
    if (playerDominance === 0 && enemyDominance === 0) {
      return 0.5; // Neutral if no jammers
    }
    
    return playerDominance / (playerDominance + enemyDominance);
  }
  
  // Calculate asset status
  calculateAssetStatus() {
    // Count active assets
    let playerActive = 0;
    let playerTotal = 0;
    
    // Count player jammers
    for (const jammerId of this.playerAssets.jammers.deployed) {
      playerTotal++;
      const jammerComponent = this.ecs.getComponent(jammerId, ComponentTypes.JAMMER);
      if (jammerComponent && !jammerComponent.depleted) {
        playerActive++;
      }
    }
    
    // Count player drones
    for (const droneId of this.playerAssets.drones.deployed) {
      playerTotal++;
      const aiComponent = this.ecs.getComponent(droneId, ComponentTypes.AI);
      if (aiComponent && aiComponent.state !== 'disabled') {
        playerActive++;
      }
    }
    
    // Count player sensors
    playerTotal += this.playerAssets.sensors.deployed.length;
    playerActive += this.playerAssets.sensors.deployed.length; // Sensors are always active
    
    // Calculate ratio
    const ratio = playerTotal > 0 ? playerActive / playerTotal : 1;
    
    return {
      active: playerActive,
      total: playerTotal,
      ratio: ratio
    };
  }
  
  // Calculate target lock (objectives control)
  calculateTargetLock() {
    // For now, use simple placeholder
    // This would normally check objective status
    return {
      achieved: 0,
      total: 1,
      ratio: 0
    };
  }
  
  // Check mission status for victory/defeat conditions
  checkMissionStatus() {
    // Victory condition: Tactical advantage above threshold
    if (this.tacticalAdvantage >= CONFIG.mission.defaultVictoryScore && this.missionPhase === 'OPERATION') {
      this.endMission(true);
    }
    
    // Defeat condition: All assets destroyed
    const assetStatus = this.calculateAssetStatus();
    if (assetStatus.active === 0 && assetStatus.total > 0) {
      this.endMission(false);
    }
  }
  
  // Spawn enemy assets based on mission phase
  spawnEnemies() {
    // Define enemy spawn positions
    const spawnPositions = [
      { x: 500, y: 500, z: 0 },
      { x: -500, y: 500, z: 0 },
      { x: 500, y: -500, z: 0 },
      { x: -500, y: -500, z: 0 }
    ];
    
    // Spawn enemy drones
    for (let i = 0; i < 4; i++) {
      const droneId = this.createEnemyDrone('SURVEILLANCE', spawnPositions[i]);
      this.enemyAssets.drones.push(droneId);
    }
    
    // Spawn enemy jammers
    const jammerPosition = { x: 0, y: 600, z: 0 };
    const jammerId = this.createEnemyJammer('STANDARD', jammerPosition);
    this.enemyAssets.jammers.push(jammerId);
  }
  
  // Create enemy drone
  createEnemyDrone(type, position) {
    // Create entity
    const entityId = this.ecs.createEntity();
    
    // Add components
    this.ecs.addComponent(entityId, ComponentTypes.TRANSFORM, position.x, position.y, position.z);
    this.ecs.addComponent(entityId, ComponentTypes.VISUAL, 'drone', '#ff4655', true);
    this.ecs.addComponent(entityId, ComponentTypes.DRONE, type);
    this.ecs.addComponent(entityId, ComponentTypes.RF_TRANSMITTER, 'ISM2400', 20, 'OMNI');
    this.ecs.addComponent(entityId, ComponentTypes.RF_RECEIVER, 'GPS', -95);
    this.ecs.addComponent(entityId, ComponentTypes.AI, 'patrol');
    this.ecs.addComponent(entityId, ComponentTypes.TEAM, 'ENEMY');
    
    // Set up drone patrol
    const droneComponent = this.ecs.getComponent(entityId, ComponentTypes.DRONE);
    droneComponent.waypoints = [
      { x: position.x + 200, y: position.y + 200, z: 0 },
      { x: position.x - 200, y: position.y + 200, z: 0 },
      { x: position.x - 200, y: position.y - 200, z: 0 },
      { x: position.x + 200, y: position.y - 200, z: 0 },
      { x: position.x, y: position.y, z: 0 }
    ];
    
    // Set AI state
    const aiComponent = this.ecs.getComponent(entityId, ComponentTypes.AI);
    aiComponent.state = CONFIG.drones.ai.states.PATROL;
    
    return entityId;
  }
  
  // Create enemy jammer
  createEnemyJammer(type, position) {
    // Create entity
    const entityId = this.ecs.createEntity();
    
    // Add components
    this.ecs.addComponent(entityId, ComponentTypes.TRANSFORM, position.x, position.y, position.z);
    this.ecs.addComponent(entityId, ComponentTypes.VISUAL, 'jammer', '#ff4655', true);
    this.ecs.addComponent(entityId, ComponentTypes.JAMMER, type);
    this.ecs.addComponent(entityId, ComponentTypes.RF_TRANSMITTER, 'GPS', 30, 'OMNI');
    this.ecs.addComponent(entityId, ComponentTypes.TEAM, 'ENEMY');
    
    // Activate jammer
    const jammerComponent = this.ecs.getComponent(entityId, ComponentTypes.JAMMER);
    jammerComponent.active = true;
    jammerComponent.targetFrequency = 'GPS';
    
    const transmitterComponent = this.ecs.getComponent(entityId, ComponentTypes.RF_TRANSMITTER);
    transmitterComponent.active = true;
    
    return entityId;
  }
  
  // Create player jammer
  createJammer(type, position) {
    // Check if we have available jammers of this type
    if (this.playerAssets.jammers.available[type] <= 0) {
      return null;
    }
    
    // Decrement available jammers
    this.playerAssets.jammers.available[type]--;
    
    // Create entity
    const entityId = this.ecs.createEntity();
    
    // Add components
    this.ecs.addComponent(entityId, ComponentTypes.TRANSFORM, position.x, position.y, position.z);
    this.ecs.addComponent(entityId, ComponentTypes.VISUAL, 'jammer', '#0084ff', true);
    this.ecs.addComponent(entityId, ComponentTypes.JAMMER, type);
    
    // Set up RF transmitter based on jammer type
    const jammerConfig = CONFIG.jammers.types[type];
    this.ecs.addComponent(
      entityId, 
      ComponentTypes.RF_TRANSMITTER, 
      jammerConfig.defaultFrequency, 
      jammerConfig.powerLevels.default, 
      jammerConfig.defaultAntenna
    );
    
    this.ecs.addComponent(entityId, ComponentTypes.TEAM, 'PLAYER');
    
    // Add to deployed jammers
    this.playerAssets.jammers.deployed.push(entityId);
    
    // Set jammer frequency and activate
    const jammerComponent = this.ecs.getComponent(entityId, ComponentTypes.JAMMER);
    jammerComponent.targetFrequency = jammerConfig.defaultFrequency;
    
    // Trigger event
    this.triggerEvent('jammerCreated', entityId, type, position);
    
    return entityId;
  }
  
  // Activate jammer
  activateJammer(jammerId) {
    if (!this.systems.jammer) {
      return false;
    }
    
    const result = this.systems.jammer.activateJammer(jammerId);
    
    if (result) {
      this.triggerEvent('jammerActivated', jammerId);
    }
    
    return result;
  }
  
  // Deactivate jammer
  deactivateJammer(jammerId) {
    if (!this.systems.jammer) {
      return false;
    }
    
    const result = this.systems.jammer.deactivateJammer(jammerId);
    
    if (result) {
      this.triggerEvent('jammerDeactivated', jammerId);
    }
    
    return result;
  }
  
  // Set jammer frequency
  setJammerFrequency(jammerId, frequency) {
    if (!this.systems.jammer) {
      return false;
    }
    
    const result = this.systems.jammer.setJammerFrequency(jammerId, frequency);
    
    if (result) {
      this.triggerEvent('jammerFrequencyChanged', jammerId, frequency);
    }
    
    return result;
  }
  
  // Set jammer power
  setJammerPower(jammerId, power) {
    if (!this.systems.jammer) {
      return false;
    }
    
    const result = this.systems.jammer.setJammerPower(jammerId, power);
    
    if (result) {
      this.triggerEvent('jammerPowerChanged', jammerId, power);
    }
    
    return result;
  }
  
  // Remove jammer
  removeJammer(jammerId) {
    // Get jammer team
    const teamComponent = this.ecs.getComponent(jammerId, ComponentTypes.TEAM);
    
    if (teamComponent && teamComponent.team === 'PLAYER') {
      // Find index in deployed jammers
      const index = this.playerAssets.jammers.deployed.indexOf(jammerId);
      
      if (index !== -1) {
        // Get jammer type
        const jammerComponent = this.ecs.getComponent(jammerId, ComponentTypes.JAMMER);
        const type = jammerComponent.type;
        
        // Remove from deployed jammers
        this.playerAssets.jammers.deployed.splice(index, 1);
        
        // Add back to available jammers
        this.playerAssets.jammers.available[type]++;
        
        // Destroy entity
        this.ecs.destroyEntity(jammerId);
        
        // Trigger event
        this.triggerEvent('jammerRemoved', jammerId, type);
        
        return true;
      }
    } else if (teamComponent && teamComponent.team === 'ENEMY') {
      // Find index in enemy jammers
      const index = this.enemyAssets.jammers.indexOf(jammerId);
      
      if (index !== -1) {
        // Remove from enemy jammers
        this.enemyAssets.jammers.splice(index, 1);
        
        // Destroy entity
        this.ecs.destroyEntity(jammerId);
        
        // Trigger event
        this.triggerEvent('enemyJammerDestroyed', jammerId);
        
        return true;
      }
    }
    
    return false;
  }
  
  // Create player drone
  createDrone(type, position, baseLocation) {
    // Check if we have available drones of this type
    if (this.playerAssets.drones.available[type] <= 0) {
      return null;
    }
    
    // Decrement available drones
    this.playerAssets.drones.available[type]--;
    
    // Create entity
    const entityId = this.ecs.createEntity();
    
    // Add components
    this.ecs.addComponent(entityId, ComponentTypes.TRANSFORM, position.x, position.y, position.z);
    this.ecs.addComponent(entityId, ComponentTypes.VISUAL, 'drone', '#0084ff', true);
    this.ecs.addComponent(entityId, ComponentTypes.DRONE, type);
    this.ecs.addComponent(entityId, ComponentTypes.RF_RECEIVER, 'GPS', -95);
    this.ecs.addComponent(entityId, ComponentTypes.AI, 'patrol');
    this.ecs.addComponent(entityId, ComponentTypes.TEAM, 'PLAYER');
    
    // Add transmitter for EW drones
    const droneConfig = CONFIG.drones.types[type];
    if (droneConfig.jammers) {
      this.ecs.addComponent(entityId, ComponentTypes.RF_TRANSMITTER, 'GPS', 27, 'OMNI');
    }
    
    // Set base location
    const droneComponent = this.ecs.getComponent(entityId, ComponentTypes.DRONE);
    droneComponent.baseLocation = baseLocation;
    
    // Add to deployed drones
    this.playerAssets.drones.deployed.push(entityId);
    
    // Trigger event
    this.triggerEvent('droneCreated', entityId, type, position);
    
    return entityId;
  }
  
  // Set drone waypoints
  setDroneWaypoints(droneId, waypoints) {
    const droneComponent = this.ecs.getComponent(droneId, ComponentTypes.DRONE);
    const aiComponent = this.ecs.getComponent(droneId, ComponentTypes.AI);
    
    if (!droneComponent || !aiComponent) {
      return false;
    }
    
    // Set waypoints
    droneComponent.waypoints = waypoints;
    
    // Set AI state to patrol
    aiComponent.state = CONFIG.drones.ai.states.PATROL;
    
    // Trigger event
    this.triggerEvent('droneWaypointsSet', droneId, waypoints);
    
    return true;
  }
  
  // Update metrics for UI display
  updateMetrics() {
    // Update jammer count
    const jammerCount = this.playerAssets.jammers.deployed.length;
    document.getElementById('jammer-count').textContent = jammerCount;
    
    // Update drone count
    const droneCount = this.playerAssets.drones.deployed.length;
    document.getElementById('drone-count').textContent = droneCount;
    
    // Update mission time
    const minutes = Math.floor(this.missionTimeRemaining / 60);
    const seconds = Math.floor(this.missionTimeRemaining % 60);
    document.getElementById('mission-time').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Event system
  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }
  
  removeEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      return;
    }
    
    const index = this.eventListeners[event].indexOf(callback);
    if (index !== -1) {
      this.eventListeners[event].splice(index, 1);
    }
  }
  
  triggerEvent(event, ...args) {
    if (!this.eventListeners[event]) {
      return;
    }
    
    for (const callback of this.eventListeners[event]) {
      callback(...args);
    }
  }
}

// Create global game state instance
const gameState = new GameState();