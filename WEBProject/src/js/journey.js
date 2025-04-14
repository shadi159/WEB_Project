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
const cache = {
    stories: null
};

// Student stories data
const studentData = [
    {
        name: "Maria Rodriguez",
        country: "Spain",
        university: "University of Toronto",
        program: "Computer Science",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop",
        quote: "The transition from Spain to Canada was challenging, but the supportive community at UofT made it easier."
    },
    {
        name: "Ahmed Hassan",
        country: "Egypt",
        university: "Technical University of Munich",
        program: "Engineering",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
        quote: "The German education system's focus on practical learning was exactly what I needed for my engineering career."
    },
    {
        name: "Yuki Tanaka",
        country: "Japan",
        university: "University of Melbourne",
        program: "Business Administration",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
        quote: "Studying in Australia opened my eyes to different business perspectives and helped me build a global network."
    },
    {
        name: "Sophie Dubois",
        country: "France",
        university: "University of Oxford",
        program: "International Relations",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
        quote: "The tutorial system at Oxford was different from anything I'd experienced in France, but it helped me develop critical thinking skills."
    },
    {
        name: "Carlos Silva",
        country: "Brazil",
        university: "Harvard University",
        program: "Medicine",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
        quote: "The research opportunities at Harvard have been incredible. The transition was tough, but the support system here is amazing."
    },
    {
        name: "Ling Wei",
        country: "China",
        university: "University of British Columbia",
        program: "Environmental Science",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
        quote: "UBC's focus on sustainability and environmental research perfectly aligned with my academic goals."
    }
];

// Fetch student stories
async function fetchStudentStories() {
    if (cache.stories) return cache.stories;

    try {
        // Transform student data into stories with additional information
        const stories = studentData.map(student => ({
            ...student,
            rating: (Math.random() * 1 + 4).toFixed(1),
            duration: `${Math.floor(Math.random() * 2) + 1} years`,
            achievements: [
                "Academic Excellence Scholarship",
                "Research Assistant Position",
                "International Student Ambassador"
            ][Math.floor(Math.random() * 3)]
        }));

        cache.stories = stories;
        return stories;
    } catch (error) {
        console.error('Error fetching student stories:', error);
        return [];
    }
}

// Display student stories
async function displayStudentStories() {
    const storiesContainer = document.getElementById('studentStories');
    if (!storiesContainer) return;

    try {
        // Show loading state
        storiesContainer.innerHTML = `
            <div class="w-full text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                <p class="text-gray-600">Loading inspiring stories...</p>
            </div>
        `;

        const stories = await fetchStudentStories();
        
        if (stories.length === 0) {
            storiesContainer.innerHTML = `
                <div class="w-full text-center py-8">
                    <p class="text-red-600">Failed to load stories. Please try again later.</p>
                </div>
            `;
            return;
        }

        // Create stories HTML
        const storiesHTML = `
            <div class="relative w-full col-span-full px-4 md:px-8 lg:px-12">
                <div class="overflow-x-auto pb-4 -mx-4 md:-mx-8 lg:-mx-12">
                    <div class="flex space-x-6 px-4 md:px-8 lg:px-12">
                        ${stories.map(story => `
                            <div class="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 flex-shrink-0 w-[300px] md:w-[350px]">
                                <div class="relative">
                                    <img src="${story.image}" alt="${story.name}" class="w-full h-50 object-cover">
                                    <div class="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                                        ${story.rating} ★
                                    </div>
                                </div>
                                <div class="p-6">
                                    <div class="flex items-center mb-4">
                                        <div class="flex-1">
                                            <h3 class="text-xl font-bold text-gray-900">${story.name}</h3>
                                            <p class="text-blue-600">${story.university}</p>
                                        </div>
                                    </div>
                                    <div class="space-y-2 mb-4">
                                        <p class="text-sm text-gray-600">
                                            <span class="font-semibold">From:</span> ${story.country}
                                        </p>
                                        <p class="text-sm text-gray-600">
                                            <span class="font-semibold">Program:</span> ${story.program}
                                        </p>
                                        <p class="text-sm text-gray-600">
                                            <span class="font-semibold">Duration:</span> ${story.duration}
                                        </p>
                                    </div>
                                    <div class="mb-4">
                                        <p class="text-gray-700 italic">"${story.quote}"</p>
                                    </div>
                                    <div class="bg-gray-50 rounded-lg p-3">
                                        <p class="text-sm text-gray-600">
                                            <span class="font-semibold">Achievement:</span> ${story.achievements}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <button class="absolute top-1/2 -translate-y-1/2 left-0 md:left-2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer opacity-75 hover:opacity-100 transition-opacity z-10">
                    <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                </button>
                <button class="absolute top-1/2 -translate-y-1/2 right-0 md:right-2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer opacity-75 hover:opacity-100 transition-opacity z-10">
                    <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </button>
            </div>
        `;

        storiesContainer.innerHTML = storiesHTML;

        // Add scroll functionality
        const scrollContainer = storiesContainer.querySelector('.overflow-x-auto');
        const leftButton = storiesContainer.querySelector('button:first-of-type');
        const rightButton = storiesContainer.querySelector('button:last-of-type');

        leftButton.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: -400, behavior: 'smooth' });
        });

        rightButton.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: 400, behavior: 'smooth' });
        });
    } catch (error) {
        console.error('Error displaying student stories:', error);
        storiesContainer.innerHTML = `
            <div class="w-full text-center py-8">
                <p class="text-red-600">Failed to load stories. Please try again later.</p>
            </div>
        `;
    }
}

// Function to update progress steps
function updateProgressSteps(currentStep) {
    const stepNumbers = document.querySelectorAll('.progress-step-number');
    const stepLabels = document.querySelectorAll('.progress-step-label');
    const progressBars = document.querySelectorAll('.progress-bar');

    stepNumbers.forEach((number, index) => {
        const step = index + 1;
        if (step <= currentStep) {
            number.classList.remove('bg-gray-200', 'text-gray-600');
            number.classList.add('bg-blue-600', 'text-white');
            stepLabels[index].classList.remove('text-gray-500');
            stepLabels[index].classList.add('text-gray-900');
            
            if (index > 0) {
                progressBars[index - 1].classList.remove('bg-gray-200');
                progressBars[index - 1].classList.add('bg-blue-600');
            }
        } else {
            number.classList.remove('bg-blue-600', 'text-white');
            number.classList.add('bg-gray-200', 'text-gray-600');
            stepLabels[index].classList.remove('text-gray-900');
            stepLabels[index].classList.add('text-gray-500');
            
            if (index > 0) {
                progressBars[index - 1].classList.remove('bg-blue-600');
                progressBars[index - 1].classList.add('bg-gray-200');
            }
        }
    });
}

// Initialize journey
function initializeJourney() {
    // Populate country dropdowns
    const fromCountrySelect = document.getElementById('fromCountry');
    const toCountrySelect = document.getElementById('toCountry');
    
    if (fromCountrySelect && toCountrySelect) {
        COUNTRIES.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            fromCountrySelect.appendChild(option.cloneNode(true));
            toCountrySelect.appendChild(option.cloneNode(true));
        });
    }

    // Populate programs dropdown
    const programSelect = document.getElementById('program');
    if (programSelect) {
        PROGRAMS.forEach(program => {
            const option = document.createElement('option');
            option.value = program.id;
            option.textContent = program.name;
            programSelect.appendChild(option);
        });
    }

    // Add event listeners
    setupEventListeners();
}

// Event listener setup
function setupEventListeners() {
    // Step 1 to Step 2
    const nextToStep2 = document.getElementById('nextToStep2');
    if (nextToStep2) {
        nextToStep2.addEventListener('click', () => {
            const fromCountry = document.getElementById('fromCountry').value;
            const toCountry = document.getElementById('toCountry').value;

            if (!fromCountry || !toCountry) {
                alert('Please select both countries');
                return;
            }

            // Populate cities dropdown
            const citySelect = document.getElementById('city');
            const cities = CITIES[toCountry] || [];
            
            citySelect.innerHTML = '<option value="">Select a city</option>';
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });

            // Show step 2
            document.getElementById('step1').classList.add('hidden');
            document.getElementById('step2').classList.remove('hidden');
            updateProgressSteps(2);
        });
    }

    // Step 2 to Step 3
    const nextToStep3 = document.getElementById('nextToStep3');
    if (nextToStep3) {
        nextToStep3.addEventListener('click', () => {
            const city = document.getElementById('city').value;
            if (!city) {
                alert('Please select a city');
                return;
            }

            // Show step 3
            document.getElementById('step2').classList.add('hidden');
            document.getElementById('step3').classList.remove('hidden');
            updateProgressSteps(3);
        });
    }

    // Back buttons
    const backToStep1 = document.getElementById('backToStep1');
    if (backToStep1) {
        backToStep1.addEventListener('click', () => {
            document.getElementById('step2').classList.add('hidden');
            document.getElementById('step1').classList.remove('hidden');
            updateProgressSteps(1);
        });
    }

    const backToStep2 = document.getElementById('backToStep2');
    if (backToStep2) {
        backToStep2.addEventListener('click', () => {
            document.getElementById('step3').classList.add('hidden');
            document.getElementById('step2').classList.remove('hidden');
            updateProgressSteps(2);
        });
    }

    // Show Results
    const showResults = document.getElementById('showResults');
    if (showResults) {
        showResults.addEventListener('click', () => {
            const toCountry = document.getElementById('toCountry').value;
            const city = document.getElementById('city').value;
            const program = document.getElementById('program').value;

            if (!toCountry || !city || !program) {
                alert('Please fill in all fields');
                return;
            }

            displayResults(toCountry, city, program);
        });
    }
}

// Display results
function displayResults(countryCode, city, programId) {
    const universities = UNIVERSITIES[countryCode] || [];
    const filteredUniversities = universities.filter(uni => 
        uni.location === city && uni.programs.includes(programId)
    );

    const mainContent = document.querySelector('.bg-white.shadow.rounded-lg.p-8');
    if (!mainContent) return;

    if (filteredUniversities.length === 0) {
        mainContent.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-600">No universities found matching your criteria.</p>
                <p class="text-gray-500 mt-2">Try selecting a different program or city.</p>
            </div>
        `;
        return;
    }

    const resultsHTML = `
        <div class="space-y-8">
            <h2 class="text-2xl font-bold text-gray-900">Universities in ${city}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${filteredUniversities.map(uni => `
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-900">${uni.name}</h3>
                        <div class="mt-2 flex items-center">
                            <span class="text-yellow-400">${'★'.repeat(Math.floor(uni.rating))}</span>
                            <span class="text-gray-600 ml-2">${uni.rating}</span>
                        </div>
                        <p class="mt-2 text-gray-600">${uni.ranking}</p>
                        <p class="mt-2 text-blue-600 font-semibold">${uni.tuition}</p>
                        <div class="mt-4">
                            <h4 class="font-semibold text-gray-700">Available Programs:</h4>
                            <ul class="mt-1 list-disc list-inside text-gray-600">
                                ${uni.programs.map(pid => 
                                    `<li>${PROGRAMS.find(p => p.id === pid)?.name || pid}</li>`
                                ).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    mainContent.innerHTML = resultsHTML;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeJourney();
    displayStudentStories();
});