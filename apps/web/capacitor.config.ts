import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.salo.pos',
  appName: 'Vamos Donde Salo!',
  webDir: 'out',
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#E8720C',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#E8720C',
    },
  },
};
export default config;
