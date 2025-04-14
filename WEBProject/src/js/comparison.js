// API endpoints for fake data
const POSTS_API = 'https://jsonplaceholder.typicode.com/posts';
const COMMENTS_API = 'https://jsonplaceholder.typicode.com/comments';
const USERS_API = 'https://jsonplaceholder.typicode.com/users';

// Available countries for comparison
const COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'CN', name: 'China' },
    { code: 'IL', name: 'Israel' },
    { code: 'IT', name: 'Italy' },
    { code: 'FR', name: 'France' },
    { code: 'JP', name: 'Japan' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' }
];

// Generate education system data from API responses
async function generateEducationSystemData(countryCode, posts, comments, users) {
    const country = COUNTRIES.find(c => c.code === countryCode);
    const randomPost = posts[Math.floor(Math.random() * posts.length)];
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomComments = comments
        .slice(0, 3)
        .map(comment => ({
            name: comment.name,
            review: comment.body.slice(0, 150) + '...'
        }));

    // Generate degree structure
    const degrees = [
        `Bachelor's Degree (${Math.floor(Math.random() * 2) + 3} years)`,
        `Master's Degree (${Math.floor(Math.random() * 2) + 1} years)`,
        `Ph.D. (${Math.floor(Math.random() * 3) + 3} years)`
    ];

    // Generate random statistics
    const statistics = {
        internationalStudents: Math.floor(Math.random() * 30 + 10) + '%',
        completionRate: Math.floor(Math.random() * 20 + 75) + '%',
        employmentRate: Math.floor(Math.random() * 15 + 80) + '%',
        averageTuition: '$' + (Math.floor(Math.random() * 30) + 10) + 'k/year'
    };

    // Generate random features using post titles
    const features = posts
        .slice(0, 4)
        .map(post => post.title.split(' ').slice(0, 4).join(' '));

    return {
        code: countryCode,
        name: country.name,
        university: randomUser.company.name + ' University',
        degrees,
        grading: generateGradingSystem(),
        academicYear: generateAcademicYear(),
        features,
        statistics,
        insights: randomPost.body,
        reviews: randomComments,
        contact: {
            email: randomUser.email,
            phone: randomUser.phone,
            website: 'www.' + randomUser.website
        }
    };
}

// Helper function to generate random grading system
function generateGradingSystem() {
    const systems = [
        'Letter grades (A, B, C, D, F) with GPA system (4.0 scale)',
        'Percentage scale (0-100)',
        'First Class, Upper Second, Lower Second, Third Class honors',
        '1.0-6.0 scale (1.0 being best)',
        'S (Excellent), A, B, C, F scale'
    ];
    return systems[Math.floor(Math.random() * systems.length)];
}

// Helper function to generate random academic year
function generateAcademicYear() {
    const years = [
        'September to June',
        'October to July',
        'August to May',
        'April to March',
        'February to November'
    ];
    return years[Math.floor(Math.random() * years.length)];
}

// Fetch and transform comparison data
async function fetchComparisonData(country1, country2) {
    try {
        const [postsResponse, commentsResponse, usersResponse] = await Promise.all([
            fetch(POSTS_API),
            fetch(COMMENTS_API),
            fetch(USERS_API)
        ]);

        const [posts, comments, users] = await Promise.all([
            postsResponse.json(),
            commentsResponse.json(),
            usersResponse.json()
        ]);

        const comparisonData = await Promise.all([
            generateEducationSystemData(country1, posts, comments, users),
            generateEducationSystemData(country2, posts, comments, users)
        ]);

        return comparisonData;
    } catch (error) {
        console.error('Error fetching comparison data:', error);
        throw error;
    }
}

// Display comparison data in the HTML
async function displayComparison(country1, country2) {
    const container = document.getElementById('education-data');
    if (!container) return;

    container.innerHTML = '<div class="col-span-12 text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div><p class="mt-4 text-gray-600">Loading comparison data...</p></div>';

    try {
        const data = await fetchComparisonData(country1, country2);
        
        const html = data.map(system => `
            <div class="col-span-12 md:col-span-6 bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
                <div class="border-b pb-4 mb-4">
                    <h3 class="text-2xl font-bold text-blue-600 mb-2">${system.name}</h3>
                    <p class="text-gray-600">${system.university}</p>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-lg mb-2">Degree Structure</h4>
                    <ul class="list-disc pl-5 text-gray-600 space-y-1">
                        ${system.degrees.map(degree => `<li>${degree}</li>`).join('')}
                    </ul>
                </div>

                <div class="mb-6">
                    <h4 class="font-semibold text-lg mb-2">Key Features</h4>
                    <ul class="list-disc pl-5 text-gray-600 space-y-1">
                        ${system.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                </div>

                <div class="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-lg mb-3">Statistics</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-2xl font-bold text-blue-600">${system.statistics.internationalStudents}</p>
                            <p class="text-sm text-gray-600">International Students</p>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-blue-600">${system.statistics.completionRate}</p>
                            <p class="text-sm text-gray-600">Completion Rate</p>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-blue-600">${system.statistics.employmentRate}</p>
                            <p class="text-sm text-gray-600">Employment Rate</p>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-blue-600">${system.statistics.averageTuition}</p>
                            <p class="text-sm text-gray-600">Average Tuition</p>
                        </div>
                    </div>
                </div>

                <div class="mb-6">
                    <h4 class="font-semibold text-lg mb-2">Academic Calendar</h4>
                    <p class="text-gray-600">${system.academicYear}</p>
                </div>

                <div class="mb-6">
                    <h4 class="font-semibold text-lg mb-2">Grading System</h4>
                    <p class="text-gray-600">${system.grading}</p>
                </div>

                <div class="mb-6">
                    <h4 class="font-semibold text-lg mb-2">Student Reviews</h4>
                    ${system.reviews.map(review => `
                        <div class="mb-4 p-4 bg-gray-50 rounded">
                            <p class="font-semibold text-gray-800">${review.name}</p>
                            <p class="text-gray-600 mt-1">${review.review}</p>
                        </div>
                    `).join('')}
                </div>

                <div class="border-t pt-4">
                    <h4 class="font-semibold text-lg mb-2">Contact Information</h4>
                    <div class="text-gray-600">
                        <p><span class="font-medium">Email:</span> ${system.contact.email}</p>
                        <p><span class="font-medium">Phone:</span> ${system.contact.phone}</p>
                        <p><span class="font-medium">Website:</span> ${system.contact.website}</p>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `
            <div class="col-span-12 text-center text-red-600 py-8">
                Error loading education system comparisons. Please try again later.
            </div>
        `;
    }
}

// Initialize comparison functionality
document.addEventListener('DOMContentLoaded', () => {
    const country1Select = document.getElementById('country1');
    const country2Select = document.getElementById('country2');
    const compareBtn = document.getElementById('compareBtn');

    // Populate country select options
    COUNTRIES.forEach(country => {
        const option1 = document.createElement('option');
        option1.value = country.code;
        option1.textContent = country.name;
        country1Select.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = country.code;
        option2.textContent = country.name;
        country2Select.appendChild(option2);
    });

    compareBtn.addEventListener('click', () => {
        const country1 = country1Select.value;
        const country2 = country2Select.value;

        if (!country1 || !country2) {
            alert('Please select both countries to compare.');
            return;
        }

        if (country1 === country2) {
            alert('Please select two different countries to compare.');
            return;
        }

        displayComparison(country1, country2);
    });
}); 