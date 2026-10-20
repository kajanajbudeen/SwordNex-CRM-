# SwordNex AI CRM - Dedicated Frontend Tier

The Frontend Tier is a standalone Single Page Application (SPA) built with React 18, TypeScript, Tailwind CSS, Lucide Icons, and Recharts.

---

## 🌐 Decoupled Architecture

* **Framework**: React 18 + Vite
* **Styling**: Tailwind CSS (Dark Enterprise Palette)
* **API Integration**: Decoupled HTTP/JSON REST client (`src/api/client.ts`)
* **State & Auth**: Client-side JWT auth state with local storage tokens & organization context
* **Target Backend**: Configurable via `VITE_API_URL` environment variable

---

## 🚀 Standalone Operations

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Set `VITE_API_URL` to point to the backend server (e.g., `http://localhost:5000` or production API URL).

### 3. Run Development Server
```bash
npm run dev
```
Accessible at: `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```
Generates optimized static assets in `dist/`, ready to deploy to any CDN or static hosting platform:
- Vercel / Netlify / Cloudflare Pages
- AWS S3 + CloudFront
- Nginx / Caddy static container

### 5. Preview Production Build Locally
```bash
npm run preview
```

### 6. Run via Docker
```bash
docker build -t swordnex-crm-client .
docker run -p 80:80 swordnex-crm-client
```
