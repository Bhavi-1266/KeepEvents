from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission , IsAuthenticated , AllowAny
from .permissions import IsAdmin , ReadOnly , IsSelfOrAdmin , IsEventOwnerOrAdmin , IsPhotoOwnerEventOwnerOrAdmin  , IsIMGMember
from .permissions import is_admin , is_img_member
from django.contrib.auth import get_user_model 
from django.contrib.auth.models import Group
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateFilter, CharFilter, NumberFilter
from .serializers import UserSerializer , EventSerializer , PhotoSerializer , commentSerializer, likedPhotoSerializer
from .serializers import RegisterSerializer , downloadedPhotoSerializer, viewedPhotoSerializer

from .utils import build_user_cache_key
from django.core.cache import cache

# At the top of the file, add:
from django.db import models

from realtime.utils import send_to_event 
from .utils import invalidate_all_users_cache, invalidate_events_cache_all_users, invalidate_activity_summary

import hashlib

from rest_framework_simplejwt.tokens import RefreshToken

from guardian.shortcuts import get_objects_for_user
from .utils import set_event_perms
from realtime.utils import send_to_event , send_to_user , send_to_all

from django.db.models import Q


from rest_framework.pagination import LimitOffsetPagination # Or PageNumberPagination   
from users.models import users
from photos.models import Photo 
from photos.models import likedPhoto , comment , downloadedPhoto , viewedPhoto
from events.models import Events

# Use your actual users model
User = get_user_model()

from rest_framework.permissions import BasePermission

class CreateOnlyPermission(BasePermission):
    """
    Allow:
    - POST /users/ (registration)
    - POST /users/login/ (login)

    Require authentication for everything else.
    """

    def has_permission(self, request, view):
        # Allow unauthenticated create
        if request.method == "POST" and getattr(view, "action", None) == "create":
            return True

        # Allow unauthenticated login
        if getattr(view, "action", None) == "login":
            return True

        # Otherwise require auth
        return bool(request.user and request.user.is_authenticated)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    
    permission_classes = [CreateOnlyPermission]

    lookup_field = "userid"

    pagination_class = LimitOffsetPagination
    page_size = 10

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["username", "email", "dept", "userbio", "enrollmentNo"]
    filterset_fields = ["dept", "batch", "is_active"]
    ordering_fields = ["username", "date_joined", "batch"]
    ordering = ["username"]


    def get_serializer_class(self):
        if self.action == "create":
            return RegisterSerializer
        return UserSerializer

    def perform_create(self, serializer):
        # Save the user first (all validations, constraints still apply)
        user = serializer.save()
        
        # Automatically add to Public group
        public_group, created = Group.objects.get_or_create(name='Public')
        user.groups.add(public_group)

    @action(detail=False, methods=["post"] , authentication_classes=[] )
    def login(self, request):   
        # 1) Get email + password
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"error": "email and password required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2) Normalize email
        email_norm = email.strip().lower()

        # 3) Find user
        try:
            user = User.objects.get(email__iexact=email_norm)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 4) Check password
        if not user.check_password(password):
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # 5) Check email verification
        if not user.is_active:
            return Response(
                {"error": "Email not verified"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 6) Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        # 7) Prepare response (NO TOKEN IN BODY)
        response = Response(
            {
                "user": UserSerializer(user, context={"request": request}).data
            },
            status=status.HTTP_200_OK,
        )

        # 8) Set HTTP-only cookies
        response.set_cookie(
            key="access",
            value=access_token,
            httponly=True,
            secure=False,      # 🔴 True in production (HTTPS)
            samesite="Lax",
            max_age=60 * 60 ,   #  15 hours
        )

        response.set_cookie(
            key="refresh",
            value=str(refresh),
            httponly=True,
            secure=False,      # 🔴 True in production
            samesite="Lax",
            max_age=7 * 24 * 60 ,  # 7 days
        )

        return response

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [ReadOnly()]
        return [IsSelfOrAdmin()]

    @action(detail=False, methods=["post"], authentication_classes=[],url_path="reset-password") 
    def ResetPassword(self, request):
        email = request.data.get("email")
        new_password = request.data.get("new_password")

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        user.set_password(new_password)
        user.save()
        return Response(UserSerializer(request.user).data)
    

from rest_framework.decorators import api_view, permission_classes

@api_view(["POST"] )
@permission_classes([])
def logout(request):
    response = Response(
        {"detail": "Logged out successfully"},
        status=status.HTTP_200_OK,
    )

    # Delete access token cookie
    response.delete_cookie(
        key="access",
        path="/",
    )

    # Delete refresh token cookie
    response.delete_cookie(
        key="refresh",
        path="/",
    )

    return response

from .serializers import UserGroupSerializer

class UserGroupViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserGroupSerializer
    
    permission_classes = [IsAuthenticated, IsAdmin]
    lookup_field = "userid"  # or "id" if your pk is id



from  .utils import CreateEventPerms
from .permissions import  CanSendInvitation , CanEditEvent , CanViewEvent
from events.models import EventInvite
from KeepEvents.settings import FRONTEND_URL
from guardian.shortcuts import get_users_with_perms , get_objects_for_user , remove_perm
from django.shortcuts import get_object_or_404
from guardian.models import UserObjectPermission

from django.db.models import IntegerField
from django.db.models.functions import Cast
from photos.task import NewPersonAdded

class EventViewSet(viewsets.ModelViewSet):
    queryset = Events.objects.all()
    serializer_class = EventSerializer

    pagination_class = LimitOffsetPagination
    page_size = 10
    lookup_field = "eventid"

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["eventname", "eventlocation", "eventdesc"]

    filterset_fields = {
        "eventdate": ["exact", "gte", "lte", "range"],
        "eventCreator": ["exact"],
        "eventlocation": ["exact", "in"],
        "eventtime": ["exact"],
        "visibility": ["exact"],
    }

    ordering_fields = ["eventname", "eventdate", "eventtime", "eventlocation"]
    ordering = ["eventdate", "eventname", "eventtime", "eventlocation"]

    # -------------------------
    # CACHE INVALIDATION HELPERS
    # -------------------------

   

    # -------------------------
    # QUERYSET
    # -------------------------

    def get_queryset(self):
        user = self.request.user
        
        # 1. Get IDs of events where the user has explicit Guardian permissions
        # allowed_by_perm = get_objects_for_user(
        #     user=user,
        #     perms="view_event_obj",
        #     klass=Events,
        #     with_superuser=True,
        # ).values_list('eventid', flat=True)

        # # 2. Return events that are either Public OR in the allowed permission list
        # return Events.objects.filter(
        #     Q(visibility="public") | Q(eventid__in=allowed_by_perm)
        # ).distinct()

        publicEvents = Events.objects.filter(visibility="public")
        permsEvents = get_objects_for_user(
            user=user,
            perms="events.view_event_obj",
            klass=Events,
            with_superuser=True,
        )
        AllowedEvents = (publicEvents | permsEvents).distinct()
        return AllowedEvents
    # -------------------------
    # CACHED READS
    # -------------------------

    def list(self, request, *args, **kwargs):
        cache_key = build_user_cache_key(request)
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            cache.set(cache_key, response.data, timeout=300)
            return response

        serializer = self.get_serializer(queryset, many=True)
        cache.set(cache_key, serializer.data, timeout=300)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        event = self.get_object()
        serializer = self.get_serializer(event, data=request.data)
        if serializer.is_valid():
            serializer.save()
            invalidate_events_cache_all_users()
            return Response(serializer.data)
        invalidate_events_cache_all_users()
        return Response(serializer.errors, status=400)
    # -------------------------
    # PERMISSION VIEWS (CACHED)
    # -------------------------

    @action(detail=True, methods=["get"], permission_classes=[CanEditEvent, IsAuthenticated])
    def viewers(self, request, eventid=None):
        cache_key = build_user_cache_key(request)
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        event = self.get_object()
        users = get_users_with_perms(event, only_with_perms_in=["view_event_obj"])
        data = UserSerializer(users, many=True).data

        cache.set(cache_key, data, timeout=300)
        
        return Response(data)

    @action(detail=True, methods=["get"], permission_classes=[CanEditEvent, IsAuthenticated])
    def editors(self, request, eventid=None):
        cache_key = build_user_cache_key(request)
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        event = self.get_object()
        users = get_users_with_perms(event, only_with_perms_in=["change_event_obj"])
        data = UserSerializer(users, many=True).data

        cache.set(cache_key, data, timeout=300)
        return Response(data)

    # -------------------------
    # PERMISSION MUTATIONS
    # -------------------------

    @action(detail=True, methods=["delete"], permission_classes=[CanEditEvent, IsAuthenticated])
    def remove_viewer(self, request, eventid=None):
        event = self.get_object()
        user = get_object_or_404(get_user_model(), userid=request.query_params["userid"])
        remove_perm("view_event_obj", user, event)
        remove_perm("change_event_obj", user, event)
        invalidate_events_cache_all_users()
        invalidate_activity_summary(user.userid)

        return Response({"message": "Viewer removed"})

    @action(detail=True, methods=["delete"], permission_classes=[CanEditEvent, IsAuthenticated])
    def remove_editor(self, request, eventid=None):
        event = self.get_object()
        user = get_object_or_404(get_user_model(), userid=request.query_params["userid"])
        remove_perm("change_event_obj", user, event)
        remove_perm("view_event_obj", user, event)
        

        invalidate_events_cache_all_users()
        invalidate_activity_summary(user.userid)

        return Response({"message": "Editor removed"})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, CanSendInvitation])
    def invite(self, request, eventid=None):
        event = self.get_object()

        invite = EventInvite.objects.create(
            event=event,
            role=request.data["role"],
            expires_at=request.data.get("expires_at"),
        )

        invalidate_events_cache_all_users()

        return Response({
            "invite_url": f"{FRONTEND_URL}/invite/{invite.token}",
            "role": invite.role,
        })

    # -------------------------
    # WRITE OPERATIONS
    # -------------------------

    def perform_create(self, serializer):
        event = serializer.save(eventCreator=self.request.user)
        CreateEventPerms(event, serializer.validated_data.get("visibility", "private"), self.request.user)

        invalidate_events_cache_all_users()
        invalidate_activity_summary(self.request.user.userid)

    def perform_update(self, serializer):
        event = serializer.save()

        visibility = self.request.data.get("visibility")
        if visibility:
            set_event_perms(event, visibility, self.request.data.get("extra_users", []))

        invalidate_events_cache_all_users()
        invalidate_activity_summary(self.request.user.userid)


from rest_framework.views import APIView
from .utils import accept_invite
class AcceptInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        return accept_invite(request, token)

    

class PhotoFilter(FilterSet):
    # unified search (text + tags + location)
    search = CharFilter(method="filter_search")

    uploader = NumberFilter(field_name="uploadedBy")
    tag = CharFilter(method="filter_by_tag")
    date = DateFilter(field_name="uploadDate", lookup_expr="date")
    date_after = DateFilter(field_name="uploadDate", lookup_expr="date__gte")
    date_before = DateFilter(field_name="uploadDate", lookup_expr="date__lte")
    event = NumberFilter(field_name="event_id")

    class Meta:
        model = Photo
        fields = [
            "search",
            "uploader",
            "tag",
            "date",
            "date_after",
            "date_before",
            "event",
        ]

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(photoDesc__icontains=value) |
            Q(event__eventname__icontains=value) |
            Q(event__eventlocation__icontains=value) |
            Q(uploadedBy__username__icontains=value) |
            Q(extractedTags__contains=[value])
        )

    def filter_by_tag(self, queryset, name, value):
        return queryset.filter(extractedTags__contains=[value])


from photos.task import process_photo_faces_store_users
from .permissions import canViewPhoto , canEditPhoto , canDeletePhoto , canAddPhoto
class PhotoViewSet(viewsets.ModelViewSet):
    """
    Photo viewset with:
      - filtering (search, uploader, tag, date range, event)
      - ordering
      - single create/update/delete
      - bulk-create
      - bulk-delete
      - like / unlike
    """

    queryset = Photo.objects.all().select_related("event", "uploadedBy")
    serializer_class = PhotoSerializer

    # Filtering & ordering
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
    ]
    filterset_class = PhotoFilter

    ordering_fields = ["uploadDate", "photoid", "likecount", "viewcount", "downloadcount", "commentcount" , "FaceCount"]
    ordering = ["-uploadDate", "-photoid", "-likecount", "-viewcount", "-downloadcount", "-commentcount" , "FaceCount"]  # default: newest first

    pagination_class = LimitOffsetPagination
    page_size = 10

    permission_classes = [IsAuthenticated]

    # 🔑 IMPORTANT: pass request to serializer (for isLikedByCurrentUser)
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context
    
    def get_queryset(self):
        user = self.request.user
        # Convert to proper boolean
        FindMe = self.request.query_params.get('FindMe', 'false').lower() == 'true'

        # 1. Get IDs of events where the user has explicit Guardian permissions
        permitted_event_ids = get_objects_for_user(
            user=user,
            perms="events.view_event_obj",
            klass=Events,
            with_superuser=True,
        ).values_list('eventid', flat=True)

        # 2. Base queryset with event visibility filters
        queryset = Photo.objects.filter(
            Q(event__visibility="public") | Q(event__eventid__in=permitted_event_ids)
        ).select_related("event", "uploadedBy")
        
        # 3. Apply FindMe filter if requested
        if FindMe:
            queryset = queryset.filter(
                Faces__contains=[{"userid": user.userid, "username": user.username}]
            ).exclude(Faces__isnull=True)  # Exclude null Faces
        
        return queryset.distinct()

    # In PhotoViewSet
    



    def list(self, request, *args, **kwargs):
        cache_key = build_user_cache_key(request)

        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            cache.set(cache_key, response.data, timeout=120)
            return response

        serializer = self.get_serializer(queryset, many=True)
        cache.set(cache_key, serializer.data, timeout=120)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        cache_key = build_user_cache_key(request)

        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        instance = self.get_object()
        serializer = self.get_serializer(instance)

        cache.set(cache_key, serializer.data, timeout=120)
        return Response(serializer.data)



    # Permissions per action
    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated() , canViewPhoto() ]

        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), canEditPhoto()]

        if self.action in ["bulk_create", "bulk_delete", "toggle_like"]:
            return [IsAuthenticated()]

        return super().get_permissions()



    # Single create
    def perform_create(self, serializer):
        permission_classes = [IsAuthenticated , canAddPhoto]
        invalidate_all_users_cache()
        serializer.save(uploadedBy=self.request.user)
        


    # -------------------------
    # BULK CREATE
    # -------------------------
    @action(detail=False, methods=["post"], url_path="bulk-create")

    def bulk_create(self, request):
        permission_classes = [IsAuthenticated, canAddPhoto]
        user = request.user
        files = request.FILES.getlist("photoFile")
        descs = request.data.getlist("photoDesc")
        event_ids = request.data.getlist("event_id")
        tags = request.data.getlist("extractedTags")

        if not files:
            return Response(
                {"error": "No files received"},
                status=status.HTTP_400_BAD_REQUEST
            )

        created = []
        errors = []
        affected_event_ids = set()   # 👈 IMPORTANT

        import json

        for i, file in enumerate(files):
            extractedTags = json.loads(tags[i]) if i < len(tags) else []

            data = {
                "photoFile": file,
                "photoDesc": descs[i] if i < len(descs) else "",
                "event_id": event_ids[i] if i < len(event_ids) else None,
                "extractedTags": extractedTags,
            }

            serializer = self.get_serializer(data=data)
            if serializer.is_valid():
                photo = serializer.save(uploadedBy=user)

                # track affected events
                affected_event_ids.add(photo.event.eventid)

                # 🔥 background processing
                process_photo_faces_store_users.delay(photo.photoid)

                created.append(serializer.data)
            else:
                errors.append({"index": i, "errors": serializer.errors})

        # invalidate cache ONCE
        invalidate_all_users_cache()

        # 🔔 notify ALL viewers of affected events
        send_to_all(
            event="ReloadPhotos",
            data={
                "userid": user.userid,
                "action": "Added",
                "eventid" : photo.event.eventid,
            }
        )


        return Response(
            {"created": created, "errors": errors},
            status=status.HTTP_207_MULTI_STATUS if errors else status.HTTP_201_CREATED
        )


    # -------------------------
    # BULK DELETE
    # -------------------------
    @action(detail=False, methods=["post"], url_path="bulk-delete")

    def bulk_delete(self, request):
        ids = request.data.get("photo_ids", [])

        if not isinstance(ids, list):
            return Response(
                {"error": "photo_ids must be a list"},
                status=status.HTTP_400_BAD_REQUEST
            )

        photos = Photo.objects.filter(pk__in=ids).select_related("event", "uploadedBy")

        deleted = []
        skipped = []
        affected_event_ids = set()   # 👈 IMPORTANT

        perm_checker = canDeletePhoto()

        for photo in photos:
            if perm_checker.has_object_permission(request, self, photo):
                deleted.append(photo.pk)

                # track event BEFORE delete
                affected_event_ids.add(photo.event.eventid)

                photo.delete()
            else:
                skipped.append(photo.pk)

        # invalidate cache ONCE
        invalidate_all_users_cache()
        user = request.user
        # 🔔 notify all viewers of affected events
        send_to_all(
            event="ReloadPhotos",
            data={
                "userid": user.userid,
                "action": "Deleted",
                "eventid" : photo.event.eventid,
            }
        )

        return Response(
            {"deleted": deleted, "skipped_no_permission": skipped},
            status=status.HTTP_200_OK,
        )

    # -------------------------
    # LIKE / UNLIKE
    # -------------------------
    @action(detail=True, methods=["post"], url_path="toggle-like")
    def toggle_like(self, request, pk=None):
        photo = self.get_object()
        user = request.user

        like = likedPhoto.objects.filter(photo=photo, user=user).first()

        if like:
            like.delete()
            photo.likecount = max(photo.likecount - 1, 0)
            liked = False
        else:
            likedPhoto.objects.create(photo=photo, user=user)
            photo.likecount += 1
            liked = True

        photo.save(update_fields=["likecount"])
        
        # CRITICAL: Clear cache for everyone because the 'likecount' changed for everyone
        # and 'isLiked' changed for this specific user.
        invalidate_all_users_cache()

        if (liked and photo.uploadedBy.userid != user.userid):
            send_to_user(
                user_id=photo.uploadedBy.userid,
                event="photo_liked",
                data={
                    "photoid": photo.photoid,
                    "userid": photo.uploadedBy.userid,
                    "action": "liked",
                    "likedBy": user.username,
                    "likedById": user.userid,
                }
            )
                

        return Response(
            {"liked": liked, "likes": photo.likecount},
            status=status.HTTP_200_OK,
        )



from django.db.models import Sum, Count, Min
from collections import Counter

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_activity_summary(request):
    user = request.user
    photos = Photo.objects.filter(uploadedBy=user).select_related("event")
    cache_key = build_user_cache_key(request)

    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    # ---- BASIC STATS ----
    stats = photos.aggregate(
        total_photos=Count("photoid"),
        total_likes=Sum("likecount"),
        total_views=Sum("viewcount"),
        total_downloads=Sum("downloadcount"),
        total_comments=Sum("commentcount"),
        first_upload_date=Min("uploadDate"),
    )

    # ---- TOP TAGS ----
    tag_counter = Counter()
    for p in photos:
        if p.extractedTags:
            tag_counter.update(p.extractedTags)

    top_tags = [
        {"tag": tag, "count": count}
        for tag, count in tag_counter.most_common(10)
    ]

    # ---- TOP LOCATIONS (via events) ----
    location_counter = Counter()
    for p in photos:
        if p.event and p.event.eventlocation:
            location_counter[p.event.eventlocation] += 1

    top_locations = [
        {"location": loc, "count": count}
        for loc, count in location_counter.most_common(5)
    ]

    # ---- MAJOR EVENTS ----
    major_events = (
        photos.values("event__eventid", "event__eventname")
        .annotate(photo_count=Count("photoid"))
        .order_by("-photo_count")[:5]
    )
    ResponseData = {
        "user": {
            "username": user.username,
            "email": user.email,
        },
        "stats": stats,
        "activity": {
            "top_tags": top_tags,
            "top_locations": top_locations,
            "major_events": list(major_events),
        },
    }

    # ---- CACHE ----
    cache.set(cache_key,ResponseData , timeout=300)
    
    return Response(ResponseData)




# -------- Like viewset --------
class LikedPhotoViewSet(viewsets.ModelViewSet):
    queryset = likedPhoto.objects.all().select_related('user', 'photo')
    serializer_class = likedPhotoSerializer
    pagination_class = LimitOffsetPagination
    page_size = 10
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'photo']
    search_fields = ['user__username', 'photo__photoDesc']
    ordering_fields = ['likedAt', 'id']
    ordering = ['-likedAt']   # default: newest first
    
    permission_classes = [IsAuthenticated]  # keep or change as needed

# -------- Comment viewset --------
from django.core.exceptions import ValidationError
class CommentViewSet(viewsets.ModelViewSet):
    queryset = comment.objects.all().select_related('user', 'photo')
    serializer_class = commentSerializer
    filterset_fields = ['user', 'photo']
    pagination_class = LimitOffsetPagination
    page_size = 10
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['commentText', 'user__username', 'photo__photoDesc']
    ordering_fields = ['commentedAt', 'id']
    ordering = ['-commentedAt']
    
    permission_classes = [IsAuthenticated]  # keep or change as needed

  

    def perform_create(self, serializer):
        photo_id = self.request.data.get('photo_id')
        if not photo_id:  # Only raise if photo is actually missing
            raise ValidationError({"photo": "This field is required."})
        
        # Continue with save
        user = self.request.user
        serializer.save(user=user)

        # Increment comment count
        photo = Photo.objects.get(pk=photo_id)

        photo.commentcount += 1
        photo.save(update_fields=['commentcount'])
        # Invalidate caches
        invalidate_all_users_cache()

        
        
        send_to_user(
            user_id=photo.uploadedBy.userid,
            event="comment_added",
            data={
                "photoid": photo.photoid,
                "userid": photo.uploadedBy.userid,
                "action": "commented",
                "comment": self.request.data.get('commentText'),
                "commentedBy": user.username,
                "commentedById": user.userid,
            }
        )
                




# -------- Download viewset --------
class DownloadedPhotoViewSet(viewsets.ModelViewSet):
    queryset = downloadedPhoto.objects.all().select_related('user', 'photo')
    serializer_class = downloadedPhotoSerializer
    pagination_class = LimitOffsetPagination
    page_size = 10
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'photo', 'version']
    search_fields = ['user__username', 'photo__photoDesc', 'version']
    ordering_fields = ['downloadedAt', 'id']
    ordering = ['-downloadedAt']
    
    permission_classes = [IsAuthenticated]  # keep or change as needed



# -------- View viewset --------
class ViewedPhotoViewSet(viewsets.ModelViewSet):
    queryset = viewedPhoto.objects.all().select_related('user', 'photo')
    serializer_class = viewedPhotoSerializer
    pagination_class = LimitOffsetPagination
    page_size = 10
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'photo']
    search_fields = ['user__username', 'photo__photoDesc']
    ordering_fields = ['viewedAt', 'id']
    ordering = ['-viewedAt']
    
    permission_classes = [IsAuthenticated]  # keep or change as needed

    

    def perform_create(self, serializer):
        photo_id = self.request.data.get('photo')
        
        if not photo_id:
            raise ValidationError({"photo_id": "This field is required."})
        
        try:
            photo = Photo.objects.get(pk=photo_id)
        except Photo.DoesNotExist:
            raise ValidationError({"photo_id": "Photo not found."})
        
        # Check permissions if needed
        # if not can_user_comment_on_photo(self.request.user, photo):
        #     raise PermissionDenied("You don't have permission to comment on this photo.")
        invalidate_all_users_cache()
        serializer.save(user=self.request.user, photo=photo)

        # Increment view count
        photo.viewcount += 1
        photo.save(update_fields=['viewcount'])
        # Invalidate caches
        



