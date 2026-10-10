import type {CapacitorConfig} from '@capacitor/cli';

/**
 * Android shell for the existing Vite build. The game, rules engine and 3D board run in the system WebView;
 * LAN play connects to a host computer running `npm run start:lan` over plain ws:// on the local network.
 */
const config:CapacitorConfig={
 appId:'com.propertyempire.game',
 appName:'Property Empire',
 webDir:'apps/web/dist',
 backgroundColor:'#F7F5F0',
 loggingBehavior:'debug',
 server:{
  // http://localhost keeps ws:// connections to LAN hosts from being blocked as mixed content.
  androidScheme:'http',
  errorPath:'webview-update.html'
 },
 android:{
  // Three.js WebGL2 and the stylesheet (color-mix, :has) need a Chromium 111+ WebView.
  minWebViewVersion:111,
  allowMixedContent:false,
  backgroundColor:'#F7F5F0'
 },
 plugins:{
  SystemBars:{insetsHandling:'native',initialViewportFitValueHint:'cover',style:'LIGHT'}
 }
};

export default config;
