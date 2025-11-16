document.getElementById('show').addEventListener('change', function () {
    const passwordField = document.getElementById('password');
    passwordField.type = this.checked ? 'text' : 'password';
  });


  function redirect2() {
    window.location.href = "{% url 'signup' %}";
  }


  function redirect() {
    window.location.href = "{% url 'forgot_password' %}";
  }



  function backToHome() {
    window.location.href = "{% url 'index' %}";
  }

   document.addEventListener('DOMContentLoaded', function () {
    const successMessages = document.querySelectorAll('.success-message .message-text');
    const errorMessages = document.querySelectorAll('.error-message .message-text');

    if (successMessages.length > 0) {
      document.getElementById('successMessage').style.display = 'block';
    }

    if (errorMessages.length > 0) {
      document.getElementById('errorMessage').style.display = 'block';
    }
  });