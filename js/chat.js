// js/chat.js

import { containsProfanity } from './profaneFilter.js';

export default class Chat {
    constructor(inputManager) {
        this.socket = null;
        this.inputManager = inputManager;
        this.chatContainer = document.getElementById('chat-container');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.chatToastContainer = document.getElementById('chat-toast-container');
        this.isVisible = false;

        this.init();
    }

    init() {
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent default form submission
                this.sendMessage();
            } else if (e.key === 'Escape') {
                this.hideChat();
            }
            e.stopPropagation();
        });
    }

    setSocket(socket) {
        this.socket = socket;
        if (this.socket) {
            this.socket.on('chatMessage', (data) => {
                this.addMessage(data.name, data.message, data.isSystem);
                // Only show toast if the chat window is not visible
                if (!this.isVisible) {
                    this.showToast(data.name, data.message);
                }
            });
        }
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
        if (!message) return;
        if (containsProfanity(message)) {
            if (this.chatToastContainer) {
                this.showToast('System', 'Profanity is not allowed in chat.');
            }
            return;
        }
        if (this.socket) {
            this.socket.emit('chatMessage', { message });
            this.chatInput.value = '';
        }
    }

    addMessage(name, message, isSystem = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        
        const nameSpan = document.createElement('span');
        nameSpan.style.color = isSystem ? '#8cf' : '#fff';
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

    showToast(name, message) {
        const toastElement = document.createElement('div');
        toastElement.classList.add('chat-toast-message');
        
        const nameSpan = document.createElement('span');
        nameSpan.style.fontWeight = 'bold';
        nameSpan.textContent = name ? `${name}: ` : '';

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;

        toastElement.appendChild(nameSpan);
        toastElement.appendChild(messageSpan);

        this.chatToastContainer.appendChild(toastElement);

        setTimeout(() => {
            toastElement.remove();
        }, 5000);
    }
}


