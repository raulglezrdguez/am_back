# GraphQL API Server

A production-ready GraphQL API built with Apollo Server, Express and MongoDB, featuring JWT authentication, Firebase integration and comprehensive testing.

## Deployment

This API is deployed to a private environment. Access is restricted to authorized clients.

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

Create a base64 string from your firebase configuration project file with sensitive information to put in your .env file.

In linux and macOS:

```bash
base64 -i firebase-admin.json
```

Create a .env file in the root directory.

```bash
# Server
PORT=5050
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/your-database-name
# or for MongoDB Atlas
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/<database-name>

# JWT
JWT_SECRET=<generate with: openssl rand -base64 48>

# Firebase (download from Firebase Console)
FIREBASE_SERVICE_ACCOUNT=<base64 of service-account.json — see steps below>

```

> 🔐 Never commit your `firebase-admin.json` or the base64 string. Rotate the service account key immediately if it leaks.

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

## Available scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `npm start`         | Start production server                  |
| `npm run dev`       | Start development server with hot reload |
| `npm test`          | Run all tests with coverage              |
| `npm run test:unit` | Run unit tests only                      |
| `npm run test:int`  | Run integration tests only               |

## API endpoints

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

### Security features

- **Fail-fast environment validation**: app refuses to start without `MONGO_URI`, `JWT_SECRET` (≥32 chars) and `FIREBASE_SERVICE_ACCOUNT`
- **JWT authentication**: stateless, HS256 with validated secret
- **Firebase email verification**: unverified emails are rejected before provisioning
- **Token revocation checks**: `verifyIdToken`/`verifySessionCookie` run with `checkRevoked: true`
- **No auto-provisioning**: new Firebase users are created with `status: 0` pending manual approval
- **IDOR protections**: all resource queries are scoped by `author`, returning `NOT_FOUND` for foreign resources
- **Rate limiting**: prevents brute force and enumeration
- **CORS**: strict origin whitelist
- **Introspection & playground disabled in production**
- **Password hashing**: bcrypt with salt rounds

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
