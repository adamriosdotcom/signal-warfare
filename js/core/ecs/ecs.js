/**
 * SIGNAL WARFARE - Entity Component System Core
 * 
 * This file implements the core ECS architecture:
 * - Entity: Simple ID with collection of components
 * - Component: Pure data structure
 * - System: Logic that operates on entities with specific components
 */

// Entity Manager - Handles creation, deletion, and querying of entities
class EntityManager {
  constructor() {
    this.entities = new Map();
    this.entityComponents = new Map();
    this.componentEntityMap = new Map();
    
    // Initialize component-entity maps for each component type
    for (const type in ComponentTypes) {
      this.componentEntityMap.set(ComponentTypes[type], new Set());
    }
    
    // Event system for entity changes
    this.eventListeners = {
      entityCreated: [],
      entityDestroyed: [],
      componentAdded: [],
      componentRemoved: []
    };
  }
  
  // Create a new entity
  createEntity() {
    const entityId = generateEntityId();
    this.entities.set(entityId, entityId);
    this.entityComponents.set(entityId, new Map());
    
    this._emitEvent('entityCreated', entityId);
    
    return entityId;
  }
  
  // Destroy an entity and all its components
  destroyEntity(entityId) {
    if (!this.entities.has(entityId)) {
      return false;
    }
    
    // Remove from component maps
    const components = this.entityComponents.get(entityId);
    components.forEach((component, type) => {
      this.componentEntityMap.get(type).delete(entityId);
    });
    
    // Delete entity records
    this.entityComponents.delete(entityId);
    this.entities.delete(entityId);
    
    this._emitEvent('entityDestroyed', entityId);
    
    return true;
  }
  
  // Add a component to an entity
  addComponent(entityId, componentType, ...args) {
    if (!this.entities.has(entityId)) {
      return null;
    }
    
    const component = createComponent(componentType, ...args);
    
    // Add to entity's component map
    this.entityComponents.get(entityId).set(componentType, component);
    
    // Add to component-entity map
    this.componentEntityMap.get(componentType).add(entityId);
    
    this._emitEvent('componentAdded', entityId, componentType, component);
    
    return component;
  }
  
  // Remove a component from an entity
  removeComponent(entityId, componentType) {
    if (!this.entities.has(entityId) || 
        !this.entityComponents.get(entityId).has(componentType)) {
      return false;
    }
    
    // Get component before removal for event
    const component = this.entityComponents.get(entityId).get(componentType);
    
    // Remove from entity's component map
    this.entityComponents.get(entityId).delete(componentType);
    
    // Remove from component-entity map
    this.componentEntityMap.get(componentType).delete(entityId);
    
    this._emitEvent('componentRemoved', entityId, componentType, component);
    
    return true;
  }
  
  // Get a specific component from an entity
  getComponent(entityId, componentType) {
    if (!this.entities.has(entityId)) {
      return null;
    }
    
    return this.entityComponents.get(entityId).get(componentType) || null;
  }
  
  // Check if an entity has a specific component
  hasComponent(entityId, componentType) {
    if (!this.entities.has(entityId)) {
      return false;
    }
    
    return this.entityComponents.get(entityId).has(componentType);
  }
  
  // Get all entities that have all of the specified components
  getEntitiesWithComponents(...componentTypes) {
    if (componentTypes.length === 0) {
      return [...this.entities.keys()];
    }
    
    // Start with the entities from the smallest component set
    let smallestSetSize = Infinity;
    let startComponentType = componentTypes[0];
    
    for (const type of componentTypes) {
      const setSize = this.componentEntityMap.get(type).size;
      if (setSize < smallestSetSize) {
        smallestSetSize = setSize;
        startComponentType = type;
      }
    }
    
    // Start with smallest set
    const startSet = this.componentEntityMap.get(startComponentType);
    if (startSet.size === 0) {
      return [];
    }
    
    // Filter by other component requirements
    return [...startSet].filter(entityId => {
      return componentTypes.every(type => this.hasComponent(entityId, type));
    });
  }
  
  // Get all components for an entity
  getAllComponents(entityId) {
    if (!this.entities.has(entityId)) {
      return null;
    }
    
    const result = {};
    this.entityComponents.get(entityId).forEach((component, type) => {
      result[type] = component;
    });
    
    return result;
  }
  
  // Events
  addEventListener(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
      return true;
    }
    return false;
  }
  
  removeEventListener(event, callback) {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(callback);
      if (index !== -1) {
        this.eventListeners[event].splice(index, 1);
        return true;
      }
    }
    return false;
  }
  
  _emitEvent(event, ...args) {
    if (this.eventListeners[event]) {
      for (const callback of this.eventListeners[event]) {
        callback(...args);
      }
    }
  }
}

// System - Base class for all game systems
class System {
  constructor(entityManager) {
    this.entityManager = entityManager;
    this.requiredComponents = [];
    this.enabled = true;
  }
  
  // Get all entities that this system should process
  getProcessableEntities() {
    return this.entityManager.getEntitiesWithComponents(...this.requiredComponents);
  }
  
  // Process each entity - to be overridden by each system
  processEntity(entityId, deltaTime) {
    // Base implementation does nothing
  }
  
  // Update - called each frame
  update(deltaTime) {
    if (!this.enabled) return;
    
    // Get all relevant entities
    const entities = this.getProcessableEntities();
    
    // Process each entity
    for (const entityId of entities) {
      this.processEntity(entityId, deltaTime);
    }
  }
}

// System Manager - Handles registration and updating of systems
class SystemManager {
  constructor(entityManager) {
    this.systems = [];
    this.systemsByName = new Map();
    this.entityManager = entityManager;
  }
  
  // Register a new system with an optional name
  registerSystem(systemClass, systemName = null) {
    const system = new systemClass(this.entityManager);
    this.systems.push(system);
    
    if (systemName) {
      this.systemsByName.set(systemName, system);
    }
    
    return system;
  }
  
  // Get a system by name
  getSystem(systemName) {
    return this.systemsByName.get(systemName) || null;
  }
  
  // Enable a system
  enableSystem(systemName) {
    const system = this.getSystem(systemName);
    if (system) {
      system.enabled = true;
      return true;
    }
    return false;
  }
  
  // Disable a system
  disableSystem(systemName) {
    const system = this.getSystem(systemName);
    if (system) {
      system.enabled = false;
      return true;
    }
    return false;
  }
  
  // Update all systems
  update(deltaTime) {
    for (const system of this.systems) {
      system.update(deltaTime);
    }
  }
}

// ECS - Top level class that ties everything together
class ECS {
  constructor() {
    this.entityManager = new EntityManager();
    this.systemManager = new SystemManager(this.entityManager);
  }
  
  // Create a new entity
  createEntity() {
    return this.entityManager.createEntity();
  }
  
  // Destroy an entity
  destroyEntity(entityId) {
    return this.entityManager.destroyEntity(entityId);
  }
  
  // Add a component to an entity
  addComponent(entityId, componentType, ...args) {
    return this.entityManager.addComponent(entityId, componentType, ...args);
  }
  
  // Remove a component from an entity
  removeComponent(entityId, componentType) {
    return this.entityManager.removeComponent(entityId, componentType);
  }
  
  // Get a component from an entity
  getComponent(entityId, componentType) {
    return this.entityManager.getComponent(entityId, componentType);
  }
  
  // Register a system
  registerSystem(systemClass, systemName = null) {
    return this.systemManager.registerSystem(systemClass, systemName);
  }
  
  // Get a system by name
  getSystem(systemName) {
    return this.systemManager.getSystem(systemName);
  }
  
  // Update all systems
  update(deltaTime) {
    this.systemManager.update(deltaTime);
  }
}