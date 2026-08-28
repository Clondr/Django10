from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core_profile', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='encryption_public_key',
            field=models.TextField(blank=True),
        ),
    ]