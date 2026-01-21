from django.shortcuts import redirect
from urllib.parse import urlencode
from django.conf import settings
import requests
import json
from datetime import datetime

# Rest Framework imports
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from .serializers import UserSerializer
from users.models import users  # Ensure this matches your actual User model import

# --- 1. MODIFIED LOGIN VIEW ---
@api_view(['GET'])
@permission_classes([AllowAny])
def omniport_login(request):
    """
    Returns the Omniport authorization URL to the frontend as JSON.
    Frontend will then redirect the window manually.
    """
    # Create a state string to prevent CSRF attacks
    request.session["oauth_state"] = "img_oauth_login"

    params = {
        "client_id": settings.OMNIPORT_CLIENT_ID,
        "redirect_uri": settings.OMNIPORT_REDIRECT_URI,
        "state": request.session["oauth_state"],
    }

    # Construct the URL string
    auth_url = f"{settings.OMNIPORT_BASE_URL}/oauth/authorise/?{urlencode(params)}"

    # CHANGED: Return JSON instead of redirecting
    return Response({"url": auth_url}, status=status.HTTP_200_OK)


# --- 2. HELPER FUNCTION (Unchanged) ---
from datetime import datetime
from users.models import users

def get_or_create_user_from_omniport(user_data):
    """
    Extracts user data from Omniport/Channeli response and finds/creates a user.
    """
    person = user_data.get("person", {})
    student = user_data.get("student", {})
    contact = user_data.get("contactInformation", {})

    # --- 1. GET EMAIL ---
    # Prefer institute webmail, fallback to personal email
    email = contact.get("instituteWebmailAddress")
    if not email:
        email = contact.get("emailAddress")
    
    if not email:
        raise ValueError("No email found in Omniport response")

    # --- 2. EXTRACT & PREPARE DATA ---
    full_name = person.get("fullName", "")
    
    # Handle Enrollment Number (Model expects Integer, Omniport sends String)
    enrol_raw = student.get("enrolmentNumber")
    enrollment_val = None
    batch_val = None
    
    if enrol_raw and str(enrol_raw).isdigit():
        enrollment_val = int(enrol_raw)
        # Bonus: Try to guess batch from enrollment number (e.g. 21114002 -> 2021)
        # Adjust logic based on your actual enrollment number format
        try:
            # Assuming first 2 digits are year (e.g. 21xxxxx -> Batch 2021)
            # This is optional, remove if not needed
            year_prefix = int(str(enrol_raw)[:2])
            batch_val = 2000 + year_prefix 
        except:
            pass

    # Handle Department/Branch
    # Omniport structure: student -> branch -> name
    branch_info = student.get("branch", {})
    dept_name = branch_info.get("name", "") if branch_info else ""

    # --- 3. GENERATE USERNAME ---
    # Logic: CleanName + DOB (or random suffix) to ensure uniqueness
    clean_name = full_name.replace(" ", "")
    dob_raw = person.get("dateOfBirth") 
    
    if dob_raw:
        try:
            # Parse YYYY-MM-DD -> DDMMYY
            date_obj = datetime.strptime(dob_raw, "%Y-%m-%d")
            dob_str = date_obj.strftime("%d%m%y")
        except ValueError:
            dob_str = "000000"
    else:
        # Fallback if DOB is missing
        dob_str = "000000"

    generated_username = f"{clean_name}{dob_str}"
    
    # Ensure username length fits model (max_length=150)
    generated_username = generated_username[:150]

    # --- 4. GET OR CREATE USER ---
    user, created = users.objects.get_or_create(
        email=email,
        defaults={
            "username": generated_username,
            
            # Map to YOUR model fields:
            "enrollmentNo": enrollment_val,   # Matches 'enrollmentNo' in models.py
            "dept": dept_name[:100],          # Matches 'dept' in models.py
            "batch": batch_val,               # Matches 'batch' in models.py
            
            # AbstractUser fields (inherited):
            "first_name": full_name[:150],    # Storing full name in first_name field
        },
    )

    # Optional: If user existed but some fields were empty, you can update them here
    if not created:
        should_save = False
        if not user.enrollmentNo and enrollment_val:
            user.enrollmentNo = enrollment_val
            should_save = True
        if not user.dept and dept_name:
            user.dept = dept_name
            should_save = True
        
        if should_save:
            user.save()

    return user

# --- 3. CALLBACK VIEW (Unchanged) ---
@api_view(['GET'])
@permission_classes([AllowAny])
def omniport_callback(request):
    code = request.GET.get("code")
    state = request.GET.get("state")

    # [1] Validation
    if not code:
        return Response({"error": "Authorization code missing"}, status=400)
    
    # [2] Exchange Code for Token
    try:
        token_response = requests.post(
            f"{settings.OMNIPORT_BASE_URL}/open_auth/token/",
            data={
                "client_id": settings.OMNIPORT_CLIENT_ID,
                "client_secret": settings.OMNIPORT_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": settings.OMNIPORT_REDIRECT_URI,
                "code": code,
            },
            timeout=10,
        )
    except Exception as e:
         return Response({"error": "Connection to Omniport failed"}, status=500)

    if token_response.status_code != 200:
        return Response(token_response.json(), status=400)

    access_token = token_response.json().get("access_token")

    # [3] Fetch User Data
    user_response = requests.get(
        f"{settings.OMNIPORT_BASE_URL}/open_auth/get_user_data/",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10
    )

    if user_response.status_code != 200:
        return Response(user_response.json(), status=400)

    # [4] Get or Create User
    try:
        user = get_or_create_user_from_omniport(user_response.json())
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    # [5] Generate Tokens
    refresh = RefreshToken.for_user(user)

    # [6] Redirect & Set Cookies
    # ⚠️ IMPORTANT: Redirect to localhost, same as your browser URL
    FRONTEND_URL = "http://127.0.0.1:5173/HomePage" 
    
    response = redirect(FRONTEND_URL)

    # --- CRITICAL COOKIE SETTINGS ---
    response.set_cookie(
        key="access",
        value=str(refresh.access_token),
        httponly=True,
        secure=False,      # Must be False for localhost (HTTP)
        samesite="Lax",    # Required for redirects
        max_age=15 * 60,   # 15 minutes
        path="/"           # 🟢 CRITICAL: Makes cookie visible to entire site
    )

    response.set_cookie(
        key="refresh",
        value=str(refresh),
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=7 * 24 * 60 * 60,
        path="/"           # 🟢 CRITICAL: Makes cookie visible to entire site
    )

    return response