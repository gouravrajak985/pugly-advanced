# Shopify Clone Backend

This is the backend for a Shopify clone built with Node.js, Express, and MongoDB.

## Features
- User authentication (JWT)
- Product management
- Order management
- RESTful API structure

## Getting Started

1. Install dependencies:
   ```cmd
   cd backend
   npm install
   ```
2. Set up your MongoDB connection string in a `.env` file:
   ```env
   MONGO_URI=mongodb://localhost:27017/shopify-clone
   PORT=5000
   ```
3. Start the development server:
   ```cmd
   npm run dev
   ```

## Folder Structure
- `src/models` - Mongoose models
- `src/routes` - Express routes
- `src/controllers` - Route controllers
- `src/middleware` - Custom middleware

## License
MIT
