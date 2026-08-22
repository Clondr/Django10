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