from django import forms
from .models import Profile

class UploadAvatarForm(forms.ModelForm):
    avatar = forms.ImageField(
        required=False,
        widget=forms.FileInput(attrs={'class': 'form-control'}),
    )

    class Meta:
        model = Profile
        fields = ['avatar']
        labels = {'avatar': 'Завантажити аватар'}