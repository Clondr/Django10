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
    path('friendship/request/<int:recipient_id>/', views.request_for_friendship, name='request-for-friendship'),
    path('friendship/accept/<int:request_id>/', views.accept_friend_request, name='accept-friend-request'),
    path('friendship/decline/<int:request_id>/', views.decline_friend_request, name='decline-friend-request'),
    path('friendship/remove/<int:friend_id>/', views.remove_friend, name='remove-friend'),
    path('notices/', views.all_notices, name='all-notices'),
    path('notices/<int:notice_id>/read/', views.mark_notice_as_read, name='mark-notice-as-read'),
    path('notices/<int:notice_id>/delete/', views.delete_notice, name='delete-notice'),
]