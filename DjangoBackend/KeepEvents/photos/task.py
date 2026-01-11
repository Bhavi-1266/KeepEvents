import face_recognition
import numpy as np
import json
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from celery import shared_task
from guardian.shortcuts import get_users_with_perms
from django.contrib.auth import get_user_model
from datetime import datetime

from .models import Photo
from realtime.utils import send_to_event

User = get_user_model()


def get_decimal_from_dms(dms, ref):
    """Helper to convert GPS degrees, minutes, seconds to decimal degrees"""
    try:
        degrees = float(dms[0])
        minutes = float(dms[1]) / 60.0
        seconds = float(dms[2]) / 3600.0
        decimal = degrees + minutes + seconds
        if ref in ['S', 'W']:
            decimal = -decimal
        return decimal
    except (TypeError, IndexError, ZeroDivisionError):
        return None


def serialize_value(value):
    """Convert various types to JSON-serializable formats"""
    # Handle bytes
    if isinstance(value, bytes):
        try:
            # Try to decode as UTF-8
            return value.decode('utf-8', errors='ignore')
        except:
            # If fails, convert to base64 or skip
            return f"<binary data: {len(value)} bytes>"
    
    # Handle tuples (common in EXIF)
    elif isinstance(value, tuple):
        return [serialize_value(v) for v in value]
    
    # Handle lists
    elif isinstance(value, list):
        return [serialize_value(v) for v in value]
    
    # Handle dictionaries
    elif isinstance(value, dict):
        return {k: serialize_value(v) for k, v in value.items()}
    
    # Handle datetime
    elif isinstance(value, datetime):
        return value.isoformat()
    
    # Handle numpy types (from face_recognition)
    elif isinstance(value, (np.integer, np.floating)):
        return float(value)
    
    # Handle standard types
    elif isinstance(value, (str, int, float, bool, type(None))):
        return value
    
    # Fallback for unknown types
    else:
        return str(value)


def extract_gps_metadata(gps_data):
    """Extract comprehensive GPS metadata"""
    gps_info = {}
    
    try:
        # Latitude
        if "GPSLatitude" in gps_data and "GPSLatitudeRef" in gps_data:
            gps_info["latitude"] = get_decimal_from_dms(
                gps_data["GPSLatitude"], 
                gps_data["GPSLatitudeRef"]
            )
            gps_info["latitude_ref"] = gps_data["GPSLatitudeRef"]
        
        # Longitude
        if "GPSLongitude" in gps_data and "GPSLongitudeRef" in gps_data:
            gps_info["longitude"] = get_decimal_from_dms(
                gps_data["GPSLongitude"], 
                gps_data["GPSLongitudeRef"]
            )
            gps_info["longitude_ref"] = gps_data["GPSLongitudeRef"]
        
        # Altitude
        if "GPSAltitude" in gps_data:
            altitude = gps_data["GPSAltitude"]
            if isinstance(altitude, tuple):
                gps_info["altitude_meters"] = float(altitude[0]) / float(altitude[1]) if altitude[1] != 0 else 0
            else:
                gps_info["altitude_meters"] = float(altitude)
            
            if "GPSAltitudeRef" in gps_data:
                gps_info["altitude_ref"] = "below_sea_level" if gps_data["GPSAltitudeRef"] == 1 else "above_sea_level"
        
        # Speed
        if "GPSSpeed" in gps_data:
            gps_info["speed"] = gps_data["GPSSpeed"]
            if "GPSSpeedRef" in gps_data:
                gps_info["speed_unit"] = gps_data["GPSSpeedRef"]
        
        # Direction
        if "GPSImgDirection" in gps_data:
            direction = gps_data["GPSImgDirection"]
            if isinstance(direction, tuple):
                gps_info["direction_degrees"] = float(direction[0]) / float(direction[1]) if direction[1] != 0 else 0
            else:
                gps_info["direction_degrees"] = float(direction)
        
        # Timestamp
        if "GPSDateStamp" in gps_data and "GPSTimeStamp" in gps_data:
            try:
                date = gps_data["GPSDateStamp"]
                time = gps_data["GPSTimeStamp"]
                gps_info["timestamp"] = f"{date} {time[0]}:{time[1]}:{time[2]}"
            except:
                pass
        
        # Satellites
        if "GPSSatellites" in gps_data:
            gps_info["satellites"] = gps_data["GPSSatellites"]
        
        # Map Datum
        if "GPSMapDatum" in gps_data:
            gps_info["map_datum"] = gps_data["GPSMapDatum"]
        
    except Exception as e:
        print(f"GPS extraction error: {e}")
    
    return gps_info


def extract_full_metadata(path):
    """
    Extracts comprehensive EXIF, GPS, and other metadata from an image.
    Returns a JSON-serializable dictionary.
    """
    meta_dict = {
        "basic": {},
        "camera": {},
        "settings": {},
        "gps": {},
        "datetime": {},
        "other": {}
    }
    
    try:
        with Image.open(path) as img:
            # Basic image info
            meta_dict["basic"]["format"] = img.format
            meta_dict["basic"]["mode"] = img.mode
            meta_dict["basic"]["size"] = img.size
            meta_dict["basic"]["width"] = img.width
            meta_dict["basic"]["height"] = img.height
            
            # Get EXIF data
            exif_data = img._getexif()
            if not exif_data:
                return meta_dict

            for tag, value in exif_data.items():
                decoded_tag = TAGS.get(tag, f"Unknown_{tag}")
                
                # Handle GPS data separately
                if decoded_tag == "GPSInfo":
                    gps_data = {}
                    for t in value:
                        sub_tag = GPSTAGS.get(t, f"GPS_{t}")
                        gps_data[sub_tag] = value[t]
                    
                    meta_dict["gps"] = extract_gps_metadata(gps_data)
                
                # Camera information
                elif decoded_tag in ["Make", "Model", "LensModel", "LensMake"]:
                    meta_dict["camera"][decoded_tag] = serialize_value(value)
                
                # Camera settings
                elif decoded_tag in [
                    "ExposureTime", "FNumber", "ISO", "ISOSpeedRatings",
                    "FocalLength", "FocalLengthIn35mmFilm",
                    "ExposureProgram", "ExposureMode", "MeteringMode",
                    "Flash", "WhiteBalance", "DigitalZoomRatio",
                    "ShutterSpeedValue", "ApertureValue", "BrightnessValue",
                    "ExposureBiasValue", "MaxApertureValue"
                ]:
                    meta_dict["settings"][decoded_tag] = serialize_value(value)
                
                # DateTime information
                elif decoded_tag in [
                    "DateTime", "DateTimeOriginal", "DateTimeDigitized",
                    "SubSecTime", "SubSecTimeOriginal", "SubSecTimeDigitized"
                ]:
                    meta_dict["datetime"][decoded_tag] = serialize_value(value)
                
                # Everything else
                else:
                    # Skip large binary data like thumbnails
                    if decoded_tag in ["JPEGThumbnail", "TIFFThumbnail"]:
                        meta_dict["other"][decoded_tag] = f"<thumbnail: {len(value)} bytes>"
                    # Skip MakerNote (camera-specific binary data)
                    elif decoded_tag == "MakerNote":
                        meta_dict["other"][decoded_tag] = f"<maker note: {len(value)} bytes>"
                    else:
                        meta_dict["other"][decoded_tag] = serialize_value(value)
            
            # Clean up empty sections
            meta_dict = {k: v for k, v in meta_dict.items() if v}
            
    except Exception as e:
        print(f"Metadata extraction error: {e}")
        meta_dict["error"] = str(e)
    
    return meta_dict


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=10,
    retry_kwargs={"max_retries": 3},
)
def process_photo_faces_store_users(self, photo_id):
    """
    1. Extracts Metadata (EXIF/GPS)
    2. Detects total faces (FaceCount)
    3. Matches faces against allowed users (Faces)
    """

    # -------------------------
    # Load photo + event
    # -------------------------
    try:
        photo = Photo.objects.select_related("event").get(pk=photo_id)
    except Photo.DoesNotExist:
        return f"Photo {photo_id} not found"
        
    event = photo.event

    # -------------------------
    # 1. Metadata Extraction
    # -------------------------
    metadata = extract_full_metadata(photo.photoFile.path)
    photo.photoMeta = json.dumps(metadata, ensure_ascii=False, indent=2)

    # -------------------------
    # 2. Face Detection (Raw Count)
    # -------------------------
    image = face_recognition.load_image_file(photo.photoFile.path)
    face_encodings = face_recognition.face_encodings(image)
    
    total_faces_detected = len(face_encodings)
    photo.FaceCount = total_faces_detected

    # -------------------------
    # Quick exit if no faces to match
    # -------------------------
    if total_faces_detected == 0:
        photo.Faces = []
        photo.isProcessed = True
        photo.save(update_fields=["Faces", "FaceCount", "isProcessed", "photoMeta"])
        return photo_id

    # -------------------------
    # 3. Build Encodings from Profile Pics
    # -------------------------
    allowed_users = get_users_with_perms(
        event,
        only_with_perms_in=["view_event_obj"],
    )

    user_encodings = {}
    for user in allowed_users:
        if not user.userProfile:
            continue

        try:
            # We use the user's saved profile path
            img = face_recognition.load_image_file(user.userProfile.path)
            encs = face_recognition.face_encodings(img)
            if len(encs) == 1:
                user_encodings[user.userid] = {
                    "username": user.username,
                    "encoding": encs[0],
                }
        except Exception:
            continue

    # -------------------------
    # 4. Compare and Match
    # -------------------------
    detected_users = {}
    if user_encodings:
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

            # Threshold 0.55 for strict matching
            if best_user_id and best_distance < 0.55:
                detected_users[best_user_id] = {
                    "userid": best_user_id,
                    "username": user_encodings[best_user_id]["username"],
                }

    # -------------------------
    # 5. Final Save
    # -------------------------
    photo.Faces = list(detected_users.values())
    photo.isProcessed = True
    photo.save(update_fields=["Faces", "FaceCount", "isProcessed", "photoMeta"])

    # Optional: Trigger Realtime Update
    # send_to_event(event.eventid, "photo_processed", {"photoid": photo_id})

    return photo_id






@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=10,
    retry_kwargs={"max_retries": 3},
    priority=0,  # Lowest priority (0-9 range usually)
    queue='low_priority' # Recommended: Route this to a separate worker queue
)
def NewPersonAdded(self, user_id, event_id):
    """
    Called when a new person is added to an event.
    1. Generates encoding for the NEW user.
    2. Scans all photos in the event.
    3. Updates 'photo.Faces' JSON if a match is found.
    """
    
    # -------------------------
    # 1. Setup & User Encoding
    # -------------------------
    try:
        user = User.objects.get(pk=user_id)
        if not user.userProfile:
            return f"User {user.username} has no profile picture."
            
        # Generate the encoding for the NEW user (Do this once)
        user_image = face_recognition.load_image_file(user.userProfile.path)
        user_encodings = face_recognition.face_encodings(user_image)
        
        if not user_encodings:
            return f"No face found in {user.username}'s profile picture."
            
        new_user_encoding = user_encodings[0]
        
    except User.DoesNotExist:
        return f"User {user_id} does not exist."

    # -------------------------
    # 2. Fetch Relevant Photos
    # -------------------------
    # We get all processed photos for this event.
    # Optimization: You might want to filter out photos where FaceCount == 0
    photos = Photo.objects.filter(event__pk=event_id, isProcessed=True).exclude(FaceCount=0)
    
    print(f"Scanning {photos.count()} photos for user {user.username}...")

    # -------------------------
    # 3. Iterate & Match
    # -------------------------
    for photo in photos:
        try:
            # Check if user is already in the Faces list to avoid re-processing
            existing_faces = photo.Faces or []
            already_tagged = any(f.get('userid') == user.userid for f in existing_faces)
            
            if already_tagged:
                continue

            # LOAD PHOTO (Heavy Operation)
            # Since we don't store raw photo encodings in DB, we must reload the file
            unknown_image = face_recognition.load_image_file(photo.photoFile.path)
            unknown_face_encodings = face_recognition.face_encodings(unknown_image)

            if not unknown_face_encodings:
                continue

            # Compare new user against ALL faces in this specific photo
            # Using your reference threshold of 0.55
            match_found = False
            
            # We calculate distance manually to match your reference logic strictly
            distances = face_recognition.face_distance(unknown_face_encodings, new_user_encoding)
            
            for distance in distances:
                if distance < 0.55:
                    match_found = True
                    break # Found them in this photo

            # -------------------------
            # 4. Update JSON
            # -------------------------
            if match_found:
                new_face_entry = {
                    "userid": user.userid,
                    "username": user.username,
                }
                
                # Append to existing list
                # We use a fresh list copy to ensure clean JSON serialization
                updated_faces = list(existing_faces)
                updated_faces.append(new_face_entry)
                
                photo.Faces = updated_faces
                photo.save(update_fields=["Faces"])
                print(f"Matched {user.username} in Photo {photo.pk}")

        except Exception as e:
            print(f"Error processing Photo {photo.pk}: {e}")
            continue

    return f"Finished scanning for {user.username}"



