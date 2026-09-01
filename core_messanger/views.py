import json
from django.http import HttpResponseBadRequest, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from .models import *
from core_profile.models import Profile
# Create your views here.


@login_required
def chat_view(request, chat_id):
    chat = get_object_or_404(Chat, id=chat_id)
    if request.user.profile not in chat.participants.all():
        return redirect('home')  # Redirect if the user is not a participant

    messages = chat.messages.order_by('timestamp')
    for message in messages:
        message.file_kind = get_file_kind(message.file)
    other_participant = chat.get_other_participant(request.user.profile)
    files = None
    return render(request, 'core_messanger/chat_view.html', {
        'chat': chat,
        'messages': messages,
        'file': files,
        'other_participant': other_participant,
        'recipient_public_key': other_participant.encryption_public_key,
    })


def get_file_kind(file):
    """Определяет тип вложения по расширению файла."""
    if not file:
        return None
    name = file.name.lower()
    image_exts = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg')
    video_exts = ('.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv')
    audio_exts = ('.mp3', '.wav', '.ogg', '.m4a', '.flac')
    if name.endswith(image_exts):
        return 'image'
    if name.endswith(video_exts):
        return 'video'
    if name.endswith(audio_exts):
        return 'audio'
    return 'other'


@login_required
def create_chat(request, recipient_id):
    recipient = get_object_or_404(Profile, id=recipient_id)
    chat, created = Chat.objects.get_or_create(participants__in=[request.user.profile, recipient])
    if created:
        chat.participants.add(request.user.profile, recipient)
    return redirect('chat-view', chat_id=chat.id)

@login_required
def chat_list_view(request):
    chats = Chat.objects.filter(participants=request.user.profile)
    how_many_participants = {chat.id: chat.participants.count() for chat in chats}
    for chat in chats:
        chat.other_participant = chat.get_other_participant(request.user.profile)
    return render(request, 'core_messanger/chat_list.html', {'chats': chats, 'how_many_participants': how_many_participants})

@login_required
def send_message(request, chat_id):
    chat = get_object_or_404(Chat, id=chat_id)
    if request.user.profile not in chat.participants.all():
        return redirect('home')  # Redirect if the user is not a participant

    if request.method == 'POST':
        ciphertext = request.POST.get('ciphertext')
        file = request.FILES.get('file')
        nonce = request.POST.get('nonce')
        self_ciphertext = request.POST.get('self_ciphertext') or ''
        self_nonce = request.POST.get('self_nonce') or ''
        public_key = request.POST.get('public_key') or request.user.profile.encryption_public_key
        try:
            public_key_data = json.loads(public_key)
        except (TypeError, json.JSONDecodeError):
            public_key_data = None
        if (
            not ciphertext
            or not nonce
            or not isinstance(public_key_data, dict)
            or public_key_data.get('kty') != 'EC'
            or public_key_data.get('crv') != 'P-256'
            or not public_key_data.get('x')
            or not public_key_data.get('y')
        ):
            return HttpResponseBadRequest('Encrypted message and public key are required')
        public_key = json.dumps(public_key_data, separators=(',', ':'))
        if public_key != request.user.profile.encryption_public_key:
            request.user.profile.encryption_public_key = public_key
            request.user.profile.save(update_fields=['encryption_public_key'])
        message = Message.objects.create(
            sender=request.user.profile,
            recipient=chat.get_other_participant(request.user.profile),
            ciphertext=ciphertext,
            nonce=nonce,
            file=file,
            sender_public_key=public_key,
            self_ciphertext=self_ciphertext,
            self_nonce=self_nonce,
        )
        chat.messages.add(message)

    return redirect('chat-view', chat_id=chat.id)

@login_required
def delete_message(request, message_id):
    message = get_object_or_404(Message, id=message_id)
    chat = message.chats.first()
    if request.user.profile == message.sender:
        message.delete()
    if chat is None:
        return redirect('chat-list-view')
    return redirect('chat-view', chat_id=chat.id)

@login_required
def delete_chat(request, chat_id):
    chat = get_object_or_404(Chat, id=chat_id)
    if request.user.profile in chat.participants.all():
        chat.delete()
    return redirect('chat-list-view')

@login_required
def edit_message(request, message_id):
    message = get_object_or_404(Message, id=message_id)
    if request.user.profile != message.sender:
        return redirect('home')  # Redirect if the user is not the sender
    chat = message.chats.first()
    if chat is None:
        return redirect('chat-list-view')

    if request.method == 'POST':
        ciphertext = request.POST.get('ciphertext')
        nonce = request.POST.get('nonce')
        if not ciphertext or not nonce:
            return HttpResponseBadRequest('Encrypted message is required')
        message.ciphertext = ciphertext
        message.nonce = nonce
        message.self_ciphertext = request.POST.get('self_ciphertext') or ''
        message.self_nonce = request.POST.get('self_nonce') or ''
        message.save(update_fields=['ciphertext', 'nonce', 'self_ciphertext', 'self_nonce'])
        return redirect('chat-view', chat_id=chat.id)

    other_participant = chat.get_other_participant(request.user.profile)
    return render(request, 'core_messanger/edit_message.html', {
        'message': message,
        'recipient_public_key': other_participant.encryption_public_key,
    })


@login_required
@require_POST
def register_public_key(request):
    try:
        public_key = json.loads(request.POST.get('public_key', ''))
    except (TypeError, json.JSONDecodeError):
        return HttpResponseBadRequest('Invalid public key')

    if (
        not isinstance(public_key, dict)
        or public_key.get('kty') != 'EC'
        or public_key.get('crv') != 'P-256'
        or not public_key.get('x')
        or not public_key.get('y')
    ):
        return HttpResponseBadRequest('Invalid public key')

    request.user.profile.encryption_public_key = json.dumps(public_key, separators=(',', ':'))
    request.user.profile.save(update_fields=['encryption_public_key'])
    return JsonResponse({'ok': True})

@login_required
def show_info_about_message(request, message_id):
    message = get_object_or_404(Message, id=message_id)
    return render(request, 'core_messanger/message_info.html', {'message': message})

@login_required
def search_user_for_chat(request):
    query = request.GET.get('q')
    if query:
        users = Profile.objects.filter(user__username__icontains=query).exclude(user=request.user)
    else:
        users = Profile.objects.none()
    return render(request, 'core_messanger/search_user.html', {'users': users})

@login_required
def add_participant_to_chat(request, chat_id=None, participant_id=None):
    # Get IDs from URL parameters or request GET/POST data
    chat_id = chat_id or request.GET.get('chat_id') or request.POST.get('chat_id')
    participant_id = participant_id or request.GET.get('participant_id') or request.POST.get('participant_id')
    
    # Если параметры не предоставлены, показываем форму для их выбора
    if not chat_id or not participant_id:
        # Получаем чаты пользователя и всех других пользователей
        user_chats = Chat.objects.filter(participants=request.user.profile)
        all_users = Profile.objects.exclude(user=request.user)
        
        return render(request, 'core_messanger/add_participant_to_chat.html', {
            'chats': user_chats,
            'users': all_users,
            'show_form': True
        })
    
    # Если параметры предоставлены, обрабатываем добавление участника
    chat = get_object_or_404(Chat, id=chat_id)
    participant = get_object_or_404(Profile, id=participant_id)
    
    # Проверяем, что текущий пользователь является участником чата
    if request.user.profile not in chat.participants.all():
        return HttpResponseBadRequest('You are not a participant of this chat')
    
    # Проверяем, что участник уже не в чате
    if participant in chat.participants.all():
        return HttpResponseBadRequest('This user is already a participant of this chat')
    
    # Добавляем участника в чат
    chat.participants.add(participant)
    
    return render(request, 'core_messanger/add_participant_to_chat.html', {
        'chat': chat,
        'participant': participant,
        'success': True
    })