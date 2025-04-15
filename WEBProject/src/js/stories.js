// Check if the stories module has already been initialized
if (typeof window.storiesModule === 'undefined') {
    window.storiesModule = true;

    // API endpoints for story data
    const USERS_API = 'https://jsonplaceholder.typicode.com/users';
    const POSTS_API = 'https://jsonplaceholder.typicode.com/posts';

    // Profile images from UI Faces (reliable free API)
    const PROFILE_IMAGES = [
        'https://i.pravatar.cc/150?img=1',
        'https://i.pravatar.cc/150?img=2',
        'https://i.pravatar.cc/150?img=3',
        'https://i.pravatar.cc/150?img=4',
        'https://i.pravatar.cc/150?img=5',
        'https://i.pravatar.cc/150?img=6'
    ];

    // Fallback avatar for when an image fails to load
    const FALLBACK_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlNWU3ZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIyMCIgZmlsbD0iI2ExYTFhYSIvPjxwYXRoIGQ9Ik0yMCA4MEMyMCA2MCAzMCA1MCA1MCA1MEM3MCA1MCA4MCA2MCA4MCA4MEw4MCA5MEwyMCA5MEwyMCA4MFoiIGZpbGw9IiNhMWExYWEiLz48L3N2Zz4=';

    // Generate student story data
    async function generateStudentStories() {
        console.log('Fetching student stories...');
        try {
            console.log('Fetching data from APIs...');
            const [usersResponse, postsResponse] = await Promise.all([
                fetch(USERS_API).catch(error => {
                    console.error('Error fetching users:', error);
                    throw error;
                }),
                fetch(POSTS_API).catch(error => {
                    console.error('Error fetching posts:', error);
                    throw error;
                })
            ]);

            console.log('Parsing JSON responses...');
            const [users, posts] = await Promise.all([
                usersResponse.json().catch(error => {
                    console.error('Error parsing users JSON:', error);
                    throw error;
                }),
                postsResponse.json().catch(error => {
                    console.error('Error parsing posts JSON:', error);
                    throw error;
                })
            ]);

            console.log('Generating stories from fetched data...');
            // Generate 6 student stories
            const stories = users.slice(0, 6).map((user, index) => {
                const post = posts[index];
                
                // Generate random education details
                const countries = ['United States', 'United Kingdom', 'Germany', 'China', 'Israel', 'Italy'];
                const universities = ['Harvard University', 'Oxford University', 'Technical University of Munich', 
                                   'Tsinghua University', 'Tel Aviv University', 'University of Bologna'];
                const programs = ['Computer Science', 'Business Administration', 'Engineering', 
                                'Data Science', 'International Relations', 'Medicine'];
                
                return {
                    id: user.id,
                    name: user.name,
                    avatar: PROFILE_IMAGES[index],
                    fromCountry: countries[Math.floor(Math.random() * countries.length)],
                    toCountry: countries[Math.floor(Math.random() * countries.length)],
                    university: universities[Math.floor(Math.random() * universities.length)],
                    program: programs[Math.floor(Math.random() * programs.length)],
                    story: post.body,
                    rating: Math.floor(Math.random() * 2) + 4, // Random rating between 4-5
                    year: 2020 + Math.floor(Math.random() * 4) // Random year between 2020-2023
                };
            });

            console.log('Successfully generated stories:', stories);
            return stories;
        } catch (error) {
            console.error('Error in generateStudentStories:', error);
            // Return fallback data if API calls fail
            return generateFallbackStories();
        }
    }

    // Fallback data in case API calls fail
    function generateFallbackStories() {
        console.log('Generating fallback stories...');
        return [
            {
                id: 1,
                name: "Sarah Johnson",
                avatar: PROFILE_IMAGES[0],
                fromCountry: "United States",
                toCountry: "Germany",
                university: "Technical University of Munich",
                program: "Computer Science",
                story: "My journey from the US to Germany was challenging but rewarding. The different teaching methods and cultural experiences have broadened my perspective significantly.",
                rating: 5,
                year: 2023
            },
            {
                id: 2,
                name: "David Chen",
                avatar: PROFILE_IMAGES[1],
                fromCountry: "China",
                toCountry: "United Kingdom",
                university: "Oxford University",
                program: "Business Administration",
                story: "Transitioning from Chinese to British education was a big step. The emphasis on independent research and critical thinking has transformed my approach to learning.",
                rating: 4,
                year: 2022
            },
            {
                id: 3,
                name: "Maria Garcia",
                avatar: PROFILE_IMAGES[2],
                fromCountry: "Spain",
                toCountry: "Israel",
                university: "Tel Aviv University",
                program: "Data Science",
                story: "The innovative tech scene in Israel and the practical approach to education at TAU have given me invaluable skills for my career in data science.",
                rating: 5,
                year: 2023
            }
        ];
    }

    // Display student stories
    async function displayStudentStories() {
        console.log('Starting displayStudentStories function...');
        const container = document.getElementById('studentStories');
        if (!container) {
            console.error('Student stories container not found!');
            return;
        }

        // Create modal element if it doesn't exist
        if (!document.getElementById('storyModal')) {
            const modalHTML = `
                <div id="storyModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-2xl w-full p-6 relative">
                            <button id="closeModal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                            <div id="modalContent"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Add event listener for closing the modal
            document.getElementById('closeModal').addEventListener('click', () => {
                document.getElementById('storyModal').classList.add('hidden');
            });

            // Close modal when clicking outside
            document.getElementById('storyModal').addEventListener('click', (e) => {
                if (e.target === document.getElementById('storyModal')) {
                    document.getElementById('storyModal').classList.add('hidden');
                }
            });
        }

        container.innerHTML = `
            <div class="col-span-full text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                <p class="mt-4 text-gray-600">Loading student stories...</p>
            </div>
        `;

        try {
            console.log('Fetching stories...');
            const stories = await generateStudentStories();
            console.log('Stories fetched successfully:', stories);
            
            // Store stories in window.storiesData for modal access
            window.storiesData = stories;
            
            const html = stories.map(story => `
                <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
                    <div class="flex items-center mb-4">
                        <img src="${story.avatar}" 
                             alt="${story.name}" 
                             class="w-12 h-12 rounded-full mr-4 object-cover"
                             onerror="this.onerror=null; this.src='${FALLBACK_AVATAR}';">
                        <div>
                            <h3 class="font-bold text-lg">${story.name}</h3>
                            <p class="text-sm text-gray-600">${story.program}</p>
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">
                            From <span class="font-semibold">${story.fromCountry}</span> to 
                            <span class="font-semibold">${story.toCountry}</span>
                        </p>
                        <p class="text-sm text-gray-600">${story.university} • ${story.year}</p>
                    </div>

                    <div class="mb-4">
                        <div class="flex items-center mb-2">
                            ${'★'.repeat(story.rating)}${'☆'.repeat(5-story.rating)}
                            <span class="ml-2 text-sm text-gray-600">${story.rating}/5</span>
                        </div>
                        <p class="text-gray-700">${story.story.slice(0, 150)}...</p>
                    </div>

                    <button onclick="showFullStory(${story.id})" class="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                        Read Full Story →
                    </button>
                </div>
            `).join('');

            container.innerHTML = html;
            console.log('Stories displayed successfully');
        } catch (error) {
            console.error('Error in displayStudentStories:', error);
            container.innerHTML = `
                <div class="col-span-full text-center text-red-600 py-8">
                    <p>Error loading student stories. Please try again later.</p>
                    <button onclick="displayStudentStories()" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        Retry Loading Stories
                    </button>
                </div>
            `;
        }
    }

    // Function to show the full story in a modal
    window.showFullStory = function(storyId) {
        const stories = window.storiesData || [];
        const story = stories.find(s => s.id === storyId);
        
        if (story) {
            const modalContent = document.getElementById('modalContent');
            modalContent.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-center">
                        <img src="${story.avatar}" 
                             alt="${story.name}" 
                             class="w-16 h-16 rounded-full mr-4 object-cover"
                             onerror="this.onerror=null; this.src='${FALLBACK_AVATAR}';">
                        <div>
                            <h2 class="text-2xl font-bold">${story.name}</h2>
                            <p class="text-gray-600">${story.program} at ${story.university}</p>
                        </div>
                    </div>
                    
                    <div class="border-t border-b py-4 my-4">
                        <p class="text-gray-600">
                            <span class="font-semibold">From:</span> ${story.fromCountry}<br>
                            <span class="font-semibold">To:</span> ${story.toCountry}<br>
                            <span class="font-semibold">Year:</span> ${story.year}
                        </p>
                    </div>

                    <div class="mb-4">
                        <div class="flex items-center mb-2">
                            ${'★'.repeat(story.rating)}${'☆'.repeat(5-story.rating)}
                            <span class="ml-2 text-gray-600">${story.rating}/5</span>
                        </div>
                    </div>

                    <div class="prose max-w-none">
                        <p class="text-gray-700 whitespace-pre-line">${story.story}</p>
                    </div>
                </div>
            `;
            
            document.getElementById('storyModal').classList.remove('hidden');
        }
    };

    // Initialize stories when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing student stories...');
        displayStudentStories();
    });
} 