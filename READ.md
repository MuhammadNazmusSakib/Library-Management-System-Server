# Academia Library - Server

This is the backend server for the Library Management System. It provides APIs for managing books, borrowing books, and user authentication using JSON Web Tokens (JWT). The server is built with Node.js, Express, and MongoDB.

## Features

- **JWT Authentication**: Secure user login using JWT, stored in cookies.
- **CRUD Operations for Books**: Add, update, delete, and get all books in the library.
- **Category-based Book Search**: Fetch books based on specific categories.
- **Borrowed Books Management**: Borrow and return books, and manage their quantities.
- **User-specific Borrowed Books**: Get borrowed books for a specific user (email).
- **Environment Variables**: Using `.env` for sensitive information such as database credentials and JWT secret.

## Technologies Used

- **Node.js**: JavaScript runtime used for the backend.
- **Express.js**: Web framework to handle HTTP requests.
- **MongoDB**: NoSQL database to store books and borrowed books.
- **JWT (JSON Web Tokens)**: Used for user authentication and session management.
- **CORS**: For cross-origin resource sharing, enabling the frontend to communicate with the backend from different domains.
- **dotenv**: To load environment variables from a `.env` file.

