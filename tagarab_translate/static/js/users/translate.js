// Speech Recognition Variables
let recognitionTimeout;
let processingTimeout;
let finalTranscript = "";
let isListening = false;
let silenceTimer;
let recognition;
let timerInterval;
let processingSeconds = 3;
let currentTimerSeconds = 3;
let isUserInitiatedSpeech = false;

// Language Selection Handlers
document.getElementById("sourceLang").addEventListener("change", updateTargetLang);
document.getElementById("targetLang").addEventListener("change", updateSourceLang);

function updateTargetLang() {
    const sourceLang = document.getElementById("sourceLang").value;
    const targetLang = document.getElementById("targetLang");
    if (sourceLang === "tl") {
        targetLang.value = "ar";
    } else if (sourceLang === "ar") {
        targetLang.value = "tl";
    }
}

function updateSourceLang() {
    const targetLang = document.getElementById("targetLang").value;
    const sourceLang = document.getElementById("sourceLang");
    if (targetLang === "tl") {
        sourceLang.value = "ar";
    } else if (targetLang === "ar") {
        sourceLang.value = "tl";
    }
}

const synonymDictionary = {}; 

// Translation Functions
async function translateText(saveToHistory = true) {
    const inputText = document.getElementById("inputText").value.trim();

    let sourceLang, targetLang, introPhrase, introVoiceLang, translationVoiceLang;
    if (translationMode === 'tl-ar') {
        sourceLang = 'tl';  
        targetLang = 'ar';  
        introPhrase = "Ang pagsasalin para sa salitang ito ay";  
        introVoiceLang = "Filipino Female";  
        translationVoiceLang = "Arabic Male";  
    } else if (translationMode === 'ar-tl') {
        sourceLang = 'ar';  
        targetLang = 'tl'; 
        introPhrase = "الترجمة لهذه الكلمة هي"; 
        introVoiceLang = "Arabic Male";  
        translationVoiceLang = "Filipino Female"; 
    }

    if (!inputText) {
        document.getElementById("outputText").value = "Please enter text to translate.";
        return;
    }

    try {
        const translatedText = await fetchTranslation(inputText, sourceLang, targetLang);
        const alternatives = await fetchEnglishAlternatives(inputText, sourceLang);

        document.getElementById("outputText").value = translatedText;
        document.getElementById("outputText2").value = alternatives.length > 0 
            ? alternatives.join("\n") 
            : "No English alternatives available";

        if (saveToHistory) {
            await saveTranslationToHistory(inputText, translatedText, sourceLang, targetLang);
        }

        speakIntroAndTranslation(introPhrase, introVoiceLang, translatedText, translationVoiceLang);

    } catch (error) {
        console.error("Translation error:", error);
        document.getElementById("outputText").value = "Translation failed, please try again.";
    }
}

// Language Detection
document.getElementById("inputText").addEventListener("input", autoDetectLanguage);

function autoDetectLanguage() {
    const inputText = document.getElementById("inputText").value.trim();
    const arabicPattern = /[\u0600-\u06FF]/; 
    const tagalogPattern = /^[a-zA-ZñÑ\s]+$/; 
    const sourceLangElement = document.getElementById("sourceLang");
    const targetLangElement = document.getElementById("targetLang");
    const translationModeElement = document.getElementById("translationMode");

    if (arabicPattern.test(inputText)) {
        translationMode = 'ar-tl';
        sourceLangElement.value = 'ar';
        targetLangElement.value = 'tl';
        translationModeElement.value = 'ar-tl';
        console.log("Mode changed to Arabic to Tagalog");
    } else if (tagalogPattern.test(inputText)) {
        translationMode = 'tl-ar';
        sourceLangElement.value = 'tl';
        targetLangElement.value = 'ar';
        translationModeElement.value = 'tl-ar';
        console.log("Mode changed to Tagalog to Arabic");
    } else {
        console.log("Unable to detect language. Keeping current mode.");
    }
}

// API Functions
function getCSRFToken() {
    const name = "csrftoken";
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
        const [key, value] = cookie.trim().split("=");
        if (key === name) {
            return decodeURIComponent(value);
        }
    }
    return "";
}

async function fetchTranslation(text, sourceLang, targetLang) {
    const apiUrl = "/api_translate/";

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRFToken(), 
        },
        body: JSON.stringify({
            q: text,
            source: sourceLang,
            target: targetLang,
            format: "text"
        }),
    });

    if (!response.ok) {
        throw new Error("Backend API request failed with status: " + response.status);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText || "No translation available";
}

async function fetchEnglishAlternatives(text, sourceLang) {
    const apiUrl = "/api_translate/";

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRFToken(), 
        },
        body: JSON.stringify({
            q: text,
            source: sourceLang,
            target: "en", 
            format: "text"
        }),
    });

    if (!response.ok) {
        throw new Error("Backend API request failed with status: " + response.status);
    }

    const data = await response.json();
    const englishTranslation = data.data.translations[0].translatedText;

    return [englishTranslation]; 
}

// FIXED SPEECH RECOGNITION FUNCTIONS
function startSpeechRecognitionModal() {
    const modal = document.getElementById("speakModal");
    const modalBody = document.getElementById("speakModalBody");
    
    // Reset state
    finalTranscript = "";
    isListening = true;
    currentTimerSeconds = processingSeconds;
    
    // Show initial listening state with visual feedback
    modalBody.innerHTML = `
        <div class="listening-indicator">
            <div class="pulse-animation"></div>
            <p class="listening-text">Listening... Please speak now</p>
            <div class="voice-levels">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
            </div>
            <p class="transcript-preview" id="transcriptPreview">Voice input will show here</p>
            <div class="timer-container">
               
           
            </div>
        </div>
    `;
    
    modal.style.display = "block";
    
    // Wait for DOM to update before starting recognition
    setTimeout(() => {
        startSpeechRecognition();
    }, 100);
}

function startSpeechRecognition() {
    resetSpeechRecognition();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.error("Speech recognition not supported in this browser.");
        showUnsupportedMessage();
        return;
    }

    recognition = new SpeechRecognition();
    const selectedSourceLang = document.getElementById("sourceLang").value;
    recognition.lang = selectedSourceLang === 'tl' ? 'fil-PH' : 'ar-SA';
    
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.start();
    resetRecognitionTimeout();
    
    // Start timer after a brief delay to ensure DOM is ready
    setTimeout(() => {
        startProcessingTimer();
    }, 200);

    recognition.onresult = function (event) {
        clearTimeout(silenceTimer);
        
        let interimTranscript = "";
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += " " + event.results[i][0].transcript.trim();
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        updateTranscriptPreview(finalTranscript, interimTranscript);
        updateVoiceLevels();
        
        // FIXED: Reset timer when ANY speech is detected
        if (interimTranscript.trim().length > 0 || finalTranscript.trim().length > 0) {
            console.log("🎤 Speech detected, resetting timer");
            resetProcessingTimer();
        }
        
        silenceTimer = setTimeout(() => {
            if (interimTranscript === "" && finalTranscript) {
                processRecognizedText(finalTranscript.trim(), selectedSourceLang);
            }
        }, 2000);
    };

    recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
        isListening = false;
        if (event.error === 'no-speech') {
            showNoSpeechMessage();
        } else {
            showTryAgainMessage();
        }
        resetSpeechRecognition();
    };

    recognition.onend = function () {
        console.log("Speech recognition ended.");
        clearTimeout(recognitionTimeout);
        isListening = false;
        
        if (finalTranscript && finalTranscript.length > 0) {
            processRecognizedText(finalTranscript.trim(), selectedSourceLang);
        } else {
            showTryAgainMessage();
        }
    };
}

// FIXED TIMER FUNCTIONS
function startProcessingTimer() {
    currentTimerSeconds = processingSeconds;
    
    console.log("🕒 Starting timer with:", currentTimerSeconds, "seconds");
    
    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Update display immediately
    updateTimerDisplay(currentTimerSeconds);
    
    // Start countdown
    timerInterval = setInterval(() => {
        if (!isListening) {
            console.log("Not listening, stopping timer");
            clearInterval(timerInterval);
            return;
        }
        
        currentTimerSeconds--;
        console.log("🕒 Timer countdown:", currentTimerSeconds);
        
        updateTimerDisplay(currentTimerSeconds);
        
        if (currentTimerSeconds <= 0) {
            console.log("🕒 Timer reached 0, processing text");
            clearInterval(timerInterval);
            
            const selectedSourceLang = document.getElementById("sourceLang").value;
            if (finalTranscript && finalTranscript.trim().length > 0) {
                processRecognizedText(finalTranscript.trim(), selectedSourceLang);
            } else {
                console.log("No speech detected within time limit");
                showNoSpeechMessage();
            }
        }
    }, 1000);
}

function updateTimerDisplay(seconds) {
    let timerElement = document.getElementById("timerCount");
    
    if (!timerElement) {
        // Try alternative selector
        timerElement = document.querySelector(".timer-circle span");
    }
    
    if (timerElement) {
        timerElement.textContent = seconds;
        
        // Visual feedback for low time
        if (seconds <= 3) {
            timerElement.style.color = "#ff4444";
            timerElement.style.fontWeight = "bold";
        } else {
            timerElement.style.color = "";
            timerElement.style.fontWeight = "";
        }
    } else {
        console.warn("Timer element not found");
    }
}

function resetProcessingTimer() {
    console.log("🔄 Resetting processing timer - speech detected!");
    currentTimerSeconds = processingSeconds;
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    updateTimerDisplay(currentTimerSeconds);
    startProcessingTimer();
}

function setProcessingTime(seconds) {
    processingSeconds = seconds;
    currentTimerSeconds = seconds;
    console.log(`⏰ Processing time set to ${seconds} seconds`);
    
    // Update display if timer is running
    updateTimerDisplay(processingSeconds);
}

// Utility function to change processing time (for testing)
function changeProcessingTime() {
    const newTime = prompt("Enter processing time in seconds (3-10):", processingSeconds);
    if (newTime && !isNaN(newTime) && newTime >= 3 && newTime <= 10) {
        setProcessingTime(parseInt(newTime));
        alert(`Processing time set to ${newTime} seconds`);
    } else if (newTime) {
        alert("Please enter a number between 3 and 10");
    }
}

function updateTranscriptPreview(final, interim) {
    const previewElement = document.getElementById("transcriptPreview");
    let html = "";
    
    if (final) {
        html += `<span class="final-text">${final}</span>`;
    }
    
    if (interim) {
        html += `<span class="interim-text">${interim}</span>`;
    }
    
    previewElement.innerHTML = html || "Speak now...";
}

function updateVoiceLevels() {
    const bars = document.querySelectorAll('.voice-levels .bar');
    bars.forEach(bar => {
        bar.style.animation = 'none';
        void bar.offsetWidth;
        bar.style.animation = 'voicePulse 1s infinite';
    });
}

function processRecognizedText(transcript, sourceLang) {
    if (transcript && transcript.length > 0) {
        console.log("Final processed transcript:", transcript);
        
        const modalBody = document.getElementById("speakModalBody");
        modalBody.innerHTML = `
            <div class="success-state">
                <div class="success-icon">✓</div>
                <p class="success-text">Text captured successfully!</p>
                <div class="captured-text">"${transcript}"</div>
                <p>Translating now...</p>
            </div>
        `;
        
        document.getElementById("inputText").value = transcript;
        
        setTimeout(() => {
            translateText();
            closeSpeakModal();
        }, 1500);
        
    } else {
        console.log("No final transcript to process.");
        showTryAgainMessage();
    }
}

function showNoSpeechMessage() {
    const modalBody = document.getElementById("speakModalBody");
    modalBody.innerHTML = `
        <div class="error-state">
            <div class="error-icon">!</div>
            <p class="error-text">No speech detected</p>
            <p class="error-detail">Please speak clearly into your microphone</p>
            <button class="btn btn-primary" onclick="retrySpeechRecognition()">Try Again</button>
        </div>
    `;
}

function showUnsupportedMessage() {
    const modalBody = document.getElementById("speakModalBody");
    modalBody.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠</div>
            <p class="error-text">Speech recognition not supported</p>
            <p class="error-detail">Your browser doesn't support speech recognition. Please try Chrome or Edge.</p>
            <button class="btn btn-secondary" onclick="closeSpeakModal()">Close</button>
        </div>
    `;
}

function showTryAgainMessage() {
    const modalBody = document.getElementById("speakModalBody");
    modalBody.innerHTML = `
        <div class="error-state">
            <div class="error-icon">!</div>
            <p class="error-text">We didn't catch that</p>
            <p class="error-detail">Please try speaking again</p>
            <div class="button-group">
                <button class="btn btn-primary" onclick="retrySpeechRecognition()">Try Again</button>
                <button class="btn btn-secondary" onclick="closeSpeakModal()">Cancel</button>
            </div>
        </div>
    `;
}

function retrySpeechRecognition() {
    startSpeechRecognitionModal();
}

function resetRecognitionTimeout() {
    clearTimeout(recognitionTimeout);
    recognitionTimeout = setTimeout(() => {
        console.warn("Speech recognition timed out. Please try again.");
        if (recognition) {
            recognition.stop();
        }
        showTryAgainMessage();
    }, 15000);
}

function resetSpeechRecognition() {
    if (recognition) {
        recognition.abort();  
    }
    clearTimeout(recognitionTimeout);
    clearTimeout(processingTimeout);
    clearTimeout(silenceTimer);
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    isListening = false;
    finalTranscript = "";
}

function closeSpeakModal() {
    const modal = document.getElementById("speakModal");
    modal.style.display = "none";
    resetSpeechRecognition(); 
}

// Text-to-Speech Functions
function syncVolume(controlId, counterpartId) {
    const volumeValue = document.getElementById(controlId).value;
    document.getElementById(counterpartId).value = volumeValue;
}


function speakText(textAreaId, langSelectId, volumeControlId) {
    isUserInitiatedSpeech = true;
    
    const text = document.getElementById(textAreaId).value.trim();
    const lang = document.getElementById(langSelectId).value;
    const volume = parseFloat(document.getElementById(volumeControlId).value) || 1.0; 
  
    if (!text) {
        console.error('No text provided for speech synthesis.');
        isUserInitiatedSpeech = false;
        return;
    }
  
    let voiceLang = null;
  
    if (lang === "tl") {
        voiceLang = "Filipino Female";
    } else if (lang === "ar") {
        voiceLang = "Arabic Male";
    }
  
    if (voiceLang) {
        responsiveVoice.speak(text, voiceLang, { 
            volume: volume,
            onend: function() {
                isUserInitiatedSpeech = false;
            }
        });
    } else {
        console.error(`Unsupported language: ${lang}`);
        isUserInitiatedSpeech = false;
    }
}


document.addEventListener('mouseover', function(e) {
    if (!isUserInitiatedSpeech && !e.target.closest('.btn')) {
        responsiveVoice.cancel();
    }
});


function speakIntroAndTranslation(introPhrase, introVoiceLang, translatedText, translationVoiceLang) {
    setTimeout(() => {
        responsiveVoice.speak(introPhrase, introVoiceLang, {
            volume: 1.0,
            onend: function() {
                setTimeout(() => {
                    responsiveVoice.speak(translatedText, translationVoiceLang, {
                        volume: 1.0
                    });
                }, 1000); 
            }
        });
    }, 1000);  
}

// Translation Mode Management
let translationMode = 'tl-ar';

function updateMode() {
    resetSpeechRecognition(); 

    const modeSelect = document.getElementById('translationMode').value;
    translationMode = modeSelect;

    if (translationMode === 'tl-ar') {
        document.getElementById('sourceLang').value = 'tl';
        document.getElementById('targetLang').value = 'ar';
    } else if (translationMode === 'ar-tl') {
        document.getElementById('sourceLang').value = 'ar';
        document.getElementById('targetLang').value = 'tl';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateMode();
});

// Utility Functions
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("visible");
}

function showLoginModal() {
    window.location.href = "login.html";
}

function setVolume() {
    const volume = parseFloat(document.getElementById("volumeSlider").value);
    const utterance = new SpeechSynthesisUtterance();
    utterance.volume = volume;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
}

function listVoices() {
    const voices = speechSynthesis.getVoices();
    voices.forEach((voice) => {
        console.log(`Name: ${voice.name}, Lang: ${voice.lang}`);
    });
}

window.speechSynthesis.onvoiceschanged = listVoices;

function detectLanguageAndTranslate() {
    const inputText = document.getElementById("inputText").value.trim();
    
    const detectedLang = franc(inputText);
    
    let sourceLang, targetLang;
    
    if (detectedLang === 'tl') { 
        sourceLang = 'tl';
        targetLang = 'ar'; 
    } else if (detectedLang === 'ar') { 
        sourceLang = 'ar';
        targetLang = 'tl'; 
    } else {
        alert("Unable to detect language. Please enter Tagalog or Arabic text.");
        return;
    }
    
    document.getElementById("sourceLang").value = sourceLang;
    document.getElementById("targetLang").value = targetLang;

    translateText();
}

async function suggestWordsFromAPI(inputWord, langCode) {
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/${langCode}/${inputWord}`;
    
    try {
        const response = await fetch(apiUrl);
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                return data.map(entry => entry.word); 
            }
        }
        return null;
    } catch (error) {
        console.error("Error fetching suggestions from the dictionary API:", error);
        return null;
    }
}

async function fetchTranslationWithDisambiguation(text, sourceLang, targetLang) {
    const ambiguousWords = {
        "tl": {
            "baka": ["maybe", "cow"]
        }
    };

    if (sourceLang in ambiguousWords) {
        const words = text.split(" ");
        const disambiguatedText = words
            .map(word => {
                if (ambiguousWords[sourceLang][word]) {
                    return `${word} (context: ${ambiguousWords[sourceLang][word].join(" or ")})`;
                }
                return word;
            })
            .join(" ");

        text = disambiguatedText;
    }

    return await fetchTranslation(text, sourceLang, targetLang);
}

// Add this to test the timer functionality
// You can add this button to your HTML for testing:
// <button class="btn" onclick="changeProcessingTime()" style="margin: 10px;">Change Processing Time</button>