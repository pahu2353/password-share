// Background service worker - Manages state and messaging between popup and content scripts

// Connection state management
let connectionRole = null; // 'sender' or 'receiver'
let encodedOffer = null;
// PIN verification commented out for debugging
// let pinVerified = false;
// let generatedPin = null;
let receivedPassword = null;

// Active tabs tracking
let activeTabId = null;

// We can't use WebRTC directly in service worker, so we'll manage state here
// and handle the actual WebRTC connection in the popup script

// PIN generation commented out for debugging
/*
// Helper function to generate a random PIN
const generateRandomPin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
*/

// Handler for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Track active tab for password filling
  if (sender.tab) {
    activeTabId = sender.tab.id;
  }
  
  // Handle different action types
  switch (message.action) {
    case 'saveConnectionInfo':
      // Save connection info sent from popup
      connectionRole = message.role;
      encodedOffer = message.encodedOffer;
      sendResponse({ success: true });
      return true;
      
    case 'getConnectionInfo':
      // Return current connection info to popup
      sendResponse({
        role: connectionRole,
        encodedOffer: encodedOffer,
        // PIN verification commented out
        // pinVerified: pinVerified,
        // pin: generatedPin,
        passwordReceived: !!receivedPassword
      });
      return true;
      
    // PIN-related cases commented out for debugging
    /*
    case 'savePin':
      // Save generated PIN
      generatedPin = message.pin;
      sendResponse({ success: true });
      return true;
      
    case 'verifyPin':
      // Verify PIN
      pinVerified = message.pin === generatedPin;
      sendResponse({ verified: pinVerified });
      return true;
    */
      
    case 'savePassword':
      // Save password
      receivedPassword = message.password;
      sendResponse({ success: true });
      return true;
      
    case 'fillPassword':
      handleFillPassword(sendResponse);
      return true;
  }
});

// Fill password on Google login page (receiver)
async function handleFillPassword(sendResponse) {
  try {
    if (connectionRole !== 'receiver') {
      throw new Error('Password filling is only available for receivers');
    }
    
    if (!receivedPassword) {
      throw new Error('No password available');
    }
    
    // Find the active Google login tab
    const tabs = await chrome.tabs.query({ url: '*://accounts.google.com/*' });
    
    if (tabs.length === 0) {
      throw new Error('No Google login page found. Please navigate to accounts.google.com');
    }
    
    // Use the active tab or the first Google login tab
    const targetTab = tabs.find(tab => tab.active) || tabs[0];
    
    try {
      // Send message to content script to fill the password
      const response = await chrome.tabs.sendMessage(targetTab.id, {
        action: 'fillPassword',
        password: receivedPassword
      });
      
      if (response && response.error) {
        throw new Error(response.error);
      }
      
      sendResponse({ success: true });
    } catch (error) {
      // If content script is not ready, try to inject it
      console.log('Content script not ready, attempting to inject...');
      
      try {
        // Inject the content script
        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          files: ['content.js']
        });
        
        // Wait a bit for the script to load
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try sending the message again
        const response = await chrome.tabs.sendMessage(targetTab.id, {
          action: 'fillPassword',
          password: receivedPassword
        });
        
        if (response && response.error) {
          throw new Error(response.error);
        }
        
        sendResponse({ success: true });
      } catch (injectionError) {
        console.error('Failed to inject content script:', injectionError);
        throw new Error('Could not communicate with the Google login page. Please refresh the page and try again.');
      }
    }
  } catch (error) {
    console.error('Error filling password:', error);
    sendResponse({ error: error.message });
  }
}
