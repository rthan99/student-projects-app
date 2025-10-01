// Simple password protection for the website
// Password: NEMOxDelft

(function() {
  const CORRECT_PASSWORD = 'NEMOxDelft';
  const AUTH_KEY = 'studentProjectsAuth';
  const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Check if user is already authenticated
  function isAuthenticated() {
    const authData = localStorage.getItem(AUTH_KEY);
    if (!authData) return false;

    try {
      const { timestamp, authenticated } = JSON.parse(authData);
      const now = Date.now();
      
      // Check if session is still valid (within 24 hours)
      if (authenticated && (now - timestamp) < SESSION_DURATION) {
        return true;
      }
    } catch (e) {
      return false;
    }

    return false;
  }

  // Set authentication
  function setAuthenticated() {
    const authData = {
      authenticated: true,
      timestamp: Date.now()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
  }

  // Show login screen
  function showLoginScreen() {
    // Hide main content
    document.body.style.overflow = 'hidden';
    
    // Create login overlay
    const loginHTML = `
      <div id="authOverlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      ">
        <div style="
          background: white;
          border: 2px solid #1e293b;
          padding: 40px;
          max-width: 400px;
          width: 90%;
          text-align: center;
        ">
          <h1 style="
            margin: 0 0 10px 0;
            font-size: 2rem;
            color: #1e293b;
            font-weight: 700;
          ">DEF Projects</h1>
          
          <p style="
            margin: 0 0 30px 0;
            color: #64748b;
            font-size: 0.95rem;
          ">Enter the access code to continue</p>
          
          <form id="authForm" style="margin-bottom: 20px;">
            <input 
              type="password" 
              id="passwordInput" 
              placeholder="Enter password"
              autocomplete="off"
              style="
                width: 100%;
                padding: 12px 16px;
                border: 1px solid #d1d5db;
                font-size: 16px;
                margin-bottom: 15px;
                box-sizing: border-box;
                background: #ffffff;
              "
              required
            />
            
            <button 
              type="submit"
              style="
                width: 100%;
                padding: 12px 24px;
                background: #1e293b;
                color: white;
                border: none;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s ease;
              "
              onmouseover="this.style.background='#0f172a'"
              onmouseout="this.style.background='#1e293b'"
            >
              Access Projects
            </button>
          </form>
          
          <div id="authError" style="
            color: #dc2626;
            font-size: 0.9rem;
            margin-top: 10px;
            display: none;
          ">
            Incorrect password. Please try again.
          </div>
        </div>
      </div>
    `;

    // Insert login screen
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = loginHTML;
    document.body.insertBefore(tempDiv.firstChild, document.body.firstChild);

    // Handle form submission
    const form = document.getElementById('authForm');
    const passwordInput = document.getElementById('passwordInput');
    const errorDiv = document.getElementById('authError');

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const enteredPassword = passwordInput.value;
      
      if (enteredPassword === CORRECT_PASSWORD) {
        // Correct password
        setAuthenticated();
        document.getElementById('authOverlay').remove();
        document.body.style.overflow = 'auto';
        
        // Show success message briefly
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #1e293b;
          color: white;
          padding: 15px 25px;
          z-index: 10000;
          font-weight: 600;
        `;
        successMsg.textContent = '✓ Access granted';
        document.body.appendChild(successMsg);
        
        setTimeout(() => successMsg.remove(), 2000);
      } else {
        // Incorrect password
        errorDiv.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
        
        // Shake animation
        passwordInput.style.animation = 'shake 0.5s';
        setTimeout(() => {
          passwordInput.style.animation = '';
        }, 500);
      }
    });

    // Focus password input
    passwordInput.focus();
  }

  // Add shake animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }
  `;
  document.head.appendChild(style);

  // Check authentication on page load
  if (!isAuthenticated()) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showLoginScreen);
    } else {
      showLoginScreen();
    }
  }

  // Add logout function (optional - for testing)
  window.logout = function() {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };
  
  console.log('🔒 Password protection active. Session expires in 24 hours.');
  console.log('To logout, run: logout()');
})();

