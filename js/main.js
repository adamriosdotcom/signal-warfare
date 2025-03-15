/**
 * SIGNAL WARFARE - Main Entry Point
 * 
 * This file loads the THREE.js library dynamically and initializes the application.
 */

// Simple check for THREE.js
function checkThreeJs() {
  // Check if THREE is available
  if (window.THREE) {
    console.log('THREE.js is available');
    return true;
  } else {
    console.error('THREE.js not available');
    displayErrorMessage('THREE.js library not loaded. Please ensure you have internet access.');
    return false;
  }
}

// Check THREE.js on load
window.addEventListener('load', () => {
  if (checkThreeJs() && window.gameEngine) {
    console.log('Initializing game with THREE.js');
  }
});

// Display startup message
function displayStartupMessage() {
  const message = "ECHO ZERO initializing...";
  console.log(message);
  
  // Add system message to RAVEN output
  const ravenOutput = document.getElementById('raven-output');
  if (ravenOutput) {
    const systemMessage = document.createElement('div');
    systemMessage.className = 'message system';
    systemMessage.textContent = "ECHO ZERO tactical interface online. Welcome, Commander.";
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
  
  // Add dynamic style elements
  const style = document.createElement('style');
  style.textContent = `
    /* Extra styles for minimized panels */
    .panel.minimized {
      transition: all 0.3s ease !important;
    }
  `;
  document.head.appendChild(style);
  
  // Initialize panel interactions
  initializePanelInteractions();
});

// Initialize panel interactions (dragging, minimizing, etc.)
function initializePanelInteractions() {
  // This functionality has been moved to interface.js
  // This function is now a simple placeholder for backward compatibility
  console.log('Panel interactions initialized via interface.js');
}