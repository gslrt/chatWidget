// frontend/src/shared/sharedBundle.js

import socketIOClient from 'socket.io-client';

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
            userUID: userUID
        });
    });

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

    

    // Update the UI based on the current mode
function updateUIMode(mode) {
    const chatWidget = document.querySelector('.chat-widget');
    const modeTitle = document.querySelector('[element="toggle-chat-mode-title"]');
    const modeDescription = document.querySelector('[element="toggle-chat-mode-description"]');

    // Remove all mode classes
    chatWidget.classList.remove('mode-a', 'mode-b', 'mode-c');
    
    // Add the new mode class
    chatWidget.classList.add(`mode-${mode.toLowerCase()}`);

    switch (mode) {
        case 'A':
            modeTitle.textContent = "Mode A";
            modeDescription.textContent = "Wait for audio";
            break;
        case 'B':
            modeTitle.textContent = "Conversation Mode";
            modeDescription.textContent = "Free talk";
            // Additional logic specific to Conversation Mode (enlarge avatar, activate microphone, etc.)
            activateMicrophone();
            showLargeAvatar();
            break;
        case 'C':
            modeTitle.textContent = "Mode C";
            modeDescription.textContent = "Text only";
            break;
        default:
            console.error('Invalid mode');
            return;
    }
}


// Define a variable to keep track of the current mode
let currentMode = 'A';

// Update the UI based on the current mode
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
}

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

