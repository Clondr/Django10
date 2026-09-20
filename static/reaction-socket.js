(function () {
    const reactions = document.querySelector('[data-post-reactions]');
    if (!reactions) return;

    const postId = reactions.dataset.postId;
    const userId = reactions.dataset.userId;
    const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let socket;
    let reconnectDelay = 1000;

    function updateReactions(data) {
        const likeCount = reactions.querySelector('[data-reaction-count="like"]');
        const dislikeCount = reactions.querySelector('[data-reaction-count="dislike"]');
        if (likeCount) likeCount.textContent = data.likes;
        if (dislikeCount) dislikeCount.textContent = data.dislikes;

        if (String(data.user_id) === userId) {
            reactions.querySelectorAll('[data-reaction-button]').forEach((button) => {
                const active = button.dataset.reactionButton === data.reaction_type;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-pressed', String(active));
            });
        }
    }

    function connect() {
        socket = new WebSocket(`${socketProtocol}//${window.location.host}/ws/post/${postId}/reactions/`);
        socket.onopen = () => { reconnectDelay = 1000; };
        socket.onmessage = (event) => updateReactions(JSON.parse(event.data));
        socket.onclose = () => {
            window.setTimeout(connect, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, 15000);
        };
    }

    reactions.querySelectorAll('[data-reaction-form]').forEach((form) => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = form.querySelector('button[type="submit"]');
            button.disabled = true;
            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    body: new FormData(form),
                });
                if (!response.ok) throw new Error('Reaction request failed');
                updateReactions(await response.json());
            } catch (error) {
                console.error(error);
            } finally {
                button.disabled = false;
            }
        });
    });

    connect();
})();