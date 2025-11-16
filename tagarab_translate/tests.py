from django.test import TestCase


from .models import CustomUser, UserProfile

class UserDeletionTestCase(TestCase):
    def setUp(self):
        # Create test user and profile
        self.user = CustomUser.objects.create(username='testuser', email='test@example.com', password='password123')
        UserProfile.objects.create(user=self.user, first_name='Test', last_name='User')

    def test_delete_user(self):
        # Delete the user and check for errors
        self.user.delete()
        # Check if profile was deleted as well
        self.assertFalse(UserProfile.objects.filter(user=self.user).exists())
