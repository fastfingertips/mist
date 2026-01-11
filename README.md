# Mist

![License](https://img.shields.io/github/license/fastfingertips/mist?style=flat-square)
![Version](https://img.shields.io/github/v/release/fastfingertips/mist?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square&logo=windows&logoColor=white)

![Tauri](https://img.shields.io/badge/Tauri-v2-FEC00F?style=flat-square&logo=tauri&logoColor=black)
![React](https://img.shields.io/badge/React-v19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Rust](https://img.shields.io/badge/Rust-Backend-000000?style=flat-square&logo=rust&logoColor=white)

Mist is a simple, modern folder size monitor for Windows. It helps you keep track of cache directories, temp folders, or any specific path, and notifies you when they grow too large.

## Download

**[Download Latest Release](https://github.com/fastfingertips/mist/releases/latest)**

1. Download `mist_x.x.x_x64-setup.exe` from the releases page.
2. Run the installer and follow the prompts.
3. Launch Mist from the Start Menu.

> **Note:** Windows may show a SmartScreen warning since the app is not code-signed. Click "More info" → "Run anyway" to proceed.

## Features

- **Folder Monitoring**: Tracks the size of any directory you add.
- **Threshold Alerts**: Visual and desktop notifications when a folder exceeds your set limit.
- **Quick Access**: Open monitored folders with a single click to manage or clean them manually.
- **System Tray**: Minimizes to tray for background monitoring. Configurable in Settings.
- **Import/Export**: Backup and restore your monitor list easily.
- **Native UI**: Designed with Windows Mica effects and Light/Dark mode support.
- **Lightweight**: Minimal background resource usage.

## Development

If you want to build from source or contribute:

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (required for Windows development)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/fastfingertips/mist.git
   cd mist
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run tauri dev
   ```

4. Build for production:
   ```bash
   npm run tauri build
   ```

   The installer will be located in `src-tauri/target/release/bundle/nsis/`.

## Tech Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Desktop Framework** | [Tauri v2](https://tauri.app/) | Low memory footprint, tiny binary size, and high security compared to Electron. |
| **Frontend Framework** | [React v19](https://react.dev/) + [Vite v7](https://vitejs.dev/) | Industry standard for building dynamic, reactive interfaces with lightning-fast HMR. |
| **Languages** | [Rust](https://www.rust-lang.org/) + [TypeScript](https://www.typescriptlang.org/) | Rust for background performance and memory safety; TypeScript for type-safe frontend development. |
| **UI Library** | [Mantine v8](https://mantine.dev/) | Premium, accessible components with built-in dark mode and high customizability. |
| **Icons** | [Tabler Icons](https://tabler-icons.io/) | Vast collection of clean, consistent, and minimal SVG icons. |

## License

Distributed under the [MIT License](LICENSE).

