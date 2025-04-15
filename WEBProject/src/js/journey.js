// API Configuration
const COUNTRIES_API_URL = 'https://restcountries.com/v3.1/all';
const CITIES_API_URL = 'https://countriesnow.space/api/v0.1/countries/cities'; // More reliable API for cities
const UNIVERSITIES_API_URL = 'http://universities.hipolabs.com/search';
const UNIVERSITY_DETAILS_API = 'https://www.topuniversities.com/universities/api/details'; // For university rankings
const TIMES_HIGHER_ED_API = 'https://www.timeshighereducation.com/api/v1/university'; // For university ratings

// Cache for API responses
const cache = {
    countries: null,
    cities: {},
    programs: null,
    universities: {}
};

// Pre-fetch countries data
async function preFetchCountries() {
    if (cache.countries) return;
    
    try {
        const response = await fetch(COUNTRIES_API_URL);
        const countries = await response.json();
        
        cache.countries = countries.map(country => ({
            code: country.cca2,
            name: country.name.common
        })).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Error pre-fetching countries:', error);
    }
}

// Fetch programs from API
async function fetchPrograms() {
    if (cache.programs) return cache.programs;
    
    // Define common university programs
    const programs = [
        {
            id: 'computer-science',
            name: 'Computer Science'
        },
        {
            id: 'business-administration',
            name: 'Business Administration'
        },
        {
            id: 'mechanical-engineering',
            name: 'Mechanical Engineering'
        },
        {
            id: 'medicine',
            name: 'Medicine'
        },
        {
            id: 'electrical-engineering',
            name: 'Electrical Engineering'
        },
        {
            id: 'psychology',
            name: 'Psychology'
        },
        {
            id: 'architecture',
            name: 'Architecture'
        },
        {
            id: 'law',
            name: 'Law'
        },
        {
            id: 'economics',
            name: 'Economics'
        },
        {
            id: 'data-science',
            name: 'Data Science'
        },
        {
            id: 'civil-engineering',
            name: 'Civil Engineering'
        },
        {
            id: 'biology',
            name: 'Biology'
        }
    ];
    
    cache.programs = programs;
    return programs;
}

// Fetch universities by filters
async function fetchUniversities(countryCode, city, programId) {
    const cacheKey = `universities_${countryCode}_${city}_${programId}`;
    if (cache.universities[cacheKey]) return cache.universities[cacheKey];
    
    try {
        // Get country name from cache
        const country = cache.countries.find(c => c.code === countryCode);
        if (!country) {
            throw new Error('Country not found');
        }

        // Fetch universities from API
        const response = await fetch(`${UNIVERSITIES_API_URL}?country=${encodeURIComponent(country.name)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const universities = await response.json();
        console.log(`Found ${universities.length} universities in ${country.name}`);

        // Normalize search terms and handle special characters
        const searchCity = city.toLowerCase()
            .trim()
            .replace(/['']/g, '') // Remove apostrophes
            .replace(/[-\s]+/g, '[\\s-]*'); // Make spaces and hyphens optional

        // Create a flexible regex pattern
        const cityPattern = new RegExp(searchCity, 'i');

        // Filter universities with more flexible matching
        const filteredUniversities = universities
            .filter(uni => {
                // If no city specified, return all universities
                if (!searchCity) return true;

                // Normalize university data for searching
                const uniCity = (uni.city || '').toLowerCase().replace(/['']/g, '');
                const uniName = (uni.name || '').toLowerCase().replace(/['']/g, '');
                const uniStateProvince = (uni.state_province || '').toLowerCase().replace(/['']/g, '');

                // Try different variations of the city name
                const cityVariations = [
                    searchCity,
                    searchCity.replace(/e/g, 'é'), // Try with accent
                    searchCity.replace(/i/g, 'í'), // Try with accent
                    searchCity.replace(/a/g, 'á'), // Try with accent
                    searchCity.split(/[\s-]+/)[0] // Try with just the first word
                ];

                // Check all variations against university data
                return cityPattern.test(uniCity) || 
                       cityPattern.test(uniName) || 
                       cityPattern.test(uniStateProvince) ||
                       cityVariations.some(variation => 
                           uniCity.includes(variation) || 
                           uniName.includes(variation) || 
                           uniStateProvince.includes(variation)
                       );
            })
            .map(uni => ({
                name: uni.name,
                location: [uni.city, uni.state_province, uni.country].filter(Boolean).join(', '),
                website: uni.web_pages && uni.web_pages.length > 0 ? uni.web_pages[0] : '#',
                domains: uni.domains || [],
                country: uni.country,
                alpha_two_code: uni.alpha_two_code,
                state_province: uni.state_province || '',
                city: uni.city || ''
            }));

        console.log(`Filtered to ${filteredUniversities.length} universities matching "${city}"`);

        // If no exact matches found, try searching in nearby cities
        if (filteredUniversities.length === 0) {
            // Try searching without city filter
            const allUniversitiesInCountry = universities.map(uni => ({
                name: uni.name,
                location: [uni.city, uni.state_province, uni.country].filter(Boolean).join(', '),
                website: uni.web_pages && uni.web_pages.length > 0 ? uni.web_pages[0] : '#',
                domains: uni.domains || [],
                country: uni.country,
                alpha_two_code: uni.alpha_two_code,
                state_province: uni.state_province || '',
                city: uni.city || '',
                distance: 'nearby' // Add distance indicator
            }));

            // Return first 5 universities in the country as alternatives
            const nearbyUniversities = allUniversitiesInCountry.slice(0, 5);
            if (nearbyUniversities.length > 0) {
                console.log(`Found ${nearbyUniversities.length} nearby universities in ${country.name}`);
                cache.universities[cacheKey] = nearbyUniversities;
                return nearbyUniversities;
            }
        }

        // Cache the results
        cache.universities[cacheKey] = filteredUniversities;
        return filteredUniversities;
    } catch (error) {
        console.error('Error fetching universities:', error);
        return [];
    }
}

// Helper function to estimate tuition based on country
function getTuitionEstimate(country) {
    const tuitionRanges = {
        'United States': { min: 20000, max: 50000 },
        'United Kingdom': { min: 15000, max: 40000 },
        'Canada': { min: 15000, max: 35000 },
        'Australia': { min: 18000, max: 45000 },
        'Germany': { min: 0, max: 5000 }, // Many German universities are free
        'France': { min: 1000, max: 15000 },
        default: { min: 5000, max: 25000 }
    };

    const range = tuitionRanges[country] || tuitionRanges.default;
    const tuition = Math.floor(Math.random() * (range.max - range.min) + range.min);
    return `$${tuition.toLocaleString()}/year`;
}

// Helper function to get university rating based on name and country
function getUniversityRating(name, country) {
    // This would ideally fetch from a real API
    // For now, we'll use a deterministic algorithm based on the university name
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rating = (4 + (hash % 10) / 10).toFixed(1); // Rating between 4.0 and 5.0
    return rating;
}

// Helper function to get university ranking based on name and country
function getUniversityRanking(name, country) {
    // This would ideally fetch from a real API
    // For now, we'll use a deterministic algorithm based on the university name
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const ranking = (hash % 500) + 1; // Ranking between 1 and 500
    return `#${ranking} in ${country}`;
}

// Fetch cities for a country
async function fetchCities(countryCode) {
    const cacheKey = `cities_${countryCode}`;
    if (cache.cities[cacheKey]) return cache.cities[cacheKey];
    
    const citySelect = document.getElementById('city');
    
    try {
        // Show loading state with spinner
        citySelect.innerHTML = `
            <option value="" disabled>
                <div class="flex items-center justify-center">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading cities...
                </div>
            </option>
        `;
        citySelect.disabled = true;
        
        // Get country name from cache
        const country = cache.countries.find(c => c.code === countryCode);
        if (!country) {
            throw new Error('Country not found');
        }
        
        // Fetch cities from API
        const response = await fetch(CITIES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                country: country.name
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Invalid cities data received');
        }
        
        // Format cities data
        const formattedCities = data.data.map(city => ({
            id: city.toLowerCase().replace(/\s+/g, '-'),
            name: city,
            countryCode: countryCode,
            state: '',
            latitude: 0,
            longitude: 0
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        // Cache the results
        cache.cities[cacheKey] = formattedCities;
        
        // Update city select
        updateCitySelect(formattedCities);
        
        return formattedCities;
    } catch (error) {
        console.error('Error fetching cities:', error);
        
        // Show error state with retry option
        citySelect.innerHTML = `
            <option value="">Error loading cities</option>
            <option value="retry">Click to retry</option>
        `;
        citySelect.disabled = false;
        
        // Add retry functionality
        citySelect.addEventListener('change', function retryHandler(e) {
            if (e.target.value === 'retry') {
                e.target.removeEventListener('change', retryHandler);
                fetchCities(countryCode);
            }
        });
        
        return [];
    }
}

// Helper function to update city select options
function updateCitySelect(cities) {
    const citySelect = document.getElementById('city');
    
    // Clear existing options
    citySelect.innerHTML = '<option value="">Select a city</option>';
    
    // Add cities
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.id;
        option.textContent = city.name;
        citySelect.appendChild(option);
    });
    
    // Enable select
    citySelect.disabled = false;
}

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
async function initializeJourney() {
    try {
        // Pre-fetch countries data
        await preFetchCountries();
        
        const fromCountrySelect = document.getElementById('fromCountry');
        const toCountrySelect = document.getElementById('toCountry');
        const programSelect = document.getElementById('program');

        // Show loading state for countries
        fromCountrySelect.innerHTML = '<option value="">Loading countries...</option>';
        toCountrySelect.innerHTML = '<option value="">Loading countries...</option>';
        fromCountrySelect.disabled = true;
        toCountrySelect.disabled = true;

        // Populate country options from cache
        fromCountrySelect.innerHTML = '<option value="">Select a country</option>';
        toCountrySelect.innerHTML = '<option value="">Select a country</option>';
        
        cache.countries.forEach(country => {
            const fromOption = document.createElement('option');
            fromOption.value = country.code;
            fromOption.textContent = country.name;
            fromCountrySelect.appendChild(fromOption);

            const toOption = document.createElement('option');
            toOption.value = country.code;
            toOption.textContent = country.name;
            toCountrySelect.appendChild(toOption);
        });

        // Enable selects
        fromCountrySelect.disabled = false;
        toCountrySelect.disabled = false;

        // Show loading state for programs
        programSelect.innerHTML = '<option value="">Loading programs...</option>';
        programSelect.disabled = true;

        // Fetch and populate programs
        const programs = await fetchPrograms();
        
        // Clear and populate program options
        programSelect.innerHTML = '<option value="">Select a program</option>';
        programs.forEach(program => {
            const option = document.createElement('option');
            option.value = program.id;
            option.textContent = program.name;
            programSelect.appendChild(option);
        });

        // Enable program select
        programSelect.disabled = false;
    } catch (error) {
        console.error('Error initializing journey:', error);
        
        // Show error states
        document.getElementById('fromCountry').innerHTML = '<option value="">Error loading countries</option>';
        document.getElementById('toCountry').innerHTML = '<option value="">Error loading countries</option>';
        document.getElementById('program').innerHTML = '<option value="">Error loading programs</option>';
        
        // Enable selects even in error state
        document.getElementById('fromCountry').disabled = false;
        document.getElementById('toCountry').disabled = false;
        document.getElementById('program').disabled = false;
    }
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
    toCountrySelect.addEventListener('change', async () => {
        const selectedCountry = toCountrySelect.value;
        if (!selectedCountry) return;
        
        try {
            await fetchCities(selectedCountry);
        } catch (error) {
            console.error('Error in country selection:', error);
            citySelect.innerHTML = '<option value="">Error loading cities</option>';
            citySelect.disabled = false;
        }
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
    showResults.addEventListener('click', async () => {
        const program = programSelect.value;
        
        if (!program) {
            alert('Please select a program');
            return;
        }

        await displayResults(toCountrySelect.value, citySelect.value, programSelect.value);
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
async function displayResults(countryCode, city, programId) {
    const resultsContainer = document.querySelector('.results-content');
    const resultsSection = document.getElementById('results');
    
    // Show loading state
    resultsContainer.innerHTML = `
        <div class="text-center py-8">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p class="text-gray-600 mt-2">Loading universities...</p>
        </div>
    `;
    resultsSection.classList.remove('hidden');
    
    // Get country name for display
    const country = cache.countries.find(c => c.code === countryCode);
    const countryName = country ? country.name : countryCode;
    
    // Fetch universities
    const universities = await fetchUniversities(countryCode, city, programId);

    if (universities.length === 0) {
        resultsContainer.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-600">No universities found in ${city}, ${countryName}.</p>
                <p class="text-gray-600 mt-2">This might be because:</p>
                <ul class="text-gray-600 mt-2 list-disc list-inside">
                    <li>The city name might be spelled differently in our database</li>
                    <li>The university might be listed under a different city</li>
                    <li>The university might not be in our database yet</li>
                </ul>
                <p class="text-gray-600 mt-4">Try:</p>
                <ul class="text-gray-600 mt-2 list-disc list-inside">
                    <li>Checking the spelling of the city</li>
                    <li>Searching for a nearby larger city</li>
                    <li>Selecting a different city in ${countryName}</li>
                </ul>
                <button class="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onclick="document.getElementById('step3').classList.add('hidden'); document.getElementById('step1').classList.remove('hidden'); document.getElementById('results').classList.add('hidden'); updateProgressSteps(0);">
                    Start New Search
                </button>
            </div>
        `;
    } else {
        const html = universities.map(uni => `
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-blue-600">${uni.name}</h3>
                        <p class="text-gray-600">${uni.location}</p>
                        ${uni.distance ? `<p class="text-yellow-600 mt-1">⚠️ This university is in a different city but might be accessible from ${city}</p>` : ''}
                    </div>
                </div>
                <div class="mb-4">
                    <p class="text-gray-600">Country: ${uni.country}</p>
                    ${uni.state_province ? `<p class="text-gray-600">State/Province: ${uni.state_province}</p>` : ''}
                    ${uni.city ? `<p class="text-gray-600">City: ${uni.city}</p>` : ''}
                    ${uni.domains.length > 0 ? `<p class="text-gray-600">Domain: ${uni.domains[0]}</p>` : ''}
                </div>
                <div class="flex space-x-4">
                    <a href="${uni.website}" target="_blank" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        Visit Website
                    </a>
                    <button onclick="showUniversityDetails('${uni.name}', '${uni.location}', '${uni.website}', '${uni.domains.join(', ')}', '${uni.country}', '${uni.state_province}')" class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                        More Info
                    </button>
                </div>
            </div>
        `).join('');

        resultsContainer.innerHTML = html;
    }

    // Hide step 3 and show results
    document.getElementById('step3').classList.add('hidden');
}

// Show university details in modal
function showUniversityDetails(name, location, website, domains, country, stateProvince) {
    const modal = document.getElementById('universityModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="space-y-6">
            <div class="border-b pb-4">
                <h2 class="text-2xl font-bold text-gray-900">${name}</h2>
                <p class="text-gray-600">${location}</p>
            </div>
            
            <div class="space-y-4">
                <div>
                    <h3 class="font-semibold text-gray-900">Country</h3>
                    <p class="text-gray-600 mt-1">${country}</p>
                </div>
                
                ${stateProvince ? `
                <div>
                    <h3 class="font-semibold text-gray-900">State/Province</h3>
                    <p class="text-gray-600 mt-1">${stateProvince}</p>
                </div>
                ` : ''}
                
                ${domains ? `
                <div>
                    <h3 class="font-semibold text-gray-900">Domains</h3>
                    <p class="text-gray-600 mt-1">${domains}</p>
                </div>
                ` : ''}
                
                <div>
                    <h3 class="font-semibold text-gray-900">Website</h3>
                    <a href="${website}" target="_blank" class="text-blue-600 hover:underline mt-1">${website}</a>
                </div>
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