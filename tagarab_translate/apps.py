from django.apps import AppConfig


class TagarabTranslateConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tagarab_translate'




class TagarabTranslateConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tagarab_translate'

    def ready(self):
        # Import the signals to ensure they are loaded
        import tagarab_translate.signals
