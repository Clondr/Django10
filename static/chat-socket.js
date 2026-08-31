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

    if (data.id) messageElement.dataset.messageId = data.id;

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
    const fileInput = chatForm.querySelector('input[type="file"]');
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const text = messageInput.value.trim();
        const status = chatForm.querySelector('.encryption-status');
        const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
        if (!text && !hasFile) return;
        if (!hasFile && (!chatSocket || chatSocket.readyState !== WebSocket.OPEN)) {
            if (status) status.textContent = 'Соединение потеряно, пробуем переподключиться...';
            return;
        }
        try {
            const keyPair = await getEncryptionKeyPair();
            const recipientPublicKey = safeParseJsonAttribute(chatForm.dataset.recipientPublicKey);

            const encrypted = await encryptMessage(
                text,
                keyPair.privateKey,
                JSON.stringify(recipientPublicKey),
                JSON.stringify(keyPair.publicKey),
            );
            // С файлом отправляем обычным POST (WebSocket не передаёт файлы):
            // шифрованные поля кладём в hidden-инпуты формы с enctype=multipart/form-data.
            if (hasFile) {
                chatForm.querySelector('[name=ciphertext]').value = encrypted.ciphertext;
                chatForm.querySelector('[name=nonce]').value = encrypted.nonce;
                chatForm.querySelector('[name=self_ciphertext]').value = encrypted.self_ciphertext;
                chatForm.querySelector('[name=self_nonce]').value = encrypted.self_nonce;
                chatForm.querySelector('[name=public_key]').value = JSON.stringify(keyPair.publicKey);
                chatForm.submit();
                return;
            }
            chatSocket.send(JSON.stringify({
                ciphertext: encrypted.ciphertext,
                nonce: encrypted.nonce,
                self_ciphertext: encrypted.self_ciphertext,
                self_nonce: encrypted.self_nonce,
                sender_public_key: JSON.stringify(keyPair.publicKey),
            }));
            messageInput.value = '';
            if (fileInput) fileInput.value = '';
            if (status) status.textContent = '';
        } catch (err) {
            console.error(err);
            if (status) status.textContent = 'Не удалось отправить сообщение';
        }
    });
}

// --- Контекстное меню сообщений (правый клик) ---
(function initMessageContextMenu() {
    let menu = document.getElementById('message-context-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'message-context-menu';
        menu.className = 'message-context-menu';
        document.body.appendChild(menu);
    }

    function hideMenu() {
        menu.classList.remove('visible');
    }

    function buildMenu(messageEl) {
        menu.innerHTML = '';
        const messageId = messageEl.dataset.messageId;
        const fileUrl = messageEl.dataset.fileUrl;
        const fileName = messageEl.dataset.fileName || 'file';
        const mine = !!messageEl.closest('.message-row.sent');

        const addItem = (icon, label, onClick, danger) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'context-menu-item' + (danger ? ' danger' : '');
            btn.innerHTML = '<span class="bi ' + icon + '"></span><span>' + label + '</span>';
            btn.addEventListener('click', () => { hideMenu(); onClick(); });
            menu.appendChild(btn);
        };

        if (fileUrl) {
            addItem('bi-download', 'Скачати файл', () => {
                const a = document.createElement('a');
                a.href = fileUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
            });
        }

        if (mine && messageId) {
            addItem('bi-pencil-square', 'Редагувати', () => {
                window.location.href = '/messanger/edit_message/' + messageId + '/';
            });
            addItem('bi-trash', 'Видалити', () => {
                window.location.href = '/messanger/delete_message/' + messageId + '/';
            }, true);
        }
    }

    document.addEventListener('contextmenu', (e) => {
        const messageEl = e.target.closest('.message.encrypted-message');
        if (!messageEl) { hideMenu(); return; }
        e.preventDefault();
        buildMenu(messageEl);
        menu.classList.add('visible');
        const rect = menu.getBoundingClientRect();
        const x = Math.min(e.clientX, window.innerWidth - rect.width - 8);
        const y = Math.min(e.clientY, window.innerHeight - rect.height - 8);
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    });

    document.addEventListener('click', hideMenu);
    document.addEventListener('scroll', hideMenu, true);
    window.addEventListener('resize', hideMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideMenu(); });
})();
