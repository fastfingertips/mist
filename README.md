# Mist

Mist is a modern, lightweight cache monitoring and cleanup utility built with **Tauri**, **React**, and **Rust**. Designed for Windows with a native, seamless look and feel.

## Features

- **Real-time Monitoring**: Tracks folder sizes for common cache locations (Temp, Spotify, Chrome, etc.).
- **Smart Notifications**: Get notified when a folder exceeds your defined threshold.
- **Native UI**: Uses Windows Acrylic/Blur effects for a premium desktop experience.
- **Theme Support**: Beautiful Dark (GitHub-inspired) and Light modes.
- **Customizable**: Add, edit, or remove any folder you want to monitor.
- **Privacy Focused**: All configuration stays locally on your machine.
- **Lightweight**: Built with Rust backend for minimal resource usage.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (required for Windows development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mist.git
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
- **Backend Logic**: Rust
- **Icons**: [Tabler Icons](https://tabler-icons.io/)

## License

Distributed under the MIT License.
