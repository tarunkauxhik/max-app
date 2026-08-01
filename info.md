# PC Development Environment

_Last verified: 1 August 2026_

## System
- OS: Windows 11 25H2, build 26200.8875
- Laptop: ASUS Vivobook Pro 15 M6500QF-HN542WS
- CPU: AMD Ryzen 5 5600H
- RAM: 16 GB
- GPU: NVIDIA GeForce RTX 2050
- Storage: 512 GB SSD
- Virtualization: Enabled
- WSL 2: Installed
- Docker Desktop: Installed

## Core Tools
- Git: 2.55.0
- VS Code: 1.130.0
- Node.js: 24.18.1 LTS
- npm: 11.6.4
- Corepack: 0.35.0
- pnpm: 11.18.0

## Java
- Global JDK: Temurin 21.0.11
- `JAVA_HOME`: `C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`
- Separate JDK 17: `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.8-hotspot`
- Android Studio JBR: 25.0.2

## Android
- Android Studio: 2026.1
- SDK path: `C:\Users\tarun\AppData\Local\Android\Sdk`
- Platforms: Android 36, Android 37.0
- Build Tools: 36.0.0, 37.0.0
- Command-line Tools: 22.0
- Emulator: 37.1.11
- NDK: 28.2.13676358
- CMake: 3.22.1
- Android licences: Accepted
- Test device: Android 16, API 36, arm64-v8a

## Flutter
- Flutter: 3.44.8 stable
- Dart: 3.12.2
- Path: `C:\Users\tarun\develop\flutter`
- Android and web setup: Working
- Visual Studio: Not installed, so Flutter Windows desktop builds are unavailable

## React Native / Expo
- Preferred stack: React Native + Expo + TypeScript
- Package manager: pnpm
- Expo Go tested successfully on Android
- Metro and Fast Refresh tested successfully
- React Native VS Code profile exists
- Use Expo Go first; avoid native builds unless required
- Gradle 8.14.3, NDK 27.1 and the temporary Expo test project were removed

## GitHub
- Username: `tarunkauxhik`
- Email: `tarunkaushikraya@gmail.com`
- Default branch: `main`
- Git Credential Manager: Configured

## Instructions for AI
Before suggesting any installation, update, build or cleanup:

1. Check this file first and avoid duplicate installations.
2. Re-check official documentation and current requirements to ensure the information is still latest.
3. Verify existing paths, versions and environment variables before changing anything.
4. Explain storage impact, downloads, modified files and rollback steps first.
5. Do not change global Java, Android, Node, Flutter or package-manager settings unless necessary.
6. Prefer project-local dependencies and minimal changes.
