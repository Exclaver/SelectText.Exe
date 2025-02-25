// background.js
const CLIENT_ID = encodeURIComponent('963962857620-ub5qr7ogishs3j4i2hui1jsua3ahjm94.apps.googleusercontent.com');
const RESPONSE_TYPE = encodeURIComponent('id_token');
const REDIRECT_URI = encodeURIComponent('https://lamomcdfocoklbenmamelleakhmpodge.chromiumapp.org');
const STATE = encodeURIComponent('fskn3');
const SCOPE = encodeURIComponent('openid email profile');
const PROMPT = encodeURIComponent('consent');

function create_oauth2_url() {
    let nonce = encodeURIComponent(Math.random().toString(36).substring(2, 15));
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&response_type=${RESPONSE_TYPE}&redirect_uri=${REDIRECT_URI}&state=${STATE}&scope=${SCOPE}&prompt=${PROMPT}&nonce=${nonce}`;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request.action);
    if (request.action === "openLogin") {
        // Open the login popup
        chrome.action.setPopup({ popup: 'login.html' });
        chrome.action.openPopup();
        return true;
      }
    if (request.action === "login") {
        try {
            chrome.identity.launchWebAuthFlow({
                url: create_oauth2_url(),
                interactive: true
            }, function(redirectUrl) {
                if (chrome.runtime.lastError) {
                    console.error('Auth Error:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                }
                if (redirectUrl) {
                    const token = new URL(redirectUrl).hash.split('&')[0].split('=')[1];
                    chrome.storage.local.set({ isAuthenticated: true, token: token }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Storage Error:', chrome.runtime.lastError);
                            sendResponse({ success: false, error: 'Storage error' });
                            return;
                        }
                        console.log('Login successful');
                        sendResponse({ success: true });
                    });
                } else {
                    console.error('No redirect URL received');
                    sendResponse({ success: false, error: "Authentication failed" });
                }
            });
            return true; // Keep message port open
        } catch (error) {
            console.error('Login Error:', error);
            sendResponse({ success: false, error: error.message });
            return false;
        }
    }

    if (request.action === "checkAuth") {
        chrome.storage.local.get(['isAuthenticated'], function(result) {
            console.log('Auth check:', result.isAuthenticated);
            sendResponse({ isAuthenticated: result.isAuthenticated === true });
        });
        return true;
    }

    if (request.action === "logout") {
        chrome.storage.local.remove(['isAuthenticated', 'token'], () => {
            if (chrome.runtime.lastError) {
                console.error('Logout Error:', chrome.runtime.lastError);
                sendResponse({ success: false, error: 'Logout failed' });
                return;
            }
            chrome.identity.clearAllCachedAuthTokens(() => {
                console.log('Logout successful');
                sendResponse({ success: true });
            });
        });
        return true;
    }

    if (request.action === "takeScreenshot") {
        chrome.tabs.captureVisibleTab(null, { format: "jpeg" }, function(dataUrl) {
            if (chrome.runtime.lastError) {
                console.error('Screenshot Error:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            console.log('Screenshot captured');
            sendResponse({ screenshot: dataUrl });
        });
        return true;
    }

    return false;
});