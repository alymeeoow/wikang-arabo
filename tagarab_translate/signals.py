from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from .models import UserProfile
from django.db import transaction
from django.db import IntegrityError

@receiver(user_logged_in)
def handle_first_login(sender, request, user, **kwargs):
    try:
        with transaction.atomic():
            # Ensure the user exists before creating the profile
            if user.id:
                user_profile, created = UserProfile.objects.get_or_create(user=user)
                if created:
                    # Logic for newly created profile
                    pass
            else:
                # Handle case when user ID doesn't exist
                raise IntegrityError("User does not exist")
    except IntegrityError as e:
        # Handle the IntegrityError
        print(f"Error creating user profile: {e}")