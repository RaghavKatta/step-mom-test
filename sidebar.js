console.log('Script loaded');

let recognition;
let isListening = false;
let currentStream = null;
let fullTranscript = ''; // Store the entire transcript
let timerInterval;
let seconds = 0;
let minutes = 0;
let currentSummary = '';
let userApiKey = '';

// Store previous warnings and suggestions with timestamps
let previousWarnings = [];
let previousSuggestions = [];

document.addEventListener('DOMContentLoaded', () => {
    const mainView = document.getElementById('mainView');
    const detailView = document.getElementById('detailView');
    const switchButton = document.getElementById('switchButton');
    const backButton = document.getElementById('backButton');
    const textField = document.querySelector('.main-view .input-field');
    const warningsSection = document.querySelector('.section:nth-child(2) .gray-rectangle');
    const suggestionsSection = document.querySelector('.section:nth-child(1) .gray-rectangle');
    const summaryBox = document.getElementById('summaryBox');
    const timerBox = document.getElementById('timerBox');
    const currentTranscriptBox = document.getElementById('currentTranscriptBox');
    const apiKeyInput = document.getElementById('apiKeyInput');

    // Load the API key from storage when the page loads
    chrome.storage.local.get(['apiKey'], (result) => {
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
    });

    // Save the API key to storage when it changes
    apiKeyInput.addEventListener('change', () => {
        const apiKey = apiKeyInput.value.trim();
        chrome.storage.local.set({ apiKey: apiKey }, () => {
            console.log('API key saved to storage.');
        });
    });

    // View switching functionality
    switchButton.addEventListener('click', () => {
        mainView.classList.add('hidden');
        detailView.classList.remove('hidden');
    });

    backButton.addEventListener('click', () => {
        detailView.classList.add('hidden');
        mainView.classList.remove('hidden');
    });

    // Add transcription button
    const startButton = document.createElement('button');
    startButton.innerHTML = '<i class="fas fa-microphone"></i> Start';
    startButton.className = 'switch-button';
    startButton.style.marginBottom = '10px';
    mainView.insertBefore(startButton, switchButton);

    startButton.addEventListener('click', async () => {
        const apiKeyInput = document.getElementById('apiKeyInput');
        userApiKey = apiKeyInput.value.trim();
    
        // Check for API key
        if (!userApiKey || !userApiKey.startsWith('sk-')) {
            alert("⚠️ Please enter a valid OpenAI API key before starting transcription.");
            return;
        }
    
        try {
            const textField = document.querySelector('.main-view .input-field'); // Get textField here
            const hasPermission = await requestMicrophonePermission();
            if (!hasPermission) {
                textField.value = 'Microphone permission is required.';
                return;
            }
    
            if (!isListening) {
                await initializeTranscription(textField);
                startButton.innerHTML = '<i class="fas fa-stop"></i> Stop';
                fullTranscript = ''; // Clear the transcript
                currentSummary = '';
                startTimer();
            } else {
                stopTranscription();
                startButton.innerHTML = '<i class="fas fa-microphone"></i> Start';
            }
        } catch (error) {
            if (textField) {
                textField.value = 'Error: ' + error.message;
            } else {
                console.error('Error: ', error.message);
            }
        }
    });
    

    function startTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        seconds = 0;
        minutes = 0;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            seconds++;
            if (seconds === 60) {
                minutes++;
                seconds = 0;
            }
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function updateTimerDisplay() {
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        timerBox.textContent = `${formattedMinutes}:${formattedSeconds}`;
    }

    async function summarizeAndClear() {
        const currentTranscript = textField.value;
        const words = currentTranscript.split(/\s+/);
        const last150Words = words.slice(-150).join(' ');

        if (last150Words.trim() !== '') {
            const problemField = document.querySelector('.detail-view .problem-section textarea');
            const customerField = document.querySelector('.detail-view .customer-section textarea');
            const questionsField = document.querySelector('.detail-view .questions-section textarea');
        
            const context = {
                problem: problemField ? problemField.value : '',
                customer: customerField ? customerField.value : '',
                questions: questionsField ? questionsField.value : '',
                transcript: last150Words,
                previousSuggestions: ''
            };

            const newSummary = await generateSummary(last150Words, currentSummary);
            currentSummary = newSummary;

            if (summaryBox) {
                summaryBox.textContent = currentSummary;
            }
            textField.value = ''; // Clear the text field
        }
    }

    async function generateSummary(transcript, previousSummary) {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

        if (!apiKey) {
            alert('Error: API key is required. Please enter your API key.');
            return 'Error: API key is missing.';
        }

        const apiUrl = "https://api.openai.com/v1/chat/completions";

        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{
                        role: "system",
                        content: `You are a summarization expert. Create a concise summary of the following transcript, incorporating any relevant information from the previous summary. Be brief and to the point.`
                    }, {
                        role: "user",
                        content: `Previous Summary: ${previousSummary}\n\nTranscript: ${transcript}`
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error("Error generating summary:", error);
            return "Error generating summary.";
        }
    }

    async function downloadTranscript() {
        try {
            // Send a message to the background script to initiate the download
            chrome.runtime.sendMessage({
                type: 'DOWNLOAD_TRANSCRIPT',
                transcript: fullTranscript
            });
        } catch (error) {
            console.error("Error downloading transcript:", error);
        }
    }

    async function requestMicrophonePermission() {
        try {
            // First check if we already have permission
            const result = await navigator.permissions.query({ name: 'microphone' });
            if (result.state === 'granted') {
                return true;
            }

            // If not granted, show an alert with instructions
            if (result.state !== 'granted') {
                alert('Microphone permission is required.\n\nTo enable it, please follow these steps:\n1. Open Chrome and go to the Extensions Manager by entering chrome://extensions/ in the address bar.\n2. Find "The Stepmom Test" extension and click on "Details".\n3. Scroll down to "Site access" and ensure microphone permissions are enabled.\n4. Reload the extension if necessary.');
                return false;
            }

            // If not granted, request it
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately since we only needed it for permission
            stream.getTracks().forEach(track => track.stop());
            
            // Save the permission state
            chrome.runtime.sendMessage({ type: 'SET_PERMISSION' });
            return true;
        } catch (error) {
            console.error('Microphone permission error:', error);
            return false;
        }
    }

    async function initializeTranscription(textField) {
    
        if (!textField) {
            throw new Error('TextField not found');
        }

        if (!window.webkitSpeechRecognition) {
            throw new Error('Your browser does not support speech recognition.');
        }

        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        setupRecognitionHandlers(textField);
        await startTabCapture();
    }

    function setupRecognitionHandlers(textField) {
        let lastAnalysisTime = 0;
        let lastSuggestions = ''; // Track previous suggestions
        const ANALYSIS_INTERVAL = 5000; // Analyze every 5 seconds

        recognition.onresult = async (event) => {
            let transcript = '';
            
            // Get all results
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            // Update the full transcript and keep only last 2500 words
            fullTranscript += transcript;

            // Update the text field
            textField.value = transcript;
            // adjustTextareaHeight(textField);

            // Check if enough time has passed for a new analysis
            const currentTime = Date.now();
            if (currentTime - lastAnalysisTime > ANALYSIS_INTERVAL) {
                lastAnalysisTime = currentTime;

                // Get context from detail view
                const problemField = document.querySelector('.detail-view .problem-section textarea');
                const customerField = document.querySelector('.detail-view .customer-section textarea');
                const questionsField = document.querySelector('.detail-view .questions-section textarea');
                
                const context = {
                    problem: problemField ? problemField.value : '',
                    customer: customerField ? customerField.value : '',
                    questions: questionsField ? questionsField.value : '',
                    transcript: fullTranscript,
                    previousSuggestions: lastSuggestions,
                    currentSummary: currentSummary
                };

                // Process transcript for Mom Test violations and suggestions
                const newSuggestions = await processTranscriptUpdate(fullTranscript, context);
                lastSuggestions = newSuggestions; // Update last suggestions
            }
        };

        recognition.onerror = (event) => {
            textField.value += `\nError: ${event.error}`;
        };

        recognition.onstart = () => {
            isListening = true;
        };
    }

    function startTabCapture() {
        return new Promise((resolve, reject) => {
            // Clean up any existing stream first
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
                currentStream = null;
            }

            if (!chrome.tabs || !chrome.tabCapture) {
                reject(new Error('Chrome APIs not available'));
                return;
            }

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError) {
                    reject(new Error('Tab query error: ' + chrome.runtime.lastError.message));
                    return;
                }

                if (!tabs?.length) {
                    reject(new Error('No active tab found'));
                    return;
                }

                chrome.tabCapture.capture({
                    audio: true,
                    video: false
                }, (stream) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error('Tab capture error: ' + chrome.runtime.lastError.message));
                        return;
                    }

                    if (stream) {
                        currentStream = stream; // Store the stream reference
                        recognition.start();
                        resolve(stream);
                    } else {
                        reject(new Error('No stream available from tab capture'));
                    }
                });
            });
        });
    }

    // function adjustTextareaHeight(textarea) {
    //     textarea.style.height = 'auto';
    //     textarea.style.height = textarea.scrollHeight + 'px';
    // }

    async function analyzeMomTest(transcript, context) {
        
        const apiKey = userApiKey;
        if (!apiKey) {
            throw new Error("API key not set.");
        }

        const apiUrl = "https://api.openai.com/v1/chat/completions";

        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{
                        role: "system",
                        content: `You are a Mom Test interview coach. Analyze the interview and respond in two sections:
                        1. VIOLATIONS (if any):
                        Format: TYPE::QUOTE::ADVICE
                        Where:
                        - TYPE is one of: FLUFF, SPECULATION, LEADING, PITCHING
                        - QUOTE is the exact problematic phrase
                        - ADVICE is a 3-4 word suggestion
                        If no violations, respond with "NONE"
                        2. QUESTIONS:
                        Format: TOPIC >> SPECIFIC QUESTION
                        Suggest 1-2 relevant questions based on context.
                        If previous suggestions still relevant, return them exactly.
                        Separate sections with "---".
                        
                        Example response:
                        FLUFF::"That's really cool"::Get specific examples
                        SPECULATION::"Would you use this?"::Ask past behavior
                        PITCHING::"We have this feature"::Avoid pitching
                        ---
                        Last occurrence >> When did you last face this?
                        Current process >> How do you handle this today?
                        Be extremely concise but specific.`
                    }, {
                        role: "user",
                        content: `Analyze this interview:
                        Problem: ${context.problem}
                        Customer: ${context.customer}
                        Questions: ${context.questions}
                        Transcript: ${transcript}
                        Previous suggestions: ${context.previousSuggestions || "None"}
                        Current Summary: ${context.currentSummary || "None"}`
                    }]
                })
            });

            console.log("Sending to OpenAI (Mom Test analysis):", {
                problem: context.problem,
                customer: context.customer,
                questions: context.questions,
                transcript: transcript,
                previousSuggestions: context.previousSuggestions,
                currentSummary: context.currentSummary
            });
            

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Raw response from OpenAI:\n", data.choices[0].message.content);
            const [violations, suggestions] = data.choices[0].message.content.trim().split('---').map(s => s.trim());
            return { violations, suggestions };
        } catch (error) {
            console.error("Error in Mom Test analysis:", error);
            return { 
                violations: "Error analyzing interview.",
                suggestions: context.previousSuggestions || "Error generating questions."
            };
        }
    }

    async function processTranscriptUpdate(transcript, context) {
        const warningsSection = document.querySelector('.section:nth-child(2) .gray-rectangle');
        const suggestionsSection = document.querySelector('.section:nth-child(1) .gray-rectangle');
        const summaryBox = document.getElementById('summaryBox');
        
        // Get both violations and suggestions in one API call
        const { violations, suggestions } = await analyzeMomTest(transcript, context);
        
        // Update the UI
        const timestamp = formatTimestamp();
        
        // Handle warnings
        if (violations && violations !== "NONE") {
            const warningItems = violations.split('\n').filter(w => w.trim() !== '');
            
            // Mark all previous warnings as old
            previousWarnings = previousWarnings.map(w => ({
                ...w,
                isOld: true
            }));
            
            // Process new warnings
            const newWarnings = warningItems.map(warning => {
                const [type, quote, advice] = warning.split('::');
                let iconClass = '';
                switch (type) {
                    case 'FLUFF':
                        iconClass = 'fas fa-comment-dots';
                        break;
                    case 'SPECULATION':
                        iconClass = 'fas fa-question';
                        break;
                    case 'LEADING':
                        iconClass = 'fas fa-hand-point-right';
                        break;
                    case 'PITCHING':
                        iconClass = 'fas fa-bullhorn';
                        break;
                    default:
                        iconClass = 'fas fa-exclamation-triangle';
                }
                return {
                    type,
                    quote,
                    advice,
                    isOld: false,
                    iconClass
                };
            });
            
            previousWarnings = [...previousWarnings, ...newWarnings];
            
            // Display all warnings
            warningsSection.innerHTML = `
                <div class="current-items">
                    ${newWarnings.map(warning => `
                        <div class="warning-box">
                            <div class="warning-title"><i class="${warning.iconClass}"></i> ${warning.type}</div>
                            <div class="warning-content">
                                ${warning.quote} ${warning.advice}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="history-items">
                    ${previousWarnings.filter(w => w.isOld).map(warning => `
                        <div class="warning-box old">
                            <div class="warning-title"><i class="${warning.iconClass}"></i> ${warning.type}</div>
                            <div class="warning-content">
                                ${warning.quote} ${warning.advice}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Handle suggestions
        if (suggestions) {
            const suggestionItems = suggestions.split('\n').filter(s => s.trim() !== '');
            
            // Check if suggestions are different from the most recent ones
            const mostRecentSuggestions = previousSuggestions.length > 0 ? 
                previousSuggestions[previousSuggestions.length - 1].items : [];
                
            if (!areArraysEqual(suggestionItems, mostRecentSuggestions)) {
                // Mark all previous suggestions as old
                previousSuggestions = previousSuggestions.map(s => ({
                    ...s,
                    isOld: true
                }));
                
                // Add new suggestions
                previousSuggestions.push({
                    items: suggestionItems,
                    isOld: false
                });
            }
            
            // Display all suggestions
            suggestionsSection.innerHTML = `
                <div class="current-items">
                    ${suggestionItems.map(suggestion => `
                        <div class="suggestion-box">
                            ${suggestion}
                        </div>
                    `).join('')}
                </div>
                <div class="history-items">
                    ${previousSuggestions
                        .filter(group => group.isOld)
                        .flatMap(suggestionGroup => 
                            suggestionGroup.items.map(suggestion => `
                                <div class="suggestion-box old">
                                    ${suggestion}
                                    
                                </div>
                            `)
                        ).join('')}
                </div>
            `;
        }
        
        if (summaryBox) {
            summaryBox.textContent = currentSummary;
        }
        
        return suggestions; // Return suggestions for tracking
    }

    function stopTranscription() {
        // Stop speech recognition
        if (recognition) {
            recognition.stop();
            recognition = null;
        }


         // Stop the timer using stopTimer function
        stopTimer();
        // Stop the timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // Stop any ongoing streams
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }

        // Reset all variables
        isListening = false;
        fullTranscript = '';
        currentSummary = '';
        seconds = 0;
        minutes = 0;

        // Reset UI elements
        textField.value = ''; // Clear the transcript field
        timerBox.textContent = '00:00'; // Reset the timer display
    }

    // Format timestamp function
    function formatTimestamp() {
        const now = new Date();
        return now.toLocaleTimeString();
    }

    // Function to check if arrays are equal
    function areArraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        return arr1.every((item, index) => item === arr2[index]);
    }
});