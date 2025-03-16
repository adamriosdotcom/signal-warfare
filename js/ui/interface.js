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
  
  // Initialize map layer toggles
  initMapLayerToggles();
  
  // Initialize panel dragging
  initPanelDragging();
  
  // Initialize tactical map
  updateTacticalMap(window.gameState, window.assets || []);
  
  // Initialize spectrum analyzer
  updateSpectrumAnalyzer();
  
  // Set up animation loop for spectrum to show dynamic changes
  animateSpectrum();
  
  // Set up animation loop for tactical map (slower refresh rate)
  animateTacticalMap();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    // Update spectrum analyzer on window resize
    updateSpectrumAnalyzer();
    
    // Update tactical map on window resize
    updateTacticalMap(window.gameState, window.assets || []);
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

// Initialize map layer toggles
function initMapLayerToggles() {
  const mapToggles = document.querySelectorAll('.map-toggle');
  
  mapToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      // Toggle active state
      toggle.classList.toggle('active');
      
      // Update the tactical map when layers change
      updateTacticalMap(window.gameState, window.assets || []);
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

// Tactical Map Cache
const tacticalMapCache = {
  terrainGrid: null,
  lastWidth: 0,
  lastHeight: 0
};

// Update tactical map
function updateTacticalMap(gameState = {}, assets = []) {
  const mapContainer = document.getElementById('map-container');
  const canvas = document.getElementById('map-canvas');
  if (!mapContainer || !canvas) return;
  
  // Set canvas size to match container
  const width = mapContainer.clientWidth;
  const height = mapContainer.clientHeight;
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Get active layers
  const showTerrain = document.querySelector('[data-layer="terrain"]').classList.contains('active');
  const showRF = document.querySelector('[data-layer="rf"]').classList.contains('active');
  const showEnemy = document.querySelector('[data-layer="enemy"]').classList.contains('active');
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw background
  drawMapBackground(ctx, width, height);
  
  // Draw terrain if active
  if (showTerrain) {
    drawTerrainLayer(ctx, width, height);
  }
  
  // Draw RF propagation if active
  if (showRF) {
    drawRFLayer(ctx, width, height, assets);
  }
  
  // Draw assets (jammers, drones, etc.)
  drawAssets(ctx, width, height, assets);
  
  // Draw enemy positions if active
  if (showEnemy) {
    drawEnemyLayer(ctx, width, height, gameState);
  }
  
  // Draw grid overlay
  drawGridOverlay(ctx, width, height);
  
  // Draw coordinates and scale indicator
  drawCoordinatesAndScale(ctx, width, height);
}

// Draw the map background
function drawMapBackground(ctx, width, height) {
  // Fill with dark background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, '#0a1410'); // Very dark greenish
  bgGradient.addColorStop(1, '#0c1116'); // Match background color
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
}

// Draw terrain features
function drawTerrainLayer(ctx, width, height) {
  // Check if we can use cached terrain
  if (tacticalMapCache.terrainGrid && 
      tacticalMapCache.lastWidth === width && 
      tacticalMapCache.lastHeight === height) {
    ctx.putImageData(tacticalMapCache.terrainGrid, 0, 0);
    return;
  }
  
  // Generate terrain features
  // Use perlin-like noise for terrain elevation
  const resolution = 60; // Number of grid cells
  const cellSizeX = width / resolution;
  const cellSizeY = height / resolution;
  
  // Draw terrain elevation using a heatmap style
  for (let x = 0; x < resolution; x++) {
    for (let y = 0; y < resolution; y++) {
      // Calculate noise value (simplified perlin-like noise)
      const noiseX = x / resolution;
      const noiseY = y / resolution;
      const elevation = simplexNoise(noiseX * 5, noiseY * 5);
      
      // Assign terrain type based on elevation
      let color;
      let alpha = 0.7;
      
      if (elevation < -0.4) {
        // Water
        color = '#103155'; // Deep blue
        alpha = 0.8;
      } else if (elevation < -0.2) {
        // Shallow water
        color = '#144b7f'; // Medium blue
        alpha = 0.75;
      } else if (elevation < 0.1) {
        // Lowland / plains
        color = '#103322'; // Dark green
        alpha = 0.6;
      } else if (elevation < 0.3) {
        // Hills
        color = '#164422'; // Medium green
        alpha = 0.65;
      } else if (elevation < 0.5) {
        // Mountains
        color = '#2d3b2e'; // Gray-green
        alpha = 0.7;
      } else {
        // High mountains
        color = '#444940'; // Gray
        alpha = 0.75;
      }
      
      // Draw the cell
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x * cellSizeX, y * cellSizeY, cellSizeX, cellSizeY);
    }
  }
  
  // Reset alpha
  ctx.globalAlpha = 1.0;
  
  // Add some geographic features
  
  // Rivers (simplified)
  ctx.strokeStyle = '#1a66a0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  // Main river path
  const riverPoints = [
    { x: width * 0.1, y: height * 0.2 },
    { x: width * 0.3, y: height * 0.3 },
    { x: width * 0.5, y: height * 0.5 },
    { x: width * 0.6, y: height * 0.8 }
  ];
  
  ctx.moveTo(riverPoints[0].x, riverPoints[0].y);
  
  // Draw curves between points
  for (let i = 0; i < riverPoints.length - 1; i++) {
    const xMid = (riverPoints[i].x + riverPoints[i+1].x) / 2;
    const yMid = (riverPoints[i].y + riverPoints[i+1].y) / 2;
    ctx.quadraticCurveTo(riverPoints[i].x, riverPoints[i].y, xMid, yMid);
  }
  
  ctx.quadraticCurveTo(
    riverPoints[riverPoints.length-1].x,
    riverPoints[riverPoints.length-1].y,
    width * 0.7,
    height * 0.9
  );
  
  // Draw river with glow effect
  ctx.shadowColor = '#1a66a0';
  ctx.shadowBlur = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Add a lake
  ctx.fillStyle = '#1a66a0';
  ctx.beginPath();
  ctx.ellipse(width * 0.4, height * 0.4, width * 0.05, height * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Cache the terrain
  tacticalMapCache.terrainGrid = ctx.getImageData(0, 0, width, height);
  tacticalMapCache.lastWidth = width;
  tacticalMapCache.lastHeight = height;
}

// Draw RF signal propagation visualization
function drawRFLayer(ctx, width, height, assets) {
  // Only draw if we have jammers or transmitters
  const jammers = assets.filter(asset => asset.type === 'JAMMER' && asset.active);
  
  if (jammers.length === 0) return;
  
  // Draw RF coverage for each jammer
  jammers.forEach(jammer => {
    // Draw coverage circle
    const x = width * (jammer.position.x / CONFIG.terrain.width + 0.5);
    const y = height * (jammer.position.z / CONFIG.terrain.height + 0.5);
    
    // Define radius based on jammer power
    const power = jammer.power || 30; // Default power if not specified
    const radius = Math.min(width, height) * (power / 100);
    
    // Create gradient for signal strength
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255, 70, 85, 0.4)'); // Red core
    gradient.addColorStop(0.5, 'rgba(255, 70, 85, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 70, 85, 0)'); // Transparent edge
    
    // Draw signal
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw directional pattern if appropriate
    if (jammer.antennaType === 'directional' && jammer.heading !== undefined) {
      // Draw directive pattern
      ctx.fillStyle = 'rgba(255, 222, 89, 0.15)';
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.7, jammer.heading - Math.PI/4, jammer.heading + Math.PI/4);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
    }
  });
}

// Draw friendly assets (jammers, drones, etc.)
function drawAssets(ctx, width, height, assets) {
  if (!assets || assets.length === 0) return;
  
  // Map device types to symbols and colors
  const assetSymbols = {
    JAMMER: { symbol: '◆', color: '#ff4655', size: 12 },
    DRONE: { symbol: '▲', color: '#36f9b3', size: 10 },
    SENSOR: { symbol: '◉', color: '#00b8d4', size: 10 }
  };
  
  // Draw each asset
  assets.forEach(asset => {
    // Convert world coordinates to map coordinates
    const x = width * (asset.position.x / CONFIG.terrain.width + 0.5);
    const y = height * (asset.position.z / CONFIG.terrain.height + 0.5);
    
    // Get symbol info
    const symbolInfo = assetSymbols[asset.type] || { symbol: '■', color: '#ffffff', size: 10 };
    
    // Draw symbol
    ctx.font = `bold ${symbolInfo.size}px var(--font-mono, monospace)`;
    ctx.fillStyle = symbolInfo.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add shadow for better visibility
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 3;
    ctx.fillText(symbolInfo.symbol, x, y);
    ctx.shadowBlur = 0;
    
    // Add label if not too many assets
    if (assets.length < 10) {
      ctx.font = `8px var(--font-mono, monospace)`;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(asset.name || asset.type.slice(0,3), x, y + 15);
    }
    
    // If it's active, add a subtle glowing circle
    if (asset.active) {
      ctx.strokeStyle = symbolInfo.color;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  });
}

// Draw enemy positions
function drawEnemyLayer(ctx, width, height, gameState) {
  // Draw known enemy positions
  // This would normally come from gameState.enemyPositions or similar
  
  // For demonstration, add some dummy enemy positions
  const enemyPositions = [
    { x: 0.2, y: 0.3, type: 'PATROL' },
    { x: 0.7, y: 0.2, type: 'DRONE' },
    { x: 0.8, y: 0.7, type: 'BASE' }
  ];
  
  // Transform to actual coordinates
  enemyPositions.forEach(enemy => {
    const x = width * enemy.x;
    const y = height * enemy.y;
    
    // Draw enemy marker - red X
    ctx.strokeStyle = '#ff4655';  // Red
    ctx.lineWidth = 2;
    
    const markerSize = 8;
    
    // Draw X
    ctx.beginPath();
    ctx.moveTo(x - markerSize, y - markerSize);
    ctx.lineTo(x + markerSize, y + markerSize);
    ctx.moveTo(x + markerSize, y - markerSize);
    ctx.lineTo(x - markerSize, y + markerSize);
    
    // Add shadow/glow effect
    ctx.shadowColor = '#ff4655';
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Add label
    ctx.font = '8px var(--font-mono, monospace)';
    ctx.fillStyle = '#ff4655';
    ctx.textAlign = 'center';
    ctx.fillText(enemy.type, x, y + 15);
  });
}

// Draw grid overlay
function drawGridOverlay(ctx, width, height) {
  ctx.strokeStyle = 'rgba(54, 249, 179, 0.15)';
  ctx.lineWidth = 0.5;
  
  // Draw grid lines
  const gridSize = 40; // Pixels between grid lines
  
  // Vertical lines
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

// Draw coordinates and scale
function drawCoordinatesAndScale(ctx, width, height) {
  // Draw coordinate frame
  ctx.fillStyle = 'rgba(54, 249, 179, 0.7)';
  ctx.font = '9px var(--font-mono, monospace)';
  
  // X-axis markers (only draw a few)
  for (let i = 0; i <= 4; i++) {
    const x = width * (i / 4);
    const coordX = Math.round((i / 4 - 0.5) * CONFIG.terrain.width);
    ctx.textAlign = 'center';
    ctx.fillText(`${coordX}`, x, height - 5);
  }
  
  // Y-axis markers (only draw a few)
  for (let i = 0; i <= 4; i++) {
    const y = height * (i / 4);
    const coordY = Math.round((i / 4 - 0.5) * CONFIG.terrain.height);
    ctx.textAlign = 'left';
    ctx.fillText(`${coordY}`, 5, y);
  }
  
  // Draw scale bar
  const scaleBarWidth = 50;
  const scaleBarHeight = 3;
  const scaleText = "500m";
  
  ctx.fillStyle = 'rgba(54, 249, 179, 0.7)';
  ctx.fillRect(width - scaleBarWidth - 10, height - 15, scaleBarWidth, scaleBarHeight);
  
  ctx.textAlign = 'right';
  ctx.fillText(scaleText, width - 10, height - 20);
}

// Simplified Perlin noise approximation for terrain
function simplexNoise(x, y) {
  // Simple noise function for demo purposes
  // In a real implementation, you'd use a proper noise library
  return Math.sin(x * 10) * Math.cos(y * 8) * 0.5 + 
         Math.sin(x * 4 + y * 3) * 0.3 +
         Math.cos(x * 7 - y * 2) * 0.2;
}

// Animate tactical map
function animateTacticalMap() {
  // Track map panel visibility
  let lastMapPanelState = false;
  let lastUpdateTime = 0;
  
  // Create simulated demo assets if none exist yet
  if (!window.assets || window.assets.length === 0) {
    window.assets = [
      {
        type: 'JAMMER',
        position: { x: CONFIG.terrain.width * 0.2, y: 10, z: CONFIG.terrain.height * 0.3 },
        name: 'JAM-1',
        active: true,
        power: 40
      },
      {
        type: 'JAMMER',
        position: { x: CONFIG.terrain.width * -0.2, y: 10, z: CONFIG.terrain.height * -0.1 },
        name: 'JAM-2',
        active: true,
        power: 30
      },
      {
        type: 'DRONE',
        position: { x: CONFIG.terrain.width * 0.3, y: 50, z: CONFIG.terrain.height * -0.2 },
        name: 'DRONE-1',
        active: true
      }
    ];
  }
  
  // Setup game state if it doesn't exist
  if (!window.gameState) {
    window.gameState = {
      missionActive: true,
      currentPhase: 'INTEL',
      enemyPositions: [
        { x: 0.2, y: 0.3, type: 'PATROL' },
        { x: 0.7, y: 0.2, type: 'DRONE' },
        { x: 0.8, y: 0.7, type: 'BASE' }
      ]
    };
  }
  
  function updateAnimation() {
    // Only update at most once every second for performance
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime;
    
    // Check if map panel is visible
    const mapPanel = document.getElementById('map-panel');
    const isVisible = mapPanel && !mapPanel.classList.contains('minimized');
    
    // Only update every 1000ms if visible, and only if visibility changed
    if ((isVisible && timeSinceLastUpdate > 1000) || (isVisible !== lastMapPanelState)) {
      // Update tactical map
      updateTacticalMap(window.gameState, window.assets);
      
      // Update drone positions for animation
      if (window.assets) {
        // Animate drone movement
        window.assets.forEach(asset => {
          if (asset.type === 'DRONE') {
            // Add some movement
            const time = now / 5000;
            const radius = CONFIG.terrain.width * 0.05;
            asset.position.x += Math.sin(time) * 5;
            asset.position.z += Math.cos(time) * 5;
            
            // Keep within bounds
            if (Math.abs(asset.position.x) > CONFIG.terrain.width * 0.5) {
              asset.position.x = Math.sign(asset.position.x) * CONFIG.terrain.width * 0.45;
            }
            if (Math.abs(asset.position.z) > CONFIG.terrain.height * 0.5) {
              asset.position.z = Math.sign(asset.position.z) * CONFIG.terrain.height * 0.45;
            }
          }
        });
      }
      
      lastUpdateTime = now;
    }
    
    // Store current state
    lastMapPanelState = isVisible;
    
    // Schedule next update
    requestAnimationFrame(updateAnimation);
  }
  
  // Start the animation loop
  updateAnimation();
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

// Cache for grid patterns
const gridCache = {
  lastWidth: 0,
  lastHeight: 0,
  cachedGrid: null
};

// Draw spectrum grid
function drawSpectrumGrid(ctx, width, height) {
  // Check if we can use cached grid (if dimensions unchanged)
  if (gridCache.cachedGrid && 
      gridCache.lastWidth === width && 
      gridCache.lastHeight === height) {
    
    // Just draw the cached grid with the active band info
    ctx.putImageData(gridCache.cachedGrid, 0, 0);
    
    // Draw only dynamic elements (scanline and band identifier)
    updateDynamicGridElements(ctx, width, height);
    return;
  }
  
  // If cache miss or first run, render the full grid
  renderFullGrid(ctx, width, height);
  
  // Cache the grid (but without scanline which is dynamic)
  gridCache.lastWidth = width;
  gridCache.lastHeight = height;
  gridCache.cachedGrid = ctx.getImageData(0, 0, width, height);
  
  // Add dynamic elements on top
  updateDynamicGridElements(ctx, width, height);
}

// Render the full grid (expensive operation - only do when needed)
function renderFullGrid(ctx, width, height) {
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
  
  // Primary grid - fewer lines for better performance
  ctx.strokeStyle = 'rgba(54, 249, 179, 0.1)';
  ctx.lineWidth = 1;
  
  // Draw horizontal amplitude lines - reduced to 4 lines
  const amplitudeLevels = ['-100', '-80', '-60', '-40'];
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
    ctx.fillStyle = 'rgba(54, 249, 179, 0.5)';
    ctx.font = '8px var(--font-mono, monospace)';
    ctx.textAlign = 'left';
    ctx.fillText(`${level}`, 5, y - 2);
  });
  
  // Draw frequency division lines - reduced count
  const divisionCount = 4; // Half as many divisions
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
  
  // Draw simplified waterfall effect at the bottom
  const waterfallHeight = 10;
  ctx.fillStyle = 'rgba(54, 249, 179, 0.1)';
  ctx.fillRect(0, height - waterfallHeight, width, waterfallHeight);
}

// Update just the dynamic elements of the grid
function updateDynamicGridElements(ctx, width, height) {
  // Get current band info for display
  const selectedBand = document.querySelector('.band.active');
  const frequency = selectedBand ? selectedBand.dataset.freq : '433';
  
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
    
    // Prepare for curve smoothing - use fewer points and then curve
    const points = [];
    const pointCount = Math.min(100, width); // Cap points to improve performance
    
    for (let i = 0; i <= pointCount; i++) {
      // Convert x position to frequency
      const normalizedX = i / pointCount;
      const x = normalizedX * width;
      
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
        // Jamming signal is wider and more square but with smooth edges
        amplitude = signal.strength * (distance < signal.width * 1.5 ? 
          (1 - Math.pow(distance/(signal.width * 1.5), 3)) : 0);
      } else if (signalType === 'WIFI' || signalType === '5G') {
        // WIFI and 5G are wider with smooth side lobes
        const mainLobe = signal.strength * Math.exp(-(distance * distance) / (2 * signal.width * signal.width));
        
        // Smoother side lobes with less sharp transitions
        let sideLobes = 0;
        if (distance > signal.width * 0.6) {
          // Smoother falloff for side lobes
          const sideLobePhase = Math.PI * 8 * distance;
          const falloff = Math.exp(-distance * 6);
          sideLobes = signal.strength * 0.15 * Math.cos(sideLobePhase) * falloff;
        }
        
        amplitude = mainLobe + sideLobes;
      } else {
        // Standard Gaussian for other signals
        amplitude = signal.strength * Math.exp(-(distance * distance) / (2 * signal.width * signal.width));
      }
      
      // Calculate vertical position - leave space at the bottom for waterfall
      const usableHeight = height - 15;
      const y = usableHeight - (amplitude * usableHeight);
      
      // Add point to our collection
      points.push({ x, y });
    }
    
    // Draw smoothed curve using bezier curves
    if (points.length > 0) {
      ctx.moveTo(0, height - 15);
      ctx.lineTo(points[0].x, points[0].y);
      
      // Draw smooth bezier curves between points
      for (let i = 0; i < points.length - 1; i++) {
        const currentPoint = points[i];
        const nextPoint = points[i + 1];
        
        // Control points for smooth curve
        const cpx = (currentPoint.x + nextPoint.x) / 2;
        
        // Draw a quadratic curve to the midpoint using the current point as control
        ctx.quadraticCurveTo(
          currentPoint.x, currentPoint.y,
          cpx, (currentPoint.y + nextPoint.y) / 2
        );
      }
      
      // Final line to last point
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(width, height - 15);
    }
    
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
    
    // Calculate actual frequency based on position and band range
    const signalFreq = min + (signal.position * frequencyRange);
    
    // Calculate dynamic dBm value based on strength
    // Convert normalized strength (0-1) to dBm range (-100 to -30)
    const dBm = Math.floor(-100 + signal.strength * 70);
    // Store updated dBm value on the signal
    signal.dbm = String(dBm);
    
    // Format frequency for display
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
      
      // Draw text with subtle "LCD" effect - minimal info to reduce clutter
      ctx.fillText(`${signal.name}`, peakX, peakY);
      ctx.font = '8px var(--font-mono, monospace)';
      ctx.fillText(`${dBm} dBm`, peakX, peakY + 10);
      
      // Add tactical indicator for hostile signals (keep minimal)
      if (signal.isHostile) {
        ctx.fillStyle = 'rgba(255, 70, 85, 0.7)';
        ctx.font = 'bold 8px var(--font-mono, monospace)';
        ctx.fillText('⚠', peakX, peakY - 10); // Just show icon, not full text
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
  
  // Draw fewer noise points for better performance
  // Skip every 4 pixels instead of every 2
  for (let x = 0; x < width; x += 4) {
    // Random noise amplitude
    const amplitude = Math.random() * noiseHeight;
    const y = usableHeight - amplitude;
    
    // Draw wider points to maintain visual density
    ctx.fillRect(x, y, 3, amplitude);
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
  
  // Performance tracking
  let lastFrameTime = 0;
  let frameTimes = [];
  let slowFrameCount = 0;
  
  function updateAnimation() {
    const frameStartTime = performance.now();
    
    // Only animate if spectrum panel is visible and not minimized
    const spectrumPanel = document.getElementById('spectrum-panel');
    const isVisible = spectrumPanel && !spectrumPanel.classList.contains('minimized');
    frameCount++;
    
    // Calculate elapsed time
    const now = Date.now();
    const elapsedTime = (now - startTime) / 1000;
    
    // Skip processing entirely if panel is not visible
    if (isVisible) {
      // Check if band has changed - only do this check when visible
      const currentBand = document.querySelector('.band.active')?.dataset.freq || '433';
      if (currentBand !== activeBand) {
        activeBand = currentBand;
        currentSignals = createDemoSignals(); // Regenerate signals for new band
      }
      
      // Reduce regeneration frequency for better performance
      // Now only regenerate every 30 frames (3 seconds) when mission is active
      if (frameCount % 30 === 0 && window.gameState && window.gameState.missionActive) {
        currentSignals = createDemoSignals();
      }
      
      // Create modified signals based on original ones with minimal copies
      const animatedSignals = currentSignals.map(signal => {
        // Create shallow copy only with the properties we'll modify
        const modifiedSignal = { 
          name: signal.name,
          position: signal.position,
          strength: signal.strength,
          width: signal.width,
          dbm: signal.dbm,
          isHostile: signal.isHostile
        };
        
        // Use simplified math operations
        const randomSeed = signal.position * 100;
        
        // Different animation patterns based on signal type (simplified math)
        if (signal.name === 'NOISE') {
          // Noise is very random but less calculation intensive
          modifiedSignal.strength = signal.strength * (0.7 + 0.3 * Math.random());
          modifiedSignal.position = signal.position + 0.02 * (Math.random() - 0.5);
          modifiedSignal.width = signal.width * (0.9 + 0.2 * Math.random());
        } else if (signal.name === 'JAM') {
          // Jamming signals - smoother pulsing
          // Precalculated sine values for common phases to reduce math operations
          const phase = (elapsedTime * 1.5) % 6.28;
          // Use a smoother pulse calculation
          let pulseFactor;
          if (phase < 1.57) { // 0 to π/2
            pulseFactor = 0.8 + 0.2 * (phase / 1.57);
          } else if (phase < 4.71) { // π/2 to 3π/2
            pulseFactor = 1.0 - 0.2 * ((phase - 1.57) / 3.14);
          } else { // 3π/2 to 2π
            pulseFactor = 0.8 + 0.2 * ((phase - 4.71) / 1.57);
          }
          
          modifiedSignal.strength = signal.strength * pulseFactor;
          // Smoother position drift
          modifiedSignal.position = signal.position + 0.008 * Math.sin(elapsedTime * 0.4 + randomSeed);
          modifiedSignal.width = signal.width;
        } else if (signal.isHostile) {
          // Hostile signals - smoother transitions
          // Use a smoother strength oscillation
          const oscillation = 0.1 * Math.sin(elapsedTime * 0.8 + randomSeed);
          modifiedSignal.strength = signal.strength * (0.95 + oscillation);
          
          // Position drift with smoothing
          const drift = 0.005 * Math.sin(elapsedTime * 0.3 + randomSeed);
          modifiedSignal.position = signal.position + drift;
          
          // Very subtle width changes
          modifiedSignal.width = signal.width * (0.98 + 0.02 * Math.sin(elapsedTime * 0.2));
        } else {
          // Civilian signals - very stable with subtle, smooth variations
          // Use lookup table approach for smoother sine approximation
          const cyclePos = (elapsedTime * 0.2 + randomSeed) % 1.0;
          const smoothFactor = 0.02 * (0.5 - 0.5 * Math.cos(cyclePos * Math.PI * 2));
          
          modifiedSignal.strength = signal.strength * (0.98 + smoothFactor);
          modifiedSignal.position = signal.position;
          modifiedSignal.width = signal.width;
        }
        
        return modifiedSignal;
      });
      
      // Reduce noise spike frequency
      if (Math.random() < 0.01) {
        animatedSignals.push({
          name: 'NOISE',
          position: Math.random(),
          strength: 0.1 + Math.random() * 0.2,
          width: 0.01 + Math.random() * 0.02,
          dbm: '-' + Math.floor(70 + Math.random() * 20),
          isHostile: false
        });
      }
      
      // Analyze signals for tactical alerts only once per 2 seconds
      if (now - signalTracker.lastUpdate > 2000) {
        analyzeTacticalSignals(animatedSignals);
        signalTracker.lastUpdate = now;
      }
      
      // Update the spectrum display with animated signals
      updateSpectrumAnalyzer(animatedSignals);
    }
    
    // Track frame performance
    const frameTime = performance.now() - frameStartTime;
    frameTimes.push(frameTime);
    if (frameTimes.length > 10) frameTimes.shift();
    
    // Calculate average frame time
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    
    // Automatically adjust refresh rate based on performance
    let refreshDelay = 100; // Default 10fps
    
    if (avgFrameTime > 50) {
      // If frames are taking >50ms, slow down to 5fps
      refreshDelay = 200;
      slowFrameCount++;
      
      // If consistently slow, further reduce quality
      if (slowFrameCount > 10) {
        // Further reduce quality here if needed
        slowFrameCount = 10; // Cap the counter
      }
    } else {
      // Reset slow frame counter if performance is good
      slowFrameCount = Math.max(0, slowFrameCount - 1);
    }
    
    // Schedule next frame with adaptive delay
    setTimeout(() => {
      requestAnimationFrame(updateAnimation);
    }, refreshDelay);
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
