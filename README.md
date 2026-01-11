# Mist

Mist is a simple, modern folder size monitor for Windows. It helps you keep track of cache directories, temp folders, or any specific path, and notifies you when they grow too large.

## Features

- **Folder Monitoring**: Tracks the size of any directory you add.
- **Threshold Alerts**: Visual and desktop notifications when a folder exceeds your set limit.
- **Quick Access**: Open monitored folders with a single click to manage or clean them manually.
- **Native UI**: Designed with Windows Acrylic effects and Light/Dark mode support.
- **Lightweight**: Minimal background resource usage.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
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
- **Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **UI Components**: [Mantine v7](https://mantine.dev/)
- **Backend Logic**: [Rust](https://www.rust-lang.org/)
- **Icons**: [Tabler Icons](https://tabler-icons.io/)

## License

Distributed under the [MIT License](LICENSE).
