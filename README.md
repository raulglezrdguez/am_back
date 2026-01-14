# GraphQL API Server

A production-ready GraphQL API built with Apollo Server, Express and MongoDB, featuring JWT authentication, Firebase integration and comprehensive testing.

## Deployed

Deployed in [`https://amback-production.up.railway.app/graphql`](https://amback-production.up.railway.app/graphql)

## Features

- 🚀 **GraphQL API** - Apollo Server v5 with Express 5 integration
- 🔐 **Secure Authentication** - JWT-based auth with bcrypt password hashing
- 🗄️ **Database** - MongoDB with Mongoose ODM
- 📱 **Firebase Integration** - User management
- 🛡️ **Security** - Rate limiting, CORS protection, and input validation
- 📝 **Logging** - Structured logging with Pino
- 🧪 **Testing** - Jest unit and integration tests with in-memory MongoDB
- 📦 **ES Modules** - Modern JavaScript module system
- 🔧 **Developer Experience** - TypeScript, nodemon, and hot reloading

## Prerequisites

- Node.js 20.x or later
- MongoDB 6.x (local or Atlas)
- Firebase project with service account credentials
- npm, yarn, or pnpm package manager

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/raulglezrdguez/am_back.git
cd back
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Setup environment variables

Create a .env file in the root directory.

```bash
# Server
PORT=4000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/your-database-name
# or for MongoDB Atlas
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/<database-name>

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Firebase (download from Firebase Console)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-client-email@project.iam.gserviceaccount.com

```

### 4. Running the backend

Development mode

```bash
npm run dev
```

Starts the server with nodemon and ts-node for hot reloading. The API will be available at http://localhost:4000

Production mode

```bash
npm start
```

## Testing

Run all test with coverage

```bash
npm run test
```

Run unit tests only

```bash
npm run test:unit
```

Run integration tests only

```bash
npm run test:int
```

Test features

- Unit Tests: Individual function and module testing
- Integration Tests: API endpoint testing with Supertest
- In-Memory DB: MongoDB Memory Server for isolated testing
- Coverage: Comprehensive coverage reporting
- Open Handles Detection: Detects resource leaks in tests

## Avalilable scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `npm start`         | Start production server                  |
| `npm run dev`       | Start development server with hot reload |
| `npm test`          | Run all tests with coverage              |
| `npm run test:unit` | Run unit tests only                      |
| `npm run test:int`  | Run integration tests only               |

## Api endpoints

GraphQL endpoint

```
POST /graphql
```

GraphQL Playground (development)

```
GET /graphql
```

Health check

```
GET /health
```

## Key technologies

| Category        | Technology                 |
| --------------- | -------------------------- |
| **Runtime**     | Node.js with ES Modules    |
| **Language**    | TypeScript                 |
| **GraphQL**     | Apollo Server 5            |
| **HTTP Server** | Express 5                  |
| **Database**    | MongoDB 6.x + Mongoose 8.x |
| **Auth**        | JWT + bcrypt               |
| **Firebase**    | Firebase Admin SDK         |
| **Testing**     | Jest 30 + Supertest        |
| **Logging**     | Pino                       |
| **Security**    | express-rate-limit, cors   |

## Security features

- Rate Limiting: Prevents brute force attacks
- CORS: Configured origin whitelist
- JWT Tokens: Stateless authentication
- Password Hashing: bcrypt with salt rounds
- Firebase Rules: Leverages Firebase security model

## Contributing

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Write tests for your changes
4. Ensure all tests pass (npm test)
5. Commit your changes (git commit -m 'Add amazing feature')
6. Push to the branch (git push origin feature/amazing-feature)
7. Open a Pull Request

### License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT) - see the LICENSE file for details.

GraphQL API server built with ❤️ and modern backend technologies.
