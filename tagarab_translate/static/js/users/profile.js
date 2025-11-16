function enableEditing() {
  const inputs = document.querySelectorAll('#profileForm input, #profileForm select');
  const birthdateDisplay = document.getElementById('birthdateDisplay');
  const birthdateInput = document.getElementById('birthdate');
  const cancelBtn = document.getElementById('cancelBtn');


  if (birthdateDisplay.value) {
    const parts = birthdateDisplay.value.split('-');
    const month = parts[0];
    const day = parts[1];
    const year = parts[2];

 
    const monthNumber = new Date(Date.parse(`${month} 1, 2021`)).getMonth() + 1;

   
    birthdateInput.value = `${year}-${monthNumber.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
  }


  inputs.forEach(input => {
    input.removeAttribute('readonly');
    input.removeAttribute('disabled');
  });


  document.getElementById('editBtn').style.display = 'none';
  document.getElementById('saveBtn').style.display = 'block';
  cancelBtn.style.display = 'block'; 


  birthdateDisplay.style.display = 'none';
  birthdateInput.style.display = 'block';
}

function closeModal() {
  const modal = document.getElementById('myModal');
  modal.style.display = 'none';
}

function saveProfile(event) {
  event.preventDefault();

  const birthdateInput = document.getElementById('birthdate');
  const birthdateDisplay = document.getElementById('birthdateDisplay');

  if (birthdateInput.style.display !== 'none' && birthdateInput.value) {
      const dateParts = birthdateInput.value.split('-');
      const formattedDate = `${dateParts[1]}-${dateParts[2]}-${dateParts[0]}`;
      birthdateDisplay.value = formattedDate;
  }

  const form = document.getElementById('profileForm');
  form.submit();
}
function cancelEditing() {
  const inputs = document.querySelectorAll('#profileForm input, #profileForm select');
  const birthdateDisplay = document.getElementById('birthdateDisplay');
  const birthdateInput = document.getElementById('birthdate');
  const cancelBtn = document.getElementById('cancelBtn');

  inputs.forEach(input => {
      input.setAttribute('readonly', 'readonly');
      input.setAttribute('disabled', 'disabled');
  });

  document.getElementById('editBtn').style.display = 'block';
  document.getElementById('saveBtn').style.display = 'none';
  cancelBtn.style.display = 'none'; 

  birthdateInput.style.display = 'none';
  birthdateDisplay.style.display = 'block';
}

document.addEventListener("DOMContentLoaded", function () {
  const cancelBtn = document.createElement('button');
  cancelBtn.id = 'cancelBtn';
  cancelBtn.classList.add('edit-button'); 
  cancelBtn.textContent = 'Cancel';
  cancelBtn.type = 'button';
  cancelBtn.style.display = 'none'; 
  cancelBtn.onclick = cancelEditing;

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.insertAdjacentElement('afterend', cancelBtn);
});
