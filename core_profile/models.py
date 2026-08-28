from django.db import models
from django.db.models.signals import post_save 
from django.dispatch import receiver 
# Create your models here.
@receiver (post_save ,sender ='auth.User')
def save_user_profile (sender ,instance ,created ,**kwargs ):
    if created :
        Profile .objects .create (user =instance )
    else :
        if hasattr (instance ,'profile'):
            instance .profile .save ()



class Profile(models.Model):
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE)
    bio = models.TextField(blank=True, max_length=250)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, default='avatars/default.png' )
    encryption_public_key = models.TextField(blank=True)

    def __str__(self):
        return f'Profile of {self.user.username }'