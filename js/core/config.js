/**
 * SIGNAL WARFARE - Configuration Module
 * 
 * Central configuration for all game parameters including:
 * - RF spectrum settings
 * - Antenna specifications
 * - Jammer types and properties
 * - Drone specifications
 * - UI settings
 * - Game mechanics parameters
 */

const CONFIG = {
  // Application settings
  app: {
    name: 'ECHO ZERO',
    version: '0.1.0',
    debugMode: false
  },
  
  // RF propagation settings
  rf: {
    // Default propagation model
    propagationModel: 'FSPL', // 'FSPL', 'TWO_RAY', 'LOG_DISTANCE'
    
    // Environmental conditions affecting propagation
    atmosphericConditions: 'CLEAR', // 'CLEAR', 'HUMID', 'RAIN' 
    
    // Frequency bands in MHz
    frequencyBands: {
      'UHF': { 
        label: '433MHz',
        value: 433,
        range: [433, 435],
        description: 'Low data rate, good penetration'
      },
      'ISM915': {
        label: '915MHz',
        value: 915,
        range: [902, 928],
        description: 'Medium range, decent penetration'
      },
      'GPS': {
        label: '1.5GHz',
        value: 1575.42,
        range: [1575.42, 1575.42], // Exact GPS L1 frequency
        description: 'Critical for navigation'
      },
      'ISM2400': {
        label: '2.4GHz',
        value: 2450,
        range: [2400, 2483],
        description: 'High bandwidth, limited range'
      },
      'CBAND': {
        label: '5.8GHz',
        value: 5800,
        range: [5725, 5850],
        description: 'Very high bandwidth, poor penetration'
      }
    },
    
    // Signal visualization colors
    signalColors: {
      strong: '#ff4655', // -30dBm to -50dBm
      medium: '#ffde59', // -50dBm to -70dBm
      weak: '#36f9b3',   // -70dBm to -85dBm
      trace: '#00b8d4'   // -85dBm to -95dBm
    }
  },
  
  // Antenna specifications
  antennas: {
    types: {
      'OMNI': {
        name: 'Omnidirectional',
        gainDbi: 2.5,     // 2-3 dBi
        beamWidth: 360,   // degrees
        description: 'General purpose 360° coverage'
      },
      'HELICONE': {
        name: 'Helicone',
        gainDbi: 10,      // 8-12 dBi
        beamWidth: 90,    // degrees
        description: 'Compact directional with circular polarization'
      },
      'HELIX': {
        name: 'Helix',
        gainDbi: 13.5,    // 12-15 dBi
        beamWidth: 45,    // degrees
        description: 'High gain with excellent axial ratio'
      },
      'HORN': {
        name: 'Horn',
        gainDbi: 17.5,    // 15-20 dBi
        beamWidth: 30,    // degrees
        description: 'Extreme directionality for precision jamming'
      }
    }
  },
  
  // Jammer types and properties
  jammers: {
    types: {
      'STANDARD': {
        name: 'Standard Jammer',
        description: 'General purpose jammer with omnidirectional antenna',
        defaultAntenna: 'OMNI',
        defaultFrequency: 'GPS',
        powerLevels: {
          min: 20,    // dBm (100mW)
          max: 33,    // dBm (2W)
          default: 27 // dBm (500mW)
        },
        cooldown: 0,  // seconds
        range: 1200,  // meters
        cost: 1,
        maxCount: 3
      },
      'PRECISION': {
        name: 'Precision Jammer',
        description: 'Directional jammer for targeted disruption',
        defaultAntenna: 'HORN',
        defaultFrequency: 'GPS',
        powerLevels: {
          min: 20,    // dBm (100mW)
          max: 37,    // dBm (5W)
          default: 30 // dBm (1W)
        },
        cooldown: 15, // seconds
        range: 2000,  // meters
        cost: 2,
        maxCount: 2
      },
      'PULSE': {
        name: 'Pulse Jammer',
        description: 'High-power pulses for intermittent jamming',
        defaultAntenna: 'HELICONE',
        defaultFrequency: 'GPS',
        powerLevels: {
          min: 27,    // dBm (500mW)
          max: 40,    // dBm (10W)
          default: 33 // dBm (2W)
        },
        cooldown: 30, // seconds
        range: 1500,  // meters
        cost: 2,
        maxCount: 2
      },
      'MOBILE': {
        name: 'Mobile Jammer',
        description: 'Vehicle-mounted jammer with extended range',
        defaultAntenna: 'OMNI',
        defaultFrequency: 'GPS',
        powerLevels: {
          min: 20,    // dBm (100mW)
          max: 40,    // dBm (10W)
          default: 30 // dBm (1W)
        },
        cooldown: 45, // seconds
        range: 2500,  // meters
        cost: 3,
        maxCount: 1
      }
    }
  },
  
  // Drone specifications
  drones: {
    types: {
      'SURVEILLANCE': {
        name: 'Surveillance Drone',
        description: 'Provides battlefield intelligence',
        speed: 15,       // meters per second
        altitude: 300,   // meters
        operatingTime: 30 * 60, // 30 minutes in seconds
        sensors: ['OPTICAL', 'RF'],
        jammingVulnerabilities: ['GPS'],
        cost: 1,
        maxCount: 2
      },
      'ATTACK': {
        name: 'Attack Drone',
        description: 'Carries payload to target objectives',
        speed: 25,       // meters per second
        altitude: 200,   // meters
        operatingTime: 15 * 60, // 15 minutes in seconds
        jammingVulnerabilities: ['GPS', 'ISM2400'],
        cost: 2,
        maxCount: 1
      },
      'EW': {
        name: 'Electronic Warfare Drone',
        description: 'Mobile jamming platform',
        speed: 20,       // meters per second
        altitude: 250,   // meters
        operatingTime: 20 * 60, // 20 minutes in seconds
        jammers: true,
        jammingVulnerabilities: ['GPS'],
        cost: 3,
        maxCount: 1
      }
    },
    ai: {
      // State machine constants
      states: {
        PATROL: 'patrol',
        CONFUSED: 'confused',
        RETURNING: 'returning',
        DISABLED: 'disabled'
      },
      // Jamming effects
      jammedErrorFactor: 1.5, // Position error multiplier when jammed
      jammedDuration: 30,     // Seconds drone stays confused after jamming
      confusedBehavior: 'random'  // 'random', 'circle', 'hover'
    }
  },
  
  // Terrain settings
  terrain: {
    width: 5000,     // meters
    height: 5000,    // meters
    maxElevation: 500, // meters
    types: {
      'URBAN': { label: 'Urban', attenuation: 20 },
      'FOREST': { label: 'Forest', attenuation: 10 },
      'WATER': { label: 'Water', attenuation: -5 },
      'OPEN': { label: 'Open', attenuation: 0 }
    }
  },
  
  // Mission settings
  mission: {
    phases: {
      DEPLOYMENT: { label: 'Deployment', duration: 120 }, // 2 minutes
      INTEL: { label: 'Intelligence', duration: 180 },    // 3 minutes
      OPERATION: { label: 'Operation', duration: 600 },   // 10 minutes
      DEFEND: { label: 'Defense', duration: 300 }         // 5 minutes
    },
    defaultVictoryScore: 75, // Percentage needed to win
    defaultAssets: {
      jammers: {
        'STANDARD': 3,
        'PRECISION': 2,
        'PULSE': 2,
        'MOBILE': 1
      },
      drones: {
        'SURVEILLANCE': 2,
        'ATTACK': 1,
        'EW': 1
      }
    }
  },
  
  // UI settings
  ui: {
    // Panel positions are now defined in CSS
    
    // Map settings
    map: {
      zoomLevels: [0.05, 0.1, 0.2, 0.3, 0.5],
      defaultZoom: 2, // Index in zoomLevels array
      gridLines: true,
      gridSpacing: 500, // meters
      colors: {
        background: '#141d26',
        grid: 'rgba(100, 116, 139, 0.2)',
        terrain: {
          base: '#1e293b',
          elevation: '#334155',
          highlight: '#475569'
        },
        assets: {
          ally: '#0ea5e9',
          enemy: '#f43f5e',
          selected: '#22d3ee'
        }
      }
    },
    
    // Tactical advantage indicator
    tacticalAdvantage: {
      width: '50%',
      height: 8,
      colors: {
        enemy: 'var(--alert-red)',
        neutral: '#888888',
        ally: 'var(--accent-primary)'
      }
    },
    
    // Animation timings
    animations: {
      fadeIn: 300,
      fadeOut: 200,
      panDuration: 500
    }
  }
};