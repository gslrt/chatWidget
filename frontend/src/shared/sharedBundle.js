// frontend/src/shared/sharedBundle.js

import socketIOClient from 'socket.io-client';

// Helper functions
function createElementFromTemplate(templateId) {
  const templateElement = document.querySelector(`[template-element="${templateId}"]`);
  if (templateElement) {
    return templateElement.cloneNode(true);
  }
  return null;
}

function getCurrentTime() {
  const now = new Date();
  return `${now.getHours()}:${now.getMinutes()}`;
}

function formatTextWithLineBreaks(text) {
  return text.replace(/\n/g, '<br/>');
}

// Initialize chat mode from sessionStorage or default to 'A'
let currentMode = sessionStorage.getItem('chatMode') || 'A';

// Function to update UI based on the current mode
function updateUIMode() {
  const modeTitle = document.querySelector('[element="toggle-chat-mode-title"]');
  const modeDescription = document.querySelector('[element="toggle-chat-mode-description"]');

  switch (currentMode) {
    case 'A':
      modeTitle.textContent = "Mode A";
      modeDescription.textContent = "Wait for audio";
      break;
    case 'B':
      modeTitle.textContent = "Conversation Mode";
      modeDescription.textContent = "Free talk";
      break;
    case 'C':
      modeTitle.textContent = "Mode C";
      modeDescription.textContent = "Text only";
      break;
    default:
      console.error('Invalid mode');
      return;
  }

  // Store the current mode in sessionStorage
  sessionStorage.setItem('chatMode', currentMode);
}

// Main shared function
export function sharedFunction() {
  const socket = socketIOClient("chatwidget-production.up.railway.app");
  let socketIOClientId = '';
  let userUID = '';

  // Event listener for the sessionReady event
  document.addEventListener('sessionReady', function() {
    const sessionId = sessionStorage.getItem("sessionId");
    console.log("sessionReady event fired. sessionId:", sessionId);
    if (sessionId && socket) {
      socket.emit('setSessionId', sessionId);
    }
  });

  // When the socket connects, attempt to send the session ID to the server
  socket.on('connect', () => {
    socketIOClientId = socket.id;
    const sessionId = sessionStorage.getItem("sessionId");
    if (sessionId) {
      socket.emit('setSessionId', sessionId);
    } else {
      console.warn("Session ID is not available in sessionStorage");
    }
  });

  socket.on('token', (token) => {
    // Handle the token, e.g., append each token to the bot's message in real-time.
  });

  // All your existing chat logic is already integrated here. No need to insert anything else.

  // Initialize UI mode
  updateUIMode();

  // Listener for chat mode toggle
  document.querySelector('[trigger-action="toggle-chat-mode"]').addEventListener('click', function() {
    if (currentMode === 'A') {
      currentMode = 'B';
    } else if (currentMode === 'B') {
      currentMode = 'C';
    } else if (currentMode === 'C') {
      currentMode = 'A';
    } else {
      console.error('Invalid current mode');
      return;
    }

    // Update the UI based on the new mode
    updateUIMode();
  });
}
