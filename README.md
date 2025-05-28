# jraw.it

jraw.it is a collaborative drawing application that allows users to draw together in real-time. It is designed to be a cross-platform experience, available on the web, Android, iOS, and desktop.

## Features

- **Real-time Collaborative Drawing:** Multiple users can draw on the same canvas simultaneously.
- **Basic Drawing Tools:** Includes tools like a pen and a color picker.
- **User Authentication:** Users can register and log in to save their work and preferences.
- **Cross-Platform:** Accessible on web browsers, Android devices, iOS devices, and as a desktop application.

## Technologies Used

### Frontend (jraw.it/)

- **React Native:** For building native mobile apps (Android and iOS) from a single codebase.
- **Expo:** A framework and platform for universal React applications, simplifying development and deployment.
- **TypeScript:** For static typing, improving code quality and maintainability.
- **Tauri:** For building cross-platform desktop applications using web technologies.

### Common

- **Node.js:** JavaScript runtime environment.
- **Yarn:** Dependency management.
- **Git:** Version control.

## Project Structure

- **`jraw.it/`**: Contains the frontend application code.
  - **`app/`**: Core application screens and navigation logic (e.g., [`app/login.tsx`](jraw.it/app/login.tsx), [`app/register.tsx`](jraw.it/app/register.tsx), [`app/canvas/`](jraw.it/app/canvas/)).
  - **`assets/`**: Static assets like images and fonts.
  - **`components/`**: Reusable UI components (e.g., [`components/CanvasComponent.tsx`](jraw.it/components/CanvasComponent.tsx), [`components/ColorPickerModal.tsx`](jraw.it/components/ColorPickerModal.tsx)).
  - **`constants/`**: Application-wide constants.
  - **`hooks/`**: Custom React hooks.
  - **`src-tauri/`**: Tauri-specific code for the desktop application.
  - **`utils/`**: Utility functions.

## First time setup

1.  Install [Node.js](https://nodejs.org/en/download/)
2.  Install [Git](https://git-scm.com/downloads)
3.  Install [Yarn](https://yarnpkg.com/getting-started/install)
4.  Clone the repository

    ```bash
    git clone https://github.com/jrawit/jraw.it.git
    ```

5.  Enter the repository

    ```bash
    cd jraw.it
    ```

6.  Install dependencies

    ```bash
    yarn
    ```

## Running the Application

### Web

```bash
yarn web
```

### Android

```bash
yarn android
```

### iOS

```bash
yarn ios
```

### Desktop

```bash
yarn desktop
```

## License

This project is licensed under the MIT License. See the [LICENSE](https://opensource.org/license/mit) file for more details.
