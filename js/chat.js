// js/chat.js

export default class Chat {
    constructor(inputManager) {
        this.socket = null;
        this.inputManager = inputManager;
        this.chatContainer = document.getElementById('chat-container');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.isVisible = false;

        this.init();
    }

    init() {
        // The input manager will handle the 'T' key to toggle chat
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
                this.hideChat();
            } else if (e.key === 'Escape') {
                this.hideChat();
            }
            e.stopPropagation(); // Prevent game keybindings from firing while typing
        });
    }

    setSocket(socket) {
        this.socket = socket;
        this.socket.on('chatMessage', (data) => {
            this.addMessage(data.name, data.message, data.isSystem);
        });
    }

    isChatInputFocused() {
        return document.activeElement === this.chatInput;
    }

    toggleChat() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.showChat();
        } else {
            this.hideChat();
        }
    }

    showChat() {
        this.isVisible = true;
        this.chatContainer.classList.remove('hidden');
        this.chatInput.focus();
        this.inputManager.setChatting(true);
    }

    hideChat() {
        this.isVisible = false;
        this.chatContainer.classList.add('hidden');
        this.chatInput.blur();
        this.inputManager.setChatting(false);
    }

    sendMessage() {
        const message = this.chatInput.value.trim();
        if (this.socket && message) {
            this.socket.emit('chatMessage', { message });
            this.chatInput.value = '';
        }
    }

    addMessage(name, message, isSystem = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        
        const nameSpan = document.createElement('span');
        nameSpan.style.color = isSystem ? '#8cf' : '#fff'; // System messages in blue
        nameSpan.style.fontWeight = 'bold';
        nameSpan.textContent = name ? `${name}: ` : '';

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageSpan.style.color = isSystem ? '#8cf' : '#ddd';

        messageElement.appendChild(nameSpan);
        messageElement.appendChild(messageSpan);

        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}


