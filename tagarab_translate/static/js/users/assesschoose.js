let selectedAssessment = '';

function showConfirmationModal(assessment) {
    selectedAssessment = assessment; 
    document.getElementById('modalText').innerText = 'Are you sure you want to take the ' + assessment + ' assessment?';
    document.getElementById('confirmationModal').style.display = 'block'; 
}



function closeModal() {
    document.getElementById('confirmationModal').style.display = 'none'; 
}
