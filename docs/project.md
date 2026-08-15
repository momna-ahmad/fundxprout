# FundXProut Project Structure

## Repository Structure

```text
fundxprout/
├─ .github/                              # GitHub workflows and automation files
├─ .gitignore                            # Git ignore rules for the entire repository
├─ .vscode/                              # Workspace and editor configuration
├─ ai/                                   # AI scoring and campaign analysis utilities
│  ├─ models/
│  │  └─ feature_columns.json            # Feature schema used by the AI scoring model
│  ├─ requirements.txt                   # Python dependencies for AI scripts
│  └─ score_campaigns.py                 # Campaign scoring and risk analysis script
├─ backend/                              # Express API, Supabase integration, and data storage helpers
│  ├─ .dockerignore                      # Files excluded from backend Docker builds
│  ├─ .env                               # Backend environment variables
│  ├─ config/
│  │  └─ supabaseAdmin.js                # Supabase admin client configuration
│  ├─ controllers/
│  │  └─ campaignController.js           # Campaign business logic and controller handlers
│  ├─ Dockerfile                         # Backend container build instructions
│  ├─ index.js                           # Main backend entry point
│  ├─ migrations/
│  │  └─ 0001_secondary_marketplace.sql  # Secondary marketplace schema migration
│  ├─ package-lock.json                  # Backend lockfile
│  ├─ package.json                       # Backend dependency manifest and scripts
│  ├─ routes/
│  │  ├─ campaignRoutes.js               # Campaign API routes
│  │  └─ diditRoutes.js                  # DIDIT-related API routes
│  ├─ server.js                          # Express server setup; registers /api/marketplace routes
│  ├─ services/
│  │  ├─ balanceReservationService.js    # Placeholder balance reservation helper for marketplace buys
│  │  ├─ matchingEngine.js               # In-memory matching engine for token order books
│  │  ├─ orderBookService.js             # Campaign-scoped in-memory order book implementation
│  │  ├─ settlementService.js            # Settlement stub for trade execution
│  │  └─ __tests__/
│  │     └─ matchingEngine.test.js       # Vitest coverage for matching engine behavior
│  └─ uploads/                           # Uploaded files and backend-managed media
├─ blockchain/                           # Smart contracts, deployment scripts, and tests
│  ├─ .env                               # Blockchain environment variables
│  ├─ .gitignore                         # Ignored Hardhat artifacts and local state
│  ├─ contracts/
│  │  ├─ businessCampaign.sol            # Core campaign contract logic
│  │  ├─ campaignFactory.sol             # Factory contract for deploying campaign contracts
│  │  ├─ equityToken.sol                  # ERC-style token contract for campaign equity
│  │  ├─ secondaryMarketplace.sol        # Secondary marketplace contract logic
│  │  ├─ TestERC20.sol                   # Simple ERC20 used for local contract tests
│  ├─ hardhat.config.ts                  # Hardhat development and network configuration
│  ├─ ignition/
│  │  └─ modules/
│  │     ├─ CampaignFactory.ts           # Ignition module for factory deployment
│  │     └─ Lock.ts                      # Ignition module for a lock example contract
│  ├─ package-lock.json                  # Blockchain lockfile
│  ├─ package.json                       # Blockchain dependency manifest and scripts
│  ├─ README.md                          # Blockchain folder documentation
│  ├─ scripts/
│  │  ├─ deploy-marketplace.ts           # Deployment script for TokenMarketplace
│  │  └─ deploy.ts                       # Deployment script for contracts
│  ├─ test/
│  │  ├─ campaignFactory.ts              # Hardhat tests for campaign factory deployment
│  │  ├─ escrow.ts                       # Escrow-related contract tests
│  │  ├─ tokenMarketplace.ts             # Tests for TokenMarketplace contract behavior
│  │  └─ Lock.js                         # Example lock contract tests
│  ├─ tsconfig.json                      # TypeScript configuration for blockchain code
│  └─ typechain-types/                   # Generated contract type definitions
├─ docs/                                 # Project documentation and analysis artifacts
│  ├─ deploy_instructions.txt            # Deployment setup instructions
│  ├─ feature_columns.json               # Shared feature metadata definitions
│  ├─ fundxproutproposal.docx            # Project proposal document
│  ├─ output_colab/
│  │  └─ final_risk_analysis.csv         # Exported AI analysis results
│  ├─ project.md                         # Living project structure document
│  ├─ secondary_marketplace.txt          # Notes for the secondary marketplace feature
│  └─ testing_didit.md                   # Testing and QA notes for DIDIT integration
├─ docker-compose.yml                   # Local development orchestration for frontend and backend
├─ frontend/                             # Next.js frontend application
│  ├─ .dockerignore                      # Files excluded from frontend Docker builds
│  ├─ .env                               # Frontend environment variables
│  ├─ .github/                           # Frontend-specific GitHub configuration
│  ├─ .gitignore                         # Frontend-specific ignore rules
│  ├─ __tests__/
│  │  └─ upload.test.jsx                 # Upload-related frontend test
│  ├─ abis/
│  │  ├─ BusinessCampaign.json           # ABI for the business campaign contract
│  │  ├─ CampaignFactory.json            # ABI for the campaign factory contract
│  │  └─ EquityToken.json                 # ABI for the equity token contract
│  ├─ app/
│  │  ├─ about/
│  │  │  └─ page.jsx                     # About page route
│  │  ├─ api/
│  │  │  ├─ ipfs-upload/
│  │  │  │  └─ route.ts                   # IPFS upload endpoint
│  │  │  ├─ test-ipfs/
│  │  │  │  └─ route.ts                   # Test IPFS endpoint
│  │  │  └─ upload/
│  │  │     └─ route.ts                   # File upload endpoint
│  │  ├─ auth/
│  │  │  ├─ callback/
│  │  │  │  └─ route.ts                   # Auth callback route handler
│  │  │  ├─ layout.tsx                    # Auth section layout
│  │  │  ├─ next-login/
│  │  │  │  └─ page.tsx                   # Next login flow page
│  │  │  └─ select-role/
│  │  │     └─ page.tsx                   # Role selection page
│  │  ├─ campaigns/
│  │  │  └─ [id]/
│  │  │     └─ page.js                    # Dynamic campaign detail page
│  │  ├─ contact/
│  │  │  └─ page.jsx                      # Contact page route
│  │  ├─ create-campaign/
│  │  │  └─ page.jsx                      # Campaign creation page route
│  │  ├─ dashboard/
│  │  │  ├─ page.js                       # Dashboard landing page
│  │  │  └─ placeholder.txt               # Placeholder dashboard content
│  │  ├─ globals.css                      # Global styles and theme overrides
│  │  ├─ globals.d.ts                     # Global CSS declaration file
│  │  ├─ homepage/
│  │  │  └─ page.js                       # Homepage route implementation
│  │  ├─ how-it-works/
│  │  │  └─ page.jsx                      # How-it-works route
│  │  ├─ investor-dashboard/
│  │  │  ├─ campaigns/
│  │  │  │  └─ page.js                    # Investor campaign list page
│  │  │  ├─ layout.tsx                    # Investor dashboard layout
│  │  │  ├─ overview/
│  │  │  │  └─ page.jsx                   # Investor overview page
│  │  │  ├─ portfolio/
│  │  │  │  └─ page.tsx                   # Investor portfolio page
│  │  │  ├─ settings/
│  │  │  │  └─ page.tsx                   # Investor settings page
│  │  │  ├─ tokens/
│  │  │  │  └─ page.tsx                   # Investor tokens page
│  │  │  └─ transactions/
│  │  │     └─ page.tsx                   # Investor transaction history page
│  │  ├─ layout.tsx                       # Root app layout and metadata wrapper
│  │  ├─ login/
│  │  │  └─ page.js                        # Login page route
│  │  ├─ page.tsx                         # Main homepage entry route
│  │  ├─ profile/
│  │  │  └─ page.js                        # Profile page route
│  │  └─ sign-up/
│  │     └─ page.tsx                      # Signup page route
│  ├─ components/
│  │  ├─ campaign-card.jsx                # Campaign card UI component
│  │  ├─ campaign-list.jsx                # Campaign list UI component
│  │  ├─ categories-nav.jsx                # Category navigation component
│  │  ├─ featured-campaign.jsx            # Featured campaign component
│  │  ├─ footer.tsx                       # Site footer component
│  │  ├─ google-signIn.tsx                # Google sign-in button component
│  │  ├─ hero-section.jsx                 # Homepage hero section component
│  │  ├─ Investor/
│  │  │  ├─ Navbar.tsx                    # Investor dashboard navbar component
│  │  │  └─ Sidebar.tsx                   # Investor dashboard sidebar component
│  │  ├─ market-analytics.jsx             # Market analytics UI component
│  │  ├─ navbar.jsx                       # Main navbar UI component
│  │  ├─ owner-campaign-analytics.jsx     # Owner analytics UI component
│  │  ├─ RiskAssessmentPanel.jsx          # Risk assessment panel component
│  │  ├─ RiskBadge.jsx                    # Risk badge display component
│  │  ├─ role-selection-form.tsx          # Role selection form component
│  │  ├─ ThemeProvider.tsx                # Theme provider implementation
│  │  ├─ theme-provider.jsx               # Theme switching provider wrapper
│  │  └─ ui/                              # Shared UI primitive folder
│  ├─ context/
│  │  ├─ auth-context.tsx                 # Auth context provider
│  │  └─ WalletContext.tsx                # Wallet connection context provider
│  ├─ Dockerfile                          # Frontend container build instructions
│  ├─ eslint.config.mjs                  # ESLint configuration
│  ├─ env.download                       # Downloaded environment example file
│  ├─ lib/
│  │  ├─ action.ts                        # Action helper utilities
│  │  ├─ formatters.ts                    # Data formatting helpers
│  │  ├─ launchCampaign.ts                 # Campaign launch helper logic
│  │  ├─ mockData.ts                       # Mock data used by UI components
│  │  ├─ supabase-client.ts               # Supabase client configuration
│  │  └─ withdrawFunds.ts                 # Withdrawal helper for campaign funds
│  ├─ next-env.d.ts                       # Next.js environment type declarations
│  ├─ next.config.ts                      # Next.js runtime configuration
│  ├─ package-lock.json                   # Frontend lockfile
│  ├─ package.json                        # Frontend dependency manifest and scripts
│  ├─ postcss.config.mjs                  # PostCSS configuration for Tailwind
│  ├─ proxy.ts                            # Proxy configuration helper
│  ├─ public/
│  │  ├─ 1.jfif                           # Static image asset
│  │  ├─ 2.jfif                           # Static image asset
│  │  ├─ bg-hero-section.png              # Hero section background image
│  │  ├─ file.svg                          # Static SVG asset
│  │  ├─ globe.svg                         # Static SVG asset
│  │  ├─ next.svg                          # Next.js logo asset
│  │  ├─ vercel.svg                        # Vercel logo asset
│  │  └─ window.svg                        # Static SVG asset
│  ├─ styles/                             # Styling overrides and theme extensions
│  ├─ tailwind.config.js                  # Tailwind CSS configuration
│  ├─ tsconfig.json                       # TypeScript configuration
│  ├─ tsconfig.tsbuildinfo                # TypeScript build cache output
│  ├─ types/
│  │  ├─ cache-life.d.ts                  # Cache-related type declarations
│  │  ├─ css.d.ts                          # CSS module type declarations
│  │  ├─ index.ts                          # Shared type exports
│  │  ├─ routes.d.ts                       # Route type declarations
│  │  └─ validator.ts                      # Validation type helpers
│  ├─ utils/
│  │  ├─ getEthPrice.ts                   # Ethereum price helper for UI calculations
│  │  ├─ investmentUtils.ts               # Investment utility helpers
│  │  ├─ recommendations.ts               # Recommendation generation helpers
│  │  ├─ supabase/                        # Supabase-specific utility helpers
│  │  └─ uploadToIPFS.ts                  # IPFS upload helper
│  ├─ vitest.config.mjs                   # Vitest configuration
│  └─ views/                              # Legacy view layer folder (if present)
├─ package-lock.json                      # Root lockfile
├─ package.json                           # Monorepo workspace manifest
├─ project.md                             # Root project overview document
├─ SRS_FundXProut.md                      # Software requirements specification
└─ TESTING_DIDIT.md                       # DIDIT testing checklist
```

## Tech Stack Summary

### ai/
- Python-based analysis workflow for campaign scoring and risk evaluation
- Dependencies declared in requirements.txt for data processing and model support
- Script-driven scoring pipeline centered on score_campaigns.py

### backend/
- Node.js runtime with Express for API services and middleware
- Supabase client integration for database and auth-related operations
- Environment-based configuration plus Docker support for local deployment
 - Realtime: Socket.IO used for marketplace book/trade events

### blockchain/
- Hardhat-based smart contract development and deployment workflow
- Solidity contracts for campaigns, token issuance, and marketplace behavior
- TypeChain-generated typings and test coverage for contract logic

### docs/
- Project documentation, deployment notes, and analysis exports
- Markdown and text-based references for architecture, testing, and feature planning
- Proposal and rollout notes kept alongside generated analysis outputs

### frontend/
- Next.js application with React-based pages and reusable components
- Tailwind CSS and TypeScript support for UI styling and type safety
- Vitest and Testing Library for component and upload-related tests

## File/Folder Purpose

### Top-level files and folders
- .github/: GitHub workflows and repository automation files
- .gitignore: Repository-wide ignore rules
- .vscode/: Editor and workspace configuration for local development
- ai/: AI scoring and campaign analysis utilities
- backend/: Express backend service and Supabase integration layer
- blockchain/: Smart contract project and deployment tooling
- docs/: Project documentation and analysis artifacts
- docker-compose.yml: Local development orchestration for backend and frontend services
- frontend/: Next.js frontend application for investors and campaign owners
- package-lock.json: Root dependency lockfile
- package.json: Monorepo workspace configuration
- project.md: Root project overview and repository architecture summary
- SRS_FundXProut.md: Software requirements specification document
- TESTING_DIDIT.md: Testing notes for DIDIT-related functionality

### ai/
- models/feature_columns.json: Feature schema definition for AI scoring
- requirements.txt: Python dependency list for AI scripts
- score_campaigns.py: Campaign scoring and risk analysis execution script

### backend/
- .dockerignore: Files excluded from backend Docker builds
- .env: Backend environment configuration
- config/supabaseAdmin.js: Supabase admin client initialization
- controllers/campaignController.js: Backend campaign business logic and handlers
- Dockerfile: Backend container build instructions
- index.js: Backend entry point for the Express application
- migrations/0001_secondary_marketplace.sql: Secondary marketplace schema migration for token order flow
- package-lock.json: Backend dependency lockfile
- package.json: Backend manifest and scripts
- routes/campaignRoutes.js: Campaign API endpoint definitions
- routes/diditRoutes.js: DIDIT-related API routes
- routes/marketplaceRoutes.js: Marketplace API routing for token orders and trades
- server.js: Server startup, middleware, and Express setup; registers /api/marketplace routes and initializes marketplace sockets
- controllers/marketplaceController.js: Marketplace endpoints and order orchestration
- middleware/requireVerified.js: Middleware to ensure user KYC/verification status
- middleware/requireWallet.js: Middleware to ensure a connected wallet is present on requests
- services/balanceReservationService.js: Balance reservation and transfer helpers (token side)
- services/matchingEngine.js: In-memory matching engine for token order books
- services/orderBookService.js: Campaign-scoped order book implementation with heap-based ordering
- services/settlementService.js: Settlement flow for matched trades (uses balanceReservationService)
- sockets/marketplaceSocket.js: Socket.IO initialization and emit helpers for marketplace realtime updates
- uploads/: Directory for uploaded files and local media assets

#### Known TODOs
- reserveFundsForBuy is a stub pending a later round of marketplace integration
- callTokenMarketplaceContract is a stub pending a later round of marketplace integration

### blockchain/
- .env: Blockchain environment configuration
- .gitignore: Ignore rules for Hardhat artifacts and local state
- contracts/AttackReentrancy.sol: Reentrancy attack contract used to validate marketplace defenses
- contracts/businessCampaign.sol: Core campaign contract implementation
- contracts/campaignFactory.sol: Factory contract for deployment orchestration
- contracts/equityToken.sol: Equity token contract implementation
- contracts/secondaryMarketplace.sol: Secondary marketplace contract logic
- contracts/TestERC20.sol: Test ERC20 token used by local contract tests
- contracts/TokenMarketplace.sol: Escrow and settlement contract for off-chain matching
- hardhat.config.ts: Hardhat environment and network configuration
- ignition/modules/CampaignFactory.ts: Ignition module for factory deployment
- ignition/modules/Lock.ts: Example ignition module for a lock contract
- ignition/modules/TokenMarketplace.ts: Ignition module entry for TokenMarketplace
- package-lock.json: Blockchain dependency lockfile
- package.json: Blockchain manifest and scripts
- README.md: Blockchain project documentation
- scripts/deploy-marketplace.ts: Deployment script for TokenMarketplace
- scripts/deploy.ts: Deployment script for contracts
- test/campaignFactory.ts: Contract test for campaign factory behavior
- test/escrow.ts: Escrow-related smart contract tests
- test/tokenMarketplace.ts: Tests for TokenMarketplace contract (deposit, settle, withdraw, reentrancy)
- test/Lock.js: Example lock contract tests
- tsconfig.json: TypeScript configuration for blockchain code
- typechain-types/: Generated TypeChain definitions for contracts

### docs/
- deploy_instructions.txt: Setup and deployment instructions for the project
- feature_columns.json: Shared feature column definitions for AI analysis
- fundxproutproposal.docx: Proposal document for the FundXProut concept
- output_colab/final_risk_analysis.csv: Exported AI evaluation output
- project.md: Living documentation of the repository structure
- secondary_marketplace.txt: Notes and references for the secondary marketplace feature
- testing_didit.md: Notes and checklist for DIDIT testing

### frontend/
- .dockerignore: Files excluded from frontend Docker builds
- .env: Frontend environment configuration
- .github/: Frontend repository automation and workflow files
- .gitignore: Frontend-specific ignore rules
- __tests__/upload.test.jsx: Upload-related frontend test
- abis/BusinessCampaign.json: ABI for the business campaign contract
- abis/CampaignFactory.json: ABI for the campaign factory contract
- abis/EquityToken.json: ABI for the equity token contract
 - abis/TokenMarketplace.json: ABI for the TokenMarketplace contract (generated after compilation)
- app/about/page.jsx: About page route component
- app/api/ipfs-upload/route.ts: IPFS upload endpoint
- app/api/test-ipfs/route.ts: Test endpoint for IPFS integration
- app/api/upload/route.ts: File upload endpoint
- app/auth/callback/route.ts: Auth callback route handler
- app/auth/layout.tsx: Auth section layout
- app/auth/next-login/page.tsx: Next login flow page
- app/auth/select-role/page.tsx: Role selection page
- app/campaigns/[id]/page.js: Dynamic campaign detail page
- app/contact/page.jsx: Contact page route
- app/create-campaign/page.jsx: Campaign creation page
- app/dashboard/page.js: Dashboard entry page
- app/dashboard/placeholder.txt: Placeholder dashboard content
- app/globals.css: Global styling and Tailwind overrides
- app/globals.d.ts: Global CSS type declarations
- app/homepage/page.js: Homepage route implementation
- app/how-it-works/page.jsx: How-it-works page route
- app/investor-dashboard/campaigns/page.js: Investor campaign list page
- app/investor-dashboard/layout.tsx: Investor dashboard layout
- app/investor-dashboard/overview/page.jsx: Investor overview page
- app/investor-dashboard/portfolio/page.tsx: Investor portfolio page
- app/investor-dashboard/settings/page.tsx: Investor settings page
- app/investor-dashboard/tokens/page.tsx: Investor tokens page
- app/investor-dashboard/transactions/page.tsx: Investor transaction history page
- app/layout.tsx: Root application layout and metadata wrapper
- app/login/page.js: Login page route
- app/page.tsx: Main homepage entry route
- app/profile/page.js: Profile page route
- app/sign-up/page.tsx: Signup page route
- components/campaign-card.jsx: Campaign card UI component
- components/campaign-list.jsx: Campaign list UI component
- components/categories-nav.jsx: Category navigation component
- components/featured-campaign.jsx: Featured campaign display component
- components/footer.tsx: Site footer component
- components/google-signIn.tsx: Google sign-in button component
- components/hero-section.jsx: Homepage hero section component
- components/Investor/Navbar.tsx: Investor dashboard navbar component
- components/Investor/Sidebar.tsx: Investor dashboard sidebar component
- components/market-analytics.jsx: Market analytics UI component
- components/navbar.jsx: Main navbar UI component
- components/owner-campaign-analytics.jsx: Owner analytics display component
- components/RiskAssessmentPanel.jsx: Risk assessment panel component
- components/RiskBadge.jsx: Risk badge display component
- components/role-selection-form.tsx: Role selection form component
- components/ThemeProvider.tsx: Theme provider implementation
- components/theme-provider.jsx: Theme switching wrapper component
- context/auth-context.tsx: Authentication context provider
- context/WalletContext.tsx: Wallet connection context provider
- Dockerfile: Frontend container build instructions
- eslint.config.mjs: ESLint configuration for the frontend workspace
- env.download: Downloaded environment example file
- lib/action.ts: Shared action helper utilities
- lib/formatters.ts: Data formatting helpers
- lib/launchCampaign.ts: Campaign launch helper logic
- lib/mockData.ts: Mock data used by UI components
- lib/supabase-client.ts: Supabase client configuration for the UI
- lib/withdrawFunds.ts: Withdrawal helper for funds-related actions
- next-env.d.ts: Next.js environment type declarations
- next.config.ts: Next.js runtime configuration
- package-lock.json: Frontend dependency lockfile
- package.json: Frontend manifest and scripts
- postcss.config.mjs: PostCSS configuration for Tailwind CSS
- proxy.ts: Proxy configuration helper
- public/: Static assets and branding files
- styles/: Shared styling overrides and theme extensions
- tailwind.config.js: Tailwind CSS configuration
- tsconfig.json: TypeScript configuration for the frontend app
- tsconfig.tsbuildinfo: TypeScript incremental build metadata
- types/cache-life.d.ts: Cache-related type declarations
- types/css.d.ts: CSS module declarations
- types/index.ts: Shared type exports
- types/routes.d.ts: Route type declarations
- types/validator.ts: Validation helper type definitions
- utils/getEthPrice.ts: Ethereum price helper for UI calculations
- utils/investmentUtils.ts: Contextual investment utility helpers
- utils/recommendations.ts: Recommendation generation helpers
- utils/supabase/: Supabase-specific utility helpers
- utils/uploadToIPFS.ts: IPFS upload helper
- vitest.config.mjs: Vitest configuration
