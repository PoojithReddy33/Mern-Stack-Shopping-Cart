# Men's Clothing Shop - MERN Stack E-commerce Platform

A comprehensive e-commerce platform for men's clothing built using the MERN stack (MongoDB, Express.js, React, Node.js).

## Features

- Product browsing without registration
- User authentication and profile management
- Shopping cart functionality with persistence
- Order processing with PhonePe payment integration
- Responsive design for mobile and desktop

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB with Mongoose ODM
- JWT Authentication
- Security middleware (Helmet, CORS, Rate Limiting)

### Frontend
- React 18 with React Router
- Material-UI for components
- React Query for state management
- Axios for API calls

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd mens-clothing-shop
```

2. Install dependencies for both frontend and backend
```bash
npm run install-all
```

3. Set up environment variables
```bash
# Copy the example env file in backend directory
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

4. Start the development servers
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend server on http://localhost:3000

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mens-clothing-shop
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=30d
PHONEPAY_MERCHANT_ID=your-phonepay-merchant-id
PHONEPAY_SALT_KEY=your-phonepay-salt-key
PHONEPAY_SALT_INDEX=1
```

## Project Structure

```
mens-clothing-shop/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── App.js
│   └── package.json
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `GET /api/products/search` - Search products
- `GET /api/products/category/:category` - Get products by category

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item
- `DELETE /api/cart/remove/:itemId` - Remove item from cart

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get specific order

### Payment
- `POST /api/payment/initiate` - Initiate PhonePe payment
- `POST /api/payment/callback` - Handle payment callback

## Development

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Building for Production
```bash
# Build frontend
cd frontend && npm run build

# Start production server
cd backend && npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.