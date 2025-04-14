// API endpoints
const API_ENDPOINTS = {
    posts: 'https://jsonplaceholder.typicode.com/posts',
    users: 'https://jsonplaceholder.typicode.com/users',
    comments: 'https://jsonplaceholder.typicode.com/comments'
};

// Resource categories with placeholder images from Unsplash
const RESOURCE_CATEGORIES = {
    academic: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846',
    cultural: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644',
    language: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8',
    visa: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c',
    financial: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07',
    housing: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2',
    health: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7'
};

// Transform API data into resource format
function transformApiData(posts, users, comments) {
    const categories = Object.keys(RESOURCE_CATEGORIES);
    
    return posts.slice(0, 21).map((post, index) => {
        const category = categories[index % categories.length];
        const user = users[index % users.length];
        const relatedComments = comments.slice(index * 2, index * 2 + 2);
        
        return {
            id: post.id,
            title: post.title.split(' ').slice(0, 4).map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            category: category,
            description: post.body.split('.')[0] + '.',
            image: `${RESOURCE_CATEGORIES[category]}?auto=format&fit=crop&w=800&q=80`,
            content: {
                overview: post.body,
                author: user.name,
                institution: user.company.name,
                sections: [
                    {
                        title: "Key Points",
                        content: relatedComments[0]?.body || "Detailed information about this resource."
                    },
                    {
                        title: "Implementation Steps",
                        content: relatedComments[1]?.body || "Step-by-step guide for implementation."
                    }
                ],
                resources: [
                    `${user.website} - Official Resource`,
                    `Contact: ${user.email}`,
                    `Additional Support: ${user.phone}`
                ]
            }
        };
    });
}

// Add a cache variable at the top of the file
let resourcesCache = null;

// Modify the fetchResources function
async function fetchResources(category = 'all') {
    try {
        // Show loading state only if we don't have cached data
        if (!resourcesCache) {
            const loadingHTML = `
                <div class="col-span-full flex justify-center items-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                </div>
            `;
            document.getElementById('resourcesGrid').innerHTML = loadingHTML;

            // Fetch data from all endpoints concurrently
            const [posts, users, comments] = await Promise.all([
                fetch(API_ENDPOINTS.posts).then(res => res.json()),
                fetch(API_ENDPOINTS.users).then(res => res.json()),
                fetch(API_ENDPOINTS.comments).then(res => res.json())
            ]);

            // Transform and cache the data
            resourcesCache = transformApiData(posts, users, comments);
        }

        // Return filtered resources from cache
        return category === 'all' 
            ? resourcesCache 
            : resourcesCache.filter(resource => resource.category === category);

    } catch (error) {
        console.error('Error fetching resources:', error);
        return [];
    }
}

// Modify the resource card click handler in the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async () => {
    const resourcesGrid = document.getElementById('resourcesGrid');
    const modal = document.getElementById('resourceModal');
    const modalContent = document.getElementById('modalContent');

    // Load initial resources
    const resources = await fetchResources();
    resourcesGrid.innerHTML = resources.map(createResourceCard).join('');

    // Handle category filters
    document.querySelectorAll('.resource-filter').forEach(button => {
        button.addEventListener('click', async () => {
            // Update active state
            document.querySelectorAll('.resource-filter').forEach(btn => {
                btn.classList.remove('active', 'bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-200');
            });
            button.classList.remove('bg-gray-200');
            button.classList.add('active', 'bg-blue-600', 'text-white');

            // Show loading state
            resourcesGrid.innerHTML = `
                <div class="col-span-full flex justify-center items-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                </div>
            `;

            // Fetch and display filtered resources
            const category = button.dataset.category;
            const filteredResources = await fetchResources(category);
            resourcesGrid.innerHTML = filteredResources.map(createResourceCard).join('');
        });
    });

    // Handle resource card clicks
    resourcesGrid.addEventListener('click', async (e) => {
        const card = e.target.closest('.resource-card');
        if (card) {
            const resourceId = parseInt(card.dataset.resourceId);
            // Use cached resources instead of fetching again
            const resource = resourcesCache.find(r => r.id === resourceId);
            
            if (resource) {
                modalContent.innerHTML = createModalContent(resource);
                modal.classList.remove('hidden');
            }
        }
    });

    // Handle modal close with cleanup
    const closeModal = () => {
        modal.classList.add('hidden');
        modalContent.innerHTML = ''; // Clear modal content
    };

    document.querySelector('.modal-close').addEventListener('click', closeModal);

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Add escape key listener for modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
});

// Create resource card HTML
function createResourceCard(resource) {
    return `
        <div class="resource-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300"
             data-resource-id="${resource.id}">
            <div class="relative h-48">
                <img src="${resource.image}" alt="${resource.title}" 
                     class="w-full h-full object-cover">
                <div class="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-medium text-blue-600">
                    ${resource.category}
                </div>
            </div>
            <div class="p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-2">${resource.title}</h3>
                <p class="text-gray-600 mb-4">${resource.description}</p>
                <div class="flex items-center justify-between">
                    <button class="view-resource bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                        View Guide
                    </button>
                    <span class="text-sm text-gray-500">By ${resource.content.author}</span>
                </div>
            </div>
        </div>
    `;
}

// Create modal content
function createModalContent(resource) {
    const sections = resource.content.sections.map(section => `
        <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${section.title}</h3>
            <p class="text-gray-600">${section.content}</p>
        </div>
    `).join('');

    return `
        <div class="modal-header mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">${resource.title}</h2>
            <p class="text-blue-600">${resource.content.institution}</p>
        </div>
        <div class="modal-body">
            <div class="bg-gray-50 rounded-lg p-4 mb-6">
                <p class="text-gray-700">${resource.content.overview}</p>
            </div>
            ${sections}
            <div class="mt-6 pt-6 border-t border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Additional Resources</h3>
                <ul class="list-disc pl-5 text-gray-600 space-y-2">
                    ${resource.content.resources.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    const resourcesGrid = document.getElementById('resourcesGrid');
    const modal = document.getElementById('resourceModal');
    const modalContent = document.getElementById('modalContent');

    // Load initial resources
    const resources = await fetchResources();
    resourcesGrid.innerHTML = resources.map(createResourceCard).join('');

    // Handle category filters
    document.querySelectorAll('.resource-filter').forEach(button => {
        button.addEventListener('click', async () => {
            // Update active state
            document.querySelectorAll('.resource-filter').forEach(btn => {
                btn.classList.remove('active', 'bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-200');
            });
            button.classList.remove('bg-gray-200');
            button.classList.add('active', 'bg-blue-600', 'text-white');

            // Fetch and display filtered resources
            const category = button.dataset.category;
            const filteredResources = await fetchResources(category);
            resourcesGrid.innerHTML = filteredResources.map(createResourceCard).join('');
        });
    });

    // Handle resource card clicks
    resourcesGrid.addEventListener('click', async (e) => {
        const card = e.target.closest('.resource-card');
        if (card) {
            const resourceId = parseInt(card.dataset.resourceId);
            const resources = await fetchResources();
            const resource = resources.find(r => r.id === resourceId);
            
            if (resource) {
                modalContent.innerHTML = createModalContent(resource);
                modal.classList.remove('hidden');
            }
        }
    });

    // Handle modal close
    document.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});