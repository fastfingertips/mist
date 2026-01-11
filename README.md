# Mist

![License](https://img.shields.io/github/license/fastfingertips/mist?style=flat-square)
![Version](https://img.shields.io/github/v/release/fastfingertips/mist?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square&logo=windows&logoColor=white)

![Tauri](https://img.shields.io/badge/Tauri-v2-FEC00F?style=flat-square&logo=tauri&logoColor=black)
![React](https://img.shields.io/badge/React-v19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Rust](https://img.shields.io/badge/Rust-Backend-000000?style=flat-square&logo=rust&logoColor=white)

Mist is a simple, modern folder size monitor for Windows. It helps you keep track of cache directories, temp folders, or any specific path, and notifies you when they grow too large.

## Features

- **Folder Monitoring**: Tracks the size of any directory you add.
- **Threshold Alerts**: Visual and desktop notifications when a folder exceeds your set limit.
- **Quick Access**: Open monitored folders with a single click to manage or clean them manually.
- **Native UI**: Designed with Windows Acrylic effects and Light/Dark mode support.
- **Lightweight**: Minimal background resource usage.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (required for Windows development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/fastfingertips/mist.git
   cd mist
   # Navigate to the app directory if necessary
   cd tauri-app/tauri-cache-reminder
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

   The executable will be located in `src-tauri/target/release/bundle/nsis/`.

## Tech Stack

- **Core**: [Tauri v2](https://tauri.app/)
- **Frontend**: [React v19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite v7](https://vitejs.dev/)
- **UI Components**: [Mantine v8](https://mantine.dev/)
- **Backend Logic**: [Rust](https://www.rust-lang.org/)
- **Icons**: [Tabler Icons](https://tabler-icons.io/)

## License

Distributed under the [MIT License](LICENSE).
