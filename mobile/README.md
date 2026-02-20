# AnimalDot Mobile App

Native mobile app for AnimalDot – smart pet bed monitoring. Same brand and aesthetic as the [AnimalDot website](../web).

## Stack

- **React Native** + **Expo** (SDK 54)
- **React Navigation** (native stack + bottom tabs)
- **Zustand** (auth, pet, device, settings)
- **react-native-ble-plx** (Bluetooth Low Energy for bed hardware)

## Scripts

- `npm start` – start Expo dev server
- `npm run android` – run on Android
- `npm run ios` – run on iOS
- `npm run web` – run in browser (Expo web)

## Deployment

1. **Development:** Run `npx expo start` and use Expo Go on a device or a simulator.
2. **Production builds:** Use [EAS Build](https://docs.expo.dev/build/introduction/):
   - Install EAS CLI: `npm i -g eas-cli`
   - Log in: `eas login`
   - Configure: `eas build:configure`
   - Build: `eas build --platform all` (or `ios` / `android`)

3. **App store submission:** Use [EAS Submit](https://docs.expo.dev/submit/introduction/) after building.

## Expo Go (SDK 54)

This project targets **Expo SDK 54** so it works with the current Expo Go app. Placeholder assets (`icon.png`, `splash.png`, etc.) are in `assets/`; replace them with your own for production.

If you see "Project is incompatible with this version of Expo Go" or "Unable to resolve asset":
1. Ensure `expo` in `package.json` is `^54.0.0`.
2. Close other terminals/IDE tabs using this folder, then run:
   ```bash
   npm install
   npx expo install --fix
   ```
3. Replace the placeholder images in `assets/` if needed (icon.png, splash.png, adaptive-icon.png, favicon.png).

## Design

Colors and typography match the AnimalDot website: primary `#3A7BFF`, success `#3CCB7F`, warning `#FFD568`, error `#FF6E6E`. See `src/components/UI.tsx` for the theme.
