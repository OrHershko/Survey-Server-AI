# Survey Server with AI Summarization

A full-stack application that allows users to create surveys, collect responses, and generate AI-powered summaries and insights.

## Features

- **Survey Management**: Create, manage, and close surveys with custom guidelines
- **Response Collection**: Users can submit and edit responses to open surveys
- **AI Summarization**: Generate intelligent summaries of survey responses using DeepSeek LLM
- **Natural Language Search**: Find surveys using natural language queries
- **Response Validation**: AI-powered validation of responses against survey guidelines
- **User Authentication**: Secure registration and login with JWT tokens

## Tech Stack

### Backend
- **Node.js** with **Express.js** framework
- **MongoDB Atlas** with **Mongoose** ODM
- **JWT** authentication with **bcrypt** password hashing
- **Winston** for logging, **Morgan** for HTTP logging
- **Joi** for input validation
- **Jest** with **Supertest** for testing

### Frontend
- **React** with **JavaScript**
- **React Router** for navigation
- **Axios** for API communication
- **React Testing Library** for testing

### AI Integration
- **DeepSeek LLM** via **OpenRouter** API
- Custom prompt templates for search, summarization, and validation

### Deployment
- **Google Cloud Platform**
- **MongoDB Atlas** (cloud database)

## Project Structure

```
survey-server-ai/
├── backend/                 # Express API server
│   ├── controllers/         # Request handlers
│   ├── services/           # Business logic
│   ├── models/             # Database models
│   ├── middleware/         # Auth, validation, logging
│   ├── routes/             # API routes
│   └── tests/              # Backend tests
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── hooks/          # Custom hooks
├── prompts/                # LLM prompt templates
│   ├── searchPrompt.txt
│   ├── summaryPrompt.txt
│   └── validatePrompt.txt
└── docs/                   # Documentation
```

## Setup Instructions

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

4. **Configure MongoDB Atlas**
   - Create a MongoDB Atlas cluster
   - Get your connection string
   - Update `MONGODB_URI` in `backend/.env`

5. **Configure OpenRouter API**
   - Sign up for OpenRouter API
   - Get your API key for DeepSeek
   - Update `OPENROUTER_API_KEY` in `backend/.env`

## Development

### Start Development Servers
```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend    # Backend only (port 5000)
npm run dev:frontend   # Frontend only (port 3000)
```

### Testing
```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run tests with coverage
cd backend && npm run test:coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format
```

## API Documentation

The API documentation will be available at `http://localhost:5000/api-docs` when the backend server is running (Swagger UI).

### Main Endpoints

- **Authentication**
  - `POST /auth/register` - User registration
  - `POST /auth/login` - User login

- **Surveys**
  - `GET /surveys` - List all surveys
  - `POST /surveys` - Create new survey
  - `GET /surveys/:id` - Get survey details
  - `PATCH /surveys/:id/close` - Close survey

- **Responses**
  - `POST /surveys/:id/responses` - Submit response
  - `PUT /surveys/:id/responses/:responseId` - Update response
  - `DELETE /surveys/:id/responses/:responseId` - Delete response

- **AI Features**
  - `POST /surveys/:id/summarize` - Generate summary
  - `POST /surveys/search` - Natural language search
  - `POST /surveys/:id/validate-responses` - Validate responses

## Environment Variables

### Backend Variables
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `REGISTRATION_SECRET` - Code required for user registration
- `OPENROUTER_API_KEY` - OpenRouter API key for LLM
- `USE_MOCK_LLM` - Use mock LLM for testing (true/false)

### Frontend Variables
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5000)
- `REACT_APP_ENV` - Environment (development/production)

## AI Configuration

### Switching from Mock to Real AI

By default, the system uses mock AI responses for development and testing. To enable real AI functionality:

1. **Get OpenRouter API Key**
   - Sign up at [OpenRouter](https://openrouter.ai/)
   - Get an API key that supports DeepSeek models
   - Note: The system is configured to use `deepseek/deepseek-chat-v3-0324:free`

2. **Configure Environment Variables**
   Create a `.env` file in the `backend/` directory:
   ```bash
   # Production AI Configuration
   OPENROUTER_API_KEY=your-actual-api-key-here
   USE_MOCK_LLM=false
   
   # Other required variables...
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret
   REGISTRATION_SECRET=your-registration-code
   ```

3. **Restart the Server**
   ```bash
   cd backend
   npm run dev
   ```

### AI Features Available

1. **Natural Language Search** (`POST /ai/surveys/search`)
   - Search surveys using natural language queries
   - Example: "Find surveys about programming languages"
   - Returns matched surveys with explanations

2. **Survey Summarization** (`POST /surveys/:id/summarize`)
   - Generate AI summaries of survey responses
   - Only available to survey creators
   - Uses survey guidelines for context

3. **Response Validation** (`POST /surveys/:id/validate-responses`)
   - Validate responses against survey guidelines
   - Identifies problematic responses
   - Returns detailed violation reasons

### Troubleshooting AI Issues

- **JSON Parsing Errors**: The system automatically handles markdown code blocks in AI responses
- **Rate Limiting**: OpenRouter may have rate limits; check your usage
- **Model Availability**: Ensure the DeepSeek model is available in your OpenRouter plan
- **API Key Issues**: Verify your OpenRouter API key is valid and has sufficient credits

## Testing Strategy

- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user workflows
- **Coverage Target**: 70% minimum

### Mock Services
- LLM calls are mocked during testing using static responses
- MongoDB Memory Server for isolated database testing
- No external API calls in test environment

## Deployment

Deployment instructions for Google Cloud Platform will be provided in the deployment phase.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper tests
4. Run linting and formatting
5. Submit a pull request

## License

This project is licensed under the MIT License. 