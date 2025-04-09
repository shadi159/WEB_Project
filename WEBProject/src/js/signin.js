// Function to validate user credentials
function validateCredentials(email, password) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(user => user.email === email && user.password === password);
    return user ? { valid: true, user } : { valid: false, message: 'Invalid email or password' };
}

// Function to show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4';
    errorDiv.innerHTML = `
        <span class="block sm:inline">${message}</span>
        <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
            <svg class="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
        </span>
    `;
    
    // Add click handler to remove error message
    errorDiv.querySelector('svg').addEventListener('click', () => {
        errorDiv.remove();
    });

    const form = document.getElementById('signinForm');
    form.insertBefore(errorDiv, form.firstChild);
}

// Google Sign-In handler
function handleGoogleSignIn(response) {
    console.log('Google sign-in response:', response);
    // Store user data in session storage
    sessionStorage.setItem('currentUser', JSON.stringify({
        name: response.credential.name,
        email: response.credential.email,
        picture: response.credential.picture
    }));
    window.location.href = '../index.html';
}

// Regular sign-in form handler
document.addEventListener('DOMContentLoaded', function() {
    const signInForm = document.getElementById('signinForm');
    
    if (signInForm) {
        signInForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Remove any existing error messages
            const existingError = document.querySelector('.bg-red-100');
            if (existingError) {
                existingError.remove();
            }
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Validate credentials
            const validation = validateCredentials(email, password);
            if (!validation.valid) {
                showError(validation.message);
                return;
            }
            
            // Store current user in session storage
            sessionStorage.setItem('currentUser', JSON.stringify(validation.user));
            
            // Redirect to main page
            window.location.href = 'profile.html';
        });
    }
}); 