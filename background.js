chrome.action.onClicked.addListener(async (tab) => {
    if (chrome.sidePanel) {
        await chrome.sidePanel.open({ tabId: tab.id });
    }
});

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason.search(/install/g) === -1) {
        return;
    }
    chrome.tabs.create({
        url: chrome.runtime.getURL("sidebar.html"),
        active: true
    });
});

// Handle messages from sidebar and welcome page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message);
    
    if (message.type === 'SET_PERMISSION') {
        chrome.storage.local.set({ 'microphonePermissionGranted': true }, () => {
            console.log('Permission status saved');
            sendResponse({ success: true });
        });
        return true; // Will respond asynchronously
    }
    
    if (message.type === 'CHECK_PERMISSION') {
        chrome.storage.local.get(['microphonePermissionGranted'], (result) => {
            console.log('Permission check result:', result);
            sendResponse({ granted: result.microphonePermissionGranted === true });
        });
        return true; // Will respond asynchronously
    }

    if (message.type === 'DOWNLOAD_TRANSCRIPT') {
        const transcript = message.transcript;
        const blob = new Blob([transcript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
            url: url,
            filename: 'transcript.txt',
            saveAs: true
        });
    }
});
