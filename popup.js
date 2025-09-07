// Popup UI Controller
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching functionality
  const senderTab = document.getElementById('senderTab');
  const receiverTab = document.getElementById('receiverTab');
  const senderInterface = document.getElementById('senderInterface');
  const receiverInterface = document.getElementById('receiverInterface');

  // Sender elements
  const generateCodeBtn = document.getElementById('generateCode');
  const codeContainer = document.getElementById('codeContainer');
  const connectionCode = document.getElementById('connectionCode');
  const copyCodeBtn = document.getElementById('copyCode');
  const codeStatus = document.getElementById('codeStatus');
  // PIN elements commented out for debugging
  // const pinInput = document.getElementById('pinInput');
  // const verifyPinBtn = document.getElementById('verifyPin');
  // const pinStatus = document.getElementById('pinStatus');
  const passwordInput = document.getElementById('passwordInput');
  const sendPasswordBtn = document.getElementById('sendPassword');
  const sendStatus = document.getElementById('sendStatus');

  // Receiver elements
  const receiverCodeInput = document.getElementById('receiverCodeInput');
  const connectWithCodeBtn = document.getElementById('connectWithCode');
  const receiverCodeStatus = document.getElementById('receiverCodeStatus');
  // PIN elements commented out for debugging
  // const generatePinBtn = document.getElementById('generatePin');
  // const pinContainer = document.getElementById('pinContainer');
  // const generatedPin = document.getElementById('generatedPin');
  // const copyPinBtn = document.getElementById('copyPin');
  // const pinGenerationStatus = document.getElementById('pinGenerationStatus');
  const connectionStatus = document.getElementById('connectionStatus');
  const fillPasswordBtn = document.getElementById('fillPassword');
  const fillStatus = document.getElementById('fillStatus');

  // WebRTC connection state
  let peerConnection = null;
  let dataChannel = null;
  let connectionRole = null; // 'sender' or 'receiver'
  let encodedOffer = null;
  let connectionStartTime = 0;

  
  // Create a WebRTC configuration with Google's STUN server
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  };
  
  // Helper functions for WebRTC
  const encodeOffer = (offer) => {
    return btoa(JSON.stringify(offer));
  };

  const decodeOffer = (encodedOffer) => {
    try {
      return JSON.parse(atob(encodedOffer));
    } catch (e) {
      console.error('Error decoding offer:', e);
      return null;
    }
  };

  // Helper for showing status messages
  const showStatus = (element, message, type = '') => {
    element.textContent = message;
    element.className = 'status';
    if (type) element.classList.add(type);
  };
  
  // Initialize WebRTC peer connection
  const initPeerConnection = (role) => {
    connectionRole = role;
    
    // Close any existing connection
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    
    if (dataChannel) {
      dataChannel.close();
      dataChannel = null;
    }
    
    console.log(`Initializing peer connection as ${role}`);
    
    // Create a new RTCPeerConnection
    peerConnection = new RTCPeerConnection(rtcConfig);
    
    // Set up ICE candidate handling
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
      } else {
        console.log('ICE candidate gathering completed');
      }
    };
    
    // ICE connection state change handling
    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
      updateConnectionStatusDisplay();
    };
    
    // Connection state change handling
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      updateConnectionStatusDisplay();
      
      // If connection fails, provide feedback
      if (['failed', 'closed'].includes(peerConnection.connectionState)) {
        if (connectionRole === 'receiver') {
          showStatus(receiverCodeStatus, 'Connection failed. Please try again with a new code.', 'error');
        } else {
          showStatus(codeStatus, 'Connection failed. Please generate a new code.', 'error');
        }
      }
    };
    
    // Handle data channel events differently based on role
    if (role === 'sender') {
      console.log('Creating data channel as sender');
      // Sender creates the data channel (non-negotiated for better compatibility)
      dataChannel = peerConnection.createDataChannel('passwordChannel', {
        ordered: true // Guarantee message delivery order
      });
      setupDataChannel();
    } else {
      console.log('Waiting for data channel as receiver');
      // Receiver waits for the data channel from sender
      peerConnection.ondatachannel = (event) => {
        console.log('Data channel received from sender');
        dataChannel = event.channel;
        setupDataChannel();
      };
    }
    
    return peerConnection;
  };
  
  // Update connection status display
  const updateConnectionStatusDisplay = () => {
    if (!peerConnection) return;
    
    const iceState = peerConnection.iceConnectionState;
    const connState = peerConnection.connectionState;
    
    console.log(`Connection update - ICE: ${iceState}, Connection: ${connState}`);
    
    if (connectionRole === 'receiver') {
      if (['connected', 'completed'].includes(iceState) || connState === 'connected') {
        showStatus(connectionStatus, 'Connected', 'success');
      } else if (['checking', 'new'].includes(iceState) || ['connecting', 'new'].includes(connState)) {
        showStatus(connectionStatus, 'Connecting...', '');
      } else if (['disconnected', 'failed', 'closed'].includes(iceState) || 
                 ['disconnected', 'failed', 'closed'].includes(connState)) {
        showStatus(connectionStatus, 'Disconnected', 'error');
      }
    }
  };
  
  // Set up the data channel event listeners
  const setupDataChannel = () => {
    if (!dataChannel) {
      console.error('Cannot setup data channel: dataChannel is null');
      return;
    }
    
    console.log(`Setting up data channel (current state: ${dataChannel.readyState})`);
    
    dataChannel.onopen = () => {
      console.log(`Data channel is open! Role: ${connectionRole}`);
      
      // If we're the receiver and we just opened the channel, enable password filling immediately
      if (connectionRole === 'receiver') {
        fillPasswordBtn.disabled = false;
        showStatus(connectionStatus, 'Connected! Ready to receive password.', 'success');
        showStatus(receiverCodeStatus, 'Connection fully established.', 'success');
      } else if (connectionRole === 'sender') {
        showStatus(codeStatus, 'Connection established! Ready to send password.', 'success');
        showStatus(sendStatus, 'Data channel ready. You can send the password now.', 'success');
        // Enable password input and send button immediately for sender
        passwordInput.disabled = false;
        sendPasswordBtn.disabled = false;
      }
    };
    
    dataChannel.onclose = () => {
      console.log('Data channel is closed');
      if (connectionRole === 'receiver') {
        showStatus(connectionStatus, 'Connection closed', 'error');
        fillPasswordBtn.disabled = true;
      }
    };
    
    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      if (connectionRole === 'receiver') {
        showStatus(connectionStatus, `Connection error: ${error.message || 'Unknown error'}`, 'error');
      }
    };
    
    dataChannel.onmessage = (event) => {
      console.log('Message received:', event.data);
      try {
        const message = JSON.parse(event.data);
        handleDataChannelMessage(message);
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };
  };
  
  // Handle data channel messages
  const handleDataChannelMessage = (message) => {
    console.log('Received message:', message.type);
    
    switch (message.type) {
      // PIN-related cases commented out for debugging
      /*
      case 'pin':
        // Receiver sent a PIN for verification
        if (connectionRole === 'sender') {
          // Save PIN to background for verification
          chrome.runtime.sendMessage({
            action: 'savePin',
            pin: message.pin
          });
        }
        break;
        
      case 'pin_verified':
        // Sender verified the PIN
        if (connectionRole === 'receiver') {
          showStatus(pinGenerationStatus, 'PIN verified by sender!', 'success');
        }
        break;
      */
        
      case 'password':
        // Sender sent the password
        if (connectionRole === 'receiver') {
          // Save password to background
          chrome.runtime.sendMessage({
            action: 'savePassword',
            password: message.password
          });
          
          showStatus(connectionStatus, 'Password received! Ready to fill.', 'success');
          fillPasswordBtn.disabled = false;
        }
        break;
        
      default:
        console.warn('Unknown message type:', message.type);
    }
  };
  
  // Send a message through the data channel
  const sendDataChannelMessage = (message) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(message));
      return true;
    }
    return false;
  };
  
  // Wait for data channel to be ready and send a message
  const waitAndSendMessage = async (message, maxAttempts = 20) => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const tryToSend = () => {
        attempts++;
        console.log(`Attempt ${attempts}/${maxAttempts} to send message...`);
        
        if (!dataChannel) {
          if (attempts >= maxAttempts) {
            reject(new Error('Data channel not created after multiple attempts'));
            return;
          }
          console.log('Data channel not created yet, waiting...');
          setTimeout(tryToSend, 500);
          return;
        }
        
        if (dataChannel.readyState === 'open') {
          console.log('Data channel is open, sending message');
          const success = sendDataChannelMessage(message);
          resolve(success);
        } else if (dataChannel.readyState === 'connecting') {
          console.log('Data channel is still connecting, waiting...');
          if (attempts >= maxAttempts) {
            reject(new Error('Data channel still connecting after multiple attempts'));
          } else {
            setTimeout(tryToSend, 500);
          }
        } else if (dataChannel.readyState === 'closing' || dataChannel.readyState === 'closed') {
          reject(new Error(`Data channel is ${dataChannel.readyState}`));
        } else {
          if (attempts >= maxAttempts) {
            reject(new Error(`Data channel in unexpected state: ${dataChannel.readyState}`));
          } else {
            console.log(`Data channel in state: ${dataChannel.readyState}, waiting...`);
            setTimeout(tryToSend, 500);
          }
        }
      };
      
      tryToSend();
    });
  };

  // Tab switching handlers
  senderTab.addEventListener('click', () => {
    senderTab.classList.add('active');
    receiverTab.classList.remove('active');
    senderInterface.classList.remove('hidden');
    receiverInterface.classList.add('hidden');
  });

  receiverTab.addEventListener('click', () => {
    receiverTab.classList.add('active');
    senderTab.classList.remove('active');
    receiverInterface.classList.remove('hidden');
    senderInterface.classList.add('hidden');
  });

  // =======================================================
  // SENDER FUNCTIONALITY
  // =======================================================

  // Generate connection code (WebRTC offer)
  generateCodeBtn.addEventListener('click', async () => {
    try {
      showStatus(codeStatus, 'Generating connection code...', '');
      
      // Initialize peer connection as sender
      connectionStartTime = Date.now();
      const pc = initPeerConnection('sender');
      
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Wait for ICE gathering to complete or timeout after 5 seconds
      await new Promise(resolve => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              console.log('ICE gathering complete');
              resolve();
            }
          };
          
          pc.addEventListener('icegatheringstatechange', checkState);
          
          // Fallback in case gathering takes too long
          setTimeout(() => {
            pc.removeEventListener('icegatheringstatechange', checkState);
            console.log('ICE gathering timeout - continuing anyway');
            resolve();
          }, 5000);
        }
      });
      
      // Encode the offer for sharing
      encodedOffer = encodeOffer(pc.localDescription);
      
      // Save connection info to background
      await chrome.runtime.sendMessage({
        action: 'saveConnectionInfo',
        role: 'sender',
        encodedOffer
      });
      
      // Display the encoded offer
      connectionCode.value = encodedOffer;
      codeContainer.classList.remove('hidden');
      
      showStatus(codeStatus, 'Connection code generated! Share it with the receiver and wait for their answer code.', 'success');
      showStatus(sendStatus, 'Waiting for receiver to provide answer code...', '');
      
      // Add answer code input
      const answerContainer = document.createElement('div');
      answerContainer.className = 'input-group';
      answerContainer.innerHTML = `
        <label>Enter answer code from receiver:</label>
        <textarea id="answerCodeInput" placeholder="Paste receiver's answer code here..."></textarea>
        <button id="processAnswer">Process Answer</button>
      `;
      
      // Insert after the copy code button
      copyCodeBtn.parentNode.insertBefore(answerContainer, copyCodeBtn.nextSibling);
      
      // Handle answer processing
      document.getElementById('processAnswer').addEventListener('click', async () => {
        const answerCode = document.getElementById('answerCodeInput').value.trim();
        if (!answerCode) {
          showStatus(codeStatus, 'Please enter the answer code from receiver', 'error');
          return;
        }
        
        try {
          showStatus(codeStatus, 'Processing answer...', '');
          
          // Decode the answer
          const answer = decodeOffer(answerCode);
          if (!answer) {
            throw new Error('Invalid answer code format');
          }
          
          // Set remote description (answer)
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          
          showStatus(codeStatus, 'Answer processed! Establishing connection...', 'success');
          showStatus(sendStatus, 'Connecting to receiver...', '');
          
          // Start checking if data channel is ready for sender
          checkDataChannelReadySender();
          
        } catch (error) {
          showStatus(codeStatus, `Error processing answer: ${error.message}`, 'error');
          console.error('Answer processing error:', error);
        }
      });
      
      // Start checking if data channel is ready for sender
      // checkDataChannelReadySender();
    } catch (error) {
      showStatus(codeStatus, `Error: ${error.message}`, 'error');
      console.error('Generate code error:', error);
    }
  });

  // Copy connection code to clipboard
  copyCodeBtn.addEventListener('click', () => {
    connectionCode.select();
    document.execCommand('copy');
    showStatus(codeStatus, 'Code copied to clipboard!', 'success');
  });

  // PIN verification commented out for debugging
  /*
  // Verify PIN from receiver
  verifyPinBtn.addEventListener('click', async () => {
    const pin = pinInput.value.trim();
    if (!pin) {
      showStatus(pinStatus, 'Please enter the PIN', 'error');
      return;
    }

    try {
      showStatus(pinStatus, 'Verifying PIN...', '');
      
      // Send verification request to background script
      const response = await chrome.runtime.sendMessage({
        action: 'verifyPin',
        pin
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (response.verified) {
        showStatus(pinStatus, 'PIN verified successfully!', 'success');
        passwordInput.disabled = false;
        sendPasswordBtn.disabled = false;
        
        // Notify the receiver with retry logic
        try {
          await waitAndSendMessage({
            type: 'pin_verified'
          });
        } catch (error) {
          console.warn('Could not send pin_verified message:', error);
          // Continue anyway since the main verification succeeded
        }
      } else {
        showStatus(pinStatus, 'PIN verification failed. Please check the PIN and try again.', 'error');
      }
    } catch (error) {
      showStatus(pinStatus, `Error: ${error.message}`, 'error');
      console.error('PIN verification error:', error);
    }
  });
  */

  // Send password to receiver
  sendPasswordBtn.addEventListener('click', async () => {
    const password = passwordInput.value;
    if (!password) {
      showStatus(sendStatus, 'Please enter the password', 'error');
      return;
    }

    try {
      showStatus(sendStatus, 'Sending password securely...', '');
      
      // Send the password with retry logic
      try {
        await waitAndSendMessage({
          type: 'password',
          password
        });
        
        showStatus(sendStatus, 'Password sent successfully!', 'success');
        
        // Clear password input for security
        setTimeout(() => {
          passwordInput.value = '';
        }, 2000);
      } catch (error) {
        throw new Error(`Failed to send password: ${error.message}`);
      }
    } catch (error) {
      showStatus(sendStatus, `Error: ${error.message}`, 'error');
      console.error('Send password error:', error);
    }
  });

  // =======================================================
  // RECEIVER FUNCTIONALITY
  // =======================================================

  // Connect with sender's code (process WebRTC offer)
  connectWithCodeBtn.addEventListener('click', async () => {
    const code = receiverCodeInput.value.trim();
    if (!code) {
      showStatus(receiverCodeStatus, 'Please enter the connection code', 'error');
      return;
    }

    try {
      showStatus(receiverCodeStatus, 'Establishing connection...', '');
      
      // Decode the offer
      const offer = decodeOffer(code);
      if (!offer) {
        throw new Error('Invalid connection code format');
      }
      
      // Initialize peer connection as receiver
      connectionStartTime = Date.now();
      const pc = initPeerConnection('receiver');
      
      // Set remote description from offer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Wait for ICE gathering to complete or timeout after 5 seconds
      await new Promise(resolve => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              console.log('ICE gathering complete');
              resolve();
            }
          };
          
          pc.addEventListener('icegatheringstatechange', checkState);
          
          // Fallback in case gathering takes too long
          setTimeout(() => {
            pc.removeEventListener('icegatheringstatechange', checkState);
            console.log('ICE gathering timeout - continuing anyway');
            resolve();
          }, 5000);
        }
      });
      
      // Encode the answer and display it for manual exchange
      const encodedAnswer = encodeOffer(pc.localDescription);
      
      // Save connection info to background
      await chrome.runtime.sendMessage({
        action: 'saveConnectionInfo',
        role: 'receiver',
        encodedOffer: code,
        encodedAnswer: encodedAnswer
      });
      
      // Show the answer code that needs to be sent back to sender
      showStatus(receiverCodeStatus, 'Connection answer generated! Share this code with the sender:', 'success');
      
      // Create answer display
      const answerContainer = document.createElement('div');
      answerContainer.className = 'input-group';
      answerContainer.innerHTML = `
        <label>Share this answer code with the sender:</label>
        <textarea readonly>${encodedAnswer}</textarea>
        <button onclick="navigator.clipboard.writeText('${encodedAnswer}'); this.textContent='Copied!';">Copy Answer Code</button>
      `;
      
      // Insert after the connect button
      connectWithCodeBtn.parentNode.insertBefore(answerContainer, connectWithCodeBtn.nextSibling);
      
      showStatus(connectionStatus, 'Waiting for sender to enter answer code...', '');
      
      // Start checking if data channel is ready
      checkDataChannelReady();
      
    } catch (error) {
      showStatus(receiverCodeStatus, `Error: ${error.message}`, 'error');
      console.error('Connection error:', error);
    }
  });
  
  // Check if data channel is ready for sender
  const checkDataChannelReadySender = () => {
    console.log('Checking sender data channel readiness...');
    
    // Check if we have a data channel and it's open
    if (dataChannel && dataChannel.readyState === 'open') {
      console.log('Sender data channel is ready and open!');
      passwordInput.disabled = false;
      sendPasswordBtn.disabled = false;
      showStatus(codeStatus, 'Connection established! Ready to send password.', 'success');
      showStatus(sendStatus, 'Connection ready. You can now send the password.', 'success');
      return;
    }
    
    const elapsedTime = Date.now() - connectionStartTime;
    const isConnected = peerConnection && 
      (['connected', 'completed'].includes(peerConnection.iceConnectionState) || 
       peerConnection.connectionState === 'connected');
    
    console.log(`Sender - Elapsed time: ${elapsedTime}ms, Connection state: ${peerConnection?.connectionState}, ICE state: ${peerConnection?.iceConnectionState}`);
    console.log(`Data channel state: ${dataChannel ? dataChannel.readyState : 'not created'}`);
    
    // If connection established but no working data channel after 5 seconds, recreate it
    if (elapsedTime > 5000 && isConnected && (!dataChannel || dataChannel.readyState !== 'open')) {
      console.log('Sender: Connection established but no working data channel, recreating...');
      
      try {
        if (dataChannel && dataChannel.readyState !== 'open') {
          console.log('Closing existing non-working data channel');
          dataChannel.close();
          dataChannel = null;
        }
        
        if (!dataChannel) {
          console.log('Creating new data channel from sender side');
          dataChannel = peerConnection.createDataChannel('passwordChannelSender', {
            ordered: true
          });
          setupDataChannel();
        }
      } catch (error) {
        console.error('Error recreating sender data channel:', error);
      }
    }
    
    // If still no working data channel after 20 seconds, show error
    if (elapsedTime > 20000 && (!dataChannel || dataChannel.readyState !== 'open')) {
      showStatus(codeStatus, 'Data channel connection failed. Please generate a new code.', 'error');
      showStatus(sendStatus, 'Connection failed.', 'error');
      return;
    }
    
    // Continue checking if we don't have an open data channel yet
    if (!dataChannel || dataChannel.readyState !== 'open') {
      setTimeout(checkDataChannelReadySender, 1000);
    }
  };

  // Periodically check if data channel is ready
  const checkDataChannelReady = () => {
    console.log('Checking data channel readiness...');
    
    // Check if we have a data channel and it's open
    if (dataChannel && dataChannel.readyState === 'open') {
      console.log('Data channel is ready and open!');
      fillPasswordBtn.disabled = false;
      showStatus(connectionStatus, 'Connected! Ready to receive password.', 'success');
      showStatus(receiverCodeStatus, 'Connection fully established.', 'success');
      return;
    }
    
    // Check connection state and elapsed time
    const elapsedTime = Date.now() - connectionStartTime;
    const isConnected = peerConnection && 
      (['connected', 'completed'].includes(peerConnection.iceConnectionState) || 
       peerConnection.connectionState === 'connected');
    
    console.log(`Elapsed time: ${elapsedTime}ms, Connection state: ${peerConnection?.connectionState}, ICE state: ${peerConnection?.iceConnectionState}`);
    
    // If connection established but no data channel after 3 seconds, create one as receiver
    if (elapsedTime > 3000 && isConnected && (!dataChannel || dataChannel.readyState === 'closed')) {
      console.log('Connection established but no working data channel, creating one as receiver');
      
      try {
        if (dataChannel && dataChannel.readyState === 'closed') {
          console.log('Closing existing closed data channel');
          dataChannel.close();
          dataChannel = null;
        }
        
        if (!dataChannel) {
          console.log('Creating data channel from receiver side');
          dataChannel = peerConnection.createDataChannel('passwordChannelReceiver', {
            ordered: true
          });
          setupDataChannel();
        }
      } catch (error) {
        console.error('Error creating fallback data channel:', error);
      }
    }
    
    // Show reconnect button after 15 seconds if still no working data channel
    if (elapsedTime > 15000 && (!dataChannel || dataChannel.readyState !== 'open')) {
      showStatus(receiverCodeStatus, 'Data channel connection failed. Please try reconnecting.', 'error');
      document.getElementById('reconnectBtn').classList.remove('hidden');
      return;
    }
    
    // Continue checking if we don't have an open data channel yet
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.log(`Data channel state: ${dataChannel ? dataChannel.readyState : 'not created'}`);
      setTimeout(checkDataChannelReady, 1000);
    }
  };

  // PIN generation commented out for debugging
  /*
  // Generate PIN for verification
  generatePinBtn.addEventListener('click', async () => {
    try {
      showStatus(pinGenerationStatus, 'Generating PIN...', '');
      
      // Generate a random 6-digit PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Try to send the PIN with retry logic
      try {
        await waitAndSendMessage({
          type: 'pin',
          pin
        });
        
        // Display the PIN
        generatedPin.value = pin;
        pinContainer.classList.remove('hidden');
        
        showStatus(pinGenerationStatus, 'PIN generated! Share it with the sender.', 'success');
      } catch (error) {
        throw new Error(`Failed to send PIN: ${error.message}`);
      }
    } catch (error) {
      showStatus(pinGenerationStatus, `Error: ${error.message}`, 'error');
      console.error('PIN generation error:', error);
    }
  });

  // Copy PIN to clipboard
  copyPinBtn.addEventListener('click', () => {
    generatedPin.select();
    document.execCommand('copy');
    showStatus(pinGenerationStatus, 'PIN copied to clipboard!', 'success');
  });
  */
  
  // Add event listener for reconnect button
  document.getElementById('reconnectBtn').addEventListener('click', async () => {
    console.log('Reconnecting...');
    showStatus(pinGenerationStatus, 'Reconnecting...', '');
    
    // Clean up existing connection
    if (peerConnection) {
      if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
      }
      peerConnection.close();
      peerConnection = null;
    }
    
    // Reset UI
    document.getElementById('reconnectBtn').classList.add('hidden');
    generatePinBtn.disabled = false;
    pinContainer.classList.add('hidden');
    connectionStatus.textContent = 'Not connected';
    fillPasswordBtn.disabled = true;
    
    // Clear previous status
    showStatus(pinGenerationStatus, 'Connection reset. You can generate a new PIN now.', '');
  });

  // Fill password on Google login page
  fillPasswordBtn.addEventListener('click', async () => {
    try {
      showStatus(fillStatus, 'Filling password...', '');
      
      // Request password filling from background script
      const response = await chrome.runtime.sendMessage({
        action: 'fillPassword'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      showStatus(fillStatus, 'Password filled successfully!', 'success');
    } catch (error) {
      showStatus(fillStatus, `Error: ${error.message}`, 'error');
      console.error('Fill password error:', error);
    }
  });

  // =======================================================
  // INITIALIZATION
  // =======================================================
  
  // Check connection status when popup opens
  chrome.runtime.sendMessage({ action: 'getConnectionInfo' }, (response) => {
    if (response.error) {
      console.error('Error getting connection info:', response.error);
      return;
    }
    
    if (response.role) {
      connectionRole = response.role;
      
      // Switch to the appropriate tab
      if (connectionRole === 'sender') {
        senderTab.click();
        
        if (response.encodedOffer) {
          // Restore sender state
          codeContainer.classList.remove('hidden');
          connectionCode.value = response.encodedOffer;
          pinInput.disabled = false;
          verifyPinBtn.disabled = false;
          
          if (response.pinVerified) {
            showStatus(pinStatus, 'PIN verified successfully!', 'success');
            passwordInput.disabled = false;
            sendPasswordBtn.disabled = false;
          }
        }
      } else {
        receiverTab.click();
        
        if (response.encodedOffer) {
          // Restore receiver state
          showStatus(connectionStatus, 'Connected', 'success');
          generatePinBtn.disabled = false;
          
          if (response.pin) {
            pinContainer.classList.remove('hidden');
            generatedPin.value = response.pin;
          }
          
          if (response.passwordReceived) {
            showStatus(connectionStatus, 'Password received! Ready to fill.', 'success');
            fillPasswordBtn.disabled = false;
          }
        }
      }
    }
  });
});
