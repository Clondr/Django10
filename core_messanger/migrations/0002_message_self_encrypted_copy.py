from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core_messanger', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='self_ciphertext',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='message',
            name='self_nonce',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
    ]
