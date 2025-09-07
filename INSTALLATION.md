# Installation Guide

This guide will walk you through installing and using the P2P Google Password Sharing Chrome extension.

## Installation Steps

1. **Download or Clone the Repository**
   - Download this project as a ZIP file and extract it, or
   - Clone the repository using Git:
     ```
     git clone https://github.com/yourusername/password-share.git
     ```

2. **Load the Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" by toggling the switch in the top-right corner
   - Click the "Load unpacked" button
   - Select the folder containing the extension files
   - The extension should now appear in your extensions list

3. **Verify Installation**
   - You should see the extension icon in your Chrome toolbar
   - Click on it to open the extension popup

## Using the Extension

### As the Password Sender (Jordan)

1. Click the extension icon in your toolbar
2. Ensure you're on the "Sender (Jordan)" tab
3. Click "Generate Code"
4. Share the displayed code with the receiver via a secure channel (message, email, etc.)
5. Ask the receiver to share their PIN with you
6. Enter the PIN in the "Verify PIN" section and click "Verify PIN"
7. Once verified, enter your Google password in the "Send Password" section
8. Click "Send Password" to securely transmit it to the receiver

### As the Password Receiver (Patrick)

1. Click the extension icon in your toolbar
2. Switch to the "Receiver (Patrick)" tab
3. Paste the code received from the sender
4. Click "Connect"
5. Click "Generate PIN" to create a verification PIN
6. Share this PIN with the sender via a secure channel
7. Wait for the sender to verify the PIN and send the password
8. Navigate to the Google login page (accounts.google.com)
9. Click "Fill Password" in the extension to automatically fill the password field

## Troubleshooting

- **Connection Issues**: If the WebRTC connection fails, try regenerating the code and ensuring both users are not behind restrictive firewalls.
- **Password Not Filling**: Make sure you're on the correct Google login page (accounts.google.com) and that the password field is visible.
- **PIN Verification Fails**: Double-check that the PIN was correctly shared and entered.

## Security Notes

- The extension only works on Google login pages (accounts.google.com)
- All communication happens directly between the two browsers (P2P)
- No passwords are stored in the extension
- The "show password" button on the Google login page is disabled to prevent casual exposure
