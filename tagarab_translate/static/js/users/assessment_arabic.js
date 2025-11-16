// Global variables
let currentQuestionIndex = 0;
let currentRecognition = null;
let recognitionTimeout = null;
let actionUrl = '';
let isLogout = false;
const questions = document.querySelectorAll('.question');
const submitButton = document.getElementById('submitButton');

/**
 * Normalizes Arabic text by removing diacritics and standardizing character variations
 * for better text matching and comparison
 */
function normalizeArabicText(text) {
    return text
        .replace(/[\u064B-\u065F]/g, '') // Remove Arabic diacritics
        .replace(/أ|إ|آ/g, 'ا') // Standardize Alef variations
        .replace(/ة/g, 'ه') // Convert Ta Marbuta to Ha
        .replace(/ئ|ي/g, 'ى') // Standardize Ya and Hamza variations
        .replace(/ؤ/g, 'و'); // Convert Waw with Hamza to Waw
}

/**
 * Calculates similarity between two strings using Levenshtein distance algorithm
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function getSimilarity(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    const distance = dp[m][n];
    return 1 - distance / Math.max(m, n);
}

/**
 * Initialize row selection for all option items
 */
function initializeRowSelection() {
    // Remove any existing click listeners by cloning nodes
    document.querySelectorAll('.options li').forEach(li => {
        li.replaceWith(li.cloneNode(true));
    });

    // Add click event listeners to all option list items
    document.querySelectorAll('.options li').forEach(li => {
        li.addEventListener('click', function(e) {
            // Don't trigger if clicking directly on the radio input
            if (e.target.type !== 'radio') {
                const radioInput = this.querySelector('input[type="radio"]');
                if (radioInput) {
                    radioInput.checked = true;
                    updateSelectionStyles(this);
                }
            }
        });
    });

    // Also handle direct radio input changes
    document.querySelectorAll('.options input[type="radio"]').forEach(input => {
        input.addEventListener('change', function() {
            if (this.checked) {
                updateSelectionStyles(this.parentElement);
            }
        });
    });
}

/**
 * Update visual styles when an option is selected
 * @param {Element} selectedLi - The selected list item element
 */
function updateSelectionStyles(selectedLi) {
    // Remove selected class from all options in the same question
    const allOptions = selectedLi.closest('.options').querySelectorAll('li');
    allOptions.forEach(li => {
        li.classList.remove('selected');
    });
    
    // Add selected class to the chosen option
    selectedLi.classList.add('selected');
    
    console.log("Option selected:", selectedLi.querySelector('input[type="radio"]').value);
}

/**
 * Displays the specified question and updates navigation controls
 * @param {number} index - The index of the question to display
 */
function showQuestion(index) {
    // Hide all questions except the current one
    questions.forEach((question, i) => {
        question.style.display = i === index ? 'block' : 'none';
    });

    // Initialize row selection for the current question
    setTimeout(() => {
        initializeRowSelection();
        
        // Clear any existing selections for the current question
        const currentOptions = questions[index].querySelectorAll('.options li');
        currentOptions.forEach(li => {
            li.classList.remove('selected');
        });
        
        // If there's a pre-selected option, highlight it
        const selectedInput = questions[index].querySelector('input[type="radio"]:checked');
        if (selectedInput) {
            updateSelectionStyles(selectedInput.parentElement);
        }
    }, 0);

    // Back arrow: always visible but disabled on the first question
    const backArrow = document.querySelector('.fa-arrow-left');
    if (index === 0) {
        backArrow.style.opacity = '0.5'; 
        backArrow.style.pointerEvents = 'none'; 
    } else {
        backArrow.style.opacity = '1';
        backArrow.style.pointerEvents = 'auto'; 
    }

    // Forward arrow: behaves differently on the last question
    const nextArrow = document.querySelector('.fa-arrow-right');
    if (index === questions.length - 1) {
        nextArrow.style.color = 'green'; 
        nextArrow.setAttribute('title', 'Submit'); 
        nextArrow.onclick = () => {
            // Check if last question has answer before submitting
            if (!hasAnswerSelected(currentQuestionIndex)) {
                showAnswerWarning();
                return;
            }
            document.getElementById('assessmentForm').submit();
        };
    } else {
        nextArrow.style.color = 'black'; 
        nextArrow.setAttribute('title', 'Next'); 
        nextArrow.onclick = goToNextQuestion; 
    }

    // Hide the regular submit button for visual consistency
    if (submitButton) {
        submitButton.style.display = 'none';
    }
}

/**
 * Navigates to the next question after validating current answer
 */
function goToNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        // Check if current question has an answer selected
        if (!hasAnswerSelected(currentQuestionIndex)) {
            showAnswerWarning();
            return; // Stop navigation
        }
        
        currentQuestionIndex++;
        showQuestion(currentQuestionIndex);
    }
}

/**
 * Navigates to the previous question
 */
function goToPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion(currentQuestionIndex);
    }
}

/**
 * Renders the current question (alias for showQuestion)
 */
function renderQuestion() {
    showQuestion(currentQuestionIndex);
}

// Check if current question has an answer selected
function hasAnswerSelected(questionIndex) {
    const currentQuestion = questions[questionIndex];
    const selectedInput = currentQuestion.querySelector('input[type="radio"]:checked');
    return selectedInput !== null;
}

// Show warning modal if no answer is selected
function showAnswerWarning() {
    const warningModal = document.getElementById('warningModal');
    const warningMessage = document.getElementById('warningMessage');
    
    if (warningModal && warningMessage) {
        warningMessage.textContent = "Please select an answer before proceeding to the next question.";
        warningModal.style.display = 'flex';
    }
}

function closeWarningModal() {
    const warningModal = document.getElementById('warningModal');
    if (warningModal) {
        warningModal.style.display = 'none';
    }
}

/**
 * Initializes and starts Arabic speech recognition for voice input
 * Handles listening state, speech processing, and matching with available options
 */
function startSpeechRecognition() {
    // Reset any previous recognition first
    resetSpeechRecognition();
    
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    const modal = document.getElementById('voiceModal');
    const timeoutMessage = document.getElementById('timeoutMessage');
    const retryButton = document.getElementById('retryButton');
    const modalMessage = modal.querySelector('#modalMessage');

    // Store current recognition instance
    currentRecognition = recognition;

    recognition.lang = 'ar'; // Set to Arabic
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3; // Get multiple alternatives for better matching
    
    recognition.start();

    recognition.onstart = function () {
        console.log("Arabic speech recognition started.");
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        
        // Enhanced listening state with English messages
        modalMessage.innerHTML = `
            <div class="listening-indicator">
                <div class="pulse-animation"></div>
                <p class="listening-text">Listening... Please speak in Arabic</p>
                <div class="voice-levels">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                </div>
                <p class="transcript-preview" id="transcriptPreview">Your voice input will appear here...</p>
            </div>
        `;
        
        timeoutMessage.style.display = 'none';
        retryButton.style.display = 'none';
    };

    recognition.onresult = function (event) {
        clearTimeout(recognitionTimeout);
        const speechResult = normalizeArabicText(event.results[0][0].transcript.trim());
        console.log("Recognized Arabic text:", speechResult);

        let matched = false;
        let bestMatch = { similarity: 0, input: null };

        // Use similarity matching instead of exact match
        document.querySelectorAll('.options input').forEach(input => {
            const optionText = normalizeArabicText(input.value);
            const similarity = getSimilarity(speechResult, optionText);
            console.log(`Comparing "${speechResult}" with "${optionText}": ${similarity}`);

            if (similarity > bestMatch.similarity) {
                bestMatch = { similarity, input };
            }

            if (similarity >= 0.8) { 
                input.checked = true;
                updateSelectionStyles(input.parentElement);
                matched = true;
                console.log("Exact match found!");
            }
        });

        if (matched) {
            // Show success state in English
            modalMessage.innerHTML = `
                <div class="success-state">
                    <div class="success-icon">✓</div>
                    <p class="success-text">Answer captured successfully!</p>
                    <div class="captured-text">"${bestMatch.input.value}"</div>
                </div>
            `;
            setTimeout(() => {
                closeModal();
            }, 2000);
        } else {
            console.log("No exact match. Closest match:", bestMatch.input?.value, "Similarity:", bestMatch.similarity);
            
            if (bestMatch.similarity > 0.6) {
                // Show suggestion in English
                modalMessage.innerHTML = `
                    <div class="suggestion-state">
                        <div class="suggestion-icon">?</div>
                        <p class="suggestion-text">Did you mean:</p>
                        <div class="suggested-option">"${bestMatch.input.value}"</div>
                        <div class="suggestion-buttons">
                            <button class="btn btn-primary" onclick="confirmSuggestion('${bestMatch.input.value}')">Yes, select this</button>
                            <button class="btn btn-secondary" onclick="retrySpeechRecognition()">No, try again</button>
                        </div>
                    </div>
                `;
            } else {
                showRetryMessage("No matching answer found. Please try speaking more clearly.");
            }
        }
    };

    recognition.onerror = function (event) {
        console.error("Arabic recognition error:", event.error);
        clearTimeout(recognitionTimeout);
        
        if (event.error === 'no-speech') {
            showRetryMessage("No speech detected. Please speak in Arabic.");
        } else if (event.error === 'language-not-supported') {
            showRetryMessage("Arabic language not supported. Trying English...");
            // Fallback to English
            setTimeout(() => {
                recognition.lang = 'en-US';
                retrySpeechRecognition();
            }, 1000);
        } else {
            showRetryMessage("An error occurred. Please try again.");
        }
    };

    recognitionTimeout = setTimeout(() => {
        console.warn("Arabic speech recognition timed out.");
        recognition.stop();
        showRetryMessage("Voice recognition timed out. Please try again.");
    }, 10000);

    function showRetryMessage(errorText) {
        modalMessage.innerHTML = `
            <div class="error-state">
                <div class="error-icon">!</div>
                <p class="error-text">We didn't catch that</p>
                <p class="error-detail">${errorText}</p>
            </div>
        `;
        timeoutMessage.style.display = 'block';
        retryButton.style.display = 'block';
        console.log("Retry message displayed.");
    }
}

/**
 * Confirms and selects a suggested answer option with row highlighting
 * @param {string} value - The option value to be selected
 */
function confirmSuggestion(value) {
    // Find and select the matching option
    document.querySelectorAll('.options input').forEach(input => {
        if (normalizeArabicText(input.value) === normalizeArabicText(value)) {
            input.checked = true;
            updateSelectionStyles(input.parentElement);
        }
    });
    
    // Show success and close in English
    const modalMessage = document.querySelector('#voiceModal #modalMessage');
    modalMessage.innerHTML = `
        <div class="success-state">
            <div class="success-icon">✓</div>
            <p class="success-text">Answer selected!</p>
            <div class="captured-text">"${value}"</div>
        </div>
    `;
    
    setTimeout(() => {
        closeModal();
    }, 1000);
}

/**
 * Retries Arabic speech recognition by resetting the modal and restarting recognition
 */
function retrySpeechRecognition() {
    console.log("Retrying Arabic speech recognition...");
    const modal = document.getElementById('voiceModal');
    const timeoutMessage = document.getElementById('timeoutMessage');
    const retryButton = document.getElementById('retryButton');
    const modalMessage = modal.querySelector('#modalMessage');

    // Reset modal content to the default state
    timeoutMessage.style.display = 'none';
    retryButton.style.display = 'none';
    
    // Show listening state again in English
    modalMessage.innerHTML = `
        <div class="listening-indicator">
            <div class="pulse-animation"></div>
            <p class="listening-text">Listening... Please speak in Arabic</p>
            <div class="voice-levels">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
            </div>
            <p class="transcript-preview" id="transcriptPreview">Your speech will appear here...</p>
        </div>
    `;

    // Restart speech recognition
    startSpeechRecognition();
}

/**
 * Properly resets speech recognition by stopping current instance and clearing timeout
 */
function resetSpeechRecognition() {
    if (currentRecognition) {
        try {
            currentRecognition.stop();
            currentRecognition = null;
        } catch (e) {
            console.log("Recognition already stopped or couldn't be stopped");
        }
    }
    if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
        recognitionTimeout = null;
    }
}

/**
 * Closes the voice modal and resets speech recognition
 */
function closeModal() {
    const modal = document.getElementById('voiceModal');
    modal.style.display = 'none';
    resetSpeechRecognition(); // Reset recognition when modal is closed
    console.log('Modal closed.');
}

/**
 * Shows confirmation modal for navigation with custom message
 * @param {Event} event - The click event from navigation link
 */
function confirmNavigation(event) {
    event.preventDefault();
    actionUrl = event.currentTarget.getAttribute('data-url'); 
    document.getElementById('modalMessage').innerText = 'Are you sure you want to go to ' + actionUrl + '?';
    document.getElementById('confirmationModal').style.display = 'flex';
}

/**
 * Shows confirmation modal for logout action
 * @param {Event} event - The click event from logout button
 */
function confirmLogout(event) {
    event.preventDefault();
    isLogout = true; 
    document.getElementById('modalMessage').innerText = 'Are you sure you want to log out?';
    document.getElementById('confirmationModal').style.display = 'flex';
}

/**
 * Handles the confirmation action for navigation or logout
 */
document.getElementById('confirmButton').onclick = function() {
    closeConfirmationModal();
    if (isLogout) {
        document.getElementById('logoutForm').submit();
    } else {
        window.location.href = actionUrl; 
    }
}

/**
 * Closes the confirmation modal and resets navigation state
 */
function closeConfirmationModal() {
    document.getElementById('confirmationModal').style.display = 'none';
    isLogout = false; 
}

// Toggle navigation for mobile
function toggleNav() {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        navbar.classList.toggle('show');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize row selection and show first question
    initializeRowSelection();
    showQuestion(currentQuestionIndex);
    

    
   
   
});