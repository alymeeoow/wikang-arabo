"""
URL configuration for tagarab project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from tagarab_translate import views
urlpatterns = [
    
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    path('login', views.user_login, name='login'),
    path('signup', views.signup, name='signup'),
    path('afterlogin', views.afterlogin, name='afterlogin'),
    path('details', views.details, name='details'),
    path('translate', views.translation, name='translate'),

    path('logout', views.user_logout, name='logout'),
    path('dictionary', views.dictionary, name='dictionary'),
    path('assesschoose', views.assesschoose, name= 'assesschoose'),
    path('profile', views.profile, name= 'profile'),
    path('assessment_tagalog', views.assessment_tagalog, name= 'assessment_tagalog'),
    path('submit_assessment', views.submit_assessment, name= 'submit_assessment'),
    path('assessment_arabic', views.assessment_arabic, name= 'assessment_arabic'),
    path("api_translate/", views.translate_text, name="api_translate"),
    path('send_reset_code', views.send_reset_code, name='send_reset_code'),
    path('verify_reset_code', views.verify_reset_code, name='verify_reset_code'),
    path('forgot_password', views.forgot_password, name='forgot_password'),
    path("save_translation_history", views.save_translation_history, name="save_translation_history"),
    path('get_translation_history/', views.get_translation_history, name='get_translation_history'),
    path('delete_translation_history/<int:item_id>/', views.delete_translation_history, name='delete_translation_history'),
    path("delete_date_history/<str:date>/", views.delete_date_history, name="delete_date_history"),
    path('submit-arabic-to-tagalog/', views.submit_arabic_to_tagalog_assessment, name='submit_arabic_to_tagalog'),
    path('fetch_ambiguous/<str:word>/', views.fetch_ambiguous_words, name='fetch_ambiguous_words'),
    path('fetch_ambiguous/', views.fetch_all_ambiguous_words, name='fetch_all_ambiguous_words'),
    path('fetch_ambiguous_2/<str:word>/', views.fetch_ambiguous_2, name='fetch_ambiguous_2'),
    path('arabic_alphabet/', views.alphabet, name='arabic_alphabet'),
    
     
    # ADMIN
    path('adminlogin', views.admin_login, name= 'adminlogin'),
    path('admindashboard', views.admin_dashboard, name= 'admindashboard'),
    path('adminstudent', views.admin_student, name= 'adminstudent'),
    path('adminscore', views.admin_score, name= 'adminscore'),
    path('admin_logout', views.admin_logout, name= 'admin_logout'),
    path('add_questions', views.questions_view, name='add_questions'),
    path('view_user_tests/<int:user_id>/', views.admin_view_user_test, name='view_user_tests'),
    path('add_questions/', views.add_questions_ajax, name='add_questions_ajax'),
    path('edit_questions/', views.edit_questions_ajax, name='edit_questions_ajax'),
    path('delete_questions/', views.delete_questions_ajax, name='delete_questions_ajax'),
    


    
]+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)