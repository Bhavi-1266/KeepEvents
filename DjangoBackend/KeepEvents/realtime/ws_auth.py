from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from users.models import users  # your custom user model


def authenticate_ws(scope):
    cookies = scope.get("cookies", {})
    raw_token = cookies.get("access")

    if not raw_token:
        return AnonymousUser()

    try:
        jwt_auth = JWTAuthentication()
        validated = jwt_auth.get_validated_token(raw_token)
        return jwt_auth.get_user(validated)
    except Exception:
        return AnonymousUser()
