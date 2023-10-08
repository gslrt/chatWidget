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

    // Initialize Web Audio API components
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    let pulsingAnimation;

    document.addEventListener('sessionReady', function() {
        const sessionId = sessionStorage.getItem("sessionId");
        console.log("sessionReady event fired. sessionId:", sessionId);
        if (sessionId && socket) {
            socket.emit('setSessionId', sessionId);
        }
    });

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
        // Handle the token
    });

    const thinkingStateElement = document.querySelector('[element="chat-thinking-state-wrapper"]');
    thinkingStateElement.style.display = 'none';

    const avatarWrapper = document.querySelector('[element="chat-bot-avatar-wrapper"]');

    const startPulsing = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        pulsingAnimation = setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const saturation = 1 + average / 256;
            avatarWrapper.style.transition = 'filter 0.1s';
            avatarWrapper.style.filter = `saturate(${saturation})`;
        }, 100);
    };

    const stopPulsing = () => {
        clearInterval(pulsingAnimation);
        avatarWrapper.style.transition = 'filter 1s';
        avatarWrapper.style.filter = 'saturate(1)';
    };

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
            fetch(data.audioUrl)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    const source = audioCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(analyser);
                    analyser.connect(audioCtx.destination);
                    source.start();
                    startPulsing();
                });
        }
        botMessageElement.querySelector('[element="chat-history-bot-timestamp"]').textContent = getCurrentTime();
        document.querySelector('[list-element="chat-history"]').appendChild(botMessageElement);
        thinkingStateElement.style.display = 'none';
    });
}
