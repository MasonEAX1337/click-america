# Click America

A real-time, massively multiplayer clicker game where players compete to generate points for their U.S. state.

## Overview

Click America is a stateful, real-time web application where users generate points ("clicks") that contribute to live global and state-level leaderboards. Data updates instantly across all connected clients, creating a highly competitive and synchronized multiplayer experience.

This project was built as an experimental stress test to explore and evaluate the new Google AI Studio full-stack capabilities. The primary goal was to assess how effectively AI Studio can generate, manage, and scale a real-time, stateful application utilizing integrated databases (Firestore), authentication, and high-frequency multiplayer synchronization.

## Features

*   **Real-Time Global & State Leaderboards:** Live, synchronized leaderboards displaying the top-performing states and players, updated instantly via Firestore `onSnapshot` listeners.
*   **Multiplayer Synchronization:** A custom `GameEngine` batches and syncs local client clicks to the server using adaptive intervals (3s active, 15s idle) to minimize database writes while maintaining a real-time feel.
*   **Click-Based Progression & Upgrades:** Players earn a balance from clicking, which can be spent on upgrades to increase manual click power or generate passive clicks per second (CPS).
*   **Offline Progression:** Players earn passive clicks while offline (calculated at a 10% efficiency rate, capped at 24 hours and 100,000 clicks to comply with anti-cheat rules).
*   **Dynamic Event System:** Periodic "State Rivalry" events (e.g., California vs. Texas) that grant click multipliers to participating states, driving engagement.
*   **Authentication:** Secure Google OAuth integration via Firebase Authentication.
*   **Anti-Cheat Mechanisms:** Client-side rate limiting (~25 clicks/sec) and strict Firestore Security Rules that cap maximum click increments per request to prevent massive botting or data injection.
*   **Interactive US Map:** A visual representation of the United States, allowing players to select their state and view regional dominance.

## Architecture

Click America utilizes a serverless, event-driven architecture designed to handle high-frequency updates.

*   **Frontend:** Built with React (Vite) and styled with Tailwind CSS. Animations are handled by Framer Motion.
*   **Database:** Firebase Firestore (NoSQL).
*   **Data Propagation:**
    1.  **User Action:** A player clicks, incrementing their local state.
    2.  **Batching:** The `GameEngine` batches clicks over a short interval (e.g., 3 seconds).
    3.  **Transaction:** A Firestore `writeBatch` atomically updates three documents:
        *   The user's profile (`/users/{userId}`)
        *   The user's state aggregate (`/states/{stateId}`)
        *   The global aggregate (`/global/stats`)
    4.  **Broadcast:** Firestore `onSnapshot` listeners on all connected clients receive the updated aggregates and re-render the UI instantly.
*   **Offline Persistence:** Utilizes Firestore's `persistentLocalCache` and `persistentMultipleTabManager` to ensure the game functions seamlessly during brief network drops and across multiple browser tabs.

## Tech Stack

*   **Frontend Framework:** React 18, Vite
*   **Styling:** Tailwind CSS
*   **Animations:** Framer Motion, canvas-confetti
*   **Icons:** Lucide React
*   **Backend / Database:** Firebase (Firestore, Authentication)
*   **Language:** TypeScript

## Getting Started

### Prerequisites

*   Node.js (v18+ recommended)
*   A Firebase project with Firestore and Google Authentication enabled.

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration

1.  Create a `firebase-applet-config.json` file in the root directory with your Firebase project credentials:
    ```json
    {
      "apiKey": "YOUR_API_KEY",
      "authDomain": "YOUR_AUTH_DOMAIN",
      "projectId": "YOUR_PROJECT_ID",
      "appId": "YOUR_APP_ID",
      "firestoreDatabaseId": "(default)"
    }
    ```
2.  Deploy the Firestore Security Rules:
    ```bash
    firebase deploy --only firestore:rules
    ```

### Running Locally

Start the Vite development server:
```bash
npm run dev
```

## Key Insights & Notes

This project served as a successful evaluation of AI-generated full-stack applications.

*   **Real-Time Performance:** Firestore handles the high-frequency reads exceptionally well via snapshot listeners. However, high-frequency *writes* required the implementation of a client-side batching engine (`GameEngine`) to prevent exceeding Firestore's sustained write limits (1 write per second per document) on the global and state aggregate documents.
*   **Security vs. Convenience:** Balancing a seamless clicker experience with security required moving away from simple client-side updates. Implementing strict Firestore rules (capping increments) and transactional purchases (`runTransaction`) was necessary to prevent basic exploits.
*   **State Management:** Managing optimistic UI updates alongside server-authoritative state required careful handling of React `useEffect` dependencies and local state reconciliation to prevent UI jitter.

## Future Improvements

*   **Scaling Optimizations (Distributed Counters):** The current architecture updates a single global document (`/global/stats`). At massive scale, this will hit Firestore's write limits. Implementing Firebase Distributed Counters (sharding) is the necessary next step for enterprise-level scaling.
*   **Advanced Anti-Spam:** Implement server-side validation (e.g., Cloud Functions) to analyze click patterns and detect sophisticated auto-clickers that bypass the client-side rate limit.
*   **Richer Gameplay:** Introduce guilds/factions within states, prestige mechanics (resetting progress for permanent multipliers), and more complex, multi-tiered upgrade trees.
*   **UI Enhancements:** Add a global chat system, more dynamic map visualizations (e.g., heatmaps based on live click volume), and richer sound design.
