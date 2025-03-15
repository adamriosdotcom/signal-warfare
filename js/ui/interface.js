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
function updateSpectrumAnalyzer() {
  // Implementation will be added in Phase 2
  console.log('Updating spectrum analyzer');
}
