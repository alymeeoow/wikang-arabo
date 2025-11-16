"""
Django Views for Tagalog-Arabic Translation Web Application
This file contains all view functions for handling:
- User authentication (login, signup, logout)
- Translation functionality
- Assessment tests
- User profiles
- Admin dashboard
- Password reset
- Dictionary functionality
"""

# Standard library imports
import json
import os
import random
from datetime import datetime, date, timedelta

# Third-party imports
import requests
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db.models import Count, Q, Avg, Sum
from django.db.models.functions import ExtractMonth
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

# Local application imports
from .decorators import admin_required
from .forms import TagalogQuestionForm, ArabicQuestionForm
from .models import (
    UserProfile, 
    AssessmentAttempt, 
    TagalogQuestion, 
    ArabicQuestion,
    TranslationHistory,
    PasswordResetCode
)

# Constants
OXFORD_APP_ID = "21b35e2a"
OXFORD_APP_KEY = "873073c3a43c3cf952c564f43f9364b"

# Paths to JSON files
DICTIONARY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static/js/json/dictionary.json")
AMBIGUOUS_WORDS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static/js/json/tagalog-words.json")
AMBIGUOUS_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static/js/json/ambiguous.json")

###########################
# CSRF & Error Handlers
###########################

def csrf_failure(request, reason=""):
    """Custom CSRF failure view"""
    return render(request, 'errors/csrf_failure.html', {'reason': reason}, status=403)

###########################
# Basic Page Views
###########################

def index(request):
    """Render the homepage"""
    return render(request, 'index/index.html')

def afterlogin(request):
    """Render after-login page"""
    return render(request, 'users/afterlogin.html')

def alphabet(request):
    """Render Arabic alphabet learning page"""
    return render(request, 'users/arabic_tagalog_alphabet.html')

###########################
# Authentication Views
###########################

def user_login(request):
    if request.method == 'POST':
        username_or_email = request.POST.get('username_or_email')
        password = request.POST.get('password')

        user = None
        if '@' in username_or_email:
            try:
                user = User.objects.get(email=username_or_email)
                user = authenticate(request, username=user.username, password=password)
            except User.DoesNotExist:
                pass
        else:
            user = authenticate(request, username=username_or_email, password=password)

        if user is not None:
            auth_login(request, user)
            user.last_login = timezone.now()
            user.save()

       
            user_profile = UserProfile.objects.filter(user=user).first()
            if user_profile is None or not (user_profile.first_name or "").strip():
                return redirect('details') 
            else:
                return redirect('translate')  
        else:
            messages.error(request, "Invalid username/email or password")

    return render(request, 'users/login.html')

def signup(request):
    """Handle new user registration with validation"""
    if request.method == 'POST':
        email = request.POST['email']
        username = request.POST['username']
        password = request.POST['password']
        confirm_password = request.POST['confirm_password']

        # Validation checks
        if password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return render(request, 'users/signup.html')

        if len(password) < 8:
            messages.error(request, "Password must be at least 8 characters long.")
            return render(request, 'users/signup.html')

        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already exists.")
            return render(request, 'users/signup.html')

        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already exists.")
            return render(request, 'users/signup.html')

        try:
            # Create new user
            user = User.objects.create(
                email=email,
                username=username,
                password=make_password(password)
            )
            user.save()

            # Log user in after registration
            auth_login(request, user)
            return redirect('details')

        except ValidationError as e:
            messages.error(request, f"Error: {str(e)}")
            return render(request, 'users/signup.html')

    return render(request, 'users/signup.html')

def user_logout(request):
    """Handle user logout"""
    logout(request)
    return redirect('login')

###########################
# User Profile Views
###########################

@login_required
def details(request):
    """Handle user profile details submission"""
    if not request.user.is_authenticated:
        return redirect('login')

    if request.method == 'POST':
        user_profile, created = UserProfile.objects.get_or_create(user=request.user)

        try:
            has_logged_in = user_profile.has_logged_in

            # Update profile fields from form data
            user_profile.first_name = request.POST.get('first_name', '').strip()
            user_profile.middle_name = request.POST.get('middle_name', '').strip()
            user_profile.last_name = request.POST.get('last_name', '').strip()
            user_profile.home_address = request.POST.get('home_address', '').strip()
            user_profile.birth_day = int(request.POST.get('birth_day', 0))
            user_profile.birth_month = int(request.POST.get('birth_month', 0))
            user_profile.birth_year = int(request.POST.get('birth_year', 0))
            user_profile.gender = request.POST.get('gender', '').strip()
            user_profile.is_student = request.POST.get('is_student') == 'yes'

            # Validate required fields
            if not all([user_profile.first_name, user_profile.last_name, user_profile.home_address]):
                messages.error(request, "Please fill in all required fields.")
                return render(request, 'users/details.html')

            # Save profile
            user_profile.has_logged_in = has_logged_in
            user_profile.save()
            messages.success(request, "Account created successfully!")
            return redirect('login')

        except ValueError:
            messages.error(request, "Invalid data provided. Please check your input.")
            return render(request, 'users/details.html')

    return render(request, 'users/details.html')

@login_required
def profile(request):
    """Display and update user profile information"""
    user = request.user
    try:
        user_profile = UserProfile.objects.get(user=user)
    except UserProfile.DoesNotExist:
        user_profile = None

    if request.method == 'POST':
        # Update profile from form data
        first_name = request.POST.get('firstName')
        middle_name = request.POST.get('middleName')
        last_name = request.POST.get('lastName')
        home_address = request.POST.get('homeAddress')
        gender = request.POST.get('gender')
        birthdate = request.POST.get('birthdate')

        if user_profile:
            user_profile.first_name = first_name
            user_profile.middle_name = middle_name
            user_profile.last_name = last_name
            user_profile.home_address = home_address
            user_profile.gender = gender

            # Parse birthdate if provided
            if birthdate:
                birth_parts = birthdate.split('-')
                user_profile.birth_year = int(birth_parts[0])
                user_profile.birth_month = int(birth_parts[1])
                user_profile.birth_day = int(birth_parts[2])

            user_profile.save()
            messages.success(request, "Profile updated successfully.")
            return redirect('profile')

    # Get assessment results with percentages
    assessment_results = AssessmentAttempt.objects.filter(user=user).order_by('-date_taken')
    for result in assessment_results:
        result.percentage = (result.score / result.total_questions) * 100 if result.total_questions > 0 else 0

    context = {
        'user_profile': user_profile,
        'assessment_results': assessment_results,
    }
    return render(request, 'users/profile.html', context)

###########################
# Translation Views
###########################

@login_required
def translation(request):
    """Handle translation page with tutorial for first-time users"""
    if request.user.is_authenticated:
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            
            # Show tutorial for first-time users
            if not user_profile.has_logged_in and not request.session.get('tutorial_triggered', False):
                request.session['show_tutorial'] = True
                request.session['tutorial_triggered'] = True
            else:
                request.session['show_tutorial'] = False
                
                # Mark as logged in after tutorial
                if request.session.get('tutorial_triggered', False):
                    user_profile.has_logged_in = True
                    user_profile.save()
                    del request.session['tutorial_triggered']

        except UserProfile.DoesNotExist:
            request.session['show_tutorial'] = False
    else:
        request.session['show_tutorial'] = False

    return render(request, 'users/translate.html')

@csrf_exempt
def translate_text(request):
    """Proxy for Google Translate API"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            text = data.get("q", "")
            source_language = data.get("source", "")
            target_language = data.get("target", "")

            # Call Google Translate API
            url = "https://translation.googleapis.com/language/translate/v2"
            api_key = settings.GOOGLE_TRANSLATE_API_KEY

            response = requests.post(
                url,
                json={
                    "q": text,
                    "source": source_language,
                    "target": target_language,
                    "format": "text",
                },
                params={"key": api_key},
            )

            if response.status_code == 200:
                return JsonResponse(response.json(), safe=False)
            else:
                return JsonResponse(
                    {"error": f"Google API returned status {response.status_code}"},
                    status=response.status_code,
                )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=400)




###########################
# Dictionary Views
###########################

@login_required
def dictionary(request):
    """Render dictionary page"""
    return render(request, 'users/dictionary.html')

def fetch_oxford_definition(word, language):
    """Fetch word definition from Oxford Dictionaries API"""
    url = f"https://od-api.oxforddictionaries.com:443/api/v2/entries/{language}/{word.lower()}"
    headers = {
        "app_id": OXFORD_APP_ID,
        "app_key": OXFORD_APP_KEY,
    }

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            # Extract definitions from API response
            definitions = [
                sense["definitions"][0]
                for lexical_entry in data["results"][0]["lexicalEntries"]
                for entry in lexical_entry["entries"]
                for sense in entry["senses"]
                if "definitions" in sense
            ]
            return definitions if definitions else ["Definition not available."]
        else:
            return ["Definition not found."]
    except Exception as e:
        return [f"Error fetching definition: {str(e)}"]

def fetch_definitions_from_json(word):
    """Fetch word definitions from local JSON dictionary"""
    try:
        with open(DICTIONARY_PATH, "r", encoding="utf-8") as file:
            dictionary = json.load(file)
        word_entry = dictionary.get(word.lower())
        if not word_entry:
            return {"error": "Word not found in dictionary."}
        return word_entry
    except Exception as e:
        return {"error": str(e)}


###########################
# Assessment Views
###########################

@login_required
def assesschoose(request):
    """Render assessment type selection page"""
    return render(request, 'users/assesschoose.html')

@login_required
def assessment_tagalog(request):
    """Render Tagalog assessment with 10 randomized questions"""
    questions = TagalogQuestion.objects.all()
    
    # If there are more than 10 questions, get 10 random ones
    if questions.count() > 10:
        questions = questions.order_by('?')[:10]  # Random order and limit to 10
    
    return render(request, 'users/assessment_tagalog.html', {'questions': questions})

@login_required
def assessment_arabic(request):
    """Render Arabic assessment with 10 randomized questions"""
    questions = ArabicQuestion.objects.all()
    
    # If there are more than 10 questions, get 10 random ones
    if questions.count() > 10:
        questions = questions.order_by('?')[:10]  # Random order and limit to 10
    
    return render(request, 'users/assessment_arabic.html', {'questions': questions})

@login_required
def submit_assessment(request):
    """Handle assessment submission and score calculation"""
    if request.method == "POST":
        total_questions = int(request.POST.get("total_questions", 0))
        correct_count = 0
        test_type = "Unknown"

        # Check each answer
        for question_id, answer in request.POST.items():
            if question_id.startswith("answers_"):
                question_id = question_id.split("_")[1]
                try:
                    # Try Tagalog question first
                    question = TagalogQuestion.objects.filter(id=question_id).first()
                    if question:
                        test_type = "Tagalog Test"
                    else:
                        # Try Arabic question if not found
                        question = ArabicQuestion.objects.filter(id=question_id).first()
                        if question:
                            test_type = "Arabic Test"

                    # Check if answer is correct
                    if question and answer.strip().lower() == question.correct_answer.strip().lower():
                        correct_count += 1
                except Exception as e:
                    print(f"Error processing question ID {question_id}: {e}")

        # Calculate score
        percentage = (correct_count / total_questions) * 100 if total_questions > 0 else 0

        # Save attempt
        AssessmentAttempt.objects.create(
            user=request.user,
            score=correct_count,
            total_questions=total_questions,
            test_type=test_type
        )

        # Render results
        return render(request, "users/result.html", {
            "score": correct_count,
            "total_questions": total_questions,
            "test_type": test_type,
            "percentage": round(percentage, 2),
        })
    else:
        return render(request, "error.html", {"message": "Invalid request."})

@login_required
def submit_arabic_to_tagalog_assessment(request):
    """Handle Arabic to Tagalog assessment submission"""
    if request.method == "POST":
        total_questions = int(request.POST.get("total_questions", 0))
        correct_count = 0

        # Check each answer
        for question_id, answer in request.POST.items():
            if question_id.startswith("answers_"):
                question_id = question_id.split("_")[1]
                try:
                    question = ArabicQuestion.objects.filter(id=question_id).first()
                    if question and answer.strip().lower() == question.correct_answer.strip().lower():
                        correct_count += 1
                except Exception as e:
                    print(f"Error processing question ID {question_id}: {e}")

        # Calculate score
        percentage = (correct_count / total_questions) * 100 if total_questions > 0 else 0

        # Save attempt
        AssessmentAttempt.objects.create(
            user=request.user,
            score=correct_count,
            total_questions=total_questions,
            test_type="Arabic Test"
        )

        # Render results
        return render(request, "users/result.html", {
            "score": correct_count,
            "total_questions": total_questions,
            "test_type": "Arabic Test",
            "percentage": round(percentage, 2),
        })
    else:
        return render(request, "error.html", {"message": "Invalid request."})

###########################
# Translation History Views
###########################

@csrf_exempt
def save_translation_history(request):
    """Save translation to user's history"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user = request.user

            # Create history entry
            history = TranslationHistory.objects.create(
                user=user,
                source_text=data.get("source_text"),
                translated_text=data.get("translated_text"),
                source_language=data.get("source_language"),
                target_language=data.get("target_language"),
            )

            return JsonResponse({"status": "success", "message": "Translation saved to history."}, status=201)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "Invalid request method."}, status=400)

def get_translation_history(request):
    """Get user's translation history grouped by date"""
    history = TranslationHistory.objects.filter(user=request.user).order_by('-timestamp')
    grouped_history = {}

    # Group by date
    for h in history:
        date_key = h.timestamp.strftime('%Y-%m-%d')
        if date_key not in grouped_history:
            grouped_history[date_key] = []
        grouped_history[date_key].append({
            "id": h.id,
            "source_text": h.source_text,
            "translated_text": h.translated_text,
            "source_language": h.source_language,
            "target_language": h.target_language,
        })

    return JsonResponse({"history": grouped_history})

@login_required
def delete_translation_history(request, item_id):
    """Delete single translation history item"""
    if request.method == 'POST':
        try:
            history_item = TranslationHistory.objects.get(id=item_id, user=request.user)
            history_item.delete()
            return JsonResponse({'success': True})
        except TranslationHistory.DoesNotExist:
            return JsonResponse({'success': False})
    return JsonResponse({'success': False})

def delete_date_history(request, date):
    """Delete all translations for a specific date"""
    if request.method == "POST":
        try:
            if not request.user.is_authenticated:
                return JsonResponse({"success": False, "message": "Unauthorized access"}, status=403)

            # Delete translations within date range
            translations_deleted = TranslationHistory.objects.filter(
                user=request.user,
                timestamp__date=date
            ).delete()

            return JsonResponse({
                "success": True,
                "message": f"All translations for {date} have been deleted.",
                "deleted_count": translations_deleted[0]
            })

        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)

    return JsonResponse({"success": False, "message": "Invalid request method"}, status=405)

###########################
# Ambiguous Words Views
###########################

def fetch_ambiguous_words(request, word):
    """Fetch ambiguous words from local JSON file"""
    try:
        with open(AMBIGUOUS_WORDS_PATH, "r", encoding="utf-8") as file:
            ambiguous_words = json.load(file)
            word_entry = ambiguous_words.get(word.lower())

            # Format response
            if word_entry:
                if isinstance(word_entry, dict):
                    word_entry = [word_entry]
                elif not isinstance(word_entry, list):
                    return JsonResponse({"error": "Invalid data format for word meanings."}, status=500)

                return JsonResponse({"word": word, "meanings": word_entry})
            else:
                return JsonResponse({"error": "Word not found in ambiguous words list."}, status=404)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Error decoding the JSON file."}, status=500)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def fetch_all_ambiguous_words(request):
    """Fetch all ambiguous words from local JSON file"""
    try:
        with open(AMBIGUOUS_WORDS_PATH, "r", encoding="utf-8") as file:
            ambiguous_words = json.load(file)
        return JsonResponse(ambiguous_words)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def fetch_ambiguous_2(request, word):
    """Fetch ambiguous words from secondary JSON file"""
    try:
        with open(AMBIGUOUS_JSON_PATH, "r", encoding="utf-8") as file:
            ambiguous_words = json.load(file)
            word_entries = ambiguous_words.get(word.lower())

            # Format response
            if word_entries:
                if isinstance(word_entries, dict):
                    word_entries = [word_entries]
                elif not isinstance(word_entries, list):
                    return JsonResponse({"error": "Invalid data format for word meanings."}, status=500)

                formatted_meanings = [
                    {
                        "english": entry.get("english", "N/A"),
                        "arabic": entry.get("arabic", "N/A"),
                    }
                    for entry in word_entries
                ]

                return JsonResponse({"word": word, "meanings": formatted_meanings})
            else:
                return JsonResponse({"error": "Word not found in ambiguous words list."}, status=404)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Error decoding the JSON file."}, status=500)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

###########################
# Password Reset Views
###########################

def send_reset_code(request):
    """Send password reset code to user's email"""
    if request.method == 'POST':
        email = request.POST.get('email')
        try:
            user = User.objects.get(email=email)
            code = str(random.randint(100000, 999999))

            # Delete any existing codes
            PasswordResetCode.objects.filter(user=user).delete()

            # Create new code
            PasswordResetCode.objects.create(user=user, code=code, created_at=timezone.now())

            # Send email
            send_mail(
                'Password Reset Code',
                f'Your password reset code is: {code}',
                'noreply@yourdomain.com',
                [email],
                fail_silently=False,
            )

            messages.success(request, 'A reset code has been sent to your email.')
            return JsonResponse({'success': True})
        except User.DoesNotExist:
            messages.error(request, 'No user found with this email address.')
            return JsonResponse({'error': 'No user found with this email address.'}, status=404)
        except Exception as e:
            messages.error(request, f'Error: {str(e)}')
            return JsonResponse({'error': str(e)}, status=500)

    return render(request, 'users/forgot.html')

def verify_reset_code(request):
    """Verify reset code and update password"""
    if request.method == 'POST':
        email = request.POST.get('email')
        entered_code = request.POST.get('code')
        new_password = request.POST.get('new_password')

        try:
            user = User.objects.get(email=email)
            reset_entry = PasswordResetCode.objects.get(user=user, code=entered_code)

            # Update password
            user.set_password(new_password)
            user.save()

            # Delete used code
            reset_entry.delete()

            messages.success(request, 'Your password has been reset successfully.')
            return redirect('login')
        except User.DoesNotExist:
            messages.error(request, 'User not found.')
        except PasswordResetCode.DoesNotExist:
            messages.error(request, 'Invalid verification code or code expired.')

    return redirect('forgot_password')

def forgot_password(request):
    """Render password reset request page"""
    return render(request, 'users/forgot.html')

###########################
# Admin Views
###########################

def admin_login(request):
    """Handle admin login"""
    if request.method == 'POST':
        username_or_email = request.POST.get('username_or_email')
        password = request.POST.get('password')

        user = authenticate(request, username=username_or_email, password=password)

        if user is not None and user.is_staff:
            login(request, user)
            return redirect('admindashboard')
        else:
            messages.error(request, "Invalid credentials or not authorized.")
            return redirect('adminlogin')
    return render(request, 'admin/admin_login.html')

@admin_required
def admin_logout(request):
    """Handle admin logout"""
    logout(request)
    return redirect('adminlogin')

@admin_required
def admin_dashboard(request):
    """Render admin dashboard with statistics"""
    start_of_today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # User statistics
    total_registered = UserProfile.objects.filter(user__is_superuser=False).count()
    active_today = UserProfile.objects.filter(
        user__last_login__gte=start_of_today,
        user__is_superuser=False
    ).count()
    newly_registered = UserProfile.objects.filter(
        user__date_joined__gte=timezone.now() - timedelta(hours=24),
        user__is_superuser=False
    ).count()
    male_students = UserProfile.objects.filter(gender="male", user__is_superuser=False).count()
    female_students = UserProfile.objects.filter(gender="female", user__is_superuser=False).count()
    total_translations = TranslationHistory.objects.count()

    # Recent users
    recent_users = UserProfile.objects.filter(user__is_superuser=False).order_by("-user__date_joined")[:5]

    # Monthly assessment participation
    monthly_participation = list(
        AssessmentAttempt.objects.filter(date_taken__year=timezone.now().year)
        .annotate(month=ExtractMonth("date_taken"))
        .values("month")
        .annotate(total=Count("id"))
        .order_by("month")
    )
    monthly_participation_formatted = [
        {"month": entry["month"], "total": entry["total"]} for entry in monthly_participation
    ]

    # Gender-based pass/fail stats
    male_pass = AssessmentAttempt.objects.filter(
        user__userprofile__gender="male", user__is_superuser=False, score__gte=10
    ).count()
    male_fail = AssessmentAttempt.objects.filter(
        user__userprofile__gender="male", user__is_superuser=False, score__lt=10
    ).count()
    female_pass = AssessmentAttempt.objects.filter(
        user__userprofile__gender="female", user__is_superuser=False, score__gte=10
    ).count()
    female_fail = AssessmentAttempt.objects.filter(
        user__userprofile__gender="female", user__is_superuser=False, score__lt=10
    ).count()

    # School-based pass/fail stats
    arabic_school_pass = AssessmentAttempt.objects.filter(
        user__userprofile__is_student=True, user__is_superuser=False, score__gte=10
    ).count()
    arabic_school_fail = AssessmentAttempt.objects.filter(
        user__userprofile__is_student=True, user__is_superuser=False, score__lt=10
    ).count()
    non_arabic_school_pass = AssessmentAttempt.objects.filter(
        user__userprofile__is_student=False, user__is_superuser=False, score__gte=10
    ).count()
    non_arabic_school_fail = AssessmentAttempt.objects.filter(
        user__userprofile__is_student=False, user__is_superuser=False, score__lt=10
    ).count()

    context = {
        "monthly_participation_json": json.dumps(monthly_participation_formatted),
        "total_registered": total_registered,
        "active_today": active_today,
        "newly_registered": newly_registered,
        "male_students": male_students,
        "female_students": female_students,
        "total_translations": total_translations,
        "recent_users": recent_users,
        "male_pass": male_pass,
        "male_fail": male_fail,
        "female_pass": female_pass,
        "female_fail": female_fail,
        "arabic_school_pass": arabic_school_pass,
        "arabic_school_fail": arabic_school_fail,
        "non_arabic_school_pass": non_arabic_school_pass,
        "non_arabic_school_fail": non_arabic_school_fail,
    }

    return render(request, "admin/admin_dashboard.html", context)

@admin_required
def admin_student(request):
    """Render admin student management page"""
    start_of_today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # User statistics
    recent_users = UserProfile.objects.filter(user__is_superuser=False).order_by("-user__date_joined")
    total_registered = UserProfile.objects.filter(user__is_superuser=False).count()
    active_today = UserProfile.objects.filter(
        user__last_login__gte=start_of_today,
        user__is_superuser=False
    ).count()
    newly_registered = UserProfile.objects.filter(
        user__date_joined__gte=timezone.now() - timedelta(hours=24),
        user__is_superuser=False
    ).count()
    male_students = UserProfile.objects.filter(gender="male", user__is_superuser=False).count()
    female_students = UserProfile.objects.filter(gender="female", user__is_superuser=False).count()
    total_translations = TranslationHistory.objects.count()

    # Format birthdays
    for user in recent_users:
        try:
            if user.birth_year is None or user.birth_month is None or user.birth_day is None:
                user.formatted_birthday = "Invalid Date"
            else:
                birthday = date(user.birth_year, user.birth_month, user.birth_day)
                user.formatted_birthday = birthday.strftime("%B-%d-%Y")
        except (AttributeError, ValueError):
            user.formatted_birthday = "Invalid Date"

    context = {
        "total_registered": total_registered,
        "active_today": active_today,
        "newly_registered": newly_registered,
        "male_students": male_students,
        "female_students": female_students,
        "total_translations": total_translations,
        "recent_users": recent_users,
    }
    return render(request, 'admin/admin_student.html', context)

@admin_required
def admin_score(request):
    """Render admin score management page"""
    start_of_today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # User statistics
    recent_users = UserProfile.objects.filter(user__is_superuser=False).order_by("-user__date_joined")
    total_registered = UserProfile.objects.filter(user__is_superuser=False).count()
    active_today = UserProfile.objects.filter(
        user__last_login__gte=start_of_today,
        user__is_superuser=False
    ).count()
    newly_registered = UserProfile.objects.filter(
        user__date_joined__gte=timezone.now() - timedelta(hours=24),
        user__is_superuser=False
    ).count()
    male_students = UserProfile.objects.filter(gender="male", user__is_superuser=False).count()
    female_students = UserProfile.objects.filter(gender="female", user__is_superuser=False).count()
    total_translations = TranslationHistory.objects.count()

    # Users with assessments
    users_with_assessments = UserProfile.objects.filter(
        user__is_superuser=False,
        user__assessment_attempts__isnull=False
    ).select_related('user').prefetch_related('user__assessment_attempts').distinct().order_by(
        'user__first_name', 'user__last_name'
    )

    # Calculate scores
    for user in users_with_assessments:
        assessments = user.user.assessment_attempts.all()
        user.assessments = assessments
        user.total_attempts = assessments.count()

        if user.total_attempts > 0:
            total_score = sum([assessment.score for assessment in assessments])
            total_questions = sum([assessment.total_questions for assessment in assessments])
            user.average_score = round(total_score / total_questions * 100, 2) if total_questions > 0 else 0
        else:
            user.average_score = 0

    # Sort users
    users_with_assessments = sorted(
        users_with_assessments,
        key=lambda u: (u.user.first_name.lower(), u.user.last_name.lower())
    )

    context = {
        'users_with_assessments': users_with_assessments,
        "total_registered": total_registered,
        "active_today": active_today,
        "newly_registered": newly_registered,
        "male_students": male_students,
        "female_students": female_students,
        "total_translations": total_translations,
        "recent_users": recent_users,
    }
    return render(request, 'admin/admin_score.html', context)

@admin_required
def admin_view_user_test(request, user_id):
    """View individual user's test results"""
    # Get user profile
    user_profile = get_object_or_404(
        UserProfile.objects.select_related('user'),
        user_id=user_id,
        user__is_superuser=False
    )

    # Get assessments with pass/fail status
    user_assessments = user_profile.user.assessment_attempts.all().order_by('-date_taken')
    for assessment in user_assessments:
        assessment.result = "Pass" if assessment.score >= (0.5 * assessment.total_questions) else "Fail"

    # Statistics
    start_of_today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    last_24_hours = timezone.now() - timedelta(hours=24)

    total_registered = UserProfile.objects.filter(user__is_superuser=False).count()
    active_today = UserProfile.objects.filter(
        user__last_login__gte=start_of_today,
        user__is_superuser=False
    ).count()
    newly_registered = UserProfile.objects.filter(
        user__date_joined__gte=last_24_hours,
        user__is_superuser=False
    ).count()
    male_students = UserProfile.objects.filter(gender="male", user__is_superuser=False).count()
    female_students = UserProfile.objects.filter(gender="female", user__is_superuser=False).count()
    total_translations = TranslationHistory.objects.count()

    context = {
        'user_profile': user_profile,
        'user_assessments': user_assessments,
        'total_registered': total_registered,
        'active_today': active_today,
        'newly_registered': newly_registered,
        'male_students': male_students,
        'female_students': female_students,
        'total_translations': total_translations,
    }
    return render(request, 'admin/admin_view_user_test.html', context)

@admin_required
def questions_view(request):
    """Manage assessment questions (Tagalog and Arabic)"""
    start_of_today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Statistics
    recent_users = UserProfile.objects.filter(user__is_superuser=False).order_by("-user__date_joined")
    total_registered = UserProfile.objects.filter(user__is_superuser=False).count()
    active_today = UserProfile.objects.filter(
        user__last_login__gte=start_of_today,
        user__is_superuser=False
    ).count()
    newly_registered = UserProfile.objects.filter(
        user__date_joined__gte=timezone.now() - timedelta(hours=24),
        user__is_superuser=False
    ).count()
    male_students = UserProfile.objects.filter(gender="male", user__is_superuser=False).count()
    female_students = UserProfile.objects.filter(gender="female", user__is_superuser=False).count()
    total_translations = TranslationHistory.objects.count()

    # Format birthdays
    for user in recent_users:
        try:
            if user.birth_year is None or user.birth_month is None or user.birth_day is None:
                user.formatted_birthday = "Invalid Date"
            else:
                birthday = date(user.birth_year, user.birth_month, user.birth_day)
                user.formatted_birthday = birthday.strftime("%B-%d-%Y")
        except (AttributeError, ValueError):
            user.formatted_birthday = "Invalid Date"

    context = {
        "total_registered": total_registered,
        "active_today": active_today,
        "newly_registered": newly_registered,
        "male_students": male_students,
        "female_students": female_students,
        "total_translations": total_translations,
        "recent_users": recent_users,
    }

    # Determine question type
    question_type = request.GET.get("type", "tagalog").lower()
    if question_type == "arabic":
        form_class = ArabicQuestionForm
        model_class = ArabicQuestion
        title = "Arabic Questions"
    else:
        form_class = TagalogQuestionForm
        model_class = TagalogQuestion
        title = "Tagalog Questions"

    # Handle form submission
    if request.method == "POST":
        form = form_class(request.POST)
        if form.is_valid():
            form.save()
            return redirect(f"{request.path}?type={question_type}")
    else:
        form = form_class()

    # Get questions
    questions = model_class.objects.all()

    return render(request, "admin/admin_add_questions.html", {
        "form": form,
        "questions": questions,
        "title": title,
        "question_type": question_type,
        **context,
    })

###########################
# AJAX Question Management
###########################

def add_questions_ajax(request):
    """Handle bulk question addition via AJAX"""
    if request.method == "POST":
        questions = []

        # Parse question data from POST
        i = 0
        while f"questions[{i}][model]" in request.POST:
            question_data = {
                "model": request.POST.get(f"questions[{i}][model]"),
                "question_type": request.POST.get(f"questions[{i}][question_type]"),
                "text": request.POST.get(f"questions[{i}][text]"),
                "correct_answer": request.POST.get(f"questions[{i}][correct_answer]"),
                "option_1": request.POST.get(f"questions[{i}][option_1]"),
                "option_2": request.POST.get(f"questions[{i}][option_2]"),
                "option_3": request.POST.get(f"questions[{i}][option_3]"),
                "option_4": request.POST.get(f"questions[{i}][option_4]"),
            }
            questions.append(question_data)
            i += 1

        # Save questions to appropriate model
        for question in questions:
            if question["model"] == "TagalogQuestion":
                TagalogQuestion.objects.create(
                    question_text=question["text"],
                    correct_answer=question["correct_answer"],
                    option_1=question["option_1"],
                    option_2=question["option_2"],
                    option_3=question["option_3"],
                    option_4=question["option_4"],
                    question_type=question["question_type"],
                )
            elif question["model"] == "ArabicQuestion":
                ArabicQuestion.objects.create(
                    question_text=question["text"],
                    correct_answer=question["correct_answer"],
                    option_1=question["option_1"],
                    option_2=question["option_2"],
                    option_3=question["option_3"],
                    option_4=question["option_4"],
                    question_type=question["question_type"],
                )

        return JsonResponse({"success": True, "message": "Questions added successfully."})
    return JsonResponse({"success": False, "message": "Invalid request method."}, status=400)

def edit_questions_ajax(request):
    """Handle question editing via AJAX"""
    if request.method == 'POST':
        question_id = request.POST.get('question_id')
        text = request.POST.get('text')
        correct_answer = request.POST.get('correct_answer')
        option_1 = request.POST.get('option_1')
        option_2 = request.POST.get('option_2')
        option_3 = request.POST.get('option_3')
        option_4 = request.POST.get('option_4')

        try:
            question = None
            # Try Tagalog question first
            try:
                question = TagalogQuestion.objects.get(id=question_id)
            except TagalogQuestion.DoesNotExist:
                pass

            # Try Arabic question if not found
            if question is None:
                try:
                    question = ArabicQuestion.objects.get(id=question_id)
                except ArabicQuestion.DoesNotExist:
                    return JsonResponse({'success': False, 'error': 'Question not found'})

            # Update question
            question.question_text = text
            question.correct_answer = correct_answer
            question.option_1 = option_1
            question.option_2 = option_2
            question.option_3 = option_3
            question.option_4 = option_4
            question.save()

            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
def delete_questions_ajax(request):
    """Handle question deletion via AJAX"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            question_id = data.get("question_id")
            if not question_id:
                return JsonResponse({"success": False, "error": "Question ID is missing"})

            # Try to find question in either model
            try:
                question = TagalogQuestion.objects.get(id=question_id)
            except TagalogQuestion.DoesNotExist:
                try:
                    question = ArabicQuestion.objects.get(id=question_id)
                except ArabicQuestion.DoesNotExist:
                    return JsonResponse({"success": False, "error": "Question not found"})

            # Delete question
            question.delete()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

    return JsonResponse({"success": False, "error": "Invalid request method"})