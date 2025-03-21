// Obtém a API do VSCode
const vscode = acquireVsCodeApi();

// Elementos do DOM
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// Estado do chat
let messages = [];

// Função para adicionar mensagem ao chat
function addMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.textContent = message;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Salva a mensagem no estado
    messages.push({ message, sender });
    vscode.setState({ messages });
}

// Função para enviar mensagem
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        // Envia a mensagem para a extensão
        vscode.postMessage({
            type: 'sendMessage',
            message: message
        });
        
        // Limpa o input
        messageInput.value = '';
    }
}

// Event listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Listener para mensagens da extensão
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'addMessage':
            addMessage(message.message, message.sender);
            break;
    }
});

// Restaura o estado anterior
const previousState = vscode.getState();
if (previousState) {
    messages = previousState.messages;
    messages.forEach(msg => {
        addMessage(msg.message, msg.sender);
    });
} 