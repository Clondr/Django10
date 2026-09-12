from django.contrib import admin
from .models import Chat, Message
# Register your models here.


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
	list_display = ('chat_name', 'is_encrypted')

	@admin.display(description='Название чата')
	def chat_name(self, obj):
		participants = obj.participants.select_related('user').all()
		return f'Чат: {", ".join(participant.user.username for participant in participants)}'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
	list_display = ('message_description', 'timestamp')

	@admin.display(description='Сообщение')
	def message_description(self, obj):
		return f'От {obj.sender.user.username} к {obj.recipient.user.username} ({obj.timestamp})'