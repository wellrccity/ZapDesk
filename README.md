# ZapDesk

ZapDesk is a comprehensive chatbot solution designed to streamline communication and automate customer interactions. It features a robust backend built with Node.js, Express, and Sequelize, integrated with WhatsApp Web for messaging. The frontend is a React-based interface, providing a user-friendly experience for managing chats, flows, and integrations.

## Features

### Backend
- **User Authentication:** Secure login and registration with JWT.
- **WhatsApp Integration:** Send and receive messages via WhatsApp Web.js.
- **Flow Management:** Define and manage conversational flows for automated responses.
- **Database Connections:** Securely store and manage database credentials.
- **Real-time Communication:** Socket.io for instant message updates.
- **API Endpoints:** RESTful API for managing users, chats, contacts, flows, and integrations.

### Frontend
- **Chat Interface:** Intuitive UI for real-time chat interactions.
- **Flow Editor:** Visual editor for creating and modifying conversational flows.
- **User Management:** Admin panel for managing users and their roles.
- **Integration Management:** Configure and manage external integrations.
- **QR Code Generation:** For WhatsApp Web connection.
- **Responsive Design:** Built with React and Bootstrap for a seamless experience across devices.

## Technologies Used

### Backend
- **Node.js:** JavaScript runtime environment.
- **Express:** Web application framework.
- **Sequelize:** ORM for MySQL.
- **MySQL2:** MySQL client for Node.js.
- **JSON Web Token (jsonwebtoken):** For authentication.
- **Bcrypt.js:** For password hashing.
- **CORS:** Cross-Origin Resource Sharing.
- **Socket.io:** Real-time bidirectional event-based communication.
- **WhatsApp Web.js:** WhatsApp client library.
- **QR Code:** For generating QR codes.
- **Dotenv:** For environment variable management.
- **Nodemon:** For automatic server restarts during development.

### Frontend
- **React:** JavaScript library for building user interfaces.
- **Vite:** Next-generation frontend tooling.
- **Bootstrap:** CSS framework for responsive design.
- **React Bootstrap:** Bootstrap components built with React.
- **React Bootstrap Icons:** Icon library.
- **React Router DOM:** For declarative routing.
- **Socket.io Client:** For real-time communication with the backend.
- **Axios:** Promise-based HTTP client.
- **React Content Editable:** For editable content areas.
- **React Toastify:** For notifications.
- **React Flow:** For building node-based editors.

## Getting Started

### Prerequisites

Make sure you have the following installed:
- Node.js (v18 or higher recommended)
- npm (Node Package Manager)
- MySQL Server

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/wellrccity/ZapDesk.git
    cd ZapDesk
    ```

2.  **Backend Setup:**
    ```bash
    cd backend
    npm install
    ```
    Create a `.env` file in the `backend` directory with your database credentials and other configurations:
    ```
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=zapdesk_db
    PORT=8080
    SECRET=your_jwt_secret
    ```
    Run the database schema:
    ```bash
    mysql -u your_user -p zapdesk_db < estrutura.sql
    ```
    (Replace `your_user` and `zapdesk_db` with your actual database user and name, and `estrutura.sql` with the path to your schema file if it's different).

3.  **Frontend Setup:**
    ```bash
    cd ../interface-chatbot
    npm install
    ```
    Create a `.env` file in the `interface-chatbot` directory:
    ```
    VITE_API_URL=http://localhost:8080/api
    ```

### Running the Application

1.  **Start the Backend Server:**
    ```bash
    cd backend
    npm start # or npm run dev if you have nodemon configured
    ```

2.  **Start the Frontend Development Server:**
    ```bash
    cd ../interface-chatbot
    npm run dev
    ```

The frontend application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## Usage

- **Login:** Access the application through the frontend and log in with your credentials.
- **Chat Management:** View and respond to WhatsApp chats.
- **Flow Editor:** Create and modify automated conversational flows.
- **Integrations:** Set up and manage connections to external services.
- **User Administration:** Manage user accounts and permissions.

## Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

## Contact

For any questions or inquiries, please contact [wellrccity](https://github.com/wellrccity).
