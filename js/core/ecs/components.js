/**
 * SIGNAL WARFARE - Component Definitions
 * 
 * This file defines all components for the Entity-Component-System architecture.
 * Components are pure data containers with no methods.
 */

// Unique ID Generator
let nextEntityId = 1;
function generateEntityId() {
  return nextEntityId++;
}

// Base Component class that all specific components extend
class Component {
  constructor() {
    this.enabled = true;
  }
}

// Transform Component - Position, rotation, scale
class TransformComponent extends Component {
  constructor(x = 0, y = 0, z = 0, rotation = 0) {
    super();
    this.position = { x, y, z };
    this.rotation = rotation;  // In degrees
    this.scale = { x: 1, y: 1, z: 1 };
  }
}

// Visual Component - Appearance properties
class VisualComponent extends Component {
  constructor(model = null, color = '#FFFFFF', visible = true) {
    super();
    this.model = model;  // Path or reference to 3D model
    this.color = color;
    this.visible = visible;
    this.opacity = 1.0;
    this.meshObject = null;  // THREE.js object reference
  }
}

// RF Transmitter Component - RF signal emission properties
class RFTransmitterComponent extends Component {
  constructor(frequency = 'GPS', power = 30, antenna = 'OMNI') {
    super();
    this.frequency = frequency;     // String key from CONFIG.rf.frequencyBands
    this.power = power;             // dBm
    this.antenna = antenna;         // String key from CONFIG.antennas.types
    this.active = false;
    this.antennaHeading = 0;        // Degrees, for directional antennas
    this.pulseParameters = {
      pulsing: false,
      onTime: 1000,               // ms
      offTime: 1000,              // ms
      currentlyTransmitting: false
    };
    this.visualizationObject = null; // THREE.js visualization object
  }
}

// RF Receiver Component - RF signal reception properties
class RFReceiverComponent extends Component {
  constructor(frequency = 'GPS', sensitivity = -95) {
    super();
    this.frequency = frequency;        // String key from CONFIG.rf.frequencyBands
    this.sensitivity = sensitivity;    // dBm
    this.receivedSignals = [];         // List of detected signals
    this.currentSignalStrength = null; // dBm of strongest detected signal
    this.jammedState = false;          // Whether this receiver is being jammed
  }
}

// Jammer Component - Specific properties for jammers
class JammerComponent extends Component {
  constructor(type = 'STANDARD') {
    super();
    this.type = type;                // String key from CONFIG.jammers.types
    this.active = false;
    this.targetFrequency = 'GPS';    // String key from CONFIG.rf.frequencyBands
    this.coverageRadius = 0;         // Visual radius of effect
    this.cooldownRemaining = 0;      // Seconds until can be reactivated
    this.powerLevel = CONFIG.jammers.types[type].powerLevels.default;
    this.depleted = false;
  }
}

// Drone Component - Specific properties for drones
class DroneComponent extends Component {
  constructor(type = 'SURVEILLANCE') {
    super();
    this.type = type;                 // String key from CONFIG.drones.types
    this.state = 'PATROL';            // Current AI state
    this.target = null;               // Current target position
    this.waypoints = [];              // List of patrol waypoints
    this.speed = CONFIG.drones.types[type].speed;
    this.altitude = CONFIG.drones.types[type].altitude;
    this.remainingTime = CONFIG.drones.types[type].operatingTime;
    this.returnToBaseWhenComplete = true;
    this.baseLocation = null;
  }
}

// AI Component - Behavior and decision making for AI entities
class AIComponent extends Component {
  constructor(behavior = 'patrol') {
    super();
    this.behavior = behavior;  // patrol, defend, attack, etc.
    this.state = 'idle';
    this.lastStateChangeTime = Date.now();
    this.targetEntity = null;
    this.detectedEnemies = [];
    this.awarenessRadius = 800;  // meters
    this.confusionLevel = 0;     // 0-100, affects decision making
    this.confusionTimer = 0;     // Time remaining in confused state
  }
}

// Health Component - Entity health and damage tracking
class HealthComponent extends Component {
  constructor(maxHealth = 100) {
    super();
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
    this.destroyed = false;
    this.damageSources = [];     // Track what caused damage
    this.lastDamageTime = 0;
    this.regenRate = 0;          // Health regenerated per second
  }
}

// Tag Component - Simple string tags for entity categorization
class TagComponent extends Component {
  constructor(tags = []) {
    super();
    this.tags = new Set(tags);
  }

  addTag(tag) {
    this.tags.add(tag);
  }

  hasTag(tag) {
    return this.tags.has(tag);
  }

  removeTag(tag) {
    this.tags.delete(tag);
  }
}

// Team Component - Entity team affiliation
class TeamComponent extends Component {
  constructor(team = 'PLAYER') {
    super();
    this.team = team;  // PLAYER, ENEMY, NEUTRAL
  }
}

// All component types available in the game
const ComponentTypes = {
  TRANSFORM: 'transform',
  VISUAL: 'visual',
  RF_TRANSMITTER: 'rfTransmitter',
  RF_RECEIVER: 'rfReceiver',
  JAMMER: 'jammer',
  DRONE: 'drone',
  AI: 'ai',
  HEALTH: 'health',
  TAG: 'tag',
  TEAM: 'team'
};

// Function to create specific component instances
function createComponent(type, ...args) {
  switch (type) {
    case ComponentTypes.TRANSFORM:
      return new TransformComponent(...args);
    case ComponentTypes.VISUAL:
      return new VisualComponent(...args);
    case ComponentTypes.RF_TRANSMITTER:
      return new RFTransmitterComponent(...args);
    case ComponentTypes.RF_RECEIVER:
      return new RFReceiverComponent(...args);
    case ComponentTypes.JAMMER:
      return new JammerComponent(...args);
    case ComponentTypes.DRONE:
      return new DroneComponent(...args);
    case ComponentTypes.AI:
      return new AIComponent(...args);
    case ComponentTypes.HEALTH:
      return new HealthComponent(...args);
    case ComponentTypes.TAG:
      return new TagComponent(...args);
    case ComponentTypes.TEAM:
      return new TeamComponent(...args);
    default:
      throw new Error(`Unknown component type: ${type}`);
  }
}