# AnimalDot Website

Marketing site and web app for AnimalDot – smart pet bed monitoring.

## Stack

- **React 18** + **TypeScript** + **Vite 6**
- **Tailwind CSS** + **Radix UI** (shadcn-style)
- **React Router** – `/` landing, `/app` in-app experience

## Scripts

- `npm run dev` – dev server at http://localhost:3000
- `npm run build` – production build to `build/`

## Deployment

1. Run `npm run build`.
2. Serve the `build/` directory with any static host (Vercel, Netlify, Cloudflare Pages, etc.).
3. Configure **SPA fallback**: all routes (`/`, `/app`, `/app/*`) must serve `index.html` so client-side routing works.

Example (Vercel): no extra config needed. Netlify: add `build/public/_redirects` with `/* /index.html 200`.
