import face_recognition
import numpy as np

from celery import shared_task
from guardian.shortcuts import get_users_with_perms
from django.contrib.auth import get_user_model

from .models import Photo
from realtime.utils import send_to_event
User = get_user_model()


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=10,
    retry_kwargs={"max_retries": 3},
)
def process_photo_faces_store_users(self, photo_id):
    """
    Detect faces in a photo and store users directly in Photo.Faces
    as [{userid, username}]
    """

    # -------------------------
    # Load photo + event
    # -------------------------
    photo = Photo.objects.select_related("event").get(pk=photo_id)
    event = photo.event

    # -------------------------
    # Users with permission
    # -------------------------
    allowed_users = get_users_with_perms(
        event,
        only_with_perms_in=["view_event_obj"],
    )

    # -------------------------
    # Build encodings from profile pictures
    # -------------------------
    user_encodings = {}

    for user in allowed_users:
        if not user.userProfile:
            continue

        try:
            img = face_recognition.load_image_file(user.userProfile.path)
            encodings = face_recognition.face_encodings(img)

            # assume exactly one face in profile picture
            if len(encodings) == 1:
                user_encodings[user.userid] = {
                    "username": user.username,
                    "encoding": encodings[0],
                }

        except Exception:
            continue

    if not user_encodings:
        photo.Faces = []
        photo.FaceCount = 0
        photo.isProcessed = True
        photo.save(update_fields=["Faces", "FaceCount", "isProcessed"])
        return photo_id

    # -------------------------
    # Load photo & detect faces
    # -------------------------
    image = face_recognition.load_image_file(photo.photoFile.path)
    face_encodings = face_recognition.face_encodings(image)

    detected_users = {}

    # -------------------------
    # Compare each face
    # -------------------------
    for face_encoding in face_encodings:
        best_user_id = None
        best_distance = 1.0

        for user_id, data in user_encodings.items():
            distance = face_recognition.face_distance(
                [data["encoding"]],
                face_encoding
            )[0]

            if distance < best_distance:
                best_distance = distance
                best_user_id = user_id

        # strict threshold
        if best_user_id and best_distance < 0.45:
            detected_users[best_user_id] = {
                "userid": best_user_id,
                "username": user_encodings[best_user_id]["username"],
            }

    # -------------------------
    # Save directly on Photo
    # -------------------------
    photo.Faces = list(detected_users.values())
    photo.FaceCount = len(photo.Faces)
    photo.isProcessed = True
    photo.save(update_fields=["Faces", "FaceCount", "isProcessed"])
    # send_to_event(
    #     photo.event.eventid,
    #     "event_photos_changed",
    #     {
    #         "eventid": photo.event.eventid,
    #         "action": "reload",
    #     }
    #         )
    return photo_id
