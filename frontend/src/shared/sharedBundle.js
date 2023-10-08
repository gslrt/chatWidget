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

     // Visual feedback based on audio
    document.addEventListener('DOMContentLoaded', function () {
        const audioPlayer = document.getElementById('audioPlayer');
        const avatarWrapper = document.querySelector('[element="chat-bot-avatar-wrapper"]');
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
    });

    document.addEventListener('click', function (e) {
        if (e.target.matches('[trigger-action="copy-bot-response-to-clipboard"]')) {
            e.preventDefault();
            const lastBotMessageContent = document.querySelectorAll('[element="chat-bot-message-content"]')[document.querySelectorAll('[element="chat-bot-message-content"]').length - 1].innerText;
            navigator.clipboard.writeText(lastBotMessageContent).then(function () {
                console.log('Bot response copied to clipboard');
            }, function (err) {
                console.error('Could not copy bot response: ', err);
            });
        }

        if (e.target.matches('[trigger-action="save-bot-response-as-private-document"]')) {
            const responseContent = e.target.closest('.message.bot').querySelector('[element="chat-bot-message-content"]').getAttribute('bot-response-raw');
            // Implement the function to save the response to the database
        }
    });
}
