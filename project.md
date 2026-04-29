# FundXProut Project Overview

## Repository Structure

```
fundxprout/
├─ .gitignore                         # Git ignore rules for the entire repo
├─ docker-compose.yml                 # Docker compose config for frontend and backend services
├─ package.json                       # npm workspace manifest for frontend/backend
├─ package-lock.json                  # lockfile for root dependency versions
├─ ai/                                # AI scoring and campaign analysis
│  ├─ requirements.txt                # Python dependencies for AI scripts
│  ├─ score_campaigns.py              # campaign scoring and risk analysis script
│  └─ models/
│     └─ feature_columns.json         # feature schema used by AI scoring
├─ backend/                           # Express API and Supabase integration
│  ├─ .dockerignore                   # files excluded from backend Docker image
│  ├─ .env                            # backend environment variables
│  ├─ Dockerfile                      # backend Docker image build instructions
│  ├─ index.js                        # main backend entry point
│  ├─ package.json                    # backend dependencies and scripts
│  ├─ package-lock.json               # backend installed lockfile
│  ├─ server.js                       # HTTP server and middleware setup
│  ├─ config/
│  │  └─ supabaseAdmin.js             # Supabase admin client config
│  ├─ controllers/
│  │  └─ campaignController.js        # campaign business logic and controller functions
│  └─ routes/
│     └─ campaignRoutes.js            # Express campaign API routes
├─ blockchain/                        # Smart contracts and Hardhat configuration
│  ├─ .env                            # blockchain environment variables
│  ├─ .gitignore                      # ignored blockchain artifacts
│  ├─ artifacts/                       # Hardhat-generated contract build artifacts
│  ├─ cache/                           # Hardhat cache files
│  ├─ contracts/                       # Solidity campaign contracts
│  │  ├─ businessCampaign.sol          # campaign contract logic
│  │  └─ campaignFactory.sol           # factory contract for campaign deployment
│  ├─ hardhat.config.ts                # Hardhat tooling and network config
│  ├─ ignition/
│  │  └─ modules/
│  │     ├─ CampaignFactory.ts         # Hardhat ignition module for factory deployment
│  │     └─ Lock.ts                    # Hardhat ignition module managing locks
│  ├─ node_modules/                   # installed blockchain dependencies
│  ├─ package-lock.json               # blockchain dependency lockfile
│  ├─ package.json                    # blockchain package manifest
│  ├─ README.md                       # blockchain folder documentation
│  ├─ scripts/
│  │  └─ deploy.ts                    # contract deployment script
│  ├─ test/
│  │  ├─ campaignFactory.ts           # Hardhat test for campaign factory contract
│  │  └─ Lock.js                       # Hardhat test for lock contract
│  ├─ tsconfig.json                   # TypeScript config for blockchain code
│  └─ typechain-types/                # generated contract typings
├─ docs/                              # project documentation and analysis
│  ├─ deploy_instructions.txt         # deployment setup instructions
│  ├─ feature_columns.json            # feature metadata definitions
│  ├─ fundxproutproposal.docx         # project proposal document
│  └─ output_colab/                   # exported analysis/Colab results
└─ frontend/                          # React/Next.js frontend app
   ├─ .dockerignore                   # ignored files for frontend Docker image
   ├─ .env                            # frontend environment variables
   ├─ .github/                        # workflow and GitHub configuration
   ├─ .gitignore                      # frontend-specific ignore rules
   ├─ .next/                          # Next.js build output and cache
   ├─ abis/                           # compiled contract ABIs for frontend blockchain use
   ├─ app/                            # Next.js app routes and page definitions
   │  ├─ globals.css                  # global styling, theme variables, and Tailwind overrides
   │  ├─ globals.d.ts                 # global CSS type declarations
   │  ├─ layout.tsx                   # root app layout and metadata wrapper
   │  ├─ page.tsx                     # main homepage route
   │  ├─ about/
   │  │  └─ page.jsx                 # about page component
   │  ├─ api/                         # serverless API endpoints
   │  │  ├─ ipfs-upload/
   │  │  │  └─ route.ts              # IPFS upload endpoint
   │  │  ├─ test-ipfs/
   │  │  │  └─ route.ts              # test IPFS endpoint
   │  │  └─ upload/
   │  │     └─ route.ts              # file upload endpoint
   │  ├─ auth/                        # auth-related pages and callbacks
   │  │  ├─ callback/
   │  │  │  └─ route.ts              # auth callback route handler
   │  │  ├─ layout.tsx               # auth section layout
   │  │  ├─ next-login/
   │  │  │  └─ page.tsx              # next login flow page
   │  │  └─ select-role/
   │  │     └─ page.tsx              # role selection page
   │  ├─ campaigns/
   │  │  └─ [id]/
   │  │     └─ page.js               # dynamic campaign detail page
   │  ├─ contact/
   │  │  └─ page.jsx                 # contact page
   │  ├─ create-campaign/
   │  │  └─ page.jsx                 # campaign creation page
   │  ├─ dashboard/
   │  │  ├─ page.js                  # dashboard page
   │  │  └─ placeholder.txt          # placeholder content file
   │  ├─ homepage/
   │  │  └─ page.js                  # homepage route implementation
   │  ├─ how-it-works/
   │  │  └─ page.jsx                 # how it works page
   │  ├─ investor-dashboard/         # investor dashboard section
   │  │  ├─ campaigns/
   │  │  │  └─ page.js               # investor campaign list
   │  │  ├─ layout.tsx               # investor dashboard layout
   │  │  ├─ overview/
   │  │  │  └─ page.jsx              # investor overview page
   │  │  ├─ portfolio/
   │  │  │  └─ page.tsx              # investor portfolio page
   │  │  ├─ settings/
   │  │  │  └─ page.tsx              # investor settings page
   │  │  ├─ tokens/
   │  │  │  └─ page.tsx              # investor tokens page
   │  │  └─ transactions/
   │  │     └─ page.tsx              # investor transaction history
   │  ├─ login/
   │  │  └─ page.js                  # login page
   │  ├─ profile/
   │  │  └─ page.js                  # profile page
   │  ├─ sign-up/
   │  │  └─ page.tsx                 # signup page
   ├─ components/                    # reusable visual components
   │  ├─ campaign-card.jsx           # campaign card UI component
   │  ├─ campaign-list.jsx           # campaign list UI component
   │  ├─ categories-nav.jsx          # category navigation component
   │  ├─ charts/                     # chart-specific component folder (empty)
   │  ├─ featured-campaign.jsx       # featured campaign display component
   │  ├─ footer.tsx                  # site footer component
   │  ├─ google-signIn.tsx           # Google sign-in button component
   │  ├─ hero-section.jsx            # homepage hero section component
   │  ├─ Investor/                   # investor-specific UI components
   │  │  ├─ Navbar.tsx               # investor dashboard navbar component
   │  │  └─ Sidebar.tsx              # investor dashboard sidebar component
   │  ├─ layout/                     # layout components folder (empty)
   │  ├─ market-analytics.jsx        # market analytics component
   │  ├─ navbar.jsx                  # main navbar component
   │  ├─ RiskAssessmentPanel.jsx     # risk assessment panel component
   │  ├─ RiskBadge.jsx               # risk badge display component
   │  ├─ role-selection-form.tsx     # role selection form component
   │  ├─ theme-provider.jsx          # theme switch provider component
   │  └─ ui/                         # shared UI primitives folder (empty)
   ├─ context/                       # React context providers
   │  └─ auth-context.tsx            # authentication context provider
   ├─ lib/                           # shared helper modules
   │  ├─ action.ts                   # action helper utilities
   │  ├─ formatters.ts               # data formatting helpers
   │  ├─ launchCampaign.ts           # launch campaign helper functions
   │  ├─ mockData.ts                 # mock data used in UI
   │  └─ supabase-client.ts          # Supabase client setup
   ├─ public/                        # static assets and icons
   │  ├─ 1.jfif
   │  ├─ 2.jfif
   │  ├─ bg-hero-section.png
   │  ├─ file.svg
   │  ├─ globe.svg
   │  ├─ next.svg
   │  ├─ vercel.svg
   │  └─ window.svg
   ├─ styles/                        # additional styling folder
   ├─ types/                         # TypeScript definitions
   │  ├─ cache-life.d.ts             # cache type definitions
   │  ├─ css.d.ts                    # CSS module type declarations
   │  ├─ index.ts                    # shared type exports
   │  ├─ routes.d.ts                 # route type definitions
   │  └─ validator.ts                # validation type definitions
   ├─ utils/                         # utility functions and helpers
   │  ├─ investmentUtils.ts          # investment helper utilities
   │  ├─ supabase/                   # Supabase-specific utility folder
   │  └─ uploadToIPFS.ts             # IPFS upload helper
   ├─ Dockerfile                     # frontend Docker image build instructions
   ├─ env.download                   # downloaded environment example file
   ├─ eslint.config.mjs              # ESLint configuration
   ├─ next-env.d.ts                  # Next.js environment types
   ├─ next.config.ts                 # Next.js configuration file
   ├─ package.json                   # frontend dependencies and scripts
   ├─ postcss.config.mjs             # PostCSS config for Tailwind CSS
   ├─ proxy.ts                       # proxy configuration helper
   ├─ tailwind.config.js             # Tailwind CSS configuration
   ├─ tsconfig.json                  # TypeScript configuration
   ├─ tsconfig.tsbuildinfo           # TypeScript build cache info
   ├─ vitest.config.mjs              # Vitest test runner config
   └─ __tests__/                     # frontend test folder
```

## Tech Stack Summary

### Root / Monorepo
- `package.json`: npm workspace for `frontend` and `backend`
- `docker-compose.yml`: local development orchestration for frontend and backend services
- Shared dependencies: `react`, `react-dom`, `ethers`, `@supabase/supabase-js`, `@supabase/ssr`

### `frontend/`
- Framework: `Next.js 16`
- UI: `React 19`, Tailwind CSS v4, `@radix-ui/react-*`, `lucide-react`
- Styling: `tailwindcss`, `@tailwindcss/postcss`, `clsx`, `tailwind-merge`, `tailwindcss-animate`
- Form and validation: `react-hook-form`, `@hookform/resolvers`, `zod`
- Charts: `recharts`
- Storage / API: `@supabase/supabase-js`, `next-cloudinary`, `next-themes`
- Testing: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `happy-dom`, `jsdom`
- TypeScript support: `typescript`, `@types/react`, `@types/node`

### `backend/`
- Runtime: `Node.js`
- API framework: `Express 5`
- Database/API client: `@supabase/supabase-js`
- Environment: `dotenv`
- CORS support: `cors`
- Dev auto-reload: `nodemon`

### `blockchain/`
- Smart contract development: `Hardhat`
- Hardhat toolbox: `@nomicfoundation/hardhat-toolbox`
- Contracts: Solidity (`.sol`) and TypeChain generated typings
- Deployment and test scripts in `scripts/` and `test/`

### `ai/`
- Python analysis for campaign scoring
- `score_campaigns.py` uses models defined under `models/`
- Dependencies declared in `requirements.txt`

### `docs/`
- Project documentation and deployment instructions
- Feature definitions and analysis artifacts

## File/Folder Purpose

### Top-level files
- `.gitignore`: repo-wide ignore rules
- `docker-compose.yml`: container orchestration for local development
- `package.json`: monorepo workspace configuration
- `package-lock.json`: lockfile for dependency versions

### `ai/`
- `requirements.txt`: Python dependencies for AI scoring scripts
- `score_campaigns.py`: campaign scoring and risk analysis script
- `models/feature_columns.json`: AI model feature definition

### `backend/`
- `.dockerignore`: excluded backend files from Docker image
- `.env`: local backend environment variables
- `Dockerfile`: backend container build instructions
- `index.js`: Express application entrypoint
- `server.js`: server startup and middleware setup
- `package.json`: backend dependency manifest
- `config/supabaseAdmin.js`: Supabase admin configuration
- `controllers/campaignController.js`: campaign endpoint logic
- `routes/campaignRoutes.js`: Express API routing for campaigns

### `blockchain/`
- `.env`: blockchain environment variables
- `.gitignore`: ignored files for blockchain folder
- `artifacts/`: generated Hardhat contract artifacts
- `cache/`: Hardhat cache and temp data
- `contracts/businessCampaign.sol`: campaign contract source
- `contracts/campaignFactory.sol`: factory contract source
- `hardhat.config.ts`: Hardhat environment and network config
- `ignition/modules/CampaignFactory.ts`: deployment helper module
- `ignition/modules/Lock.ts`: lock contract helper module
- `scripts/deploy.ts`: contract deployment script
- `test/campaignFactory.ts`: campaign factory tests
- `test/Lock.js`: lock contract tests
- `typechain-types/`: generated TypeChain typings

### `docs/`
- `deploy_instructions.txt`: deployment instructions
- `feature_columns.json`: feature metadata and column schema
- `fundxproutproposal.docx`: project proposal document
- `output_colab/`: analysis export outputs

### `frontend/`
- `.dockerignore`: excluded frontend build files from Docker image
- `.env`: frontend environment variables
- `.github/`: GitHub Actions or workflows folder
- `.next/`: Next.js output and build cache
- `abis/`: contract ABIs used by frontend blockchain code
- `app/globals.css`: global styling and theme CSS
- `app/globals.d.ts`: CSS module type declarations
- `app/layout.tsx`: root app layout component
- `app/page.tsx`: homepage route
- `app/about/page.jsx`: about page component
- `app/api/ipfs-upload/route.ts`: IPFS file upload endpoint
- `app/api/test-ipfs/route.ts`: IPFS test endpoint
- `app/api/upload/route.ts`: generic upload endpoint
- `app/auth/callback/route.ts`: auth callback handler
- `app/auth/layout.tsx`: auth section layout wrapper
- `app/auth/next-login/page.tsx`: next login page
- `app/auth/select-role/page.tsx`: role selection page
- `app/campaigns/[id]/page.js`: campaign details page
- `app/contact/page.jsx`: contact page
- `app/create-campaign/page.jsx`: campaign creation page
- `app/dashboard/page.js`: dashboard landing page
- `app/dashboard/placeholder.txt`: placeholder content file
- `app/homepage/page.js`: homepage component file
- `app/how-it-works/page.jsx`: how it works page
- `app/investor-dashboard/campaigns/page.js`: investor campaign list page
- `app/investor-dashboard/layout.tsx`: investor dashboard layout wrapper
- `app/investor-dashboard/overview/page.jsx`: investor overview page
- `app/investor-dashboard/portfolio/page.tsx`: investor portfolio page
- `app/investor-dashboard/settings/page.tsx`: investor settings page
- `app/investor-dashboard/tokens/page.tsx`: investor tokens page
- `app/investor-dashboard/transactions/page.tsx`: investor transactions page
- `app/login/page.js`: login page
- `app/profile/page.js`: profile page
- `app/sign-up/page.tsx`: signup page
- `components/campaign-card.jsx`: campaign card UI component
- `components/campaign-list.jsx`: campaign list UI component
- `components/categories-nav.jsx`: category nav component
- `components/featured-campaign.jsx`: featured campaign component
- `components/footer.tsx`: footer UI component
- `components/google-signIn.tsx`: Google sign-in button component
- `components/hero-section.jsx`: hero section component
- `components/Investor/Navbar.tsx`: investor dashboard navbar
- `components/Investor/Sidebar.tsx`: investor dashboard sidebar
- `components/market-analytics.jsx`: market analytics UI component
- `components/navbar.jsx`: main site navigation component
- `components/RiskAssessmentPanel.jsx`: risk assessment panel component
- `components/RiskBadge.jsx`: risk badge UI component
- `components/role-selection-form.tsx`: role selection form component
- `components/theme-provider.jsx`: theme provider component
- `lib/action.ts`: generic action helpers
- `lib/formatters.ts`: formatting utilities
- `lib/launchCampaign.ts`: campaign launch helpers
- `lib/mockData.ts`: mock data source
- `lib/supabase-client.ts`: Supabase client setup
- `public/`: static assets for the frontend
- `types/cache-life.d.ts`: cache type definitions
- `types/css.d.ts`: CSS module type definitions
- `types/index.ts`: shared type exports
- `types/routes.d.ts`: route type definitions
- `types/validator.ts`: validation type definitions
- `utils/investmentUtils.ts`: investment calculation helpers
- `utils/supabase/`: Supabase utility folder
- `utils/uploadToIPFS.ts`: IPFS upload utility
- `Dockerfile`: frontend Dockerfile
- `env.download`: environment download example
- `eslint.config.mjs`: ESLint configuration
- `next-env.d.ts`: Next.js type declarations
- `next.config.ts`: Next.js config file
- `package.json`: frontend dependency manifest
- `postcss.config.mjs`: Tailwind PostCSS config
- `proxy.ts`: local proxy helper
- `tailwind.config.js`: Tailwind CSS config
- `tsconfig.json`: TypeScript compiler config
- `tsconfig.tsbuildinfo`: TypeScript cache info
- `vitest.config.mjs`: Vitest configuration
- `__tests__/`: frontend tests folder

## Global Frontend CSS Properties (`frontend/app/globals.css`)

### Imported tooling
- `@import "tailwindcss";`
- `@custom-variant dark (&:is(.dark *));`

### Root theme custom properties
- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--popover`
- `--popover-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--muted`
- `--muted-foreground`
- `--accent`
- `--accent-foreground`
- `--destructive`
- `--destructive-foreground`
- `--border`
- `--input`
- `--ring`
- `--chart-1`
- `--chart-2`
- `--chart-3`
- `--chart-4`
- `--chart-5`
- `--radius`
- `--sidebar`
- `--sidebar-foreground`
- `--sidebar-primary`
- `--sidebar-primary-foreground`
- `--sidebar-accent`
- `--sidebar-accent-foreground`
- `--sidebar-border`
- `--sidebar-ring`

### Dark theme custom properties
- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--popover`
- `--popover-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--muted`
- `--muted-foreground`
- `--accent`
- `--accent-foreground`
- `--destructive`
- `--destructive-foreground`
- `--border`
- `--input`
- `--ring`
- `--sidebar`
- `--sidebar-foreground`
- `--sidebar-primary`
- `--sidebar-primary-foreground`
- `--sidebar-accent`
- `--sidebar-accent-foreground`
- `--sidebar-border`
- `--sidebar-ring`

### Theme inline variable mappings
- `--font-sans`
- `--font-mono`
- `--color-background`
- `--color-foreground`
- `--color-card`
- `--color-card-foreground`
- `--color-popover`
- `--color-popover-foreground`
- `--color-primary`
- `--color-primary-foreground`
- `--color-secondary`
- `--color-secondary-foreground`
- `--color-muted`
- `--color-muted-foreground`
- `--color-accent`
- `--color-accent-foreground`
- `--color-destructive`
- `--color-destructive-foreground`
- `--color-border`
- `--color-input`
- `--color-ring`
- `--color-chart-1`
- `--color-chart-2`
- `--color-chart-3`
- `--color-chart-4`
- `--color-chart-5`
- `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--radius-xl`
- `--color-sidebar`
- `--color-sidebar-foreground`
- `--color-sidebar-primary`
- `--color-sidebar-primary-foreground`
- `--color-sidebar-accent`
- `--color-sidebar-accent-foreground`
- `--color-sidebar-border`
- `--color-sidebar-ring`

### Base global rules
- All elements: `border-border outline-ring/50`
- `body`: `bg-background text-foreground`, `font-family: var(--font-sans), Arial, Helvetica, sans-serif`

### Light theme override selectors
- `.bg-[#181A2A]`, `.bg-[#181A2A]/95`
- `.bg-[#1a2030]`
- `.bg-[#0d1117]`
- `.bg-[#1e2530]`
- `body` color/background
- `.bg-white/5`, `.bg-white/10`
- `.bg-black/80`, `.bg-black/70`
- `.text-white`
- `.text-gray-300`, `.text-gray-400`, `.text-gray-500`, `.text-gray-600`
- `.text-white/80`, `.text-white/50`
- `.text-[#181A2A]`
- `.border-white/5`, `.border-white/10`, `.border-white/20`
- `.placeholder-gray-500::placeholder`, `.placeholder-gray-600::placeholder`
- `.fill-white`
- `.shadow-xl`
- `.from-[#6f42c1]/10`, `.from-[#6f42c1]/20`
- `nav.sticky`
- `footer.bg-[#0d1117]`, `footer`
- `footer .text-white`, `footer .text-white/80`, `footer .text-white/50`
- `.bg-[#6f42c1]`, `.bg-[#6f42c1] .text-white`
- `.text-[#a78bfa]`, `.text-[#6f42c1]`
- `.focus:ring-[#6f42c1]:focus`
- `input.bg-[#0d1117]`, `textarea.bg-[#0d1117]`
- `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`
- `.rounded-2xl`
- `aside`
- `.min-h-screen.bg-[#181A2A]`
- `.hover:bg-white/10:hover`, `.hover:bg-[#6f42c1]/20:hover`, `.hover:text-white:hover`
- `.bg-[#6f42c1] .text-white`, `.bg-[#6f42c1].text-white`, `button.bg-[#6f42c1]`, `a.bg-[#6f42c1]`, `.bg-[#a78bfa].text-white`, `a.bg-[#a78bfa]`
- `.bg-white.shadow-xl`
- `.recharts-tooltip-wrapper div`
- `select`, `select option`
- `.border-b.border-white/10`, `.border-b.border-white/5`, `.border-t.border-white/10`
- `tr:hover.hover:bg-white/5:hover`
- `.bg-clip-text.text-transparent`
- `span.bg-[#1a2030]`
- `.bg-white/10.rounded-full`
- `html[data-theme="light"]`, `html.light`

## Notes
- `frontend/app/globals.css` is the main global CSS entrypoint and defines both light and dark theme palettes plus Tailwind overrides.
- `docker-compose.yml` starts `frontend` on port `3000` and `backend` on port `5000`.
- The repo uses a hybrid stack with frontend React/Next.js, backend Express/Supabase, and blockchain smart contracts via Hardhat.
