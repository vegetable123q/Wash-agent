import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "edu.tsinghua.washmatecampus",
  appName: "WashMate Campus",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
