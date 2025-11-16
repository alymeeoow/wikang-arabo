from django.db import models
from django.utils import timezone
from django.conf import settings


from django.contrib.auth.models import User  

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    first_name = models.CharField(max_length=255, null=True, blank=True)
    middle_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    home_address = models.CharField(max_length=255, null=True, blank=True)
    birth_day = models.IntegerField(blank=True, null=True)
    birth_month = models.IntegerField(blank=True, null=True)
    birth_year = models.IntegerField(blank=True, null=True)
    gender = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], null=True, blank=True)
    is_student = models.BooleanField(default=False, null=True, blank=True)
    has_logged_in = models.BooleanField(default=False, null=True, blank=True)

    def __str__(self):
        return f'{self.user.username} Profile'




class TagalogQuestion(models.Model):
    QUESTION_TYPES = [
        ('multiple_choice', 'Multiple Choice'),
        ('word_completion', 'Word Completion'),
    ]

    question_text = models.CharField(max_length=255)  
    arabic_word = models.CharField(max_length=100)  
    correct_answer = models.CharField(max_length=100)  
    option_1 = models.CharField(max_length=100)  
    option_2 = models.CharField(max_length=100)  
    option_3 = models.CharField(max_length=100)  
    option_4 = models.CharField(max_length=100)  
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='multiple_choice') 

    def __str__(self):
        return f"{self.question_text} ({self.get_question_type_display()})"


class ArabicQuestion(models.Model):
    QUESTION_TYPES = [
        ('multiple_choice', 'Multiple Choice'),
        ('word_completion', 'Word Completion'),
    ]

    question_text = models.CharField(max_length=255) 
    tagalog_word = models.CharField(max_length=100)  
    correct_answer = models.CharField(max_length=100)  
    option_1 = models.CharField(max_length=100)  
    option_2 = models.CharField(max_length=100)  
    option_3 = models.CharField(max_length=100)  
    option_4 = models.CharField(max_length=100)  
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='multiple_choice')  

    def __str__(self):
        return f"{self.question_text} ({self.get_question_type_display()})                      "


class TranslationHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='translation_history')
    source_text = models.TextField()
    translated_text = models.TextField()
    source_language = models.CharField(max_length=10)
    target_language = models.CharField(max_length=10)
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Translation by {self.user.username} on {self.timestamp}"


class AssessmentAttempt(models.Model):
    TEST_TYPE_CHOICES = [
        ('tagalog', 'Tagalog Test'),
        ('arabic', 'Arabic Test'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assessment_attempts"
    )
    score = models.IntegerField() 
    total_questions = models.IntegerField() 
    date_taken = models.DateTimeField(auto_now_add=True)  
    test_type = models.CharField(
        max_length=20,
        choices=TEST_TYPE_CHOICES,
        default='tagalog'  
    )

    def __str__(self):
        return (
            f"{self.user.username} - Score: {self.score}/{self.total_questions} "
            f"on {self.date_taken} ({self.get_test_type_display()})"
        )
    


class PasswordResetCode(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(default=timezone.now)

    def is_expired(self):
     
        return timezone.now() > self.created_at + timezone.timedelta(minutes=15)