import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.chat_id = self.scope["url_route"]["kwargs"]["chat_id"]
        self.group_name = f"chat_{self.chat_id}"

        # Пускаем только участников чата
        try:
            ok = self.user.is_authenticated and await self.is_participant()
        except Exception:
            logger.exception("connect check failed for chat %s", self.chat_id)
            ok = False
        if not ok:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data)
        except (TypeError, json.JSONDecodeError):
            await self.send(text_data=json.dumps({"error": "invalid json"}))
            return

        try:
            message = await self.save_message(
                ciphertext=data.get("ciphertext", ""),
                nonce=data.get("nonce", ""),
                sender_public_key=data.get("sender_public_key", ""),
                self_ciphertext=data.get("self_ciphertext", ""),
                self_nonce=data.get("self_nonce", ""),
            )
        except Exception:
            logger.exception("save_message failed for chat %s", self.chat_id)
            await self.send(text_data=json.dumps({"error": "could not save message"}))
            return

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "message": {
                    "id": message.id,
                    "ciphertext": message.ciphertext,
                    "nonce": message.nonce,
                    "sender_public_key": message.sender_public_key,
                    "sender_id": message.sender_id,
                    "self_ciphertext": message.self_ciphertext or "",
                    "self_nonce": message.self_nonce or "",
                    "sender": str(message.sender),
                    "timestamp": message.timestamp.strftime("%H:%M %d.%m.%Y"),
                },
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    @database_sync_to_async
    def is_participant(self):
        from .models import Chat

        return Chat.objects.filter(id=self.chat_id, participants__user=self.user).exists()

    @database_sync_to_async
    def save_message(self, ciphertext, nonce, sender_public_key, self_ciphertext="", self_nonce=""):
        from .models import Chat, Message

        if not ciphertext or not nonce:
            raise ValueError("ciphertext and nonce are required")

        sender = self.user.profile
        chat = Chat.objects.get(id=self.chat_id, participants=sender)
        recipient = chat.get_other_participant(sender)
        if recipient is None:
            raise ValueError("no recipient in chat")
        message = Message.objects.create(
            sender=sender,
            recipient=recipient,
            ciphertext=ciphertext,
            nonce=nonce,
            sender_public_key=sender_public_key,
            self_ciphertext=self_ciphertext,
            self_nonce=self_nonce,
        )
        chat.messages.add(message)
        return message
