from django.shortcuts import render, redirect
from .forms import *
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django .contrib .auth .forms import AuthenticationForm 
from core_profile.models import Profile
# Create your views here.

def register(request):
    form = RegisterForm()
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            Profile.objects.create(user=user)
            login(request, user)
            return redirect('home')
    return render(request, 'auth_system/register.html', {'form': form})


def login_view(request):
    form = AuthenticationForm()
    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('home')

    return render(request, 'auth_system/login.html', {'form': form})

def home(request):
    return render(request, 'home.html')

@login_required
def logout_view(request):
    logout(request)
    return redirect('home')