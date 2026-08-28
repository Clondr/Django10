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
]