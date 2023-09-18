// sharedBundle.js



import socketIOClient from 'socket.io-client';

function chatWidget() {
    const socket = socketIOClient("chatwidget-production.up.railway.app");  // Connect to your backend's URL
    let socketIOClientId = '';

    socket.on('connect', () => {
        socketIOClientId = socket.id;
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

        // Emit the message using sockets
        socket.emit('chatMessage', {
            question: userInput,
            socketIOClientId: socketIOClientId
        });
    });

    // Listen for bot's response
    socket.on('botResponse', (data) => {
        const formattedBotResponse = formatTextWithLineBreaks(data.text);

        const botMessageElement = createElementFromTemplate('chat-bot-message-wrapper');
        botMessageElement.querySelector('[element="chat-bot-message-content"]').innerHTML = formattedBotResponse;
        botMessageElement.querySelector('[element="chat-bot-message-content"]').setAttribute('bot-response-raw', data.text);

        if(data.audioUrl) {
            audio.src = data.audioUrl;
            audio.play();
        }

        botMessageElement.querySelector('[element="chat-history-bot-timestamp"]').textContent = getCurrentTime();
        document.querySelector('[list-element="chat-history"]').appendChild(botMessageElement);
        thinkingStateElement.style.display = 'none';
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
            storeBotResponseInDatabase(responseContent); // Implement this function to save the response to the database
        }
    });
}
