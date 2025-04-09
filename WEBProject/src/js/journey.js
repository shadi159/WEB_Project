// API endpoints
const COUNTRIES_API = 'https://restcountries.com/v3.1/all';
const UNIVERSITIES_API = 'http://universities.hipolabs.com/search';
const CITIES_API = 'https://countriesnow.space/api/v0.1/countries';
const WEATHER_API = 'https://api.openweathermap.org/data/2.5/weather';
const FOURSQUARE_API = 'https://api.foursquare.com/v3/places/search';
const APARTMENTS_API = 'https://api.rentcast.io/v1/listings';

// API endpoints for fake data
const USERS_API = 'https://jsonplaceholder.typicode.com/users';
const POSTS_API = 'https://jsonplaceholder.typicode.com/posts';
const COMMENTS_API = 'https://jsonplaceholder.typicode.com/comments';
const PHOTOS_API = 'https://jsonplaceholder.typicode.com/photos';

// Mock data for all locations
const MOCK_DATA = {
    'Israel': {
        'Jerusalem': {
            universities: [
                {
                    name: 'Hebrew University of Jerusalem',
                    web_pages: ['https://www.huji.ac.il/'],
                    programs: ['Computer Science', 'Data Science', 'Software Engineering', 'Artificial Intelligence', 'Business Administration', 'Medicine'],
                    rating: 4.8,
                    tuition: '$15,000/year',
                    housing: ['Student Dorms', 'Off-campus Housing', 'International Student Housing'],
                    restaurants: ['University Cafeteria', 'Kosher Dining Hall', 'Student Center Cafe']
                },
                {
                    name: 'Jerusalem College of Technology',
                    web_pages: ['https://www.jct.ac.il/'],
                    programs: ['Computer Science', 'Software Engineering', 'Business Administration', 'Engineering'],
                    rating: 4.6,
                    tuition: '$12,000/year',
                    housing: ['JCT Dorms', 'Student Apartments', 'Family Housing'],
                    restaurants: ['Campus Dining', 'Tech Cafe', 'Student Lounge']
                }
            ],
            apartments: [
                {
                    name: 'Student Heights Apartments',
                    price: '$800/month',
                    distance: '0.3 miles from Hebrew University',
                    amenities: ['Furnished', 'Wi-Fi', 'Security', 'Study Rooms'],
                    rating: 4.5
                },
                {
                    name: 'University View Residences',
                    price: '$900/month',
                    distance: '0.2 miles from campus',
                    amenities: ['Air Conditioning', 'Laundry', 'Parking', 'Gym'],
                    rating: 4.6
                },
                {
                    name: 'City Center Student Living',
                    price: '$750/month',
                    distance: '0.5 miles from university',
                    amenities: ['Balcony', 'Kitchen', 'Common Room', 'Bike Storage'],
                    rating: 4.3
                }
            ],
            attractions: [
                {
                    name: 'Old City',
                    type: 'Historical',
                    description: 'Historic walled area of Jerusalem with religious and cultural sites',
                    distance: '2.0 km from Hebrew University'
                },
                {
                    name: 'Mahane Yehuda Market',
                    type: 'Cultural',
                    description: 'Famous market with local food and culture',
                    distance: '1.5 km from city center'
                },
                {
                    name: 'Jerusalem Tech Hub',
                    type: 'Professional',
                    description: 'Modern technology center and startup ecosystem',
                    distance: '0.8 km from university'
                },
                {
                    name: 'Israel Museum',
                    type: 'Cultural',
                    description: 'National museum with art and archaeological collections',
                    distance: '1.2 km from campus'
                }
            ]
        }
    }
};

// Cache for API responses
const cache = {
    countries: null,
    universities: {},
    cities: {}
};

// Mock weather data
const MOCK_WEATHER = {
    'New York': { temp: 20, description: 'Sunny', humidity: 65, wind: 5 },
    'London': { temp: 15, description: 'Cloudy', humidity: 75, wind: 8 },
    'Toronto': { temp: 10, description: 'Partly Cloudy', humidity: 60, wind: 6 },
    'Sydney': { temp: 25, description: 'Clear', humidity: 55, wind: 4 },
    'Berlin': { temp: 18, description: 'Sunny', humidity: 70, wind: 7 },
    'Paris': { temp: 17, description: 'Partly Cloudy', humidity: 68, wind: 6 },
    'Rome': { temp: 22, description: 'Sunny', humidity: 62, wind: 5 },
    'Madrid': { temp: 24, description: 'Clear', humidity: 58, wind: 4 },
    'Tokyo': { temp: 19, description: 'Cloudy', humidity: 72, wind: 7 },
    'Seoul': { temp: 16, description: 'Partly Cloudy', humidity: 65, wind: 6 }
};

// Mock university data by country
const MOCK_UNIVERSITIES = {
    'US': [
        {
            name: 'Massachusetts Institute of Technology',
            web_pages: ['http://web.mit.edu/'],
            domains: ['mit.edu'],
            country: 'United States'
        },
        {
            name: 'Stanford University',
            web_pages: ['http://www.stanford.edu/'],
            domains: ['stanford.edu'],
            country: 'United States'
        },
        {
            name: 'Harvard University',
            web_pages: ['http://www.harvard.edu/'],
            domains: ['harvard.edu'],
            country: 'United States'
        }
    ],
    'GB': [
        {
            name: 'University of Oxford',
            web_pages: ['http://www.ox.ac.uk/'],
            domains: ['ox.ac.uk'],
            country: 'United Kingdom'
        },
        {
            name: 'University of Cambridge',
            web_pages: ['http://www.cam.ac.uk/'],
            domains: ['cam.ac.uk'],
            country: 'United Kingdom'
        },
        {
            name: 'Imperial College London',
            web_pages: ['http://www.imperial.ac.uk/'],
            domains: ['imperial.ac.uk'],
            country: 'United Kingdom'
        }
    ],
    'CA': [
        {
            name: 'University of Toronto',
            web_pages: ['http://www.utoronto.ca/'],
            domains: ['utoronto.ca'],
            country: 'Canada'
        },
        {
            name: 'University of British Columbia',
            web_pages: ['http://www.ubc.ca/'],
            domains: ['ubc.ca'],
            country: 'Canada'
        },
        {
            name: 'McGill University',
            web_pages: ['http://www.mcgill.ca/'],
            domains: ['mcgill.ca'],
            country: 'Canada'
        }
    ],
    'AU': [
        {
            name: 'University of Melbourne',
            web_pages: ['http://www.unimelb.edu.au/'],
            domains: ['unimelb.edu.au'],
            country: 'Australia'
        },
        {
            name: 'University of Sydney',
            web_pages: ['http://www.sydney.edu.au/'],
            domains: ['sydney.edu.au'],
            country: 'Australia'
        },
        {
            name: 'Australian National University',
            web_pages: ['http://www.anu.edu.au/'],
            domains: ['anu.edu.au'],
            country: 'Australia'
        }
    ],
    'FR': [
        {
            name: 'Sorbonne University',
            web_pages: ['http://www.sorbonne-universite.fr/'],
            domains: ['sorbonne-universite.fr'],
            country: 'France'
        },
        {
            name: 'École Polytechnique',
            web_pages: ['http://www.polytechnique.edu/'],
            domains: ['polytechnique.edu'],
            country: 'France'
        },
        {
            name: 'Paris Sciences et Lettres',
            web_pages: ['http://www.psl.eu/'],
            domains: ['psl.eu'],
            country: 'France'
        }
    ],
    'IT': [
        {
            name: 'University of Bologna',
            web_pages: ['http://www.unibo.it/'],
            domains: ['unibo.it'],
            country: 'Italy'
        },
        {
            name: 'Sapienza University of Rome',
            web_pages: ['http://www.uniroma1.it/'],
            domains: ['uniroma1.it'],
            country: 'Italy'
        },
        {
            name: 'Politecnico di Milano',
            web_pages: ['http://www.polimi.it/'],
            domains: ['polimi.it'],
            country: 'Italy'
        }
    ],
    'ES': [
        {
            name: 'University of Barcelona',
            web_pages: ['http://www.ub.edu/'],
            domains: ['ub.edu'],
            country: 'Spain'
        },
        {
            name: 'Complutense University of Madrid',
            web_pages: ['http://www.ucm.es/'],
            domains: ['ucm.es'],
            country: 'Spain'
        },
        {
            name: 'University of Valencia',
            web_pages: ['http://www.uv.es/'],
            domains: ['uv.es'],
            country: 'Spain'
        }
    ],
    'JP': [
        {
            name: 'University of Tokyo',
            web_pages: ['http://www.u-tokyo.ac.jp/'],
            domains: ['u-tokyo.ac.jp'],
            country: 'Japan'
        },
        {
            name: 'Kyoto University',
            web_pages: ['http://www.kyoto-u.ac.jp/'],
            domains: ['kyoto-u.ac.jp'],
            country: 'Japan'
        },
        {
            name: 'Osaka University',
            web_pages: ['http://www.osaka-u.ac.jp/'],
            domains: ['osaka-u.ac.jp'],
            country: 'Japan'
        }
    ],
    'KR': [
        {
            name: 'Seoul National University',
            web_pages: ['http://www.snu.ac.kr/'],
            domains: ['snu.ac.kr'],
            country: 'South Korea'
        },
        {
            name: 'Korea Advanced Institute of Science and Technology',
            web_pages: ['http://www.kaist.ac.kr/'],
            domains: ['kaist.ac.kr'],
            country: 'South Korea'
        },
        {
            name: 'Yonsei University',
            web_pages: ['http://www.yonsei.ac.kr/'],
            domains: ['yonsei.ac.kr'],
            country: 'South Korea'
        }
    ]
};

// Predefined country data (needed for proper country code mapping)
const COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' }
];

// Fetch countries data
async function fetchCountries() {
    if (cache.countries) return cache.countries;
    
    try {
        const response = await fetch(COUNTRIES_API);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Transform the data to match our structure
        cache.countries = data
            .filter(country => country.name.common && country.cca2) // Filter out any invalid entries
            .map(country => ({
                code: country.cca2,
                name: country.name.common
            }))
            .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
        
        return cache.countries;
    } catch (error) {
        console.error('Error fetching countries:', error);
        return [];
    }
}

// Fetch cities for a country
async function fetchCities(countryName) {
    if (cache.cities[countryName]) return cache.cities[countryName];

    try {
        // First try: Direct API call to REST Countries API for capital city
        const restCountriesResponse = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}`);
        if (restCountriesResponse.ok) {
            const countryData = await restCountriesResponse.json();
            if (countryData[0]) {
                const cities = [];
                
                // Add capital cities
                if (countryData[0].capital && countryData[0].capital.length > 0) {
                    cities.push(...countryData[0].capital);
                }
                
                // If it's a small territory or country with few cities, this might be enough
                if (cities.length > 0) {
                    cache.cities[countryName] = cities;
                    return cities;
                }
            }
        }

        // Second try: Cities API with normalized country name
        const response = await fetch(CITIES_API);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Normalize strings for comparison (remove special characters and make lowercase)
        const normalizeString = (str) => str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '');

        const normalizedCountryName = normalizeString(countryName);
        
        // Find the country data with more flexible matching
        const countryData = data.data.find(c => {
            const normalizedApiCountry = normalizeString(c.country);
            return normalizedApiCountry === normalizedCountryName ||
                   normalizedApiCountry.includes(normalizedCountryName) ||
                   normalizedCountryName.includes(normalizedApiCountry);
        });

        if (countryData && countryData.cities && countryData.cities.length > 0) {
            const cities = countryData.cities
                .filter(city => city && city.trim()) // Remove empty entries
                .slice(0, 10); // Take top 10 cities

            cache.cities[countryName] = cities;
            return cities;
        }

        // Third try: Generate a single city entry if nothing else worked
        const fallbackCity = countryName; // Use country name as city for very small territories
        cache.cities[countryName] = [fallbackCity];
        return [fallbackCity];

    } catch (error) {
        console.error(`Error fetching cities for ${countryName}:`, error);
        // Final fallback: Use country name as city
        const fallbackCity = countryName;
        cache.cities[countryName] = [fallbackCity];
        return [fallbackCity];
    }
}

// Fetch universities for a country
async function fetchUniversities(countryCode, city) {
    const cacheKey = `${countryCode}-${city}`;
    if (cache.universities[cacheKey]) return cache.universities[cacheKey];

    try {
        // Get country name from the cached countries data
        const countries = await fetchCountries();
        const country = countries.find(c => c.code === countryCode);
        if (!country) throw new Error(`Country not found for code: ${countryCode}`);

        const response = await fetch(`${UNIVERSITIES_API}?country=${encodeURIComponent(country.name)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Transform the data to match our structure
        const universities = data.map(uni => ({
            name: uni.name,
            web_pages: uni.web_pages,
            domains: uni.domains,
            country: uni.country,
            state_province: uni['state-province'],
            programs: [
                'Computer Science',
                'Computer Engineering',
                'Software Engineering',
                'Information Technology',
                'Data Science',
                'Artificial Intelligence',
                'Business Administration',
                'Engineering',
                'Medicine',
                'Arts and Design',
                'Mathematics',
                'Physics',
                'Chemistry',
                'Biology',
                'Economics'
            ],
            rating: (Math.random() * 1 + 4).toFixed(1),
            tuition: `$${Math.floor(Math.random() * 30000 + 20000)}/year`,
            housing: [
                'Student Dorms',
                'Off-campus Housing',
                'International Student Housing'
            ],
            restaurants: [
                'University Cafeteria',
                'Student Center Cafe',
                'Campus Dining Hall'
            ],
            description: `A prestigious university in ${city}, ${country.name} offering world-class education.`,
            location: city,
            contact: {
                email: uni.domains[0] ? `info@${uni.domains[0]}` : 'contact@university.edu',
                phone: `+${Math.floor(Math.random() * 10000000000)}`
            }
        }));

        cache.universities[cacheKey] = universities;
        return universities;
    } catch (error) {
        console.error('Error fetching universities:', error);
        return [];
    }
}

// Fetch weather for a city
async function fetchWeather(city) {
    // Return mock weather data
    return MOCK_WEATHER[city] || {
        temp: Math.floor(Math.random() * 30 + 10),
        description: ['Sunny', 'Cloudy', 'Partly Cloudy', 'Clear'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 40 + 40),
        wind: Math.floor(Math.random() * 10 + 2)
    };
}

// Fetch apartments for a city
async function fetchApartments(city) {
    if (cache.apartments[city]) return cache.apartments[city];

    try {
        // Fetch photos to create apartment listings
        const photosResponse = await fetch(PHOTOS_API);
        const photos = await photosResponse.json();

        // Transform photos into apartment listings
        const apartments = photos.slice(0, 10).map(photo => ({
            name: `${photo.title.split(' ').slice(0, 3).join(' ')} Apartments`,
            price: `$${Math.floor(Math.random() * 1000 + 800)}/month`,
            distance: `${(Math.random() * 2).toFixed(1)} miles from university`,
            amenities: [
                'Furnished',
                'Wi-Fi',
                'Security',
                'Study Rooms',
                'Gym',
                'Laundry'
            ].sort(() => 0.5 - Math.random()).slice(0, 4),
            rating: (Math.random() * 1 + 4).toFixed(1),
            image: photo.url,
            thumbnail: photo.thumbnailUrl,
            description: photo.title
        }));

        cache.apartments[city] = apartments;
        return apartments;
    } catch (error) {
        console.error('Error fetching apartments:', error);
        return [];
    }
}

// Fetch local attractions for a city
async function fetchAttractions(city) {
    if (cache.attractions[city]) return cache.attractions[city];

    try {
        // Fetch comments to create attractions
        const commentsResponse = await fetch(COMMENTS_API);
        const comments = await commentsResponse.json();

        // Transform comments into attractions
        const attractions = comments.slice(0, 8).map(comment => ({
            name: `${comment.name.split(' ').slice(0, 3).join(' ')} ${
                ['Park', 'Museum', 'Center', 'Gallery', 'Theater'][Math.floor(Math.random() * 5)]
            }`,
            type: ['Cultural', 'Historical', 'Entertainment', 'Educational', 'Sports'][
                Math.floor(Math.random() * 5)
            ],
            description: comment.body.slice(0, 100) + '...',
            distance: `${(Math.random() * 3 + 0.5).toFixed(1)} km from city center`,
            rating: (Math.random() * 1 + 4).toFixed(1),
            reviews: Math.floor(Math.random() * 500 + 100)
        }));

        cache.attractions[city] = attractions;
        return attractions;
    } catch (error) {
        console.error('Error fetching attractions:', error);
        return [];
    }
}

// Helper functions for data transformation
function getProgramsForUniversity(universityName) {
    // This would be replaced with actual API data
    return ['Computer Science', 'Business Administration', 'Engineering', 'Medicine'];
}

function getTuitionForCountry(country) {
    const tuitionRanges = {
        'United States': '$40,000 - $60,000/year',
        'United Kingdom': '£20,000 - £35,000/year',
        'Canada': 'CAD 25,000 - CAD 40,000/year',
        'Australia': 'AUD 30,000 - AUD 45,000/year',
        'Germany': '€0 - €20,000/year'
    };
    return tuitionRanges[country] || 'Contact university for details';
}

function getHousingOptions(universityName) {
    return [
        `${universityName} Dorms`,
        'Student Housing Complex',
        'Off-campus Apartments'
    ];
}

function getNearbyRestaurants(universityName) {
    return [
        `${universityName} Dining Hall`,
        'Campus Cafe',
        'Student Center Restaurant'
    ];
}

function getRandomAmenities() {
    const allAmenities = [
        'Furnished',
        'High-speed Internet',
        'Study Rooms',
        'Gym',
        '24/7 Security',
        'Laundry Facilities',
        'Common Areas',
        'Bike Storage',
        'Fitness Center',
        'Business Center'
    ];
    return allAmenities.sort(() => 0.5 - Math.random()).slice(0, 4);
}

// Get data functions
function getUniversities(country, city, program) {
    try {
        const cityData = MOCK_DATA[country]?.[city];
        if (!cityData) return [];
        
        return cityData.universities.filter(uni => 
            uni.programs.some(p => p.toLowerCase() === program.toLowerCase())
        );
    } catch (error) {
        console.error('Error getting universities:', error);
        return [];
    }
}

function getApartments(country, city) {
    try {
        return MOCK_DATA[country]?.[city]?.apartments || [];
    } catch (error) {
        console.error('Error getting apartments:', error);
        return [];
    }
}

function getAttractions(country, city) {
    try {
        return MOCK_DATA[country]?.[city]?.attractions || [];
    } catch (error) {
        console.error('Error getting attractions:', error);
        return [];
    }
}

// Initialize the journey process
async function initializeJourney() {
    try {
        // Step 1: Select Countries
        const fromCountrySelect = document.getElementById('fromCountry');
        const toCountrySelect = document.getElementById('toCountry');
        
        if (!fromCountrySelect || !toCountrySelect) {
            throw new Error('Required elements not found');
        }
        
        // Show loading state
        fromCountrySelect.innerHTML = '<option value="">Loading countries...</option>';
        toCountrySelect.innerHTML = '<option value="">Loading countries...</option>';
        
        // Populate country dropdowns
        const countries = await fetchCountries();
        
        // Clear loading state
        fromCountrySelect.innerHTML = '<option value="">Select country</option>';
        toCountrySelect.innerHTML = '<option value="">Select country</option>';
        
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            fromCountrySelect.appendChild(option.cloneNode(true));
            toCountrySelect.appendChild(option);
        });

        // Add event listeners with cleanup
        const nextToStep2 = document.getElementById('nextToStep2');
        if (nextToStep2) {
            nextToStep2.addEventListener('click', async () => {
                const fromCountry = fromCountrySelect.value;
                const toCountry = toCountrySelect.value;

                if (!fromCountry || !toCountry) {
                    alert('Please select both countries');
                    return;
                }

                // Show loading state
                const citySelect = document.getElementById('city');
                if (!citySelect) {
                    console.error('City select element not found');
                    return;
                }

                citySelect.innerHTML = '<option value="">Loading cities...</option>';

                // Get the selected country's name
                const selectedCountry = countries.find(c => c.code === toCountry);
                if (!selectedCountry) {
                    alert('Country not found');
                    return;
                }

                // Fetch cities for the selected country
                const cities = await fetchCities(selectedCountry.name);

                // Update cities dropdown
                citySelect.innerHTML = '<option value="">Select a city</option>';
                cities.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city;
                    option.textContent = city;
                    citySelect.appendChild(option);
                });

                // Show step 2
                const step1 = document.getElementById('step1');
                const step2 = document.getElementById('step2');
                if (step1 && step2) {
                    step1.classList.add('hidden');
                    step2.classList.remove('hidden');
                }
            });
        }

        // Step 2 to Step 1 (Back)
        const backToStep1 = document.getElementById('backToStep1');
        if (backToStep1) {
            backToStep1.addEventListener('click', () => {
                const step1 = document.getElementById('step1');
                const step2 = document.getElementById('step2');
                if (step1 && step2) {
                    step2.classList.add('hidden');
                    step1.classList.remove('hidden');
                }
            });
        }

        // Step 2 to Step 3
        const nextToStep3 = document.getElementById('nextToStep3');
        if (nextToStep3) {
            nextToStep3.addEventListener('click', async () => {
                const city = document.getElementById('city').value;
                if (!city) {
                    alert('Please select a city');
                    return;
                }

                // Get weather information for the city
                const weather = await fetchWeather(city);
                const weatherInfo = document.createElement('div');
                weatherInfo.className = 'mt-4 p-4 bg-blue-50 rounded-lg';
                weatherInfo.innerHTML = `
                    <h4 class="font-medium text-blue-900">Current Weather in ${city}</h4>
                    <p class="text-blue-700">Temperature: ${weather.temp}°C</p>
                    <p class="text-blue-700">Condition: ${weather.description}</p>
                    <p class="text-blue-700">Humidity: ${weather.humidity}%</p>
                `;
                
                const step2 = document.getElementById('step2');
                if (step2) {
                    step2.appendChild(weatherInfo);
                }

                // Show step 3
                const step3 = document.getElementById('step3');
                if (step2 && step3) {
                    step2.classList.add('hidden');
                    step3.classList.remove('hidden');
                }
            });
        }

        // Step 3 to Step 2 (Back)
        const backToStep2 = document.getElementById('backToStep2');
        if (backToStep2) {
            backToStep2.addEventListener('click', () => {
                const step2 = document.getElementById('step2');
                const step3 = document.getElementById('step3');
                if (step2 && step3) {
                    step3.classList.add('hidden');
                    step2.classList.remove('hidden');
                }
            });
        }

        // Show Results
        const showResults = document.getElementById('showResults');
        if (showResults) {
            showResults.addEventListener('click', async () => {
                const program = document.getElementById('program')?.value.toLowerCase();
                const city = document.getElementById('city')?.value;
                const toCountry = document.getElementById('toCountry')?.value;

                if (!program || !city || !toCountry) {
                    alert('Please select a program, city, and country');
                    return;
                }

                try {
                    // Show loading state
                    const mainContent = document.querySelector('.bg-white.shadow.rounded-lg.p-8');
                    if (mainContent) {
                        mainContent.innerHTML = '<div class="text-center py-8"><p class="text-gray-600">Loading results...</p></div>';
                    }

                    // Fetch universities using the actual API
                    const universities = await fetchUniversities(toCountry, city);

                    // Filter universities by program (with more flexible matching)
                    const filteredUniversities = universities.filter(uni => 
                        uni.programs.some(p => {
                            const programName = p.toLowerCase();
                            // Check for exact match or common abbreviations
                            if (program === 'cs') {
                                return programName.includes('computer science') || 
                                       programName === 'cs' || 
                                       programName.includes('computer engineering') ||
                                       programName.includes('software engineering');
                            }
                            return programName.includes(program) || 
                                   program.includes(programName);
                        })
                    );

                    // Create results HTML
                    let resultsHTML = `
                        <div class="space-y-8">
                            <h2 class="text-2xl font-bold text-gray-900">Results for ${city}, ${toCountry} - ${program}</h2>
                            
                            <!-- Universities Section -->
                            <div>
                                <h3 class="text-xl font-semibold text-gray-900 mb-4">Universities</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    `;

                    if (filteredUniversities.length === 0) {
                        resultsHTML += `
                            <div class="bg-gray-50 p-6 rounded-lg">
                                <p class="text-gray-600">No universities found for the selected program in this city.</p>
                            </div>
                        `;
                    } else {
                        filteredUniversities.forEach(university => {
                            resultsHTML += `
                                <div class="bg-gray-50 p-6 rounded-lg">
                                    <h4 class="text-lg font-semibold text-gray-900">${university.name}</h4>
                                    <p class="text-gray-600 mt-2">${university.description}</p>
                                    <div class="mt-4">
                                        <h5 class="font-medium text-gray-900">Website:</h5>
                                        <a href="${university.web_pages[0]}" target="_blank" class="text-blue-600 hover:text-blue-800">
                                            ${university.web_pages[0]}
                                        </a>
                                    </div>
                                    <div class="mt-4">
                                        <h5 class="font-medium text-gray-900">Programs:</h5>
                                        <ul class="list-disc list-inside text-gray-600">
                                            ${university.programs.map(p => `<li>${p}</li>`).join('')}
                                        </ul>
                                    </div>
                                    <div class="mt-4">
                                        <h5 class="font-medium text-gray-900">Housing Options:</h5>
                                        <ul class="list-disc list-inside text-gray-600">
                                            ${university.housing.map(option => `<li>${option}</li>`).join('')}
                                        </ul>
                                    </div>
                                    <div class="mt-4">
                                        <h5 class="font-medium text-gray-900">Nearby Restaurants:</h5>
                                        <ul class="list-disc list-inside text-gray-600">
                                            ${university.restaurants.map(restaurant => `<li>${restaurant}</li>`).join('')}
                                        </ul>
                                    </div>
                                    <div class="mt-4">
                                        <h5 class="font-medium text-gray-900">Tuition:</h5>
                                        <p class="text-gray-600">${university.tuition}</p>
                                    </div>
                                    <div class="mt-4">
                                        <h5 class="font-medium text-gray-900">Contact:</h5>
                                        <p class="text-gray-600">Email: ${university.contact.email}</p>
                                        <p class="text-gray-600">Phone: ${university.contact.phone}</p>
                                    </div>
                                    <div class="mt-2">
                                        <span class="text-yellow-500">${'★'.repeat(Math.floor(university.rating))}${'☆'.repeat(5 - Math.floor(university.rating))}</span>
                                        <span class="text-gray-600 ml-2">(${university.rating})</span>
                                    </div>
                                </div>
                            `;
                        });
                    }

                    resultsHTML += `
                                </div>
                            </div>
                        </div>
                    `;

                    // Replace form with results
                    if (mainContent) {
                        mainContent.innerHTML = resultsHTML;
                    }
                } catch (error) {
                    console.error('Error loading results:', error);
                    const mainContent = document.querySelector('.bg-white.shadow.rounded-lg.p-8');
                    if (mainContent) {
                        mainContent.innerHTML = '<div class="text-center py-8"><p class="text-red-600">Error loading results. Please try again.</p></div>';
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error initializing journey:', error);
        const mainContent = document.querySelector('.bg-white.shadow.rounded-lg.p-8');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-600">An error occurred while loading the journey planner. Please try again later.</p>
                </div>
            `;
        }
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeJourney); 