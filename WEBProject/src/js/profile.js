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

    const form = document.getElementById('profileForm');
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

    const form = document.getElementById('profileForm');
    form.insertBefore(successDiv, form.firstChild);
}

// Function to load user profile data
function loadProfileData() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'signin.html';
        return;
    }

    // Find user in local storage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === currentUser.email);

    if (user) {
        // Update form fields safely
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const dobInput = document.getElementById('dob');
        const countryInput = document.getElementById('country');
        const userNameSpan = document.getElementById('userName');
        const userEmailSpan = document.getElementById('userEmail');

        if (nameInput) nameInput.value = user.name || '';
        if (emailInput) emailInput.value = user.email || '';
        if (dobInput) dobInput.value = user.dob || '';
        if (countryInput) countryInput.value = user.country || '';
        if (userNameSpan) userNameSpan.textContent = user.name || '';
        if (userEmailSpan) userEmailSpan.textContent = user.email || '';
    }
}

// Function to validate password change
function validatePasswordChange(currentPassword, newPassword, confirmNewPassword) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === currentUser.email);

    if (currentPassword && user.password !== currentPassword) {
        return { valid: false, message: 'Current password is incorrect' };
    }

    if (newPassword && newPassword.length < 6) {
        return { valid: false, message: 'New password must be at least 6 characters long' };
    }

    if (newPassword !== confirmNewPassword) {
        return { valid: false, message: 'New passwords do not match' };
    }

    return { valid: true };
}

// Function to update user profile
function updateProfile(userData) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Find and update user
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...userData };
        localStorage.setItem('users', JSON.stringify(users));
        return true;
    }
    return false;
}

// Handle menu navigation
function setupMenuNavigation() {
    const menuItems = document.querySelectorAll('nav a');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const href = item.getAttribute('href');
            
            // Handle sign out
            if (href === 'signin.html') {
                sessionStorage.removeItem('currentUser');
                window.location.href = href;
                return;
            }
            
            // Handle navigation to other pages
            if (href) {
                window.location.href = href;
                return;
            }
            
            // Remove active class from all items
            menuItems.forEach(i => i.classList.remove('bg-blue-50'));
            // Add active class to clicked item
            item.classList.add('bg-blue-50');
        });
    });
}

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    // Load profile data
    loadProfileData();

    // Setup menu navigation
    setupMenuNavigation();

    const profileForm = document.getElementById('profileForm');
    const cancelButton = document.getElementById('cancelButton');

    if (profileForm && cancelButton) {
        // Handle cancel button click
        cancelButton.addEventListener('click', function() {
            window.location.href = '../index.html';
        });

        // Handle form submission
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Remove any existing messages
            const existingMessage = document.querySelector('.bg-red-100, .bg-green-100');
            if (existingMessage) {
                existingMessage.remove();
            }

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const dob = document.getElementById('dob').value;
            const country = document.getElementById('country').value;
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            // Validate password change if any password fields are filled
            if (currentPassword || newPassword || confirmNewPassword) {
                const passwordValidation = validatePasswordChange(currentPassword, newPassword, confirmNewPassword);
                if (!passwordValidation.valid) {
                    showError(passwordValidation.message);
                    return;
                }
            }

            // Prepare user data for update
            const userData = {
                name,
                email,
                dob,
                country
            };

            // Add new password if provided
            if (newPassword) {
                userData.password = newPassword;
            }

            // Update profile
            if (updateProfile(userData)) {
                showSuccess('Profile updated successfully!');
                // Update user info in sidebar
                const userNameElement = document.getElementById('userName');
                const userEmailElement = document.getElementById('userEmail');
                if (userNameElement) userNameElement.textContent = name;
                if (userEmailElement) userEmailElement.textContent = email;
                // Clear password fields
                const currentPasswordInput = document.getElementById('currentPassword');
                const newPasswordInput = document.getElementById('newPassword');
                const confirmPasswordInput = document.getElementById('confirmNewPassword');
                if (currentPasswordInput) currentPasswordInput.value = '';
                if (newPasswordInput) newPasswordInput.value = '';
                if (confirmPasswordInput) confirmPasswordInput.value = '';
            } else {
                showError('Failed to update profile. Please try again.');
            }
        });
    }
});

// Load user data from session storage
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser) {
        // Update user info in sidebar for all pages
        const userNameElements = document.querySelectorAll('#userName');
        const userEmailElements = document.querySelectorAll('#userEmail');
        const userInitialsElements = document.querySelectorAll('#userInitials');

        userNameElements.forEach(el => el.textContent = currentUser.name);
        userEmailElements.forEach(el => el.textContent = currentUser.email);
        userInitialsElements.forEach(el => el.textContent = currentUser.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase());

        // Update profile information if on profile page
        if (document.getElementById('profileName')) {
            document.getElementById('profileName').textContent = currentUser.name;
            document.getElementById('profileEmail').textContent = currentUser.email;
            document.getElementById('profileInitials').textContent = currentUser.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase();
            document.getElementById('displayName').textContent = currentUser.name;
            document.getElementById('displayEmail').textContent = currentUser.email;
            document.getElementById('displayDob').textContent = currentUser.dob ? new Date(currentUser.dob).toLocaleDateString() : 'Not set';
            document.getElementById('displayCountry').textContent = currentUser.country || 'Not set';

            // Set member since date
            const memberSince = new Date(currentUser.createdAt || Date.now());
            document.getElementById('memberSince').textContent = memberSince.toLocaleDateString('default', { month: 'long', year: 'numeric' });
            
            // Set last updated date
            document.getElementById('lastUpdated').textContent = 'Today';
        }
    } else {
        // Redirect to sign in if no user is logged in
        window.location.href = 'signin.html';
    }
}); 