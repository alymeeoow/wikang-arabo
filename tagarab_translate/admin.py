from django.contrib import admin

from .models import  UserProfile 
from .models import TagalogQuestion, ArabicQuestion,TranslationHistory,AssessmentAttempt
from .models import PasswordResetCode


admin.site.register(TranslationHistory)


admin.site.register(AssessmentAttempt)


class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'home_address', 'gender', 'is_student', 'has_logged_in')
    search_fields = ('user__username', 'first_name', 'last_name')
    
admin.site.register(UserProfile, UserProfileAdmin)



class TagalogToArabicQuestionAdmin(admin.ModelAdmin):
  
    list_display = ('question_text', 'arabic_word', 'correct_answer', 'question_type')

    list_filter = ('question_type',) 

    search_fields = ('question_text', 'arabic_word', 'correct_answer')
  
    fields = (
        'question_text',
        'question_type', 
        'arabic_word',
        'correct_answer',
        'option_1',
        'option_2',
        'option_3',
        'option_4',
      
    )

admin.site.register(TagalogQuestion, TagalogToArabicQuestionAdmin)


class ArabicToTagalogQuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'tagalog_word', 'correct_answer', 'question_type')
    list_filter = ('question_type',)
    search_fields = ('question_text', 'tagalog_word', 'correct_answer')
    fields = (
        'question_text',
        'question_type',
        'tagalog_word',
        'correct_answer',
        'option_1',
        'option_2',
        'option_3',
        'option_4',
    
    )

admin.site.register(ArabicQuestion, ArabicToTagalogQuestionAdmin)



class PasswordResetCodeAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'created_at', 'is_used')
    search_fields = ('user__username', 'code')
    list_filter = ('is_used', 'created_at')


admin.site.register(PasswordResetCode)