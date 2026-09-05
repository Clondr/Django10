const btn = document.getElementById('theme-toggle');
const mobileBtn = document.getElementById('theme-toggle-mobile');
const body = document.body;
const root = document.documentElement;

function applyTheme(theme) {
    const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
    const isDark = normalizedTheme === 'dark';

    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(isDark ? 'dark-theme' : 'light-theme');
    root.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    root.style.colorScheme = isDark ? 'dark' : 'light';

    try {
        localStorage.setItem('theme', normalizedTheme);
    } catch (e) {
        console.warn('Theme localStorage is unavailable', e);
    }

    [btn, mobileBtn].forEach((toggle) => {
        if (!toggle) return;

        Array.from(toggle.childNodes).forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                node.textContent = '';
            }
        });

        toggle.classList.toggle('is-dark', isDark);
        toggle.setAttribute('aria-pressed', String(isDark));
        toggle.setAttribute('aria-label', isDark ? 'Переключити на світлу тему' : 'Переключити на темну тему');
    });
}

function getStoredTheme() {
    try {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark' || storedTheme === 'light') {
            return storedTheme;
        }
    } catch (e) {
        console.warn('Theme localStorage read failed', e);
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function toggleTheme() {
    const nextTheme = body.classList.contains('dark-theme') ? 'light' : 'dark';
    applyTheme(nextTheme);
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getStoredTheme());

    const groupMenu = document.querySelector('[data-group-menu]');
    const groupMenuOpen = document.querySelector('[data-group-menu-open]');
    const groupMenuBackdrop = document.querySelector('.group-menu-backdrop');
    const groupMenuCloseButtons = document.querySelectorAll('[data-group-menu-close]');

    if (groupMenu && groupMenuOpen) {
        const setGroupMenuState = (isOpen) => {
            groupMenu.classList.toggle('is-open', isOpen);
            groupMenu.setAttribute('aria-hidden', String(!isOpen));
            groupMenuOpen.setAttribute('aria-expanded', String(isOpen));
            document.body.classList.toggle('group-menu-open', isOpen);
            if (groupMenuBackdrop) groupMenuBackdrop.hidden = !isOpen;
            if (isOpen) {
                groupMenu.querySelector('[data-group-menu-close]:not([hidden])')?.focus();
            } else {
                groupMenuOpen.focus();
            }
        };

        groupMenuOpen.addEventListener('click', () => setGroupMenuState(true));
        groupMenuCloseButtons.forEach((element) => element.addEventListener('click', () => setGroupMenuState(false)));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && groupMenu.classList.contains('is-open')) setGroupMenuState(false);
        });
    }

    if (btn) {
        btn.addEventListener('click', toggleTheme);
    }

    if (mobileBtn) {
        mobileBtn.addEventListener('click', (event) => {
            event.preventDefault();
            toggleTheme();
        });
    }

    try {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (el) {
            return new bootstrap.Tooltip(el);
        });
    } catch (e) {
        console.warn('Tooltips init failed', e);
    }
});

const encryptionStorageKey = 'django-messenger-e2ee-key-v1';

function base64FromBytes(bytes) {
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
}

function bytesFromBase64(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function getCsrfToken() {
    const cookie = document.cookie.split('; ').find((row) => row.startsWith('csrftoken='));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}

async function getEncryptionKeyPair() {
    const stored = localStorage.getItem(encryptionStorageKey);
    if (stored) {
        try {
            const keys = JSON.parse(stored);
            if (keys.privateKey && keys.publicKey) {
                const privateKey = await crypto.subtle.importKey('jwk', keys.privateKey, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
                return { privateKey, publicKey: keys.publicKey };
            }
        } catch (error) {
            localStorage.removeItem(encryptionStorageKey);
        }
    }

    const keyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
    const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    localStorage.setItem(encryptionStorageKey, JSON.stringify({ privateKey, publicKey }));
    return { privateKey: keyPair.privateKey, publicKey };
}

async function registerEncryptionKey(form, publicKey) {
    const csrfToken = form.querySelector('[name="csrfmiddlewaretoken"]')?.value || getCsrfToken();
    const body = new URLSearchParams({
        csrfmiddlewaretoken: csrfToken,
        public_key: JSON.stringify(publicKey),
    });
    const response = await fetch(form.dataset.keyUrl, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    if (!response.ok) throw new Error('Не удалось зарегистрировать ключ');
}

async function deriveChatKey(privateKey, publicKeyJwk) {
    const publicKey = await crypto.subtle.importKey('jwk', JSON.parse(publicKeyJwk), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    return crypto.subtle.deriveKey({ name: 'ECDH', public: publicKey }, privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function decryptMessage(message, privateKey, ownPublicKey) {
    // Если есть self-копия (для отправителя) — используем её с собственным ключом
    const useSelf = message.dataset.selfCiphertext && ownPublicKey;
    const publicKeyRaw = useSelf ? JSON.stringify(ownPublicKey) : message.dataset.senderPublicKey;
    const senderPublicKey = safeParseJsonAttribute(publicKeyRaw);
    if (!senderPublicKey) throw new Error('invalid sender public key');
    const key = await deriveChatKey(privateKey, JSON.stringify(senderPublicKey));
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: bytesFromBase64(useSelf ? message.dataset.selfNonce : message.dataset.nonce) },
        key,
        bytesFromBase64(useSelf ? message.dataset.selfCiphertext : message.dataset.ciphertext),
    );
    return new TextDecoder().decode(plaintext);
}

// Возвращает оба шифротекста: для получателя и для себя (sender-копия),
// чтобы отправитель мог прочитать собственное сообщение.
async function encryptMessage(text, privateKey, recipientPublicKey, ownPublicKey) {
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();

    const recipientKey = await deriveChatKey(privateKey, recipientPublicKey);
    const recipientCiphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        recipientKey,
        encoder.encode(text),
    );

    // Если отправитель не передал свой публичный ключ — копируем шифротекст получателя.
    if (!ownPublicKey) {
        return {
            ciphertext: base64FromBytes(new Uint8Array(recipientCiphertext)),
            nonce: base64FromBytes(nonce),
            self_ciphertext: null,
            self_nonce: null,
        };
    }

    const ownKey = await deriveChatKey(privateKey, ownPublicKey);
    const ownCiphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        ownKey,
        encoder.encode(text),
    );

    return {
        ciphertext: base64FromBytes(new Uint8Array(recipientCiphertext)),
        nonce: base64FromBytes(nonce),
        self_ciphertext: base64FromBytes(new Uint8Array(ownCiphertext)),
        self_nonce: base64FromBytes(nonce),
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    const bootstrapForm = document.querySelector('[data-encryption-bootstrap]');
    if (!bootstrapForm || !window.crypto?.subtle) return;
    try {
        const keyPair = await getEncryptionKeyPair();
        await registerEncryptionKey(bootstrapForm, keyPair.publicKey);
    } catch (error) {
        console.error('Не удалось зарегистрировать ключ шифрования', error);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector('[data-encrypted-message-form], [data-encrypted-edit-form]');
    if (!form) return;
    const status = form.querySelector('.encryption-status');
    if (!window.crypto?.subtle) {
        status.textContent = 'Шифрование недоступно: откройте сайт через HTTPS или localhost';
        form.addEventListener('submit', (event) => event.preventDefault());
        return;
    }
    const ciphertextField = form.querySelector('[name="ciphertext"]');
    const nonceField = form.querySelector('[name="nonce"]');
    let publicKeyField = form.querySelector('[name="public_key"]');
    if (!publicKeyField) {
        publicKeyField = document.createElement('input');
        publicKeyField.type = 'hidden';
        publicKeyField.name = 'public_key';
        form.appendChild(publicKeyField);
    }
    const encryptionReady = getEncryptionKeyPair().then(async (keyPair) => {
        await registerEncryptionKey(form, keyPair.publicKey);
        return keyPair;
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        // Формы чата отправляются через WebSocket (chat-socket.js), не через HTTP
        if (form.dataset.websocketSend !== undefined) return;
        try {
            const keyPair = await encryptionReady;
            await registerEncryptionKey(form, keyPair.publicKey);
            const textField = form.querySelector('[name="content"]');
            
            if (!textField.value.trim() || !form.dataset.recipientPublicKey) {
                status.textContent = 'Получатель еще не активировал шифрование';
                return;
            }
            const recipientPublicKey = safeParseJsonAttribute(form.dataset.recipientPublicKey);
            if (!recipientPublicKey) {
                status.textContent = 'Некорректный публичный ключ получателя';
                return;
            }
            const encrypted = await encryptMessage(
                textField.value,
                keyPair.privateKey,
                JSON.stringify(recipientPublicKey),
                JSON.stringify(keyPair.publicKey),
            );
            ciphertextField.value = encrypted.ciphertext;
            nonceField.value = encrypted.nonce;
            const selfCipherField = form.querySelector('[name="self_ciphertext"]');
            const selfNonceField = form.querySelector('[name="self_nonce"]');
            if (selfCipherField) selfCipherField.value = encrypted.self_ciphertext || '';
            if (selfNonceField) selfNonceField.value = encrypted.self_nonce || '';
            publicKeyField.value = JSON.stringify(keyPair.publicKey);
            if (!ciphertextField.value || !nonceField.value || !publicKeyField.value) {
                throw new Error('Не удалось сформировать зашифрованные поля');
            }
            textField.removeAttribute('name');
            const csrfToken = form.querySelector('[name="csrfmiddlewaretoken"]')?.value || getCsrfToken();
            const response = await fetch(form.action, {
                method: 'POST',
                headers: { 'X-CSRFToken': csrfToken },
                body: new FormData(form),
                credentials: 'same-origin',
            });
            if (!response.ok) throw new Error(`Ошибка отправки: ${response.status}`);
            window.location.assign(response.url);
        } catch (error) {
            status.textContent = 'Не удалось подготовить зашифрованное сообщение';
        }
    });

    try {
        const keyPair = await encryptionReady;
        const messages = document.querySelectorAll('.encrypted-message');
        for (const message of messages) {
            const contentEl = message.querySelector('.message-content');
            if (!contentEl) continue;
            try {
                // Если это собственное сообщение пользователя (есть self-копия) —
                // расшифровываем её своим публичным ключом
                const ownKey = message.dataset.selfCiphertext ? keyPair.publicKey : undefined;
                contentEl.textContent = await decryptMessage(message, keyPair.privateKey, ownKey);
            } catch (error) {
                contentEl.textContent = 'Сообщение недоступно для этого ключа';
            }
        }

        const editForm = form.matches('[data-encrypted-edit-form]') ? form : null;
        if (editForm) {
            const plaintext = await decryptMessage({ dataset: editForm.dataset }, keyPair.privateKey);
            editForm.querySelector('[name="content"]').value = plaintext;
        }

    } catch (error) {
        status.textContent = 'Шифрование недоступно в этом браузере';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const role = document.body.getAttribute('data-user-role') || null;
    document.querySelectorAll('[data-allowed-roles]').forEach((el) => {
        try {
            const allowed = el.getAttribute('data-allowed-roles').split(',').map((s) => s.trim());
            if (!role || !allowed.includes(role)) {
                el.style.display = 'none';
            }
        } catch (e) {
            console.warn('Role-based visibility failed', e);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const maxVisible = 3;
    document.querySelectorAll('.events-list').forEach((list) => {
        const events = Array.from(list.querySelectorAll('.gc-event'));
        if (events.length > maxVisible) {
            const hidden = events.slice(maxVisible);
            hidden.forEach((el) => {
                el.style.display = 'none';
            });

            const moreBtn = document.createElement('a');
            moreBtn.href = '#';
            moreBtn.className = 'small fst-italic';
            moreBtn.textContent = `+${hidden.length} more`;
            moreBtn.style.display = 'inline-block';
            moreBtn.style.marginTop = '6px';
            moreBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const currentlyHidden = hidden[0].style.display === 'none';
                hidden.forEach((el) => {
                    el.style.display = currentlyHidden ? '' : 'none';
                });
                moreBtn.textContent = currentlyHidden ? 'show less' : `+${hidden.length} more`;
            });
            list.appendChild(moreBtn);
        }
    });
});
// ================== ИСПРАВЛЕНИЯ ДЛЯ ЧАТА ==================

// Функция для корректного чтения JSON из data-атрибутов Django-шаблонов
function safeParseJsonAttribute(value) {
    if (!value) return null;
    // Django |escape превращает кавычки в &quot; — распаковываем
    let raw = value;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = raw;
    raw = textarea.value;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}
