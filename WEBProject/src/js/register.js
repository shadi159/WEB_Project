// Function to check if email already exists
function isEmailExists(email) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.some(user => user.email === email);
}

// Function to validate password
function validatePassword(password, confirmPassword) {
    if (password !== confirmPassword) {
        return { valid: false, message: 'Passwords do not match' };
    }
    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    return { valid: true };
}

// Function to validate date of birth
function validateDOB(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    if (age < 13) {
        return { valid: false, message: 'You must be at least 13 years old to register' };
    }
    return { valid: true };
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

    const form = document.getElementById('registerForm');
    form.insertBefore(errorDiv, form.firstChild);
}

// Function to show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4';
    successDiv.innerHTML = `
        <span class="block sm:inline">${message}</span>
        <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
            <svg class="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
        </span>
    `;
    
    // Add click handler to remove success message
    successDiv.querySelector('svg').addEventListener('click', () => {
        successDiv.remove();
    });

    const form = document.getElementById('registerForm');
    form.insertBefore(successDiv, form.firstChild);
}

// Function to register a new user
function registerUser(userData) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    users.push(userData);
    localStorage.setItem('users', JSON.stringify(users));
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

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up form handler');
    const registerForm = document.getElementById('registerForm');
    
    if (!registerForm) {
        console.error('Register form not found!');
        return;
    }
    
    registerForm.addEventListener('submit', function(e) {
        console.log('Form submitted');
        e.preventDefault();
        
        // Remove any existing error messages
        const existingError = document.querySelector('.bg-red-100');
        if (existingError) {
            existingError.remove();
        }
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const dob = document.getElementById('dob').value;
        const country = document.getElementById('country').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        console.log('Form values:', { name, email, dob, country });
        
        // Validate email
        if (isEmailExists(email)) {
            console.log('Email exists');
            showError('Email already exists. Please use a different email or sign in.');
            return;
        }
        
        // Validate date of birth
        const dobValidation = validateDOB(dob);
        if (!dobValidation.valid) {
            console.log('DOB validation failed');
            showError(dobValidation.message);
            return;
        }
        
        // Validate password
        const passwordValidation = validatePassword(password, confirmPassword);
        if (!passwordValidation.valid) {
            console.log('Password validation failed');
            showError(passwordValidation.message);
            return;
        }
        
        // Create user object
        const userData = {
            name,
            email,
            dob,
            country,
            password, // Note: In a real application, you should hash the password
            createdAt: new Date().toISOString()
        };
        
        console.log('Saving user data:', userData);
        
        // Save user to local storage
        registerUser(userData);
        
        // Show success message
        showSuccess('Registration successful! Redirecting to sign in page...');
        
        // Redirect to sign in page after 2 seconds
        setTimeout(() => {
            window.location.href = 'signin.html';
        }, 2000);
    });
}); 