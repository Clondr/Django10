from django.db import models
from core_profile.models import Profile
from django.db.models.signals import post_delete
from django.dispatch import receiver
import os
# Create your models here.


class Message(models.Model):
    sender = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='received_messages')
    ciphertext = models.TextField()
    nonce = models.CharField(max_length=32)
    sender_public_key = models.TextField()
    self_ciphertext = models.TextField(blank=True, default='')
    self_nonce = models.CharField(max_length=32, blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)
    file = models.FileField(upload_to='message_files/', blank=True, null=True)

    def __str__(self):
        return f'Message from {self.sender} to {self.recipient} at {self.timestamp}'

# Signal to delete the file when the Message instance is deleted
@receiver(post_delete, sender=Message)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    """Удаляет файл с диска при удалении объекта из БД."""
    if instance.file:
        if os.path.isfile(instance.file.path):
            os.remove(instance.file.path)
class Chat(models.Model):
    participants = models.ManyToManyField(Profile, related_name='chats')
    messages = models.ManyToManyField(Message, related_name='chats', blank=True)
    is_encrypted = models.BooleanField(default=True)

    def get_other_participant(self, profile):
        return self.participants.exclude(id=profile.id).first()

    def __str__(self):
        return f'Chat between {", ".join([str(p) for p in self.participants.all()])}'
