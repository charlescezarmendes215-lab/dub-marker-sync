import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.charleslab.dubmarker",
  appName: "DubMarker",
  webDir: "dist-mobile",
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
