from django import forms
from .models import Post

class PostForm(forms.ModelForm):
    title = forms.CharField(
        max_length=200,
        label='Заголовок',
        help_text='Коротко опишіть, про що цей пост.',
        widget=forms.TextInput(attrs={
            'class': 'post-form-input',
            'placeholder': 'Наприклад: Мої нотатки про подорож',
            'autocomplete': 'off',
        }),
    )
    content = forms.CharField(
        label='Текст посту',
        help_text='Поділіться думками, історією або корисною інформацією.',
        widget=forms.Textarea(attrs={
            'class': 'post-form-input post-form-textarea',
            'placeholder': 'Напишіть щось, чим хочеться поділитися...',
            'rows': 8,
        }),
    )
    file = forms.FileField(
        label='Вкладення',
        required=False,
        help_text='Необов’язково. Додайте зображення, документ, аудіо або відео.',
        widget=forms.FileInput(attrs={'class': 'post-form-file'}),
    )

    class Meta:
        model = Post
        fields = ['title', 'content', 'file']