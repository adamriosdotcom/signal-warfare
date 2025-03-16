/**
 * ECHO ZERO - Jammer Entity Factory
 * 
 * This file contains factory functions to create jammer entities
 * with appropriate components and behaviors.
 */

// Jammer types and configurations are defined in CONFIG.jammers.types

// Factory function to create a jammer entity
function createJammer(ecs, type, position, team = 'PLAYER') {
  if (!ecs || !type || !position) {
    console.error("Invalid parameters provided to createJammer");
    return null;
  }

  // Validate jammer type
  const jammerConfig = CONFIG.jammers.types[type];
  if (!jammerConfig) {
    console.error(`Invalid jammer type: ${type}`);
    return null;
  }

  // Create entity
  const entityId = ecs.createEntity();
  
  // Add transform component
  ecs.addComponent(entityId, ComponentTypes.TRANSFORM, position.x, position.y, position.z);
  
  // Add visual component with team-based color
  const color = team === 'PLAYER' ? '#0084ff' : '#ff4655';
  ecs.addComponent(entityId, ComponentTypes.VISUAL, 'jammer', color, true);
  
  // Add jammer component
  ecs.addComponent(entityId, ComponentTypes.JAMMER, type);
  
  // Set up RF transmitter based on jammer type
  ecs.addComponent(
    entityId, 
    ComponentTypes.RF_TRANSMITTER, 
    jammerConfig.defaultFrequency, 
    jammerConfig.powerLevels.default, 
    jammerConfig.defaultAntenna
  );
  
  // Add team component
  ecs.addComponent(entityId, ComponentTypes.TEAM, team);
  
  // Add tag component for easier querying
  const tags = ['JAMMER', type, team];
  ecs.addComponent(entityId, ComponentTypes.TAG, tags);
  
  // Log creation
  console.log(`Created ${type} jammer (ID: ${entityId}) at position (${position.x}, ${position.y}, ${position.z})`);
  
  return entityId;
}

// Utility function to validate jammer placement
function validateJammerPlacement(ecs, position, deployedJammers) {
  if (!ecs || !position) {
    return { 
      valid: false, 
      reason: "Invalid parameters" 
    };
  }
  
  // Check terrain boundaries
  const terrainBounds = {
    minX: -CONFIG.terrain.width / 2,
    maxX: CONFIG.terrain.width / 2,
    minY: -CONFIG.terrain.height / 2,
    maxY: CONFIG.terrain.height / 2
  };
  
  if (position.x < terrainBounds.minX || position.x > terrainBounds.maxX || 
      position.y < terrainBounds.minY || position.y > terrainBounds.maxY) {
    return { 
      valid: false, 
      reason: "Out of bounds" 
    };
  }
  
  // Check proximity to other jammers
  const minimumDistance = 50; // 50 meters minimum distance between jammers
  
  for (const jammerId of deployedJammers) {
    const jammerTransform = ecs.getComponent(jammerId, ComponentTypes.TRANSFORM);
    if (jammerTransform) {
      const dx = position.x - jammerTransform.position.x;
      const dy = position.y - jammerTransform.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minimumDistance) {
        return { 
          valid: false, 
          reason: `Too close to another jammer (minimum ${minimumDistance}m required)` 
        };
      }
    }
  }
  
  // Passed all checks
  return {
    valid: true,
    reason: ""
  };
}
