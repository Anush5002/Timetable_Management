# Timetable Management System - Installation Guide

This guide describes how to set up and run the Timetable Management System, which consists of a Node.js/Express backend (with Python scheduler) and a React/Vite frontend.

## Prerequisites

Ensure you have the following software installed on your system:

1.  **Node.js** (v18 or higher) & **npm**
    *   [Download Node.js](https://nodejs.org/)
2.  **MySQL Server** (v8.0 recommended)
    *   [Download MySQL](https://dev.mysql.com/downloads/installer/)
    *   Ensure the MySQL service is running.
3.  **Python** (v3.8 or higher)
    *   [Download Python](https://www.python.org/downloads/)
    *   Ensure `python` is added to your system PATH.

---

## 1. Database Configuration

The system is designed to automatically create the database and tables if they don't exist. You just need a MySQL user with permissions to create databases.

1.  Make sure your MySQL server is running.
2.  Note down your MySQL `root` username and password (or any user with `CREATE DATABASE` privileges).

---

## 2. Backend Setup

The backend handles the API and the scheduling algorithm.

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Create a `.env` file in the `backend` directory to configure your database connection:
    *   Create a file named `.env`.
    *   Add the following variables (update with your actual MySQL credentials):

    ```env
    PORT=5000
    DB_HOST=localhost
    
    # Credentials to CREATE the database (usually root)
    DB_ROOT_USER=root
    DB_ROOT_PASSWORD=your_root_password
    
    # Detailed App User (System will create this user regarding APP_DB configuration)
    APP_DB_NAME=timetable
    APP_DB_USER=nodeuser
    APP_DB_PASSWORD=password1234
    ```

4.  Start the backend server:
    ```bash
    node server.js
    ```
    *   *First Run:* You should see specific logs indicating that the database `timetable` was created and tables were provisioned.
    *   The server will run on `http://localhost:5000`.

---

## 3. Frontend Setup

The frontend is a React application that serves the user interface.

1.  Open a new terminal window.
2.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```

3.  Install dependencies:
    ```bash
    npm install
    ```

4.  (Optional) Configure API URL:
    *   The frontend tries to connect to `http://localhost:5000` by default.
    *   If your backend is running on a different port, create a `.env` file in `frontend`:
        ```env
        VITE_API_BASE_URL=http://localhost:your_port
        ```

5.  Start the development server:
    ```bash
    npm run dev
    ```

6.  Open your browser and verify the application is running (usually at `http://localhost:5173` or `http://localhost:8080` as shown in the terminal).

---

## Troubleshooting

-   **"ER_ACCESS_DENIED_ERROR" in Backend**: Double-check `DB_ROOT_USER` and `DB_ROOT_PASSWORD` in `backend/.env`.
-   **"Python not found"**: Ensure Python is installed and added to your system environment variables. You can verify by running `python --version` in your terminal.
-   **Frontend shows "Network Error"**: Ensure the backend server is running and the port matches the default (`5000`) or your `VITE_API_BASE_URL` configuration.
