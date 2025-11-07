// Reactotron configuration for React Native (Expo)
// Initialize Reactotron only in development mode

import Reactotron from 'reactotron-react-native';

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  try {
    Reactotron
      .configure({ name: 'chitti-udi' }) // controls connection & communication settings
      .useReactNative() // add all built-in react native plugins
      .connect(); // let's connect!

  // Clear Reactotron on every reload so it's easier to read
  // @ts-ignore
  Reactotron.clear && Reactotron.clear();

  // Attach Reactotron to console for easy access in development
  (console as any).tron = Reactotron;
  console.log('Reactotron configured');
  } catch (e) {
    // If Reactotron fails, don't crash the app
    console.warn('Reactotron failed to configure', e);
  }
}

export default Reactotron;
