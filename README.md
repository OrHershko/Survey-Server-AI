# Survey Server with AI Summarization

A full-stack application that allows users to create surveys, collect responses, and generate AI-powered summaries and insights.

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
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend    # Backend only (port 5000)
npm run dev:frontend   # Frontend only (port 3000)
```

## How to Run Tests

```bash
# Run all tests (backend)
cd backend && npm test

# Run tests with coverage
cd backend && npm run test:coverage
```

## Environment Variables

### Backend Variables (.env.example)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
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