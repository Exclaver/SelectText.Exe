// login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginContainer = document.querySelector('.login-container');
    const oauthBtn = document.getElementById('oauthBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    function updateButtonVisibility(isAuthenticated) {
        oauthBtn.style.display = isAuthenticated ? 'none' : 'block';
        logoutBtn.style.display = isAuthenticated ? 'block' : 'none';
    }

    // Check authentication status on load
    chrome.runtime.sendMessage({ action: "checkAuth" }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('Auth check error:', chrome.runtime.lastError);
            return;
        }
        
        if (response && response.isAuthenticated) {
            window.location.href = 'popup.html';
        }
        updateButtonVisibility(response && response.isAuthenticated);
    });

    oauthBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "login" }, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Login error:', chrome.runtime.lastError);
                return;
            }
            
            if (response && response.success) {
                window.location.href = 'popup.html';
            } else {
                console.error('Login failed:', response ? response.error : 'Unknown error');
                // You could add UI feedback here
            }
        });
    });

    logoutBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "logout" }, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Logout error:', chrome.runtime.lastError);
                return;
            }
            
            if (response && response.success) {
                updateButtonVisibility(false);
                chrome.storage.local.clear();
            } else {
                console.error('Logout failed:', response ? response.error : 'Unknown error');
            }
        });
    });
});