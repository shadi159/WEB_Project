# EduBridge

EduBridge is a web platform designed to support students as they transition between international education systems. The project provides culturally-aware onboarding, tailored resources, and tools that help learners navigate academic expectations in a new country.

## Key Features
- **Personalized onboarding experiences:** Registration, sign-in, and profile flows (`WEBProject/src/register.html`, `WEBProject/src/signin.html`, `WEBProject/src/profile.html`) help learners capture their background and surface relevant information.
- **Cross-cultural comparisons:** Interactive comparisons of grading scales, classroom expectations, and learning styles draw from structured datasets like `education_systems.json` and `resources.json` (`WEBProject/src`), making it easier to understand differences between home and host countries.
- **Resource library and journey planning:** Curated resources, cultural stories, and a guided journey planner (`WEBProject/src/Resources.html`, `WEBProject/src/journey.html`, `WEBProject/src/js`) give students actionable next steps throughout their transition.
- **Support and community touchpoints:** Contact and about pages (`WEBProject/src/contact.html`, `WEBProject/src/about.html`) highlight the team behind EduBridge and provide direct lines for assistance.

## Project Structure
```
WEB_Project/
├── README.md
├── WEBProject/             # Primary Vite + Tailwind workspace for the EduBridge UI
│   ├── public/
│   ├── src/
│   │   ├── js/             # Page-specific interactivity written in vanilla JavaScript
│   │   ├── *.html          # Static pages that make up the EduBridge experience
│   │   ├── *.json          # Content and configuration data (education systems, resources)
│   │   └── style.css       # Shared styling layer on top of Tailwind utility classes
│   ├── package.json
│   ├── postcss.config.cjs
│   └── tailwind.config.cjs
├── WEBProjectReact/        # Placeholder for a future React implementation
├── package.json            # Workspace-level dependencies (Tailwind, Vite)
└── package-lock.json
```

## Getting Started
1. **Install dependencies**
   ```bash
   cd WEBProject
   npm install
   ```
2. **Start a local development server**
   ```bash
   npm run dev
   ```
   Vite will output a local URL (typically `http://localhost:5173`) where you can explore the EduBridge pages.
3. **Build for production**
   ```bash
   npm run build
   ```
4. **Preview the production bundle**
   ```bash
   npm run preview
   ```

## Technology Stack
- [Vite](https://vitejs.dev/) for fast development builds and bundling.
- [Tailwind CSS](https://tailwindcss.com/) to accelerate styling with utility-first classes.
- Vanilla JavaScript modules for page-level interactions.
- JSON datasets for content configuration and cultural comparisons.

## Contributing
1. Fork the repository and create a feature branch.
2. Make your changes and ensure pages load correctly in the Vite dev server.
3. Commit your updates with clear messages.
4. Open a pull request describing your improvements or fixes.

## Roadmap
- Expand the React-based implementation located in `WEBProjectReact/`.
- Integrate real authentication and persistent user profiles.
- Add analytics to track which resources are most helpful for students.

We welcome feedback and suggestions to make EduBridge an even more supportive transition companion for international students.
