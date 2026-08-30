from django.db import models
from core_profile.models import Profile
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

    def __str__(self):
        return f'Message from {self.sender} to {self.recipient} at {self.timestamp}'

class Chat(models.Model):
    participants = models.ManyToManyField(Profile, related_name='chats')
    messages = models.ManyToManyField(Message, related_name='chats', blank=True)
    is_encrypted = models.BooleanField(default=True)

    def get_other_participant(self, profile):
        return self.participants.exclude(id=profile.id).first()

    def __str__(self):
        return f'Chat between {", ".join([str(p) for p in self.participants.all()])}'
