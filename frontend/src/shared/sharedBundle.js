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
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}


function formatTextWithLineBreaks(text) {
  return text.replace(/\n/g, '<br/>');
}

let currentBotMessageElement = null; 



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
  let currentTokenStreamElement = null;  // New variable to keep track of the bot message element

  // Event listener for the sessionReady event
  document.addEventListener('sessionReady', function() {
    const sessionId = sessionStorage.getItem("sessionId");
    console.log("sessionReady event fired. sessionId:", sessionId);
    if (sessionId && socket) {
      socket.emit('setSessionId', sessionId);
    }
  });

  socket.onAny((event, ...args) => {
    console.log(`socket event received: ${event}`);
  });

  socket.on('start', () => {
    console.log('start');
  });

 socket.on('token', (token) => {
  if (currentMode !== 'C') {
    return;  // Skip if not in Mode C
  }

  // If it's the first token, create a new bot message element
  if (!currentTokenStreamElement) {
    // Hide the thinking state when the first token is received in Mode C
    thinkingStateElement.style.display = 'none';
    
    currentTokenStreamElement = createElementFromTemplate('chat-bot-message-wrapper');
    currentTokenStreamElement.classList.add('message-hidden');
    currentTokenStreamElement.querySelector('[element="chat-bot-message-content"]').innerHTML = '';
    currentTokenStreamElement.querySelector('[element="chat-history-bot-timestamp"]').textContent = getCurrentTime();
    document.querySelector('[list-element="chat-history"]').appendChild(currentTokenStreamElement);
    void currentTokenStreamElement.offsetWidth;

    // Here is where you trigger the slide-in effect
    currentTokenStreamElement.classList.remove('message-hidden');
    currentTokenStreamElement.classList.add('message-visible');
  }

  // Update the bot message element with the received token
  const existingContent = currentTokenStreamElement.querySelector('[element="chat-bot-message-content"]').innerHTML;
  currentTokenStreamElement.querySelector('[element="chat-bot-message-content"]').innerHTML = existingContent + token;
});


  socket.on('sourceDocuments', (sourceDocuments) => {
    console.log('sourceDocuments:', sourceDocuments);
  });

  ('end', () => {
    if (currentMode !== 'C') {
      return;  // Skip if not in Mode C
    }
    
    console.log('end');
    // Reset the currentTokenStreamElement so that a new one will be created on the next 'start'
    currentTokenStreamElement = null;
  });

  // When the socket connects, attempt to send the session ID to the server
  ('connect', () => {
      console.log('Socket connected');  
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
    if (e.shiftKey) {
      // Insert a line break when Shift + Enter is pressed
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const br = document.createElement("br");
      range.deleteContents();
      range.insertNode(br);
      range.setStartAfter(br);
      range.setEndAfter(br);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Submit the message when Enter is pressed without Shift
      document.querySelector('[trigger-action="submit-chat-input"]').click();
    }
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

  // Reset the currentTokenStreamElement to null for a new question
  currentTokenStreamElement = null;

  const userMessageElement = createElementFromTemplate('chat-user-message-wrapper');
userMessageElement.classList.remove('hidden');
userMessageElement.classList.add('message-hidden');  
userMessageElement.querySelector('[element="chat-user-message-content"]').textContent = userInput;
userMessageElement.querySelector('[element="chat-history-user-timestamp"]').textContent = getCurrentTime();
document.querySelector('[list-element="chat-history"]').appendChild(userMessageElement);
void userMessageElement.offsetWidth;  
userMessageElement.classList.remove('message-hidden');  
userMessageElement.classList.add('message-visible');





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
  // Skip if in Mode C to avoid regular bot message
  if (currentMode === 'C') {
    return;
  }

  // Create a new bot message element for the final response
const botMessageElement = createElementFromTemplate('chat-bot-message-wrapper');
botMessageElement.classList.remove('hidden');  
botMessageElement.classList.add('message-hidden');  
const formattedBotResponse = formatTextWithLineBreaks(data.text);
botMessageElement.querySelector('[element="chat-bot-message-content"]').innerHTML = formattedBotResponse;
botMessageElement.querySelector('[element="chat-history-bot-timestamp"]').textContent = getCurrentTime();
document.querySelector('[list-element="chat-history"]').appendChild(botMessageElement);
void botMessageElement.offsetWidth;  
botMessageElement.classList.remove('message-hidden');  
botMessageElement.classList.add('message-visible');



  
  // If audio URL is present, play the audio
  if (data.audioUrl) {
    audio.src = data.audioUrl;
    audio.play();
  }

  // If in mode 'C', set this as the current bot message element
  if (currentMode === 'C') {
    currentBotMessageElement = botMessageElement;
  } else {
    // Reset the current bot message element
    currentBotMessageElement = null;
  }

  thinkingStateElement.style.display = 'none';
});








  
function chatRecording() {
    const triggerDiv = document.querySelector('div[trigger-action="toggle-audio-record-chat-input"]');
    const canvasContainer = document.querySelector('.audio-recording-visualizer');
    const canvas = document.querySelector('canvas[element="audio-recording-visualizer"]');
    const input = document.querySelector('div[element="chat-user-input"]');

    if (!triggerDiv) {
        console.error("Could not find the audio record toggle button.");
        return;
    }

    let audioCtx, source, analyser, dataArray, mediaRecorder;
    let recording = false;
    let audioChunks = [];
    let stream;

    const initAudioContext = () => {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.9;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        source.connect(analyser);
        const canvasCtx = canvas.getContext('2d');

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
        if (recording) {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                triggerDiv.style.backgroundColor = '';
                canvasContainer.style.display = "none";
            }
        } else {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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
            } catch (error) {
                console.error("Failed to acquire media stream.", error);
                return;
            }
        }

        recording = !recording;
    };

    triggerDiv.addEventListener('click', toggleRecording);
}

window.onload = function() {
    chatRecording();
};








  

  

  
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
