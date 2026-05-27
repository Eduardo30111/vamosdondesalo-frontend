import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.salo.pos',
  appName: 'Vamos Donde Salo!',
  webDir: 'public-mobile',
  server: {
    // Para emulador Android: 10.0.2.2 siempre apunta al host (tu Mac)
    // Para dispositivo real: usa la IP local de tu Mac
    url: 'http://192.168.80.22:3000',
    cleartext: true,
  },
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
