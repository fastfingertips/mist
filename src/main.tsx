import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import App from "./App";
import "@mantine/core/styles.css";

// GitHub Dark Theme Palette
const theme = createTheme({
  fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif',
  primaryColor: 'violet',
  defaultRadius: 'md',
  colors: {
    // Override default 'dark' palette with GitHub colors
    dark: [
      '#c9d1d9', // 0: Text Primary (Foreground)
      '#b1bac4', // 1: Text Secondary
      '#8b949e', // 2: Text Muted / Icons
      '#6e7681', // 3: Disabled / Placeholder
      '#484f58', // 4: Borders (Subtle)
      '#30363d', // 5: Borders (Default)
      '#21262d', // 6: Surface Light / Hover
      '#161b22', // 7: Surface Default (Cards, Sidebars) - Mantine uses this for Card bg in dark mode usually
      '#0d1117', // 8: Canvas Default (Body Background)
      '#010409', // 9: Canvas Dark (Deep background)
    ],
  },
  // Set default background colors
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>
);
