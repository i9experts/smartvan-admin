# SmartVan Admin Portal

World-class school transport management dashboard built with Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui.

## Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + custom design tokens
- **State**: React Query (@tanstack/react-query)
- **API**: Axios with JWT interceptors
- **Realtime**: Socket.io client
- **Charts**: Recharts
- **Icons**: Lucide React

## Brand colors
| Token | Hex | Usage |
|-------|-----|-------|
| `sv-navy` | `#1B2B6B` | Sidebar active, primary buttons |
| `sv-yellow` | `#FFB800` | Logo, accent elements |
| `sv-teal` | `#00C48C` | Active status, success |
| `sv-red` | `#FF4B4B` | Alerts, errors |
| `sv-orange` | `#FF8C42` | Warnings, delayed |
| `sv-muted` | `#8A94A6` | Secondary text |
| `sv-border` | `#EAECF0` | All borders |
| `sv-bg` | `#F5F6FA` | Page background |

## Project structure
```
src/
├── app/
│   ├── auth/login/         Login page
│   ├── dashboard/          Main dashboard
│   ├── tracking/           Live GPS tracking
│   ├── students/           Student management
│   ├── vans/               Van management
│   ├── drivers/            Driver management
│   ├── parents/            Parent management
│   ├── routes/             Route planner
│   ├── alerts/             Alerts overview
│   ├── analytics/          Analytics
│   ├── billing/            Billing & subscription
│   └── fleet/              Fleet management
├── components/
│   ├── layout/             Sidebar, Topbar
│   ├── dashboard/          Dashboard components
│   ├── tracking/           Tracking components
│   ├── students/           Student components
│   └── shared/             Shared UI
├── hooks/                  useAuth, useSocket, etc.
├── lib/                    api.ts, utils.ts, socket.ts
└── types/                  TypeScript types
```

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/i9experts/smartvan-admin.git
cd smartvan-admin

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your API URL and Google Maps key

# 4. Run development server
npm run dev

# 5. Build for production
npm run build
npm start
```

## Server deployment
```bash
# On the server at /var/www/smartvan-admin
git clone https://github.com/i9experts/smartvan-admin.git .
npm install
npm run build
pm2 start npm --name smartvan-admin -- start -- -p 3000
pm2 save
```

Add `SERVER_SSH_KEY` secret to GitHub repo → auto-deploys on every push to main.

## API connection
The app connects to `https://api.smartvanride.com` (the NestJS backend already running on port 3002). All routes are already fixed with the Week 1 + Week 2 security patches.

## Build plan progress
- ✅ Week 1: Foundation + all 10 admin screens
- ⏳ Week 2: Live tracking map + Flutter apps
- ⏳ Week 3: ETA engine + SOS + geofencing
- ⏳ Week 4: Stripe billing + Arabic + launch
