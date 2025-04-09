// Load user data from session storage
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser) {
        // Update user info in sidebar
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('userInitials').textContent = currentUser.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();

        // Fill form with current user data
        document.getElementById('fullName').value = currentUser.name;
        document.getElementById('email').value = currentUser.email;
        document.getElementById('dob').value = currentUser.dob || '';
        document.getElementById('country').value = currentUser.country || '';
    } else {
        // Redirect to sign in if no user is logged in
        window.location.href = 'signin.html';
    }
});

// Handle settings form submission
document.getElementById('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'signin.html';
        return;
    }

    // Get form data
    const formData = {
        name: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        dob: document.getElementById('dob').value,
        country: document.getElementById('country').value
    };

    // Get password fields
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate password change if any password field is filled
    if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showMessage('Please fill all password fields to change password', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showMessage('New password must be at least 6 characters long', 'error');
            return;
        }

        // Update password in local storage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.email === currentUser.email);
        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            localStorage.setItem('users', JSON.stringify(users));
        }
    }

    // Update user data in session storage
    const updatedUser = { ...currentUser, ...formData };
    sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

    // Update user data in local storage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...formData };
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Show success message
    showMessage('Settings updated successfully', 'success');

    // Clear password fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
});

// Function to show messages
function showMessage(message, type = 'success') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`;
    
    // Add message content
    messageDiv.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
} 