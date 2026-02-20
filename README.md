# AnimalDot

Smart pet bed monitoring: real-time vitals (heart rate, respiration, temperature, weight) from your pet’s bed.

This repo contains two **separate** products that share the same brand and aesthetic:

| Project | Description |
|--------|--------------|
| **[web](./web)** | Marketing website + web app. React, Vite, Tailwind. Deploy as a static site. |
| **[mobile](./mobile)** | Native mobile app. React Native, Expo. Deploy to App Store / Play Store. |

## Quick start

**Website**
```bash
cd web && npm install && npm run dev
```
Open http://localhost:3000. Build: `npm run build` → serve the `build/` folder.

**Mobile app**
```bash
cd mobile && npm install && npx expo start
```
Use Expo Go on a device or run an iOS/Android simulator.

## Deployment

- **Web:** See [web/README.md](./web/README.md). Use any static host (Vercel, Netlify, etc.) with SPA fallback for `/` and `/app`.
- **Mobile:** See [mobile/README.md](./mobile/README.md). Use EAS Build and EAS Submit for store-ready builds.
