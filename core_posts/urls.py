from django.urls import path
from . import views

urlpatterns = [
    path('post_list/', views.post_list, name='post_list'),
    path('post_detail/<int:post_id>/', views.post_detail, name='post_detail'),
    path('create_post/', views.create_post, name='create_post'),
    path('delete_post/<int:post_id>/', views.delete_post, name='delete_post'),
    path('create_comment/<int:post_id>/', views.create_comment, name='create_comment'),
    path('delete_comment/<int:post_id>/<int:comment_id>/', views.delete_comment, name='delete_comment'),
    path('edit_post/<int:post_id>/', views.edit_post, name='edit_post'),
    path('edit_comment/<int:comment_id>/', views.edit_comment, name='edit_comment'),
    path('react/<int:post_id>/<str:reaction_type>/', views.react_to_post, name='react_to_post'),
]