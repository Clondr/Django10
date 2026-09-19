from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from .models import Post, Comment
from .forms import PostForm
# Create your views here.

def get_file_kind(file):
    """Определяет тип вложения по расширению файла."""
    if not file:
        return None
    name = file.name.lower()
    image_exts = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg')
    video_exts = ('.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv')
    audio_exts = ('.mp3', '.wav', '.ogg', '.m4a', '.flac', '.opus')
    if name.endswith(image_exts):
        return 'image'
    if name.endswith(video_exts):
        return 'video'
    if name.endswith(audio_exts):
        return 'audio'
    return 'document'


@login_required
def post_list(request):
    search_query = request.GET.get('q', '').strip()
    if search_query:
        posts = Post.objects.filter(
            Q(title__icontains=search_query)
            | Q(content__icontains=search_query)
            | Q(author__username__icontains=search_query)
        ).distinct().order_by('-created_at')
    else:
        posts = Post.objects.all().order_by('-created_at')
    return render(request, 'core_posts/post_list.html', {
        'posts': posts,
        'search_query': search_query,
    })

@login_required
def post_detail(request, post_id):
    # Logic to retrieve and display a specific post by its ID
    post = get_object_or_404(Post, id=post_id)
    file_kind = get_file_kind(post.file)
    return render(request, 'core_posts/post_detail.html', {
        'post': post,
        'file_kind': file_kind,
    })

@login_required
def create_post(request):
    if request.method == 'POST':
        # Logic to handle post creation
        form = PostForm(request.POST, request.FILES)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.save()
            return redirect('post_detail', post_id=post.id)
    else:
        form = PostForm()
    return render(request, 'core_posts/create_post.html', {'form': form})

@login_required
def delete_post(request, post_id):
    # Logic to delete a specific post by its ID
    post = get_object_or_404(Post, id=post_id)
    if request.method == 'POST':
        post.delete()
        return redirect('post_list')
    return render(request, 'core_posts/confirm_delete.html', {'post': post})

@login_required
def edit_post(request, post_id):
    # Logic to edit a specific post by its ID
    post = get_object_or_404(Post, id=post_id)
    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES, instance=post)
        if form.is_valid():
            form.save()
            return redirect('post_detail', post_id=post.id)
    else:
        form = PostForm(instance=post)
    return render(request, 'core_posts/edit_post.html', {'form': form, 'post': post})

@login_required
def create_comment(request, post_id):
    # Logic to handle comment creation for a specific post
    post = get_object_or_404(Post, id=post_id)
    if request.method == 'POST':
        content = request.POST.get('content')
        if post.only_one_comment_on_user(request.user):
            # User has already commented on this post, handle accordingly (e.g., show an error message)
            return render(request, 'core_posts/create_comment.html', {'post': post, 'error': 'You have already commented on this post.'})
        if content:
            comment = Comment.objects.create(author=request.user, content=content)
            post.comments.add(comment)
            return redirect('post_detail', post_id=post.id)
    return render(request, 'core_posts/create_comment.html', {'post': post})

@login_required
def delete_comment(request, post_id, comment_id):
    # Logic to delete a specific comment by its ID for a specific post
    post = get_object_or_404(Post, id=post_id)
    comment = get_object_or_404(Comment, id=comment_id)
    if request.method == 'POST':
        post.comments.remove(comment)
        comment.delete()
        return redirect('post_detail', post_id=post.id)
    return render(request, 'core_posts/confirm_delete_comment.html', {'post': post, 'comment': comment})
