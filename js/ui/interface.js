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
  // Background
  ctx.fillStyle = '#0c1116';
  ctx.fillRect(0, 0, width, height);
  
  // Grid
  ctx.strokeStyle = 'rgba(54, 249, 179, 0.1)';
  ctx.lineWidth = 1;
  
  // Vertical grid lines (frequency divisions)
  const verticalLines = 10;
  for (let i = 0; i <= verticalLines; i++) {
    const x = (i / verticalLines) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Horizontal grid lines (amplitude divisions)
  const horizontalLines = 5;
  for (let i = 0; i <= horizontalLines; i++) {
    const y = (i / horizontalLines) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Draw axes labels
  ctx.fillStyle = 'rgba(54, 249, 179, 0.6)';
  ctx.font = '10px var(--font-mono, monospace)';
  ctx.textAlign = 'left';
  ctx.fillText('-100 dBm', 5, height - 5);
  ctx.textAlign = 'right';
  ctx.fillText('-30 dBm', width - 5, height - 5);
  
  // Frequency range
  const selectedBand = document.querySelector('.band.active');
  const frequency = selectedBand ? selectedBand.dataset.freq : '433';
  
  // Draw frequency range
  ctx.textAlign = 'center';
  ctx.fillText(`${frequency} MHz`, width / 2, height - 5);
}

// Draw spectrum signals
function drawSignals(ctx, signals, width, height) {
  signals.forEach(signal => {
    // Draw signal peak
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(54, 249, 179, 0.8)');
    gradient.addColorStop(1, 'rgba(54, 249, 179, 0.1)');
    
    ctx.fillStyle = gradient;
    
    // Draw signal as a bell curve centered at frequency
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    for (let x = 0; x < width; x++) {
      const normalizedX = x / width;
      const centerPoint = signal.position;
      const distance = Math.abs(normalizedX - centerPoint);
      const amplitude = signal.strength * Math.exp(-(distance * distance) / (2 * signal.width * signal.width));
      const y = height - (amplitude * height);
      
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    
    // Draw peak frequency text
    ctx.fillStyle = 'rgba(54, 249, 179, 0.9)';
    ctx.textAlign = 'center';
    const peakX = signal.position * width;
    const peakY = height - (signal.strength * height) - 15;
    ctx.fillText(`${signal.name}`, peakX, peakY);
    ctx.fillText(`${signal.dbm} dBm`, peakX, peakY + 12);
  });
}

// Create demo signals for testing
function createDemoSignals() {
  const selectedBand = document.querySelector('.band.active');
  const frequency = selectedBand ? selectedBand.dataset.freq : '433';
  
  switch (frequency) {
    case '433':
      return [
        { name: 'FSK', position: 0.3, strength: 0.65, width: 0.05, dbm: '-45' },
        { name: 'LoRa', position: 0.7, strength: 0.85, width: 0.03, dbm: '-35' }
      ];
    case '915':
      return [
        { name: 'GFSK', position: 0.4, strength: 0.55, width: 0.07, dbm: '-50' },
        { name: 'Noise', position: 0.9, strength: 0.3, width: 0.1, dbm: '-70' }
      ];
    case '1575':
      return [
        { name: 'GPS L1', position: 0.5, strength: 0.75, width: 0.04, dbm: '-40' },
        { name: 'JAM', position: 0.55, strength: 0.95, width: 0.06, dbm: '-30' }
      ];
    case '2400':
      return [
        { name: 'BT', position: 0.2, strength: 0.4, width: 0.05, dbm: '-60' },
        { name: 'WIFI', position: 0.6, strength: 0.7, width: 0.12, dbm: '-45' },
        { name: 'DRONE', position: 0.8, strength: 0.6, width: 0.05, dbm: '-50' }
      ];
    case '5800':
      return [
        { name: 'WIFI', position: 0.5, strength: 0.65, width: 0.15, dbm: '-45' },
        { name: '5G', position: 0.2, strength: 0.45, width: 0.07, dbm: '-55' }
      ];
    default:
      return [
        { name: 'Signal', position: 0.5, strength: 0.7, width: 0.05, dbm: '-45' }
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
  // Store current signals and modify them slightly each frame
  let currentSignals = createDemoSignals();
  
  // Keep track of animation time
  let startTime = Date.now();
  
  function updateAnimation() {
    // Only animate if spectrum panel is visible and not minimized
    const spectrumPanel = document.getElementById('spectrum-panel');
    if (spectrumPanel && !spectrumPanel.classList.contains('minimized')) {
      // Calculate elapsed time for smooth oscillation
      const elapsedTime = (Date.now() - startTime) / 1000;
      
      // Create modified signals based on original ones but with slight variations
      const animatedSignals = currentSignals.map(signal => {
        return {
          ...signal,
          // Oscillate strength slightly
          strength: signal.strength * (0.9 + 0.2 * Math.sin(elapsedTime * 2 + signal.position * 10)),
          // Oscillate position slightly
          position: signal.position + 0.01 * Math.sin(elapsedTime * 1.5 + signal.position * 5),
          // Random variations in width
          width: signal.width * (0.95 + 0.1 * Math.sin(elapsedTime + signal.position * 15))
        };
      });
      
      // Add occasional noise spikes
      if (Math.random() < 0.05) {
        animatedSignals.push({
          name: 'NOISE',
          position: Math.random(),
          strength: 0.2 + Math.random() * 0.3,
          width: 0.02 + Math.random() * 0.03,
          dbm: '-' + Math.floor(70 + Math.random() * 20)
        });
      }
      
      // Update the spectrum display with animated signals
      updateSpectrumAnalyzer(animatedSignals);
    }
    
    // Refresh every 100ms for smoother animation
    setTimeout(updateAnimation, 100);
  }
  
  // Start the animation loop
  updateAnimation();
}
