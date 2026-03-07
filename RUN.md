# AnimalDot – Commands to Run and Test

Use this guide to install dependencies, run the backend, web app, and mobile app, and execute tests.

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** (or pnpm/yarn)
- **PostgreSQL** (for backend; default DB name: `animaldot`)
- **Expo Go** on your phone (optional; for mobile) or Android/iOS simulator

---

## 1. Backend (API + WebSocket)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and set at least:

- `DATABASE_URL` – e.g. `postgresql://postgres:postgres@localhost:5432/animaldot`
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` – random strings for production

Create the database and run migrations:

```bash
# Create DB (if needed; exact command depends on your Postgres setup)
# createdb animaldot

npm run db:migrate
```

Run the API (dev):

```bash
npm run dev
```

API runs at **http://localhost:3000**. Health: **http://localhost:3000/api/health**.

Build for production:

```bash
npm run build
npm start
```

Run backend tests:

```bash
cd backend
npm test
```

---

## 2. Web app

```bash
cd web
npm install
```

Optional: create `web/.env` and set:

- `VITE_API_URL=http://localhost:3000/api` (if API is not on 3000)
- `VITE_WS_URL=ws://localhost:3000` (for WebSocket; optional, derived from API URL by default)

Run dev server:

```bash
npm run dev
```

Web app runs at **http://localhost:5173** (or the port Vite prints). Open `/` for landing, `/app` for the app (sign-in or live view).

Build for production:

```bash
npm run build
```

Serve the built files (e.g. `npx serve dist` or your host’s static file serving).

Run web tests:

```bash
cd web
npm run test:run
```

Watch mode:

```bash
npm test
```

---

## 3. Mobile app (Expo)

```bash
cd mobile
npm install
```

Optional: create `mobile/.env` and set:

- `EXPO_PUBLIC_API_URL=http://localhost:3000/api`  
  Use `http://10.0.2.2:3000/api` for Android emulator, or your machine’s LAN IP for a physical device.

Start Expo:

```bash
npx expo start
```

Then scan the QR code with Expo Go, or press `a` (Android) / `i` (iOS) for simulator.

Run mobile tests:

```bash
cd mobile
npm test
```

---

## 4. Run full stack (backend + web)

1. **Terminal 1 – Backend**
   ```bash
   cd backend && npm run db:migrate && npm run dev
   ```

2. **Terminal 2 – Web**
   ```bash
   cd web && npm run dev
   ```

3. Open **http://localhost:5173** and go to **Log in** → sign in or create account, then use the app.

---

## 5. Run all tests

From the repo root:

```bash
cd backend && npm test && cd ..
cd web && npm run test:run && cd ..
cd mobile && npm test && cd ..
```

Or run each in its own terminal:

| Project  | Command           |
|----------|-------------------|
| Backend  | `cd backend && npm test` |
| Web      | `cd web && npm run test:run` |
| Mobile   | `cd mobile && npm test` |

---

## 6. Lint

- **Backend:** `cd backend && npm run lint`
- **Web:** (add `"lint": "eslint ."` to `web/package.json` if desired)
- **Mobile:** `cd mobile && npm run lint`

---

## 7. Summary table

| Action        | Backend              | Web                 | Mobile           |
|---------------|----------------------|---------------------|------------------|
| Install       | `npm install`        | `npm install`       | `npm install`    |
| Env           | `cp .env.example .env` | (optional `.env`) | (optional `.env`) |
| Migrate DB    | `npm run db:migrate` | –                   | –                |
| Dev server    | `npm run dev`        | `npm run dev`       | `npx expo start` |
| Build         | `npm run build`      | `npm run build`     | (EAS Build)      |
| Tests         | `npm test`           | `npm run test:run`  | `npm test`       |

---

## 8. Testing the device when it’s not connected to your computer

The firmware publishes to the MQTT broker (**sensorweb.us:1883**) on topics:

- `/AnimalDot/<mac>/temperature` — BedDot binary
- `/AnimalDot/<mac>/humidity` — BedDot binary  
- `/AnimalDot/<mac>/debug` — JSON (human‑readable)

`<mac>` is the device WiFi MAC without colons, lowercased (e.g. `a1b2c3d4e5f6`). You can get it from serial at boot (WiFi test line) or from your router.

### Option A: Subscribe to MQTT from your PC

From your computer you can watch live traffic to confirm the device is publishing while it runs on power elsewhere.

**Using mosquitto_sub (if you have Mosquitto installed):**

```bash
# All AnimalDot devices, all measurements (wildcard)
mosquitto_sub -h sensorweb.us -p 1883 -t "/AnimalDot/+/#" -v

# Or only debug (JSON) for easy reading
mosquitto_sub -h sensorweb.us -p 1883 -t "/AnimalDot/+/debug" -v
```

**Using MQTT Explorer (GUI):**

1. Download [MQTT Explorer](http://mqtt-explorer.com/) (or any MQTT client).
2. Add connection: host `sensorweb.us`, port `1883`, no TLS.
3. Subscribe to `/AnimalDot/#` (all AnimalDot topics).
4. Power the device elsewhere; you should see messages every few seconds.

If you see messages, the device is successfully pushing to the server (broker). Your backend does not subscribe to this broker by default; it accepts vitals via **POST /api/vitals**. To get device data into the dashboard when the device is not connected, you’d add an MQTT subscriber in the backend that parses these topics and writes to the `vitals` table (or bridge the broker to your pipeline).

### Option B: Backend API + dashboard

If the device (or another service) is already posting vitals to your API (e.g. **POST /api/vitals**), then with the backend and dashboard running you can:

1. Log in to the dashboard.
2. Open the device and check **Latest vitals** or **Trends** to confirm new data.

This only shows data that has been ingested into your API; for firmware that only publishes to MQTT, use Option A to verify the device, and add an MQTT→backend bridge if you want that data in the dashboard.
