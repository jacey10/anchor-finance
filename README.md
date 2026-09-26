# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

<<<<<<< HEAD
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)
=======
👉 **[Try the Live App](https://anchorvault.vercel.app/)**

## ✨ Key Features
>>>>>>> 4c924d8 (docs: add comprehensive README with architecture and setup guide)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

<<<<<<< HEAD
## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
=======
## 🛠️ Tech Stack

*   **Frontend:** React, Vite
*   **Backend & Database:** Supabase (PostgreSQL, Auth, Row Level Security)
*   **Styling:** Custom CSS (Mobile-first, PWA-ready)
*   **Charts:** Recharts

## 🧠 Architectural Decisions

### 1. Transactions as the Single Source of Truth
Instead of maintaining separate "balance" fields in the database that require complex syncing, Anchor Vault calculates all balances on the fly from the `transactions` table. This prevents data drift and ensures that if a historical transaction is deleted, the net worth instantly and correctly recalculates.

### 2. The "Starting Balance" Pattern
To allow users to log their initial wealth without inflating their "Income this month" charts, the app uses a reserved system source named `"Starting Balance"`. 
*   **Net Worth Engine:** Includes these transactions in total holdings.
*   **Monthly Summary Engine:** Explicitly filters out `tx.source === 'Starting Balance'` from monthly income calculations.

### 3. Dynamic Sources vs. Hardcoded Arrays
Early versions hardcoded income sources (e.g., `['Freelance', 'Salary']`). This was refactored to a dedicated `income_sources` database table. This ensures the app scales infinitely without requiring code deployments when a user starts a new side hustle.

## 🗺️ Future Roadmap (v2)

*   **The Bucket System:** Advanced allocation of funds into specific buckets (e.g., Rent, Groceries, Vacation) rather than just broad categories.
*   **USD Expenses:** Allowing direct spending from USD holdings (currently USD is strictly a savings/holding currency).
*   **Offline-First PWA:** Implementing a Service Worker and IndexedDB for full offline transaction logging and background syncing.
*   **Investment Tracking:** Expanding the Net Worth engine to include non-cash assets.

## 👤 Author

*   **Jacey** - [https://jacey10.vercel.app/]

##  License

MIT License.
>>>>>>> 4c924d8 (docs: add comprehensive README with architecture and setup guide)
