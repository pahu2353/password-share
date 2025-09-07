// Content script for interacting with Google Sign-In page
console.log('P2P Google Password Sharing content script loaded');

// Helper function to find password input field on Google login page
const findPasswordField = () => {
  // Google login password field selectors
  const selectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[aria-label*="password" i]',
    'input[placeholder*="password" i]'
  ];
  
  // Try each selector
  for (const selector of selectors) {
    const field = document.querySelector(selector);
    if (field) return field;
  }
  
  return null;
};

// Helper function to find "show password" toggle button
const findShowPasswordToggle = () => {
  // Possible selectors for the show password button/toggle
  const selectors = [
    // Attribute-based selectors
    'button[aria-label*="show password" i]',
    'button[title*="show password" i]',
    'div[role="button"][aria-label*="show password" i]',
    
    // Icon-based selectors (Google often uses material icons)
    'button .material-icons-extended:not([hidden])',
    
    // Position-based selectors (relative to password field)
    'input[type="password"] + div button',
    'input[type="password"] ~ div button',
    
    // More generic visual cues
    'button svg[aria-hidden="true"]',
    'div[role="button"] svg[aria-hidden="true"]'
  ];
  
  // Try each selector
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    // Return the element closest to the password field
    if (elements.length > 0) {
      const passwordField = findPasswordField();
      if (passwordField) {
        // Sort by proximity to password field
        return Array.from(elements).sort((a, b) => {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          const passwordRect = passwordField.getBoundingClientRect();
          
          const distanceA = Math.hypot(
            rectA.left - passwordRect.right,
            rectA.top - passwordRect.top
          );
          
          const distanceB = Math.hypot(
            rectB.left - passwordRect.right,
            rectB.top - passwordRect.top
          );
          
          return distanceA - distanceB;
        })[0];
      }
      return elements[0];
    }
  }
  
  return null;
};

// Function to fill the password field
const fillPasswordField = (password) => {
  const passwordField = findPasswordField();
  
  if (!passwordField) {
    return { error: 'Password field not found on the page' };
  }
  
  // Use both direct property setting and input events for compatibility
  passwordField.value = password;
  
  // Dispatch events to ensure form validation is triggered
  const events = ['input', 'change', 'keyup'];
  events.forEach(eventType => {
    const event = new Event(eventType, { bubbles: true });
    passwordField.dispatchEvent(event);
  });
  
  return { success: true };
};

// Function to disable the "show password" toggle
const disableShowPasswordToggle = () => {
  const toggle = findShowPasswordToggle();
  
  if (toggle) {
    // Method 1: Remove the element
    // toggle.remove();
    
    // Method 2: Make it invisible but keep layout (preferred)
    toggle.style.visibility = 'hidden';
    
    // Method 3: Disable the button
    toggle.disabled = true;
    toggle.setAttribute('aria-disabled', 'true');
    
    // Method 4: Block click events
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, true);
    
    return { success: true };
  }
  
  return { warning: 'Show password toggle not found' };
};

// Handle messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fillPassword') {
    // Fill the password field
    const fillResult = fillPasswordField(message.password);
    
    // Try to disable the show password toggle
    const toggleResult = disableShowPasswordToggle();
    
    // Combine results
    const result = {
      ...fillResult,
      toggleDisabled: toggleResult.success
    };
    
    if (toggleResult.warning) {
      result.warning = toggleResult.warning;
    }
    
    sendResponse(result);
  }
  
  return true;
});

// Run immediately when the page loads
(() => {
  // Create a MutationObserver to watch for dynamically added elements
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if password field or show password toggle is added
        const passwordField = findPasswordField();
        const toggle = findShowPasswordToggle();
        
        if (passwordField && toggle) {
          disableShowPasswordToggle();
          
          // Once found and disabled, we can disconnect the observer
          observer.disconnect();
          break;
        }
      }
    }
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Also try immediately in case elements are already present
  disableShowPasswordToggle();
})();
