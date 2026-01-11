# events/utils.py
from guardian.shortcuts import assign_perm, remove_perm
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model
from events.models import Events , EventInvite
from django.shortcuts import get_object_or_404
from rest_framework.response import Response

User = get_user_model()

def set_event_perms(event, visibility, extra_user_ids=None):
    """
    visibility: "admin" | "img" | "public"
    extra_user_ids: optional list of user IDs with direct access
    """
    admin_group = Group.objects.get(name="Admin")
    img_group = Group.objects.get(name="IMG Member")
    public_group = Group.objects.get(name="Public")

    
    # Clear old group perms on this event
    # for g in [admin_group, img_group, public_group]:
    #     remove_perm("view_event_obj", g, event)
    #     remove_perm("change_event_obj", g, event)
    #     remove_perm("delete_event_obj", g, event)


    # if visibility == "private":
    #     return
    # # Base: Admin can always view/change/delete
    # if visibility == "admin":
    #     assign_perm("view_event_obj", admin_group, event)
    #     assign_perm("change_event_obj", admin_group, event)
    #     assign_perm("delete_event_obj", admin_group, event)

    # if visibility == "img":
    #     assign_perm("view_event_obj", admin_group, event)
    #     assign_perm("change_event_obj", admin_group, event)
    #     assign_perm("delete_event_obj", admin_group, event)
    #     assign_perm("view_event_obj", img_group, event)

    # if visibility == "public":
    #     assign_perm("view_event_obj", img_group, event)
    #     assign_perm("view_event_obj", public_group, event)
    #     assign_perm("view_event_obj", admin_group, event)
    
    # Optional per-user direct view perms
    if extra_user_ids:
        for uid in extra_user_ids:
            try:
                u = User.objects.get(pk=uid)
            except User.DoesNotExist:
                continue
            assign_perm("view_event_obj", u, event)


def CreateEventPerms(event, visibility, user):

    assign_perm("view_event_obj", user, event)
    assign_perm("change_event_obj", user, event)
    assign_perm("delete_event_obj", user, event)
    assign_perm("invite_event_obj", user, event)

    admin_group = Group.objects.get(name="Admin")
    img_group = Group.objects.get(name="IMG Member")
    public_group = Group.objects.get(name="Public")


    if visibility == "private":
        return ; 
    if visibility == "admin":
        assign_perm("view_event_obj", admin_group, event)
        assign_perm("change_event_obj", admin_group, event)
        assign_perm("delete_event_obj", admin_group, event)
        assign_perm("invite_event_obj", admin_group, event)

    if visibility == "img":
        assign_perm("view_event_obj", img_group, event)
        assign_perm("view_event_obj", admin_group, event)
        assign_perm("change_event_obj", admin_group, event)
        assign_perm("delete_event_obj", admin_group, event)
        assign_perm("invite_event_obj", admin_group, event)

    if visibility == "public":
        assign_perm("view_event_obj", public_group, event)
        assign_perm("view_event_obj", admin_group, event)
        assign_perm("view_event_obj", img_group, event)



ROLE_PERMISSIONS = {
    "viewer": ["view_event_obj"],
    "editor": ["view_event_obj", "change_event_obj", "invite_event_obj"],
}

def get_user_role_for_event(user, event):
    if not user.is_authenticated:
        return None

    if event.eventCreator == user:
        return "owner"

    if user.has_perm("events.change_event_obj", event):
        return "editor"

    if user.has_perm("events.view_event_obj", event):
        return "viewer"
    
    return None
 

from photos.task import NewPersonAdded
def accept_invite(request, token):
    invite = get_object_or_404(
        EventInvite,
        token=token,
        is_active=True
    )

    if invite.expires_at and invite.expires_at < timezone.now():
        return Response({"error": "Invite expired"}, status=400)

    
    for perm in ROLE_PERMISSIONS[invite.role]:  
        assign_perm(perm, request.user, invite.event)

    invite.is_active = False
    invite.save()
    NewPersonAdded.delay(request.user.pk, invite.event.pk)    
    return Response({"status": "joined"})



import random
from datetime import timedelta
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
from users.models import EmailOTP

def generate_otp(length=6):
    return "".join(random.choice("0123456789") for _ in range(length))

def create_and_send_email_otp(user):
    # Invalidate previous unused OTPs
    EmailOTP.objects.filter(user=user, used=False).update(used=True)

    code = generate_otp()
    expires_at = timezone.now() + timedelta(minutes=5)

    EmailOTP.objects.create(
        user=user,
        code=code,
        expires_at=expires_at,
    )

    subject = "KeepEvents email verification OTP"
    message = f"Your OTP is {code}. It is valid for 5 minutes."
    from_email = settings.DEFAULT_FROM_EMAIL
    to_email = [user.email]

    send_mail(subject, message, from_email, to_email)



from urllib.parse import urlencode
def build_user_cache_key(request):
    user_id = request.user.userid

    query_params = request.query_params.copy()
    sorted_params = sorted(query_params.items())
    normalized_query = urlencode(sorted_params)

    path = request.path
    full_key = f"user:{user_id}:{path}?{normalized_query}"

    return full_key


from django_redis import get_redis_connection
from django.core.cache import cache


def invalidate_all_users_cache():
    """
    Delete all photo cache keys for all users.
    Pattern: :1:user:*:/api/photos/*
    """
    try:
        redis_conn = get_redis_connection("default")
        pattern = "*user:*:/api/photos/*"
        
        cursor = 0
        deleted_count = 0
        
        while True:
            cursor, keys = redis_conn.scan(cursor, match=pattern, count=100)
            if keys:
                redis_conn.delete(*keys)
                deleted_count += len(keys)
            if cursor == 0:
                break
        
        print(f"✅ Cleared {deleted_count} photo cache keys")
        
    except Exception as e:
        print(f"⚠️ Cache invalidation error: {e}")


def invalidate_events_cache_all_users():
    """
    Delete all event cache keys for all users.
    Pattern: :1:user:*:/api/events/*
    """
    try:
        redis_conn = get_redis_connection("default")
        pattern = "*user:*:/api/events/*"
        
        cursor = 0
        deleted_count = 0
        
        while True:
            cursor, keys = redis_conn.scan(cursor, match=pattern, count=100)
            if keys:
                redis_conn.delete(*keys)
                deleted_count += len(keys)
            if cursor == 0:
                break
        
        print(f"✅ Cleared {deleted_count} event cache keys")
        
    except Exception as e:
        print(f"⚠️ Events cache invalidation error: {e}")


def invalidate_activity_summary(user_id):
    """
    Delete activity summary cache for a specific user.
    """
    try:
        cache_key = f"*user:{user_id}:/api/users/me/activity-summary/"
        result = cache.delete(cache_key)
        print(f"✅ Cleared activity summary for user {user_id} (deleted: {result})")
    except Exception as e:
        print(f"⚠️ Failed to clear activity summary: {e}")