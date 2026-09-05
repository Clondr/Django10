from django.urls import path
from . import views

urlpatterns = [
    path('create_chat/<int:recipient_id>/', views.create_chat, name='create-chat'),
    path('chats/', views.chat_list_view, name='chat-list-view'),
    path('send_message/<int:chat_id>/', views.send_message, name='send-message'),
    path('delete_message/<int:message_id>/', views.delete_message, name='delete-message'),
    path('delete_chat/<int:chat_id>/', views.delete_chat, name='delete-chat'),
    path('edit_message/<int:message_id>/', views.edit_message, name='edit-message'),
    path('info_message/<int:message_id>/', views.show_info_about_message, name='show-info-about-message'),
    path('chat/<int:chat_id>/', views.chat_view, name='chat-view'),
    path('search_user_for_chat/', views.search_user_for_chat, name='search-user-for-chat'),
    path('encryption/public-key/', views.register_public_key, name='register-public-key'),
    path('add_participant_to_chat/', views.add_participant_to_chat, name='add-participant-to-chat'),
    path('add_participant_to_chat/<int:chat_id>/<int:participant_id>/', views.add_participant_to_chat, name='add-participant-to-chat-with-ids'),
    path('chat/<int:chat_id>/remove-participant/<int:participant_id>/', views.remove_participant_from_chat, name='remove-participant-from-chat'),
    path('chat/<int:chat_id>/leave/', views.leave_chat, name='leave-chat'),
]