# P2P Google Password Sharing Chrome Extension

A secure Chrome extension that allows two users to share access to Google Sign-In without exposing the raw password, without hosting servers, and relying only on WebRTC P2P connections.

## Core Principles

- **P2P Only**: All credential transfer occurs over a WebRTC data channel.
- **Manual One-Way Code Exchange**: Only the sender's offer code is shared with the receiver.
- **PIN-Based Confirmation**: Requires PIN verification before credential sharing.
- **Google-Only Scope**: Extension only activates on accounts.google.com login pages.
- **Block Casual Exposure**: Extension attempts to block or disable the "show password" button in the Google login form.

## User Flow

### 1. Connection Setup

- **Sender** opens extension → clicks Generate Code.
- Extension creates a WebRTC offer and displays it as a short encoded string.
- **Receiver** opens extension → pastes sender's code.
- Extension generates answer internally and establishes the P2P connection.
- WebRTC data channel is now established.

### 2. PIN Verification

- **Receiver** generates a short random PIN (6 digits).
- They tell the sender the PIN out-of-band (voice, message).
- **Sender** inputs the PIN into the extension before sending credentials.
- Extension ensures receiver's PIN matches before allowing password transfer.

### 3. Password Transfer

- **Sender** enters Google password into extension UI.
- Extension encrypts password with the session key negotiated during WebRTC setup.
- Encrypted payload sent to receiver.

### 4. Password Injection

- **Receiver** clicks Fill Password in extension popup.
- Extension content script injects decrypted password into the password input field on accounts.google.com.
- Extension disables/hides the "show password" toggle on the page.
- Login proceeds normally.

## Security Considerations

- **One-way signaling**: Only sender's code is shared, reducing complexity.
- **PIN-based verification**: Prevents man-in-the-middle attacks if someone intercepts the code.
- **Google-only injection**: Reduces attack surface by scoping strictly to accounts.google.com.
- **Password never stored**: Extension does not persist credentials beyond session.
- **Casual leakage blocked**: Prevents "show password" click and Chrome password manager prompts.

## Technical Implementation

- Uses Google's free STUN server for ICE (stun.l.google.com:19302).
- No TURN fallback → some peers may fail to connect (acceptable tradeoff).
- Uses built-in WebRTC DataChannel encryption; no plaintext is ever sent.
- Minimal UI focused on "Code → PIN → Fill".

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this project folder
5. The extension should now be installed and visible in your Chrome toolbar

## Usage

### For the Sender (Jordan)
1. Click the extension icon
2. On the "Sender" tab, click "Generate Code"
3. Share the generated code with the receiver
4. Wait for the receiver to share their PIN
5. Enter the PIN and click "Verify PIN"
6. Enter your Google password and click "Send Password"

### For the Receiver (Patrick)
1. Click the extension icon
2. On the "Receiver" tab, paste the code from the sender
3. Click "Connect"
4. Generate a PIN and share it with the sender
5. Once the sender verifies the PIN and sends the password
6. Navigate to accounts.google.com login page
7. Click "Fill Password" in the extension

## Privacy & Security

This extension:
- Does not collect or transmit any data to external servers
- Only operates on accounts.google.com domains
- Uses WebRTC's built-in encryption for all communications
- Never stores passwords locally or in any persistent storage

## License

[MIT License](LICENSE)
