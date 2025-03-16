/**
 * SIGNAL WARFARE - User Interface Manager
 * 
 * This file handles UI interactions, panel management, and visualization
 * of game state information in the interface.
 */

// UI Manager class will be implemented in Phase 4
// This file currently contains placeholder code

// Initialize UI components
document.addEventListener('DOMContentLoaded', () => {
  // Initialize minimize buttons
  initMinimizeButtons();
  
  // Initialize asset panel tabs
  initAssetPanelTabs();
  
  // Initialize panel dragging
  initPanelDragging();
  
  // Initialize spectrum analyzer
  updateSpectrumAnalyzer();
  
  // Set up animation loop for spectrum to show dynamic changes
  animateSpectrum();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    // Update spectrum analyzer on window resize
    updateSpectrumAnalyzer();
  });
});

// Initialize panel minimize buttons
function initMinimizeButtons() {
  console.log('DEBUG: Initializing minimize buttons');
  const minimizeButtons = document.querySelectorAll('.minimize-button');
  console.log('DEBUG: Found minimize buttons:', minimizeButtons.length);
  
  minimizeButtons.forEach(button => {
    // Add a more direct click event to ensure it's working
    button.onclick = function() {
      // Use the global toggle function to ensure consistent behavior
      return window.toggleMinimize(this.closest('.panel').id);
    };
  });
}

// Initialize asset panel tabs
function initAssetPanelTabs() {
  const assetTabs = document.querySelectorAll('.asset-tab');
  
  assetTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      document.querySelectorAll('.asset-tab').forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Show the corresponding content (placeholder for now)
      // In the future, we'll show/hide different content sections based on the tab
      console.log(`Selected tab: ${tab.dataset.tab}`);
    });
  });
}

// Initialize panel dragging
function initPanelDragging() {
  const panels = document.querySelectorAll('.panel');
  
  panels.forEach(panel => {
    const header = panel.querySelector('.panel-header');
    makeDraggable(panel, header);
  });
}

// Make an element draggable
function makeDraggable(element, handle) {
  if (!handle || !element) return;
  
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e.preventDefault();
    // Get mouse position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // Bring panel to front
    const allPanels = document.querySelectorAll('.panel');
    allPanels.forEach(p => p.style.zIndex = 10);
    element.style.zIndex = 20;
    
    // Add event listeners for mouse movement and release
    document.onmousemove = elementDrag;
    document.onmouseup = closeDragElement;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    
    // Calculate new position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // Set new position
    element.style.top = (element.offsetTop - pos2) + 'px';
    element.style.left = (element.offsetLeft - pos1) + 'px';
  }
  
  function closeDragElement() {
    // Remove event listeners
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Show an alert message in the UI
function showAlert(message, type = 'info') {
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

// Expose showAlert to window for global access
window.showAlert = showAlert;

// Update tactical map
function updateTacticalMap() {
  // Implementation will be added in Phase 2
  console.log('Updating tactical map');
}

// Update spectrum analyzer
function updateSpectrumAnalyzer(signals = []) {
  const spectrumDisplay = document.getElementById('spectrum-display');
  if (!spectrumDisplay) return;
  
  // Clear existing display
  while (spectrumDisplay.firstChild) {
    spectrumDisplay.removeChild(spectrumDisplay.firstChild);
  }
  
  // Create canvas for spectrum display
  const canvas = document.createElement('canvas');
  canvas.width = spectrumDisplay.clientWidth;
  canvas.height = spectrumDisplay.clientHeight;
  spectrumDisplay.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  
  // Draw background grid
  drawSpectrumGrid(ctx, canvas.width, canvas.height);
  
  // If no signals provided, create demo signals
  if (!signals || signals.length === 0) {
    signals = createDemoSignals();
  }
  
  // Draw signals
  drawSignals(ctx, signals, canvas.width, canvas.height);
  
  // Add event listeners to frequency band selectors
  initFrequencyBandSelectors();
}

// Draw spectrum grid
function drawSpectrumGrid(ctx, width, height) {
  // Background with subtle gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, '#0c1116');
  bgGradient.addColorStop(1, '#111a24');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  
  // Frequency band info
  const selectedBand = document.querySelector('.band.active');
  const frequency = selectedBand ? selectedBand.dataset.freq : '433';
  const { min, max } = getFrequencyRange(frequency);
  
  // Primary grid
  ctx.strokeStyle = 'rgba(54, 249, 179, 0.1)';
  ctx.lineWidth = 1;
  
  // Draw horizontal amplitude lines
  const amplitudeLevels = ['-100', '-90', '-80', '-70', '-60', '-50', '-40', '-30'];
  const usableHeight = height - 20; // Adjust for bottom margin
  
  amplitudeLevels.forEach((level, index) => {
    const normalizedValue = (parseInt(level) + 100) / 70; // Normalize -100 to -30 range
    const y = usableHeight - (normalizedValue * usableHeight);
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    
    // Draw label
    if (index % 2 === 0) { // Draw every other label to avoid cluttering
      ctx.fillStyle = 'rgba(54, 249, 179, 0.5)';
      ctx.font = '8px var(--font-mono, monospace)';
      ctx.textAlign = 'left';
      ctx.fillText(`${level}`, 5, y - 2);
    }
  });
  
  // Draw frequency division lines
  const divisionCount = 8;
  const frequencyRange = max - min;
  
  for (let i = 0; i <= divisionCount; i++) {
    const x = (i / divisionCount) * width;
    const frequencyValue = min + (i / divisionCount) * frequencyRange;
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height - 15); // Stop before bottom to make room for labels
    ctx.stroke();
    
    // Draw frequency label
    if (i % 2 === 0 || i === divisionCount) { // Draw selected labels
      ctx.fillStyle = 'rgba(54, 249, 179, 0.5)';
      ctx.font = '8px var(--font-mono, monospace)';
      ctx.textAlign = 'center';
      
      // Format frequency display based on range
      let displayFreq;
      if (frequencyValue >= 1000) {
        displayFreq = (frequencyValue / 1000).toFixed(1) + 'GHz';
      } else {
        displayFreq = frequencyValue.toFixed(0) + 'MHz';
      }
      
      ctx.fillText(displayFreq, x, height - 4);
    }
  }
  
  // Draw waterfall effect at the bottom
  const waterfallHeight = 10;
  const waterfallGradient = ctx.createLinearGradient(0, height - waterfallHeight, width, height - waterfallHeight);
  waterfallGradient.addColorStop(0, 'rgba(20, 29, 38, 0.8)');
  waterfallGradient.addColorStop(0.25, 'rgba(54, 249, 179, 0.1)');
  waterfallGradient.addColorStop(0.5, 'rgba(54, 249, 179, 0.2)');
  waterfallGradient.addColorStop(0.75, 'rgba(54, 249, 179, 0.1)');
  waterfallGradient.addColorStop(1, 'rgba(20, 29, 38, 0.8)');
  
  ctx.fillStyle = waterfallGradient;
  ctx.fillRect(0, height - waterfallHeight, width, waterfallHeight);
  
  // Add scanline effect
  ctx.fillStyle = 'rgba(54, 249, 179, 0.05)';
  const scanlinePosition = (Date.now() % 3000) / 3000; // Cycle every 3 seconds
  const scanlineY = scanlinePosition * height;
  ctx.fillRect(0, scanlineY, width, 2);
  
  // Draw band identifier in top right
  ctx.fillStyle = 'rgba(54, 249, 179, 0.8)';
  ctx.font = 'bold 11px var(--font-mono, monospace)';
  ctx.textAlign = 'right';
  ctx.fillText(`BAND: ${frequency} MHz`, width - 10, 15);
}

// Get frequency range for the selected band
function getFrequencyRange(frequency) {
  switch (frequency) {
    case '433':
      return { min: 430, max: 440 };
    case '915':
      return { min: 902, max: 928 };
    case '1575':
      return { min: 1560, max: 1590 };
    case '2400':
      return { min: 2400, max: 2500 };
    case '5800':
      return { min: 5700, max: 5900 };
    default:
      return { min: 430, max: 440 };
  }
}

// Draw spectrum signals
function drawSignals(ctx, signals, width, height) {
  // Get frequency band info
  const selectedBand = document.querySelector('.band.active');
  const frequencyBand = selectedBand ? selectedBand.dataset.freq : '433';
  const { min, max } = getFrequencyRange(frequencyBand);
  const frequencyRange = max - min;
  
  // Sort signals by strength to draw weaker ones first (layering effect)
  signals.sort((a, b) => a.strength - b.strength);
  
  // Background noise - add subtle static everywhere
  drawBackgroundNoise(ctx, width, height);
  
  // Draw each signal
  signals.forEach(signal => {
    // Determine signal characteristics based on type
    const signalType = signal.name || 'UNKNOWN';
    const signalColor = getSignalColor(signalType, signal.isHostile);
    
    // Create gradient based on signal type
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, signalColor.peak);
    gradient.addColorStop(0.6, signalColor.mid);
    gradient.addColorStop(1, signalColor.base);
    
    ctx.fillStyle = gradient;
    
    // Draw signal as a bell curve centered at frequency
    ctx.beginPath();
    ctx.moveTo(0, height - 15); // Adjust to leave room for labels
    
    for (let x = 0; x < width; x++) {
      // Convert x position to frequency
      const normalizedX = x / width;
      
      // Calculate signal shape
      const centerPoint = signal.position;
      const distance = Math.abs(normalizedX - centerPoint);
      
      // Apply the appropriate signal shape based on signal type
      let amplitude;
      
      if (signalType === 'NOISE') {
        // Random noise is more jagged
        amplitude = signal.strength * Math.exp(-(distance * distance) / (2 * signal.width * signal.width));
        amplitude *= (0.85 + 0.3 * Math.random()); // Add randomness
      } else if (signalType === 'JAM') {
        // Jamming signal is wider and more square
        amplitude = signal.strength * (distance < signal.width * 1.5 ? 
          (1 - Math.pow(distance/(signal.width * 1.5), 4)) : 0);
      } else if (signalType === 'WIFI' || signalType === '5G') {
        // WIFI and 5G are wider with side lobes
        const mainLobe = signal.strength * Math.exp(-(distance * distance) / (2 * signal.width * signal.width));
        const sideLobes = signal.strength * 0.2 * Math.cos(distance * 50) * Math.exp(-distance * 8);
        amplitude = mainLobe + (distance > signal.width ? sideLobes : 0);
      } else {
        // Standard Gaussian for other signals
        amplitude = signal.strength * Math.exp(-(distance * distance) / (2 * signal.width * signal.width));
      }
      
      // Calculate vertical position - leave space at the bottom for waterfall
      const usableHeight = height - 15;
      const y = usableHeight - (amplitude * usableHeight);
      
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, height - 15);
    ctx.closePath();
    ctx.fill();
    
    // Add glowing effect for strong signals
    if (signal.strength > 0.6) {
      ctx.save();
      ctx.filter = `blur(${signal.strength * 4}px)`;
      ctx.beginPath();
      
      const peakX = signal.position * width;
      const peakY = (height - 15) - (signal.strength * (height - 15));
      const glowRadius = signal.strength * 10;
      
      ctx.arc(peakX, peakY, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = signalColor.glow;
      ctx.fill();
      ctx.restore();
    }
    
    // Draw peak frequency marker
    const signalFreq = min + (signal.position * frequencyRange);
    let freqDisplay;
    
    if (signalFreq >= 1000) {
      freqDisplay = (signalFreq / 1000).toFixed(3) + ' GHz';
    } else {
      freqDisplay = signalFreq.toFixed(1) + ' MHz';
    }
    
    // Only show labels if the signal is strong enough
    if (signal.strength > 0.25) {
      // Draw peak frequency text
      ctx.fillStyle = signalColor.text;
      ctx.textAlign = 'center';
      ctx.font = 'bold 9px var(--font-mono, monospace)';
      
      const peakX = signal.position * width;
      const peakY = (height - 15) - (signal.strength * (height - 15)) - 18;
      
      // Draw text with subtle "LCD" effect
      ctx.fillText(`${signal.name}`, peakX, peakY);
      ctx.font = '8px var(--font-mono, monospace)';
      ctx.fillText(`${signal.dbm} dBm`, peakX, peakY + 10);
      ctx.fillText(`${freqDisplay}`, peakX, peakY + 20);
      
      // Add tactical indicator for hostile signals
      if (signal.isHostile) {
        ctx.fillStyle = 'rgba(255, 70, 85, 0.7)';
        ctx.font = 'bold 8px var(--font-mono, monospace)';
        ctx.fillText('⚠ HOSTILE', peakX, peakY - 10);
      }
    }
  });
}

// Draw background noise
function drawBackgroundNoise(ctx, width, height) {
  const usableHeight = height - 15;
  const noiseHeight = usableHeight * 0.1; // 10% of height
  
  // Create noise points
  ctx.fillStyle = 'rgba(54, 249, 179, 0.05)';
  
  for (let x = 0; x < width; x += 2) {
    // Random noise amplitude
    const amplitude = Math.random() * noiseHeight;
    const y = usableHeight - amplitude;
    
    ctx.fillRect(x, y, 1, amplitude);
  }
}

// Get color scheme based on signal type
function getSignalColor(type, isHostile = false) {
  // Hostile signals use red theme
  if (isHostile) {
    return {
      peak: 'rgba(255, 70, 85, 0.8)',
      mid: 'rgba(255, 70, 85, 0.4)',
      base: 'rgba(255, 70, 85, 0.1)',
      text: 'rgba(255, 70, 85, 0.9)',
      glow: 'rgba(255, 70, 85, 0.6)'
    };
  }
  
  // Color based on signal type
  switch (type) {
    case 'JAM':
      return {
        peak: 'rgba(255, 222, 89, 0.8)', // Yellow
        mid: 'rgba(255, 222, 89, 0.4)',
        base: 'rgba(255, 222, 89, 0.1)',
        text: 'rgba(255, 222, 89, 0.9)',
        glow: 'rgba(255, 222, 89, 0.6)'
      };
    case 'NOISE':
      return {
        peak: 'rgba(100, 116, 139, 0.6)', // Gray
        mid: 'rgba(100, 116, 139, 0.3)',
        base: 'rgba(100, 116, 139, 0.1)',
        text: 'rgba(100, 116, 139, 0.8)',
        glow: 'rgba(100, 116, 139, 0.2)'
      };
    case 'GPS':
    case 'GPS L1':
      return {
        peak: 'rgba(14, 165, 233, 0.8)', // Blue
        mid: 'rgba(14, 165, 233, 0.4)',
        base: 'rgba(14, 165, 233, 0.1)',
        text: 'rgba(14, 165, 233, 0.9)',
        glow: 'rgba(14, 165, 233, 0.6)'
      };
    default:
      return {
        peak: 'rgba(54, 249, 179, 0.8)', // Default green
        mid: 'rgba(54, 249, 179, 0.4)',
        base: 'rgba(54, 249, 179, 0.1)',
        text: 'rgba(54, 249, 179, 0.9)',
        glow: 'rgba(54, 249, 179, 0.6)'
      };
  }
}

// Create demo signals for testing
function createDemoSignals() {
  const selectedBand = document.querySelector('.band.active');
  const frequency = selectedBand ? selectedBand.dataset.freq : '433';
  
  // Add mission state integration
  const missionActive = window.gameState && window.gameState.missionActive;
  const missionPhase = window.gameState && window.gameState.currentPhase;
  
  // Scale factors for mission state
  let hostilePresence = 0;
  let jammingPresence = 0;
  
  if (missionActive) {
    switch (missionPhase) {
      case 'DEPLOYMENT':
        hostilePresence = 0.2;
        jammingPresence = 0;
        break;
      case 'INTEL':
        hostilePresence = 0.5;
        jammingPresence = 0.2;
        break;
      case 'OPERATION':
        hostilePresence = 0.8;
        jammingPresence = 0.6;
        break;
      case 'DEFEND':
        hostilePresence = 1.0;
        jammingPresence = 1.0;
        break;
      default:
        hostilePresence = 0.3;
        jammingPresence = 0.1;
    }
  }
  
  // Random variance to make signals more realistic
  const addVariance = (val, amount = 0.1) => val * (1 - amount/2 + Math.random() * amount);
  
  // Generate signals based on frequency band
  switch (frequency) {
    case '433':
      // 433 MHz: Common for remote control, IoT devices, etc.
      const signals433 = [
        // Base signals always present
        { 
          name: 'FSK', 
          position: 0.3, 
          strength: addVariance(0.65), 
          width: 0.05, 
          dbm: '-' + Math.floor(addVariance(45, 0.2)),
          isHostile: false
        },
        { 
          name: 'LoRa', 
          position: 0.7, 
          strength: addVariance(0.85), 
          width: 0.03, 
          dbm: '-' + Math.floor(addVariance(35, 0.2)),
          isHostile: false
        }
      ];
      
      // Add mission-specific signals
      if (missionActive && hostilePresence > 0.3 && Math.random() < hostilePresence) {
        signals433.push({
          name: 'DRONE', 
          position: addVariance(0.45, 0.2), 
          strength: addVariance(0.5 * hostilePresence), 
          width: 0.04, 
          dbm: '-' + Math.floor(addVariance(55, 0.3)),
          isHostile: true
        });
      }
      
      if (jammingPresence > 0 && Math.random() < jammingPresence) {
        signals433.push({
          name: 'JAM', 
          position: addVariance(0.5, 0.4), 
          strength: addVariance(0.7 * jammingPresence), 
          width: 0.08, 
          dbm: '-' + Math.floor(addVariance(40, 0.5)),
          isHostile: true
        });
      }
      
      return signals433;
      
    case '915':
      // 915 MHz: ISM band, used for various industrial/scientific equipment
      const signals915 = [
        { 
          name: 'GFSK', 
          position: 0.4, 
          strength: addVariance(0.55), 
          width: 0.07, 
          dbm: '-' + Math.floor(addVariance(50, 0.2)),
          isHostile: false
        },
        { 
          name: 'NOISE', 
          position: 0.9, 
          strength: addVariance(0.3), 
          width: 0.1, 
          dbm: '-' + Math.floor(addVariance(70, 0.2)),
          isHostile: false
        }
      ];
      
      // Add additional signals when mission is active
      if (missionActive && Math.random() < 0.7) {
        signals915.push({
          name: 'UART', 
          position: addVariance(0.6, 0.2), 
          strength: addVariance(0.4), 
          width: 0.05, 
          dbm: '-' + Math.floor(addVariance(65, 0.2)),
          isHostile: false
        });
      }
      
      return signals915;
      
    case '1575':
      // 1575 MHz: GPS L1 frequency - critical for mission
      const signals1575 = [
        { 
          name: 'GPS L1', 
          position: 0.5, 
          strength: addVariance(0.75), 
          width: 0.04, 
          dbm: '-' + Math.floor(addVariance(40, 0.1)),
          isHostile: false
        }
      ];
      
      // Add jamming when present based on mission phase
      if (jammingPresence > 0 && Math.random() < jammingPresence * 1.5) {
        signals1575.push({
          name: 'JAM', 
          position: addVariance(0.53, 0.1), 
          strength: addVariance(0.9 * jammingPresence), 
          width: 0.08, 
          dbm: '-' + Math.floor(addVariance(30, 0.2)),
          isHostile: true
        });
      }
      
      return signals1575;
      
    case '2400':
      // 2.4 GHz: WiFi, Bluetooth, consumer drones
      const signals2400 = [
        { 
          name: 'BT', 
          position: 0.2, 
          strength: addVariance(0.4), 
          width: 0.05, 
          dbm: '-' + Math.floor(addVariance(60, 0.2)),
          isHostile: false
        },
        { 
          name: 'WIFI', 
          position: 0.6, 
          strength: addVariance(0.7), 
          width: 0.12, 
          dbm: '-' + Math.floor(addVariance(45, 0.2)),
          isHostile: false
        }
      ];
      
      // Add drone signals based on mission phase
      if (hostilePresence > 0.2 && Math.random() < hostilePresence) {
        const droneCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < droneCount; i++) {
          signals2400.push({
            name: 'DRONE', 
            position: addVariance(0.8, 0.3), 
            strength: addVariance(0.6 * hostilePresence), 
            width: 0.05, 
            dbm: '-' + Math.floor(addVariance(50, 0.3)),
            isHostile: true
          });
        }
      }
      
      return signals2400;
      
    case '5800':
      // 5.8 GHz: WiFi, modern consumer drones, 5G
      const signals5800 = [
        { 
          name: 'WIFI', 
          position: 0.5, 
          strength: addVariance(0.65), 
          width: 0.15, 
          dbm: '-' + Math.floor(addVariance(45, 0.2)),
          isHostile: false
        },
        { 
          name: '5G', 
          position: 0.2, 
          strength: addVariance(0.45), 
          width: 0.07, 
          dbm: '-' + Math.floor(addVariance(55, 0.2)),
          isHostile: false
        }
      ];
      
      // Add mission-specific signals
      if (missionActive && hostilePresence > 0.4) {
        signals5800.push({
          name: 'DRONE', 
          position: addVariance(0.75, 0.2),
          strength: addVariance(0.7 * hostilePresence), 
          width: 0.04, 
          dbm: '-' + Math.floor(addVariance(40, 0.3)),
          isHostile: true
        });
        
        if (jammingPresence > 0.5 && Math.random() < jammingPresence) {
          signals5800.push({
            name: 'JAM', 
            position: addVariance(0.73, 0.1), 
            strength: addVariance(0.8 * jammingPresence), 
            width: 0.1, 
            dbm: '-' + Math.floor(addVariance(35, 0.2)),
            isHostile: true
          });
        }
      }
      
      return signals5800;
      
    default:
      return [
        { 
          name: 'Signal', 
          position: 0.5, 
          strength: 0.7, 
          width: 0.05, 
          dbm: '-45',
          isHostile: false
        }
      ];
  }
}

// Initialize frequency band selectors
function initFrequencyBandSelectors() {
  const bands = document.querySelectorAll('.band');
  
  // If no active band, set the first one active
  if (!document.querySelector('.band.active')) {
    bands[0].classList.add('active');
  }
  
  bands.forEach(band => {
    band.addEventListener('click', () => {
      // Remove active class from all bands
      bands.forEach(b => b.classList.remove('active'));
      
      // Add active class to clicked band
      band.classList.add('active');
      
      // Update spectrum display
      updateSpectrumAnalyzer();
    });
  });
}

// Animate spectrum to show dynamic signal changes
function animateSpectrum() {
  // Track active band to detect changes
  let activeBand = document.querySelector('.band.active')?.dataset.freq || '433';
  
  // Store current signals
  let currentSignals = createDemoSignals();
  
  // Keep track of animation time
  let startTime = Date.now();
  
  // Tactical events history
  let eventLog = [];
  let lastEventTime = 0;
  
  // Animation frame counter for optimizing refreshes
  let frameCount = 0;
  
  // Track important signals for alert generation
  const signalTracker = {
    jammingDetected: false,
    hostileSignalsCount: 0,
    gpsStatus: 'normal', // 'normal', 'degraded', 'jammed'
    lastUpdate: Date.now()
  };
  
  function updateAnimation() {
    // Only animate if spectrum panel is visible and not minimized
    const spectrumPanel = document.getElementById('spectrum-panel');
    const isVisible = spectrumPanel && !spectrumPanel.classList.contains('minimized');
    frameCount++;
    
    // Calculate elapsed time
    const now = Date.now();
    const elapsedTime = (now - startTime) / 1000;
    
    // Check if band has changed
    const currentBand = document.querySelector('.band.active')?.dataset.freq || '433';
    if (currentBand !== activeBand) {
      activeBand = currentBand;
      currentSignals = createDemoSignals(); // Regenerate signals for new band
      console.log("Band changed to:", activeBand);
    }
    
    // Every 10th frame (about 1 second) regenerate some signals to simulate changes
    if (frameCount % 10 === 0) {
      // Regenerate signals only if mission is active to show dynamic battlefield
      if (window.gameState && window.gameState.missionActive) {
        currentSignals = createDemoSignals();
      }
    }
    
    if (isVisible) {
      // Create modified signals based on original ones but with slight variations
      const animatedSignals = currentSignals.map(signal => {
        const randomSeed = signal.position * 100; // Make each signal unique but consistent
        let modifiedSignal = { ...signal };
        
        // Different animation patterns based on signal type
        if (signal.name === 'NOISE') {
          // Noise is very random
          modifiedSignal.strength = signal.strength * (0.7 + 0.6 * Math.random());
          modifiedSignal.position = signal.position + 0.03 * (Math.random() - 0.5);
          modifiedSignal.width = signal.width * (0.8 + 0.4 * Math.random());
        } else if (signal.name === 'JAM') {
          // Jamming signals have aggressive pulsing
          const pulseRate = 2.5;
          const pulseDepth = 0.3;
          modifiedSignal.strength = signal.strength * (1 - pulseDepth + pulseDepth * Math.abs(Math.sin(elapsedTime * pulseRate + randomSeed)));
          modifiedSignal.position = signal.position + 0.01 * Math.sin(elapsedTime * 0.7 + randomSeed);
          modifiedSignal.width = signal.width * (0.9 + 0.2 * Math.sin(elapsedTime * 1.2 + randomSeed));
        } else if (signal.isHostile) {
          // Hostile signals have characteristic fluctuations
          modifiedSignal.strength = signal.strength * (0.85 + 0.3 * Math.pow(Math.sin(elapsedTime * 1.2 + randomSeed), 2));
          modifiedSignal.position = signal.position + 0.015 * Math.sin(elapsedTime * 0.8 + randomSeed);
          modifiedSignal.width = signal.width * (0.9 + 0.2 * Math.sin(elapsedTime * 1.5 + randomSeed));
        } else {
          // Civilian signals have smoother, more stable patterns
          modifiedSignal.strength = signal.strength * (0.95 + 0.1 * Math.sin(elapsedTime * 0.5 + randomSeed));
          modifiedSignal.position = signal.position + 0.005 * Math.sin(elapsedTime * 0.3 + randomSeed);
          modifiedSignal.width = signal.width * (0.98 + 0.04 * Math.sin(elapsedTime * 0.4 + randomSeed));
        }
        
        return modifiedSignal;
      });
      
      // Add occasional noise spikes (less frequent for cleaner display)
      if (Math.random() < 0.02) {
        animatedSignals.push({
          name: 'NOISE',
          position: Math.random(),
          strength: 0.1 + Math.random() * 0.2,
          width: 0.01 + Math.random() * 0.02,
          dbm: '-' + Math.floor(70 + Math.random() * 20),
          isHostile: false
        });
      }
      
      // Analyze signals for tactical alerts (once per second)
      if (now - signalTracker.lastUpdate > 1000) {
        analyzeTacticalSignals(animatedSignals);
        signalTracker.lastUpdate = now;
      }
      
      // Update the spectrum display with animated signals
      updateSpectrumAnalyzer(animatedSignals);
    }
    
    // Use requestAnimationFrame for smoother animation
    // But limit refresh rate to 10fps for performance
    setTimeout(() => {
      requestAnimationFrame(updateAnimation);
    }, 100);
  }
  
  // Analyze signals for tactical information
  function analyzeTacticalSignals(signals) {
    if (!window.gameState || !window.gameState.missionActive) return;
    
    // Count hostile signals and check for jammers
    let hostileCount = 0;
    let jamming = false;
    let gpsSignal = 'normal';
    
    signals.forEach(signal => {
      if (signal.isHostile) hostileCount++;
      if (signal.name === 'JAM') jamming = true;
      
      // Check GPS status specifically on the GPS band
      if (activeBand === '1575') {
        if (signal.name === 'GPS L1') {
          if (signal.strength < 0.4) {
            gpsSignal = 'degraded';
          }
        }
        if (signal.name === 'JAM' && signal.strength > 0.6) {
          gpsSignal = 'jammed';
        }
      }
    });
    
    // Generate alerts for important changes
    if (hostileCount > signalTracker.hostileSignalsCount) {
      // New hostile signal detected
      if (window.showAlert && Math.random() < 0.3) { // Randomize to avoid alert spam
        window.showAlert(`Detected ${hostileCount} hostile signals in ${activeBand} MHz band`, 'warning');
      }
    }
    
    if (jamming && !signalTracker.jammingDetected) {
      // Jamming just detected
      if (window.showAlert) {
        window.showAlert(`ALERT: Jamming detected in ${activeBand} MHz band`, 'critical');
      }
    }
    
    if (gpsSignal !== signalTracker.gpsStatus && activeBand === '1575') {
      if (gpsSignal === 'jammed' && window.showAlert) {
        window.showAlert('CRITICAL: GPS signal is being jammed', 'critical');
      } else if (gpsSignal === 'degraded' && window.showAlert) {
        window.showAlert('WARNING: GPS signal degraded', 'warning');
      }
    }
    
    // Update tracker
    signalTracker.hostileSignalsCount = hostileCount;
    signalTracker.jammingDetected = jamming;
    signalTracker.gpsStatus = gpsSignal;
    
    // Add tactical event to log (if important enough)
    if ((jamming && !signalTracker.jammingDetected) || 
        (gpsSignal !== signalTracker.gpsStatus) || 
        (hostileCount - signalTracker.hostileSignalsCount > 1)) {
      
      // Only log if enough time has passed since last event
      const now = Date.now();
      if (now - lastEventTime > 5000) {
        lastEventTime = now;
        eventLog.push({
          time: new Date().toLocaleTimeString(),
          message: jamming ? 
            `Jamming detected in ${activeBand} MHz band` : 
            `${hostileCount} hostile signals in ${activeBand} MHz`
        });
        
        // Keep log size reasonable
        if (eventLog.length > 10) {
          eventLog.shift();
        }
      }
    }
  }
  
  // Start the animation loop
  updateAnimation();
}
