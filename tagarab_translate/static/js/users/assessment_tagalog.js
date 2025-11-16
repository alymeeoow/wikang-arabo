/**
 * Normalizes Tagalog text by converting to lowercase, trimming whitespace,
 * and removing special characters and accents for better text matching
 */
function normalizeTagalogText(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/ñ/g, 'n')
        .replace(/\./g, '')
        .replace(/,/g, '');
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
 * Checks if the current question has a radio button selected
 * Returns true if an answer is selected, false otherwise
 */
function hasAnswerSelected(questionIndex) {
    const currentQuestion = questions[questionIndex];
    const selectedInput = currentQuestion.querySelector('input[type="radio"]:checked');
    return selectedInput !== null;
}

/**
 * Displays a warning modal when user tries to proceed without selecting an answer
 */
function showAnswerWarning() {
    const warningModal = document.getElementById('warningModal');
    const warningMessage = document.getElementById('warningMessage');
    
    warningMessage.textContent = "Please select an answer before proceeding to the next question.";
    warningModal.style.display = 'flex';
}

/**
 * Closes the answer warning modal
 */
function closeWarningModal() {
    const warningModal = document.getElementById('warningModal');
    warningModal.style.display = 'none';
}

// Global variable to track current recognition instance
let currentRecognition = null;
let recognitionTimeout = null;

/**
 * Initializes and starts speech recognition for voice input
 * Handles listening state, speech processing, and matching with available options
 */
function startSpeechRecognition() {
    // Reset any previous recognition first
    resetSpeechRecognition();
    
    // Initialize SpeechRecognition
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    const modal = document.getElementById('voiceModal');
    const timeoutMessage = document.getElementById('timeoutMessage');
    const retryButton = document.getElementById('retryButton');
    const modalMessage = modal.querySelector('#modalMessage');

    // Store current recognition instance
    currentRecognition = recognition;

    recognition.lang = 'fil-PH'; // Set to Filipino
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3; // Get multiple alternatives for better matching
    
    recognition.start();

    // Show modal and reset timeout/retry button visibility
    recognition.onstart = function () {
        console.log("Speech recognition started.");
        modal.style.display = 'flex'; // Show the modal
        modal.style.justifyContent = 'center'; // Center horizontally
        modal.style.alignItems = 'center'; // Center vertically
        
        // Enhanced listening state with your design
        modalMessage.innerHTML = `
            <div class="listening-indicator">
                <div class="pulse-animation"></div>
                <p class="listening-text">Listening... Please speak in Filipino</p>
                <div class="voice-levels">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                </div>
                <p class="transcript-preview" id="transcriptPreview">Your voice input  will appear here...</p>
            </div>
        `;
        
        timeoutMessage.style.display = 'none'; // Hide timeout message
        retryButton.style.display = 'none'; // Hide retry button
    };

    // Handle recognition result with similarity matching
    recognition.onresult = function (event) {
        clearTimeout(recognitionTimeout); // Clear timeout
        const speechResult = event.results[0][0].transcript.trim();
        console.log("Recognized text:", speechResult);

        const normalizedSpeech = normalizeTagalogText(speechResult);
        console.log("Normalized speech:", normalizedSpeech);

        let matched = false;
        let bestMatch = { similarity: 0, input: null };

        // Use similarity matching instead of exact match
        document.querySelectorAll('.options input').forEach(input => {
            const optionText = normalizeTagalogText(input.value);
            const similarity = getSimilarity(normalizedSpeech, optionText);
            console.log(`Comparing "${normalizedSpeech}" with "${optionText}": ${similarity}`);

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
            // Show success state
            modalMessage.innerHTML = `
                <div class="success-state">
                    <div class="success-icon">✓</div>
                    <p class="success-text">Answer captured successfully!</p>
                    <div class="captured-text">"${bestMatch.input.value}"</div>
                </div>
            `;
            setTimeout(() => {
                closeModal(); // Close modal on success
            }, 2000);
        } else {
            console.log("No exact match. Closest match:", bestMatch.input?.value, "Similarity:", bestMatch.similarity);
            
            if (bestMatch.similarity > 0.6) {
                // Show suggestion
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

    // Handle recognition errors
    recognition.onerror = function (event) {
        console.error("Recognition error:", event.error);
        clearTimeout(recognitionTimeout);
        
        if (event.error === 'no-speech') {
            showRetryMessage("No speech detected. Please speak in Filipino.");
        } else if (event.error === 'language-not-supported') {
            showRetryMessage("Filipino language not supported. Trying English...");
            // Fallback to English
            setTimeout(() => {
                recognition.lang = 'en-US';
                retrySpeechRecognition();
            }, 1000);
        } else {
            showRetryMessage("An error occurred. Please try again.");
        }
    };

    // Handle recognition timeout
    recognitionTimeout = setTimeout(() => {
        console.warn("Speech recognition timed out.");
        recognition.stop(); // Stop recognition
        showRetryMessage("Voice recognition timed out. Please try again.");
    }, 10000);

    // Function to handle error or retry message
    function showRetryMessage(errorText) {
        modalMessage.innerHTML = `
            <div class="error-state">
                <div class="error-icon">!</div>
                <p class="error-text">We didn't catch that</p>
                <p class="error-detail">${errorText}</p>
            </div>
        `;
        timeoutMessage.style.display = 'block'; // Show timeout message
        retryButton.style.display = 'block'; // Show retry button
        console.log("Retry message and button displayed.");
    }
}

/**
 * Confirms and selects a suggested answer option
 * @param {string} value - The option value to be selected
 */
function confirmSuggestion(value) {
    // Find and select the matching option
    document.querySelectorAll('.options input').forEach(input => {
        if (normalizeTagalogText(input.value) === normalizeTagalogText(value)) {
            input.checked = true;
            updateSelectionStyles(input.parentElement);
        }
    });
    
    // Show success and close
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
 * Retries speech recognition by resetting the modal and restarting recognition
 */
function retrySpeechRecognition() {
    console.log("Retrying speech recognition...");
    const modal = document.getElementById('voiceModal');
    const timeoutMessage = document.getElementById('timeoutMessage');
    const retryButton = document.getElementById('retryButton');
    const modalMessage = modal.querySelector('#modalMessage');

    // Reset modal content to the default state
    timeoutMessage.style.display = 'none'; // Hide timeout message
    retryButton.style.display = 'none'; // Hide retry button
    
    // Show listening state again
    modalMessage.innerHTML = `
        <div class="listening-indicator">
            <div class="pulse-animation"></div>
            <p class="listening-text">Listening... Please speak in Filipino</p>
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
    modal.style.display = 'none'; // Hide modal
    resetSpeechRecognition(); // Reset recognition when modal is closed
    console.log('Modal closed.');
}

// Your existing navigation and question code remains exactly the same
document.addEventListener("DOMContentLoaded", () => {
    renderQuestion();
});

let actionUrl = '';
let isLogout = false;

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

let currentQuestionIndex = 0; 
const questions = document.querySelectorAll('.question');
const submitButton = document.getElementById('submitButton'); 

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
        backArrow.style.opacity = '0.5'; // Gray out the arrow
        backArrow.style.pointerEvents = 'none'; // Disable click
    } else {
        backArrow.style.opacity = '1';
        backArrow.style.pointerEvents = 'auto'; // Enable click
    }

    // Forward arrow: behaves differently on the last question
    const nextArrow = document.querySelector('.fa-arrow-right');
    if (index === questions.length - 1) {
        nextArrow.style.color = 'green'; // Change color to green
        nextArrow.setAttribute('title', 'Submit'); // Add tooltip
        nextArrow.onclick = () => {
            // Check if last question has answer before submitting
            if (!hasAnswerSelected(currentQuestionIndex)) {
                showAnswerWarning();
                return;
            }
            document.getElementById('assessmentForm').submit();
        };
    } else {
        nextArrow.style.color = 'black'; // Default color
        nextArrow.setAttribute('title', 'Next'); // Reset tooltip
        nextArrow.onclick = goToNextQuestion; // Navigate to the next question
    }

    // Hide the regular submit button for visual consistency
    submitButton.style.display = 'none';
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

// Initialize the first question when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    showQuestion(currentQuestionIndex);
    initializeRowSelection();
});

/**
 * Renders the current question (alias for showQuestion)
 */
function renderQuestion() {
    showQuestion(currentQuestionIndex);
}