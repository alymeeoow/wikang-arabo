

function readAloud() {
  const resultsContainer = document.getElementById("resultsContainer");

  if (!resultsContainer || resultsContainer.innerHTML.trim() === "") {
    alert("No results to read aloud.");
    return;
  }


  const wordElement = resultsContainer.querySelector("h3");
  const translationElements = Array.from(resultsContainer.querySelectorAll("p"));

  if (!wordElement && translationElements.length === 0) {
    alert("No valid words or translations found to read.");
    return;
  }


  const voices = {
    ar: "Arabic Male",
    en: "UK English Female", 
    tl: "Filipino Female", 
  };


  const originalWordRaw = wordElement.innerText.trim();
  const originalWord = originalWordRaw
    .replace(/Original:/i, "") 
    .replace(/\(.*?\)/g, "") 
    .trim(); 

  let originalLanguage;
  let originalPrefix;

  if (/[\u0600-\u06FF]/.test(originalWord)) {
    originalLanguage = "ar";
    originalPrefix = "بالعربية، هذا هو"; 
  } else if (/^[a-zA-ZñÑ\s]+$/.test(originalWord)) {
    originalLanguage = "tl"; 
    originalPrefix = "Sa Tagalog, ito ay"; 
  } else {
    originalLanguage = "en"; 
    originalPrefix = "In English, it's"; 
  }


  const itemsToRead = [];
  if (wordElement) {
    itemsToRead.push({
      text: `${originalPrefix} ${originalWord}`,
      voice: voices[originalLanguage],
    });
  }


  translationElements.forEach((translationElement) => {
    const translationText = translationElement.innerText.trim();
    const [translationLabel, translationContent] = translationText.split(":").map((part) => part.trim());

    if (voices[translationLabel]) {
      let prefix;


      if (translationLabel === "ar") {
        prefix = "ترجمته إلى اللغة العربية هو"; 
      } else if (translationLabel === "en") {
        prefix = "The translation of it in English is"; 
      } else if (translationLabel === "tl") {
        prefix = "Ang pagsasalin nito sa Tagalog ay";
      }

      itemsToRead.push({
        text: `${prefix} ${translationContent}`,
        voice: voices[translationLabel],
      });
    }
  });


  let index = 0;
  const readNextItem = () => {
    if (index < itemsToRead.length) {
      const { text, voice } = itemsToRead[index];
      responsiveVoice.speak(text, voice, {
        onend: () => {
          index++;
          readNextItem(); 
        },
      });
    }
  };


  readNextItem();
}




function startVoiceSearch() {
  const recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  const modal = document.getElementById("voiceModal");

  let recognitionTimeout;

  let inputLang = detectInputLanguage();

  recognition.lang = inputLang;

  recognition.onstart = function () {
    modal.style.display = "block";

    recognitionTimeout = setTimeout(() => {
      console.warn("Voice search timed out. Please try again.");
      showTryAgainMessage();
      recognition.stop();
    }, 10000);
  };

  recognition.onspeechend = function () {
    modal.style.display = "none";
    clearTimeout(recognitionTimeout);
    recognition.stop();
  };

  recognition.onresult = function (event) {
    clearTimeout(recognitionTimeout);
    const transcript = event.results[0][0].transcript.trim();

    document.getElementById("searchInput").value = transcript;
    console.log("Recognized:", transcript);

    searchDictionary();
  };

  recognition.start();
}

function detectInputLanguage() {
  const inputText = document.getElementById("inputText").value.trim();

  if (/[\u0600-\u06FF]/.test(inputText)) {
    return "ar-SA";
  } else {
    return "tl-PH";
  }
}

function closeModal() {
  document.getElementById("voiceModal").style.display = "none";
}

function showTryAgainMessage() {
  document.getElementById("timeoutMessage").style.display = "block";
  document.getElementById("retryButton").style.display = "block";
}

function retryVoiceSearch() {
  document.getElementById("timeoutMessage").style.display = "none";
  document.getElementById("retryButton").style.display = "none";
  startVoiceSearch();
}

function detectLanguage(word) {
  const tagalogPattern = /^[a-zA-ZñÑ\s]+$/;
  const arabicPattern = /^[\u0600-\u06FF\s]+$/;

  if (tagalogPattern.test(word)) {
    return "tagalog";
  } else if (arabicPattern.test(word)) {
    return "arabic";
  } else {
    return "unknown";
  }
}

function getPhilippineTime() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function shouldUpdateWord() {
  const storedDate = localStorage.getItem("wordOfTheDayDate");

  if (!storedDate) {
    return true;
  }

  const philippineNow = getPhilippineTime();
  const lastUpdate = new Date(storedDate);

  return (
    philippineNow.getDate() !== lastUpdate.getDate() ||
    philippineNow.getMonth() !== lastUpdate.getMonth()
  );
}




let wordDictionary = {};

async function loadWordDictionary() {
  try {
    const response = await fetch(WORD_DICTIONARY_URL); 
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    wordDictionary = await response.json();

    if (!Object.keys(wordDictionary).length) {
      console.error("Word dictionary is empty.");
      return;
    }

    getWordOfTheDay();
  } catch (error) {
    console.error("Error loading word dictionary:", error);
    document.getElementById("wordOfDay").innerHTML =
      "<p>Could not load Word of the Day. Please try again later.</p>";
  }
}

async function getWordOfTheDay() {
  const storedWord = localStorage.getItem("wordOfTheDay");
  const storedDate = localStorage.getItem("wordOfTheDayDate");

  const today = new Date().toDateString();

  if (storedWord && storedDate === today) {
    displayWordOfTheDay(storedWord);
    return;
  }

  const words = Object.keys(wordDictionary);
  const randomIndex = Math.floor(Math.random() * words.length);
  const wordOfTheDay = words[randomIndex];

  localStorage.setItem("wordOfTheDay", wordOfTheDay);
  localStorage.setItem("wordOfTheDayDate", today);

  displayWordOfTheDay(wordOfTheDay);
}

async function displayWordOfTheDay(word) {
  const wordOfDayContainer = document.getElementById("wordOfDay");

  try {
    const tagalogTranslation = await translateText(word, "tl");
    const arabicTranslation = await translateText(word, "ar");

    wordOfDayContainer.innerHTML = `
      <h3>${word.toUpperCase()}</h3>
      <p><strong>Tagalog:</strong> ${tagalogTranslation || "Translation unavailable"}</p>
      <p><strong>Arabic:</strong> ${arabicTranslation || "Translation unavailable"}</p>
    `;
  } catch (error) {
    console.error("Error displaying Word of the Day:", error);
    wordOfDayContainer.innerHTML =
      "<p>Could not display Word of the Day. Please try again later.</p>";
  }
}

async function translateText(text, targetLanguage) {
  const apiUrl = "/api_translate/";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
      },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText || "No translation available";
  } catch (error) {
    console.error("Error during translation:", error);
    return null;
  }
}

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

window.onload = function () {
  loadWordDictionary();
};



async function searchDictionary() {
  const searchInput = document.getElementById("searchInput").value.trim().toLowerCase();
  const resultsContainer = document.getElementById("resultsContainer");
  const equivalentLabel = document.getElementById("equivalentLabel");
  const languageSwitch = document.getElementById("languageSwitch");
  const wordsListDiv = document.getElementById("wordsList");


  wordsListDiv.style.display = 'none'; 

  resultsContainer.innerHTML = "";
  equivalentLabel.innerHTML = "";

  if (!searchInput) {
    resultsContainer.innerText = "Please enter a word to search.";
    return;
  }

  try {
    const isSwitchOn = languageSwitch.checked;
    let response;
    let data;

    if (isSwitchOn) {
      response = await fetch(`/fetch_ambiguous_2/${searchInput}/`);
      if (!response.ok) {
        throw new Error("Word not found in the dictionary.");
      }
      data = await response.json();
      equivalentLabel.innerHTML = `Standard Dictionary Definitions for "<strong>${searchInput}</strong>":`;
    } else {
      response = await fetch(`/fetch_ambiguous/${searchInput}/`);
      if (!response.ok) {
        throw new Error("Word not found in the Dictionary.");
      }
      data = await response.json();
      equivalentLabel.innerHTML = `Possible Meanings for "<strong>${searchInput}</strong>":`;
    }

    const tagalogWordElement = document.createElement("div");
    tagalogWordElement.innerHTML = `<p><strong>Tagalog Word:</strong> ${searchInput}</p>`;
    resultsContainer.appendChild(tagalogWordElement);

    const meanings = data.meanings || data[searchInput];

    if (meanings) {
      for (const item of meanings) {
        const meaningElement = document.createElement("div");
        meaningElement.style.marginBottom = "15px";

        if (!isSwitchOn) {
          const arabicWordTranslation = await translateText(searchInput, "ar");
          const arabicDefinitionTranslation = await translateText(item.definition, "ar");

          meaningElement.innerHTML = `
            <p><strong>Tagalog:</strong> ${searchInput}</p>
            <p><strong>Definition:</strong> ${item.definition}</p>
            <p><strong>Arabic Word:</strong> <span dir="rtl">${arabicWordTranslation || "Translation unavailable"}</span></p>
            <p><strong>Arabic Definition:</strong> <span dir="rtl">${arabicDefinitionTranslation || "Translation unavailable"}</span></p>
          `;
        } else {
          const englishTranslation = item.english || "Translation unavailable";
          const arabicTranslation = item.arabic || "Translation unavailable";

          meaningElement.innerHTML = `
            <p><strong>English Meaning:</strong> ${englishTranslation}</p>
            <p><strong>Arabic Translation:</strong> <span dir="rtl">${arabicTranslation}</span></p>
          `;
        }

        resultsContainer.appendChild(meaningElement);
      }
    } else {
      resultsContainer.innerText = "No meanings found for the word.";
    }
  } catch (error) {
    console.error("Error fetching dictionary data:", error);
    resultsContainer.innerText = error.message;
  }
}

const ambiguous_2 = [
  "tayo", "puno", "baka", "ayos", "kita", "baba", "bago", "bait", "baon", "basa", 
  "dating", "huli", "burol", "bukas", "sama", "tala", "suso", "tubo", "sala", "pasa", 
  "suka", "hulog", "lobo", "gamit", "talon", "buhay", "panahon", "galing", "tama", 
  "yaya", "bunga"
];

const languageSwitch = document.getElementById('languageSwitch');
const wordsButton = document.getElementById('wordsButton');
const wordsListDiv = document.getElementById("wordsList");
const languageLabel = document.getElementById("languageLabel"); 


function toggleLanguage() {

  if (languageSwitch.checked) {
    languageLabel.textContent = "Ambiguity Dictionary"; 
    wordsButton.style.display = 'block'; 
  } else {
    languageLabel.textContent = "Descriptive Dictionary"; 
    wordsButton.style.display = 'none';
    wordsListDiv.style.display = 'none'; 
  }
}


function showWords() {

  if (wordsListDiv.style.display === 'none' || wordsListDiv.style.display === '') {
    wordsListDiv.innerHTML = "";  
    ambiguous_2.forEach(function(word) {
      const wordElement = document.createElement("p");
      wordElement.textContent = word;
      wordElement.style.cursor = 'pointer';


      wordElement.addEventListener('mouseover', function() {
        wordElement.style.color = "#007BFF"; 
      });

     
      wordElement.addEventListener('mouseout', function() {
        wordElement.style.color = ""; 
      });

     
      wordElement.addEventListener('click', function() {
        document.getElementById("searchInput").value = word;
        searchDictionary(); 
      });

      wordsListDiv.appendChild(wordElement); 
    });
    wordsListDiv.style.display = 'block'; 
  } else {
    wordsListDiv.style.display = 'none'; 
  }
}


languageSwitch.addEventListener('change', function() {
  wordsListDiv.style.display = 'none'; 
});


wordsButton.addEventListener('click', showWords);


toggleLanguage();
