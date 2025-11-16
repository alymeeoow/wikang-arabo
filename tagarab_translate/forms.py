from django import forms
from .models import UserProfile

from .models import TagalogQuestion, ArabicQuestion

class UserProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ['first_name', 'middle_name', 'last_name', 'home_address', 'birth_day', 'birth_month', 'birth_year', 'gender', 'is_student']
        widgets = {
            'birth_day': forms.NumberInput(attrs={'class': 'form-control'}),
            'birth_month': forms.NumberInput(attrs={'class': 'form-control'}),
            'birth_year': forms.NumberInput(attrs={'class': 'form-control'}),
            'gender': forms.Select(choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')]),
            'is_student': forms.Select(choices=[(True, 'Yes'), (False, 'No')]),
        }






class TagalogQuestionForm(forms.ModelForm):
    class Meta:
        model = TagalogQuestion
        fields = ['question_text', 'arabic_word', 'question_type', 
                  'correct_answer', 'option_1', 'option_2', 'option_3', 'option_4']


class ArabicQuestionForm(forms.ModelForm):
    class Meta:
        model = ArabicQuestion
        fields = ['question_text', 'tagalog_word', 'question_type', 
                  'correct_answer', 'option_1', 'option_2', 'option_3', 'option_4']
