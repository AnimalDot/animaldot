// index.js
// AnimalDot Mobile App Entry Point

import { AppRegistry, LogBox } from 'react-native';
import App from './App';

// Ignore specific warnings that are not relevant
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
  'Require cycle:',
]);

// Register the main application component (Expo expects 'main')
AppRegistry.registerComponent('main', () => App);
