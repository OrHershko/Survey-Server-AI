# Survey Server with AI Summarization

A full-stack application that allows users to create surveys, collect responses, and generate AI-powered summaries and insights.

## Team Panda Info

*   **Full Name:** Or Herhsko - 322316514
*   **Full Name:** Tom Braudo - 324182914
*   **Full Name:** Adva Levine - 319098133
*   **Full Name:** Amir Azmon - 213475403

## Installation and Running the App

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account
- OpenRouter API account (for DeepSeek LLM)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd survey-server-ai
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies and all workspace dependencies
   npm run install-all
   ```

3. **Set up environment variables**
   
   **Backend** (`backend/.env`):
   ```bash
   cp backend/env.example backend/.env
   # Edit backend/.env with your actual values
   ```
   
   **Frontend** (`frontend/.env`):
   ```bash
   cp frontend/env.example frontend/.env
   # Edit frontend/.env with your actual values
   ```

### Running the Application

```bash
# Start both backend and frontend simultaneously
npm run dev
```

### Alternative Running Options

```bash
# Start backend only
npm run start:backend

# Start frontend only
npm run start:frontend
```

## Available Scripts

```bash
# Development
npm run dev                # Start both backend and frontend
npm run start:backend      # Start backend only
npm run start:frontend     # Start frontend only

# Testing
npm run test:backend       # Run backend tests
npm run test:frontend      # Run frontend tests

# Building
npm run build:frontend     # Build frontend for production
```

## How to Run Tests

```bash
# Run all tests (backend)
npm run test:backend

# Run tests with coverage (from backend directory)
cd backend && npm run test:coverage
```

## Environment Variables

### Backend Variables (.env.example)
- `NODE_ENV` - Environment mode (test/development/production)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `JWT_EXPIRES_IN` - JWT token expiration time (default: '1h')
- `JWT_REFRESH_EXPIRES_IN` - JWT refresh token expiration time (default: '7d')
- `REGISTRATION_SECRET` - Code required for user registration
- `OPENROUTER_API_KEY` - OpenRouter API key for LLM
- `USE_MOCK_LLM` - Use mock LLM for testing (true/false)

### Frontend Variables (.env.example)
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5000)
- `REACT_APP_ENV` - Environment (development/production)

## How to Verify Mocked/Test Mode

### Switch to Mock Mode
```bash
# In backend/.env
USE_MOCK_LLM=true
```

### Switch to Real LLM Mode
```bash
# In backend/.env
USE_MOCK_LLM=false
OPENROUTER_API_KEY=your-actual-api-key-here
```

### Verify Current Mode

**Option 1: Check server logs when starting:**
- **Mock Mode**: `"Using Mock LLM Service for chat completion"`
- **Real Mode**: `"Attempting OpenRouter API call to model deepseek/..."`

**Option 2: Check .env file:**
```bash
grep USE_MOCK_LLM backend/.env
```

### Quick Toggle Commands

**For Development/Testing (Mock Mode):**
```bash
cd backend
echo "USE_MOCK_LLM=true" >> .env
npm run dev
```

**For Production Testing (Real LLM):**
```bash
cd backend
echo "USE_MOCK_LLM=false" >> .env
echo "OPENROUTER_API_KEY=your-api-key" >> .env
npm run dev
``` 
