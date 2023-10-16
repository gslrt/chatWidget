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
  const conversationModeWrapper = document.querySelector('[element="conversation-mode-message-wrapper"]');
  const visualizerWrapper = document.querySelector('[element="interface-visualizer-wrapper"]');
  const chatHistory = document.querySelector('[element="chat-history"]');

  switch (currentMode) {
    case 'A':
      modeTitle.textContent = "Mode A";
      modeDescription.textContent = "Wait for audio";
      conversationModeWrapper.classList.add('hide');
      visualizerWrapper.classList.remove('conversation-mode');
      chatHistory.classList.remove('conversation-mode');
      break;
    case 'B':
      modeTitle.textContent = "Conversation Mode";
      modeDescription.textContent = "Free talk";
      conversationModeWrapper.classList.remove('hide');
      visualizerWrapper.classList.add('conversation-mode');
      chatHistory.classList.add('conversation-mode');
      break;
    case 'C':
      modeTitle.textContent = "Mode C";
      modeDescription.textContent = "Text only";
      conversationModeWrapper.classList.add('hide');
      visualizerWrapper.classList.remove('conversation-mode');
      chatHistory.classList.remove('conversation-mode');
      break;
    default:
      console.error('Invalid mode');
      return;
  }

  // Store the current mode in sessionStorage
  sessionStorage.setItem('chatMode', currentMode);
}

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

  const audio = document.getElementById('audioPlayer');
  const thinkingStateElement = document.querySelector('[element="chat-thinking-state-wrapper"]');
  thinkingStateElement.style.display = 'none';

  document.querySelector('[element="chat-user-input"]').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.querySelector('[trigger-action="submit-chat-input"]').click();
    }
  });

  document.querySelector('[trigger-action="submit-chat-input"]').addEventListener('click', function (e) {
    e.preventDefault();
    const userInput = document.querySelector('[element="chat-user-input"]').innerText.trim();
    if (!userInput) {
      return;
    }
    document.querySelector('[element="chat-user-input"]').innerText = '';
    thinkingStateElement.style.display = 'block';
    const userMessageElement = createElementFromTemplate('chat-user-message-wrapper');
    userMessageElement.querySelector('[element="chat-user-message-content"]').textContent = userInput;
    userMessageElement.querySelector('[element="chat-history-user-timestamp"]').textContent = getCurrentTime();
    document.querySelector('[list-element="chat-history"]').appendChild(userMessageElement);
    socket.emit('chatMessage', {
      question: userInput,
      socketIOClientId: socketIOClientId,
      userUID: userUID,
      mode: currentMode
    });
  });


  

  // Visual feedback based on audio
  const audioPlayer = document.getElementById('audioPlayer');
  const avatarWrapper = document.querySelector('[element="chat-bot-avatar-wrapper"]');

  if (audioPlayer && avatarWrapper) {
    let pulsingAnimation;

    const randomInterval = () => Math.random() * 200;
    const randomSaturation = () => Math.random() * 1.1 + 1.3;

    const startPulsing = () => {
      pulsingAnimation = setInterval(() => {
        avatarWrapper.style.transition = 'filter 0.3s';
        avatarWrapper.style.filter = `saturate(${randomSaturation()})`;
      }, randomInterval());
    };

    const stopPulsing = () => {
      clearInterval(pulsingAnimation);
      avatarWrapper.style.transition = 'filter 1s';
      avatarWrapper.style.filter = 'saturate(1)';
    };

    audioPlayer.addEventListener('play', () => {
      startPulsing();
    });

    audioPlayer.addEventListener('pause', () => {
      stopPulsing();
    });

    audioPlayer.addEventListener('ended', () => {
      stopPulsing();
    });
  } else {
    console.warn("Required DOM elements for visual feedback are not available yet.");
  }

  socket.on('botResponse', (data) => {
    const formattedBotResponse = formatTextWithLineBreaks(data.text);
    const botMessageElement = createElementFromTemplate('chat-bot-message-wrapper');
    botMessageElement.querySelector('[element="chat-bot-message-content"]').innerHTML = formattedBotResponse;
    botMessageElement.querySelector('[element="chat-bot-message-content"]').setAttribute('bot-response-raw', data.text);
    if (data.audioUrl) {
      audio.src = data.audioUrl;
      audio.play();
    }
    botMessageElement.querySelector('[element="chat-history-bot-timestamp"]').textContent = getCurrentTime();
    document.querySelector('[list-element="chat-history"]').appendChild(botMessageElement);
    thinkingStateElement.style.display = 'none';
  });









  
function chatRecording() {
    console.log("Debug: Starting chatRecording function");

    let recording = false;
    let audioChunks = [];
    let stream;
    let audioCtx;
    let source;
    let analyser;
    let dataArray;

    const triggerDiv = document.querySelector('div[trigger-action="toggle-audio-record-chat-input"]');

    if (!triggerDiv) {
        console.error("Debug: Could not find the audio record toggle button.");
        return;  // Exit the function if the main element is not found
    } else {
        console.log("Debug: Found the audio record toggle button.");
    }

    const canvas = document.querySelector('canvas[element="audio-recording-visualizer"]');
    const input = document.querySelector('div[element="chat-user-input"]');
    const canvasCtx = canvas.getContext('2d');
    const canvasContainer = document.querySelector('div[element="audio-recording-visualizer-code"]');
    canvasContainer.style.display = "none"; 

    const initAudioContext = () => {
        console.log("Debug: Inside initAudioContext function");
        
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.9;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        source.connect(analyser);

        function draw() {
            requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);
            canvasCtx.fillStyle = 'rgb(28, 28, 28)';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = 'rgb(255, 0, 0)';
            canvasCtx.beginPath();
            const sliceWidth = canvas.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        }

        draw();
    };

    const toggleRecording = async () => {
        console.log("Debug: Inside toggleRecording function");

        if (recording) {
            console.log("Debug: Stopping recording");
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                triggerDiv.style.backgroundColor = '';
                canvasContainer.style.display = "none"; 
            }
        } else {
            console.log("Debug: Starting recording");
            
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                console.log("Debug: Media stream acquired.");
            } catch (error) {
                console.error("Debug: Failed to acquire media stream.", error);
                return;  // Exit if the stream could not be acquired
            }

            mediaRecorder = new MediaRecorder(stream);
            initAudioContext();

            input.textContent = ''; 

            mediaRecorder.ondataavailable = event => audioChunks.push(event.data);

            mediaRecorder.onstop = () => {
                const formData = new FormData();
                formData.append('file', new Blob(audioChunks, { type: 'audio/webm' }), 'audio.webm');
                const token = localStorage.getItem('token');
                const transcribeApiUrl = `${process.env.TRANSCRIBE_SERVER_URL}/transcribe`;

                fetch(transcribeApiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                    },
                    body: formData,
                    credentials: 'include'
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.text) {
                            input.textContent = data.text;
                        } else {
                            console.error(data.error);
                        }
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                    });

                audioChunks = [];
            };

            mediaRecorder.start();
            triggerDiv.style.backgroundColor = 'red';
            canvasContainer.style.display = "block"; 
        }

        recording = !recording;
    };

    triggerDiv.addEventListener('click', function() {
        console.log("Debug: Audio record button clicked.");
        toggleRecording();
    });

    console.log("Debug: Event listener attached to audio record button.");
}

// Ensure chatRecording is called after DOM is fully loaded:
document.addEventListener('DOMContentLoaded', function() {
    console.log("Debug: DOM fully loaded.");
    chatRecording();
});










  

  

  
  // Listen for clicks on the toggle element
  document.querySelector('[trigger-action="toggle-chat-mode"]').addEventListener('click', function() {
    // Cycle through modes A -> B -> C -> A
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

  // Initial UI setup
  updateUIMode();
}
