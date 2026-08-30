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
        // Для собственных сообщений используем self-копию и свой публичный ключ
        const isMine = data.sender_id === myProfileId;
        if (isMine && data.self_ciphertext) {
            appendMessageRow(
                data,
                await decryptMessage(
                    { dataset: { selfCiphertext: data.self_ciphertext, selfNonce: data.self_nonce, senderPublicKey: data.sender_public_key } },
                    keyPair.privateKey,
                    keyPair.publicKey,
                ),
            );
            return;
        }
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

    // Убираем только «пустую» заглушку — она является прямым потомком .chat-messages.
    // Обычный querySelector('p') цеплял бы <p class="message-content"> первого сообщения
    // и стирал его текст (баг: после нового сообщения первое сообщение «исчезало»).
    const emptyNote = chatMessages.querySelector(':scope > p');
    if (emptyNote) emptyNote.remove();

    const mine = data.sender_id === myProfileId;
    const row = document.createElement('div');
    row.className = 'message-row d-flex w-100 ' + (mine ? 'sent justify-content-end' : 'received justify-content-start');

    const messageElement = document.createElement('div');
    messageElement.className = 'message encrypted-message';
    messageElement.dataset.ciphertext = data.ciphertext;
    messageElement.dataset.nonce = data.nonce;
    messageElement.dataset.senderPublicKey = data.sender_public_key;
    if (mine && data.self_ciphertext) {
        messageElement.dataset.selfCiphertext = data.self_ciphertext;
        messageElement.dataset.selfNonce = data.self_nonce;
    }

    const text = document.createElement('p');
    text.className = 'message-content';
    text.textContent = plaintext;
    const time = document.createElement('small');
    time.textContent = data.timestamp || '';
    messageElement.appendChild(text);
    messageElement.appendChild(time);

    // Кнопки редактировать/удалить — только для своих сообщений
    if (mine && data.id) {
        const editLink = document.createElement('a');
        editLink.href = '/messanger/edit_message/' + data.id + '/';
        editLink.className = 'btn btn-sm btn-secondary';
        editLink.textContent = 'Редагувати';

        const deleteLink = document.createElement('a');
        deleteLink.href = '/messanger/delete_message/' + data.id + '/';
        deleteLink.className = 'btn btn-sm btn-danger';
        deleteLink.textContent = 'Видалити';

        messageElement.appendChild(editLink);
        messageElement.appendChild(deleteLink);
    }

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
            const recipientPublicKey = safeParseJsonAttribute(chatForm.dataset.recipientPublicKey);
            if (!recipientPublicKey) {
                if (status) status.textContent = 'Получатель еще не активировал шифрование';
                return;
            }
            const encrypted = await encryptMessage(
                text,
                keyPair.privateKey,
                JSON.stringify(recipientPublicKey),
                JSON.stringify(keyPair.publicKey),
            );
            chatSocket.send(JSON.stringify({
                ciphertext: encrypted.ciphertext,
                nonce: encrypted.nonce,
                self_ciphertext: encrypted.self_ciphertext,
                self_nonce: encrypted.self_nonce,
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
