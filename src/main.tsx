import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import App from "./App";
import "@mantine/core/styles.css";

import { AppColors, DarkThemePalette } from "./theme";

// Helper to generate shades from a hex color
// Based on: StackOverflow & PimpMyMantine
function shadeColor(color: string, percent: number) {
  const f = Number.parseInt(color.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = percent < 0 ? percent * -1 : percent;
  const R = f >> 16;
  const G = (f >> 8) & 0x00FF;
  const B = f & 0x0000FF;

  return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
}

function generatePalette(base: string) {
  return [
    shadeColor(base, 0.9), // 0
    shadeColor(base, 0.75), // 1
    shadeColor(base, 0.6), // 2
    shadeColor(base, 0.45), // 3
    shadeColor(base, 0.3), // 4
    shadeColor(base, 0.15), // 5
    base,                  // 6 (Primary)
    shadeColor(base, -0.2), // 7
    shadeColor(base, -0.4), // 8
    shadeColor(base, -0.6), // 9
  ];
}

const renderApp = async () => {
  let primaryColorName = AppColors.primary;
  let customColors = {};

  try {
    // Fetch Windows accent color
    const sysColor = await invoke<string | null>('get_windows_accent_color');
    if (sysColor) {
      const palette = generatePalette(sysColor);
      // Override the default color palette (e.g. 'blue') because components use explicit references to it
      customColors = { [AppColors.primary]: palette };
      // We don't change primaryColorName because it is already set to AppColors.primary
    }
  } catch (e) {
    // Fallback or dev mode without new rust command
    console.log("Could not fetch system accent color (ignore if in dev with old backend):", e);
  }

  const theme = createTheme({
    fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif',
    primaryColor: primaryColorName,
    defaultRadius: 'md',
    colors: {
      // Override default 'dark' palette
      dark: DarkThemePalette as any,
      ...customColors,
    },
  });

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <App />
      </MantineProvider>
    </React.StrictMode>
  );
};

renderApp();
