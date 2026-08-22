from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import *
from .forms import *
# Create your views here.

@login_required
def profile_view(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    return render(request, 'core_profile/profile.html', {'profile': profile})

@login_required
def edit_profile_view(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        form = UploadAvatarForm(request.POST, request.FILES, instance=profile)
        new_bio = request.POST.get('bio')
        if new_bio is not None:
            profile.bio = new_bio
            profile.save()
        new_avatar = request.FILES.get('avatar')
        if new_avatar is not None:
            profile.avatar = new_avatar
            profile.save()
        if form.is_valid():
            form.save()
            return redirect('profile')
    else:
        form = UploadAvatarForm(instance=profile)
    return render(request, 'core_profile/edit_profile.html', {'form': form})

@login_required
def delete_bio_of_user(request):
    profile = get_object_or_404(Profile, user=request.user)
    profile.bio = ''
    profile.save()
    return redirect('profile')