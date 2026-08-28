from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core_messanger', '0001_initial'),
        ('core_profile', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='message',
            name='content',
        ),
        migrations.AddField(
            model_name='message',
            name='ciphertext',
            field=models.TextField(default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='message',
            name='nonce',
            field=models.CharField(default='', max_length=32),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='message',
            name='sender_public_key',
            field=models.TextField(default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='chat',
            name='is_encrypted',
            field=models.BooleanField(default=True),
        ),
    ]