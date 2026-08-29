const roomName = JSON.parse(document.getElementById('room-name').textContent);
const myProfileId = JSON.parse(document.getElementById('my-profile-id').textContent);

const messageInput = document.querySelector('#content');
const chatForm = document.querySelector('form[data-encrypted-message-form]');
const chatMessages = document.querySelector('.chat-messages');

let chatSocket = null;
let reconnectDelay = 1000;

function connect() {
    chatSocket = new WebSocket(
        'ws://' + window.location.host + '/ws/chat/' + roomName + '/'
    );

    chatSocket.onopen = function() {
        reconnectDelay = 1000;
    };

    chatSocket.onmessage = onChatMessage;

    chatSocket.onclose = function(e) {
        console.warn('Chat socket closed, reconnecting in ' + reconnectDelay + 'ms', e);
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
    };
}

connect();

async function onChatMessage(e) {
    const data = JSON.parse(e.data);
    if (data.error || !data.ciphertext) return;
    if (!window.crypto?.subtle || !chatForm) return;

    try {
        const keyPair = await getEncryptionKeyPair();
        const plaintext = await decryptMessage(
            { dataset: { senderPublicKey: data.sender_public_key, nonce: data.nonce, ciphertext: data.ciphertext } },
            keyPair.privateKey
        );
        appendMessageRow(data, plaintext);
    } catch (err) {
        console.error('Не удалось расшифровать сообщение', err);
        appendMessageRow(data, 'Сообщение недоступно для этого ключа');
    }
}

function appendMessageRow(data, plaintext) {
    if (!chatMessages) return;

    const emptyNote = chatMessages.querySelector('p');
    if (emptyNote) emptyNote.remove();

    const mine = data.sender_id === myProfileId;
    const row = document.createElement('div');
    row.className = 'message-row d-flex w-100 ' + (mine ? 'sent justify-content-end' : 'received justify-content-start');

    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    const text = document.createElement('p');
    text.className = 'message-content';
    text.textContent = plaintext;
    const time = document.createElement('small');
    time.textContent = data.timestamp || '';
    messageElement.appendChild(text);
    messageElement.appendChild(time);
    row.appendChild(messageElement);

    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Отправка через WebSocket вместо перезагрузки страницы ---
if (chatForm && messageInput) {
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const text = messageInput.value.trim();
        const status = chatForm.querySelector('.encryption-status');
        if (!text) return;
        if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
            if (status) status.textContent = 'Соединение потеряно, пробуем переподключиться...';
            return;
        }
        try {
            const keyPair = await getEncryptionKeyPair();
            const recipientPublicKey = chatForm.dataset.recipientPublicKey;
            if (!recipientPublicKey) {
                if (status) status.textContent = 'Получатель еще не активировал шифрование';
                return;
            }
            const encrypted = await encryptMessage(text, keyPair.privateKey, recipientPublicKey);
            chatSocket.send(JSON.stringify({
                ciphertext: encrypted.ciphertext,
                nonce: encrypted.nonce,
                sender_public_key: JSON.stringify(keyPair.publicKey),
            }));
            messageInput.value = '';
            if (status) status.textContent = '';
        } catch (err) {
            console.error(err);
            if (status) status.textContent = 'Не удалось отправить сообщение';
        }
    });
}
