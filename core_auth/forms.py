from django import forms 
from django .contrib .auth .forms import UserCreationForm
from django .contrib .auth .models import User

class RegisterForm(UserCreationForm):
    username = forms.CharField(label='Username', max_length=30)
    password1 = forms.CharField(label='Password', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Confirm Password', widget=forms.PasswordInput)
    widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control-lg', 'placeholder':'Введіть ваше ім\'я}'}),
            'password1': forms.PasswordInput(attrs={'class': 'form-control-lg'}),
            'password2': forms.PasswordInput(attrs={'class': 'form-control-lg'}),
        }
    class Meta:
        model = User
        fields = ['username', 'password1', 'password2']

    def __init__ (self ,*args ,**kwargs ):
        super().__init__ (*args ,**kwargs)
        self.fields['username'].widget = forms.TextInput(attrs = {'class':'form-control'})
        self.fields['password1'].widget = forms.PasswordInput(attrs = {'class':'form-control'})
        self.fields['password2'].widget = forms.PasswordInput(attrs = {'class':'form-control'})