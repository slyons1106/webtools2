# WebTools2

This project is a web application with a React frontend and an Express.js backend. It features role-based access control with two roles: USER and ADMIN.

## Project Structure

- `client/`: Contains the React frontend application (Vite + TypeScript).
- `server/`: Contains the Express.js backend application.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone git@github.com:slyons1106/webtools2.git
    cd webtools2
    ```

2.  **Install server dependencies:**
    ```bash
    npm install
    ```

3.  **Install client dependencies:**
    ```bash
    cd client
    npm install
    cd ..
    ```

## Running the Application

1.  **Start the backend server:**
    In the project root directory:
    ```bash
    npm start
    ```
    The server will run on `http://localhost:3000`.

2.  **Start the frontend development server:**
    In the `client` directory:
    ```bash
    npm run dev
    ```
    The client development server will run on `http://localhost:5173` (or another available port).

## Authentication

The application includes a mock authentication system with the following credentials:

-   **User:**
    -   Username: `user`
    -   Password: `password`
-   **Admin:**
    -   Username: `admin`
    -   Password: `adminpassword`

### Access Control

-   **Home Page:** Accessible to all users (logged in or not).
-   **Admin Page:** Accessible only to users with the `ADMIN` role.

## API Endpoints

-   `POST /login`: Authenticates a user.
-   `POST /logout`: Logs out the current user.
-   `GET /check-auth`: Checks the authentication status and role of the current user.
-   `GET /api/public`: Public API endpoint (accessible to all).
-   `GET /api/admin`: Admin-only API endpoint (requires `ADMIN` role).

## Deployment to Raspberry Pi

*(This section will be expanded as the project progresses)*

To deploy to a Raspberry Pi, you would typically build the client application, then serve both the client static files and the backend application from the Raspberry Pi.

1.  **Build the client:**
    ```bash
    cd client
    npm run build
    ```
    This will create a `dist` folder in the `client` directory containing the production-ready frontend assets.

2.  **Run the server in production mode:**
    Ensure your server is configured to serve the static files from `client/dist` when running in production. The current `server/index.js` has basic support for this.
    ```bash
    NODE_ENV=production npm start
    ```
