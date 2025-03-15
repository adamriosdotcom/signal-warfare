/**
 * SIGNAL WARFARE - Main Entry Point
 * 
 * This file loads the THREE.js library dynamically and initializes the application.
 */

// Directly include THREE.js script tag in index.html
// Let the browser know that we expect THREE to be available
const checkThreeJsLoaded = () => {
  if (window.THREE) {
    console.log('THREE.js loaded successfully');
    // Initialize post-processing if needed
    if (window.gameEngine && window.gameEngine.setupPostProcessing) {
      window.gameEngine.setupPostProcessing();
    }
  } else {
    console.error('THREE.js not available');
    displayErrorMessage('THREE.js library not loaded. Please check the script inclusion in the HTML file.');
  }
};

// Check if THREE.js is loaded after a short delay
setTimeout(checkThreeJsLoaded, 1000);

// Display startup message
function displayStartupMessage() {
  const message = "SIGNAL WARFARE initializing...";
  console.log(message);
  
  // Add system message to RAVEN output
  const ravenOutput = document.getElementById('raven-output');
  if (ravenOutput) {
    const systemMessage = document.createElement('div');
    systemMessage.className = 'message system';
    systemMessage.textContent = "SIGNAL WARFARE tactical interface online. Welcome, Commander.";
    ravenOutput.appendChild(systemMessage);
  }
}

// Display error message
function displayErrorMessage(message) {
  console.error(message);
  
  const errorContainer = document.createElement('div');
  errorContainer.style.position = 'absolute';
  errorContainer.style.top = '50%';
  errorContainer.style.left = '50%';
  errorContainer.style.transform = 'translate(-50%, -50%)';
  errorContainer.style.backgroundColor = 'rgba(255, 70, 85, 0.9)';
  errorContainer.style.color = 'white';
  errorContainer.style.padding = '20px';
  errorContainer.style.borderRadius = '5px';
  errorContainer.style.textAlign = 'center';
  errorContainer.style.maxWidth = '80%';
  errorContainer.style.zIndex = '1000';
  
  errorContainer.innerHTML = `
    <h3>Initialization Error</h3>
    <p>${message}</p>
    <button onclick="location.reload()">Retry</button>
  `;
  
  document.body.appendChild(errorContainer);
}

// Wait for page to load
window.addEventListener('load', () => {
  displayStartupMessage();
  
  // Add tactical advantage indicator styles
  const style = document.createElement('style');
  style.textContent = `
    #tactical-advantage {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: ${CONFIG.ui.tacticalAdvantage.width};
      z-index: 20;
    }
    
    .advantage-bar {
      height: ${CONFIG.ui.tacticalAdvantage.height}px;
      background-color: rgba(30, 41, 59, 0.8);
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    }
    
    .advantage-progress {
      height: 100%;
      width: 50%;
      background-color: ${CONFIG.ui.tacticalAdvantage.colors.neutral};
      transition: width 0.5s ease, background-color 0.5s ease;
    }
    
    .advantage-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      font-size: 10px;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }
    
    .advantage-value {
      font-weight: 600;
      color: var(--text-primary);
    }
  `;
  document.head.appendChild(style);
  
  // Initialize panel interactions
  initializePanelInteractions();
});

// Initialize panel interactions (dragging, minimizing, etc.)
function initializePanelInteractions() {
  const panels = document.querySelectorAll('.panel');
  
  panels.forEach(panel => {
    // Make panels draggable
    const header = panel.querySelector('.panel-header');
    makeDraggable(panel, header);
    
    // Add minimize button functionality
    const minimizeButton = panel.querySelector('.minimize-button');
    if (minimizeButton) {
      minimizeButton.addEventListener('click', () => {
        const content = panel.querySelector('.panel-content');
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
        minimizeButton.textContent = content.style.display === 'none' ? '+' : '_';
      });
    }
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