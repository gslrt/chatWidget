// sharedBundle.js





import { MAIN_SERVER_URL } from './script.built.js';
export function chatView() {


    function createElementFromTemplate(templateSelector) {
        const template = document.querySelector(`[template-element="${templateSelector}"]`);
        const clone = template.cloneNode(true);
        clone.classList.remove('hidden-template');
        return clone;
    }

    function getCurrentTime() {
        const now = new Date();
        return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    function escapeHtml(html) {
        var text = document.createTextNode(html);
        var p = document.createElement('p');
        p.appendChild(text);
        return p.innerHTML;
    }

    function formatTextWithLineBreaks(text) {
        text = escapeHtml(text);
        text = text.replace(/\n/g, '<br>');
        text = text.replace(/```([^`]+)```/g, function(match, code) {
            var escapedCode = code.replace(/<br>/g, '\n');
            return '<pre><code>' + escapedCode + '</code></pre>';
        });

        // Add support for bold text
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Add support for headings
        text = text.replace(/### (.*?)\n/g, '<h3>$1</h3>');
        text = text.replace(/## (.*?)\n/g, '<h2>$1</h2>');
        text = text.replace(/# (.*?)\n/g, '<h1>$1</h1>');

        return text;
    }

    document.addEventListener('DOMContentLoaded', function () {
        const audio = document.getElementById('audioPlayer');
        const thinkingStateElement = document.querySelector('[element="chat-thinking-state-wrapper"]');

        // Set "thinking" state hidden by default
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
            console.log("User Input:", userInput);

            if (!userInput) {
                return; // Do not proceed if the user input is empty
            }

            document.querySelector('[element="chat-user-input"]').innerText = '';

            // Show "thinking" state while waiting for bot response
            thinkingStateElement.style.display = 'block';

            const userMessageElement = createElementFromTemplate('chat-user-message-wrapper');
            userMessageElement.querySelector('[element="chat-user-message-content"]').textContent = userInput;
            userMessageElement.querySelector('[element="chat-history-user-timestamp"]').textContent = getCurrentTime();
            document.querySelector('[list-element="chat-history"]').appendChild(userMessageElement);

            const token = localStorage.getItem('token');

            fetch(`${MAIN_SERVER_URL}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token,
                },
                body: JSON.stringify({ "question": userInput, "ttsEnabled": true }) 
            })
            .then(response => {
                if (response.headers.get('content-type').includes('application/json')) {
                    return response.json();
                } else {
                    return response.text();
                }
            })
            .then(data => {
                console.log(data);

                const formattedBotResponse = formatTextWithLineBreaks(data.text);

                const botMessageElement = createElementFromTemplate('chat-bot-message-wrapper');
                botMessageElement.querySelector('[element="chat-bot-message-content"]').innerHTML = formattedBotResponse;

                // Store the original response in the bot-response-raw attribute
                botMessageElement.querySelector('[element="chat-bot-message-content"]').setAttribute('bot-response-raw', data.text);

                if(data.audioUrl) {
                    audio.src = data.audioUrl;
                    audio.play();
                }

                botMessageElement.querySelector('[element="chat-history-bot-timestamp"]').textContent = getCurrentTime();
                document.querySelector('[list-element="chat-history"]').appendChild(botMessageElement);

                // Hide "thinking" state after receiving bot response
                thinkingStateElement.style.display = 'none';
            })
            .catch(error => {
                console.error('Error:', error);
                // Hide "thinking" state in case of an error too
                thinkingStateElement.style.display = 'none';
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
                storeBotResponseInDatabase(responseContent); // Implement this function to save the response to the database
            }
        });
    });







 document.addEventListener('DOMContentLoaded', function () {
    const audioPlayer = document.getElementById('audioPlayer');
    const avatarWrapper = document.querySelector('[element="chat-bot-avatar-wrapper"]');
    let pulsingAnimation;

    const randomInterval = () => Math.random() * 200; // Random interval between 500ms and 1500ms
    const randomSaturation = () => Math.random() * 1.1 + 1.3; // Random value between 1.4 and 2.2

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
      // Smooth transition to increase saturation over 1 second
      avatarWrapper.style.transition = 'filter 1s';
      avatarWrapper.style.filter = 'saturate(2)';

      // Start the pulsing animation
      startPulsing();
    });

    audioPlayer.addEventListener('pause', () => {
      // Stop the pulsing animation and reset saturation
      stopPulsing();
    });

    audioPlayer.addEventListener('ended', () => {
      // Stop the pulsing animation and reset saturation when audio ends
      stopPulsing();
    });
  });
}
