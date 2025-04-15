// Mock data for countries
const COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'JP', name: 'Japan' },
    { code: 'IL', name: 'Israel' }
];

// Mock data for programs
const PROGRAMS = [
    { id: 'cs', name: 'Computer Science' },
    { id: 'eng', name: 'Engineering' },
    { id: 'bus', name: 'Business Administration' },
    { id: 'med', name: 'Medicine' },
    { id: 'law', name: 'Law' },
    { id: 'art', name: 'Arts & Humanities' }
];

// Mock data for cities by country
const CITIES = {
    'US': ['New York', 'Los Angeles', 'Chicago', 'Boston', 'San Francisco'],
    'UK': ['London', 'Manchester', 'Edinburgh', 'Oxford', 'Cambridge'],
    'CA': ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary'],
    'AU': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
    'DE': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Heidelberg'],
    'FR': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux'],
    'JP': ['Tokyo', 'Osaka', 'Kyoto', 'Fukuoka', 'Sapporo'],
    'IL': ['Jerusalem', 'Tel Aviv', 'Haifa', 'Beer Sheva', 'Herzliya', 'Karmiel']
};

// Mock data for universities
const UNIVERSITIES = {
    'US': [
        {
            name: 'MIT',
            rating: 4.9,
            programs: ['cs', 'eng'],
            tuition: '$53,000/year',
            location: 'Boston',
            ranking: '#1 in Technology'
        },
        {
            name: 'Harvard University',
            rating: 4.9,
            programs: ['bus', 'med', 'law'],
            tuition: '$51,000/year',
            location: 'Boston',
            ranking: '#1 in Law & Medicine'
        }
    ],
    'UK': [
        {
            name: 'University of Oxford',
            rating: 4.8,
            programs: ['cs', 'eng', 'med', 'law'],
            tuition: '£39,000/year',
            location: 'Oxford',
            ranking: '#1 in UK'
        },
        {
            name: 'Imperial College London',
            rating: 4.7,
            programs: ['cs', 'eng'],
            tuition: '£38,000/year',
            location: 'London',
            ranking: '#1 in Engineering'
        }
    ],
    'IL': [
        {
            name: 'Hebrew University of Jerusalem',
            rating: 4.8,
            programs: ['cs', 'med', 'law', 'art'],
            tuition: '$15,000/year',
            location: 'Jerusalem',
            ranking: '#1 in Israel'
        },
        {
            name: 'Tel Aviv University',
            rating: 4.7,
            programs: ['cs', 'eng', 'bus', 'art'],
            tuition: '$14,000/year',
            location: 'Tel Aviv',
            ranking: '#2 in Israel'
        },
        {
            name: 'Technion',
            rating: 4.9,
            programs: ['cs', 'eng'],
            tuition: '$16,000/year',
            location: 'Haifa',
            ranking: '#1 in Technology'
        },
        {
            name: 'Braude College of Engineering',
            rating: 4.6,
            programs: ['cs', 'eng'],
            tuition: '$12,000/year',
            location: 'Karmiel',
            ranking: '#1 in Northern Israel Engineering'
        }
    ]
};

// Cache for API responses
const cache = {};

// Update progress steps
function updateProgressSteps(currentStep) {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        if (index < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('completed', 'active');
        }
    });
}

// Initialize journey form
function initializeJourney() {
    const fromCountrySelect = document.getElementById('fromCountry');
    const toCountrySelect = document.getElementById('toCountry');
    const citySelect = document.getElementById('city');
    const programSelect = document.getElementById('program');

    // Populate country options for both from and to country selects
    COUNTRIES.forEach(country => {
        const fromOption = document.createElement('option');
        fromOption.value = country.code;
        fromOption.textContent = country.name;
        fromCountrySelect.appendChild(fromOption);

        const toOption = document.createElement('option');
        toOption.value = country.code;
        toOption.textContent = country.name;
        toCountrySelect.appendChild(toOption);
    });

    // Populate program options
    PROGRAMS.forEach(program => {
        const option = document.createElement('option');
        option.value = program.id;
        option.textContent = program.name;
        programSelect.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    const fromCountrySelect = document.getElementById('fromCountry');
    const toCountrySelect = document.getElementById('toCountry');
    const citySelect = document.getElementById('city');
    const programSelect = document.getElementById('program');
    const nextToStep2 = document.getElementById('nextToStep2');
    const nextToStep3 = document.getElementById('nextToStep3');
    const showResults = document.getElementById('showResults');
    const backToStep1 = document.getElementById('backToStep1');
    const backToStep2 = document.getElementById('backToStep2');

    // Country selection handler
    toCountrySelect.addEventListener('change', () => {
        const selectedCountry = toCountrySelect.value;
        const cities = CITIES[selectedCountry] || [];

        // Clear and populate city options
        citySelect.innerHTML = '<option value="">Select a city</option>';
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    });

    // Next to Step 2 button handler
    nextToStep2.addEventListener('click', () => {
        const fromCountry = fromCountrySelect.value;
        const toCountry = toCountrySelect.value;
        
        if (!fromCountry || !toCountry) {
            alert('Please select both countries');
            return;
        }

        document.getElementById('step1').classList.add('hidden');
        document.getElementById('step2').classList.remove('hidden');
        updateProgressSteps(1);
    });

    // Next to Step 3 button handler
    nextToStep3.addEventListener('click', () => {
        const city = citySelect.value;
        
        if (!city) {
            alert('Please select a city');
            return;
        }

        document.getElementById('step2').classList.add('hidden');
        document.getElementById('step3').classList.remove('hidden');
        updateProgressSteps(2);
    });

    // Show Results button handler
    showResults.addEventListener('click', () => {
        const program = programSelect.value;
        
        if (!program) {
            alert('Please select a program');
            return;
        }

        displayResults(toCountrySelect.value, citySelect.value, programSelect.value);
    });

    // Back to Step 1 button handler
    backToStep1.addEventListener('click', () => {
        document.getElementById('step2').classList.add('hidden');
        document.getElementById('step1').classList.remove('hidden');
        updateProgressSteps(0);
    });

    // Back to Step 2 button handler
    backToStep2.addEventListener('click', () => {
        document.getElementById('step3').classList.add('hidden');
        document.getElementById('step2').classList.remove('hidden');
        updateProgressSteps(1);
    });
}

// Display results
function displayResults(countryCode, city, programId) {
    const resultsContainer = document.querySelector('.results-content');
    const resultsSection = document.getElementById('results');
    const universities = UNIVERSITIES[countryCode] || [];
    
    // Filter universities by city and program
    const filteredUniversities = universities.filter(uni => 
        uni.location === city && uni.programs.includes(programId)
    );

    if (filteredUniversities.length === 0) {
        resultsContainer.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-600">No universities found for the selected program in this city.</p>
                <button class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onclick="document.getElementById('step3').classList.add('hidden'); document.getElementById('step1').classList.remove('hidden'); document.getElementById('results').classList.add('hidden'); updateProgressSteps(0);">
                    Start New Search
                </button>
            </div>
        `;
    } else {
        const html = filteredUniversities.map(uni => `
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-blue-600">${uni.name}</h3>
                        <p class="text-gray-600">${uni.location}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-yellow-400 text-lg">
                            ${'★'.repeat(Math.floor(uni.rating))}${'☆'.repeat(5-Math.floor(uni.rating))}
                        </div>
                        <p class="text-sm text-gray-600">${uni.rating} / 5.0</p>
                    </div>
                </div>
                <div class="mb-4">
                    <p class="font-semibold">${uni.ranking}</p>
                    <p class="text-gray-600">Tuition: ${uni.tuition}</p>
                </div>
                <button onclick="showUniversityDetails('${uni.name}', '${uni.location}', '${uni.rating}', '${uni.tuition}', '${uni.ranking}', '${uni.programs.join(', ')}')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Learn More
                </button>
            </div>
        `).join('');

        resultsContainer.innerHTML = html;
    }

    // Hide step 3 and show results
    document.getElementById('step3').classList.add('hidden');
    resultsSection.classList.remove('hidden');
}

// Show university details in modal
function showUniversityDetails(name, location, rating, tuition, ranking, programs) {
    const modal = document.getElementById('universityModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="space-y-6">
            <div class="border-b pb-4">
                <h2 class="text-2xl font-bold text-gray-900">${name}</h2>
                <p class="text-gray-600">${location}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h3 class="font-semibold text-gray-900">Rating</h3>
                    <div class="flex items-center mt-1">
                        <div class="text-yellow-400 text-lg">
                            ${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5-Math.floor(rating))}
                        </div>
                        <span class="ml-2 text-gray-600">${rating} / 5.0</span>
                    </div>
                </div>
                <div>
                    <h3 class="font-semibold text-gray-900">Tuition</h3>
                    <p class="text-gray-600 mt-1">${tuition}</p>
                </div>
            </div>

            <div>
                <h3 class="font-semibold text-gray-900">Ranking</h3>
                <p class="text-gray-600 mt-1">${ranking}</p>
            </div>

            <div>
                <h3 class="font-semibold text-gray-900">Available Programs</h3>
                <p class="text-gray-600 mt-1">${programs}</p>
            </div>

            <div class="pt-4 border-t">
                <button onclick="closeUniversityModal()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Close
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

// Close university modal
function closeUniversityModal() {
    const modal = document.getElementById('universityModal');
    modal.classList.add('hidden');
}

// Initialize the journey when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeJourney();
    setupEventListeners();

    // Add event listener for closing modal
    document.getElementById('closeModal').addEventListener('click', closeUniversityModal);
});