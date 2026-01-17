import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import App from "./App";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { AppColors, DarkThemePalette, generatePalette } from "./theme";
import { api } from "./api";

const renderApp = async () => {
  let primaryColorName = AppColors.primary;
  let customColors = {};

  try {
    const sysColor = await api.getWindowsAccentColor();
    if (sysColor) {
      const palette = generatePalette(sysColor);
      customColors = { [AppColors.primary]: palette };
    }
  } catch (e) {
    console.log("Could not fetch system accent color:", e);
  }

  const theme = createTheme({
    fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif',
    primaryColor: primaryColorName,
    defaultRadius: 'md',
    colors: {
      dark: DarkThemePalette as any,
      ...customColors,
    },
  });

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications position="top-right" zIndex={2000} />
        <App />
      </MantineProvider>
    </React.StrictMode>
  );
};

renderApp();
