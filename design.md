# Survey Server with AI Summarization - Design Document

## Architecture Overview

### High-Level Architecture

The application follows a **layered architecture pattern** with clear separation of concerns:

```
┌─────────────────────┐    ┌─────────────────────┐
│    Frontend (React) │    │   External APIs     │
│                     │    │  - OpenRouter API   │
│  - Components       │    │  - DeepSeek LLM     │
│  - Pages            │    │                     │
│  - Services         │    └─────────────────────┘
│  - Hooks            │              │
└─────────────────────┘              │
           │                         │
           │ HTTP/REST               │
           │                         │
┌─────────────────────┐              │
│  Backend (Express)  │              │
│                     │              │
│  ┌─────────────────┐│              │
│  │   Controllers   ││              │
│  └─────────────────┘│              │
│  ┌─────────────────┐│              │
│  │    Services     ││──────────────┘
│  └─────────────────┘│
│  ┌─────────────────┐│
│  │     Models      ││
│  └─────────────────┘│
│  ┌─────────────────┐│
│  │   Middleware    ││
│  └─────────────────┘│
└─────────────────────┘
           │
           │ Mongoose ODM
           │
┌─────────────────────┐
│   MongoDB Atlas     │
│                     │
│ - Users Collection  │
│ - Surveys Collection│
│ - Embedded Responses│
└─────────────────────┘
```

### Backend Architecture

#### 1. Routes Layer (`/routes`)
- **`authRoutes.js`**: Authentication endpoints (register, login)
- **`surveyRoutes.js`**: Core survey CRUD operations and response management
- **`aiRoutes.js`**: AI-powered features (search, summarization, validation)

**Key Design Decision**: Separate AI routes to isolate AI functionality and make it easier to manage feature flags or disable AI features independently.

#### 2. Controllers Layer (`/controllers`)
- **`authController.js`**: Handles authentication logic, JWT token management
- **`surveyController.js`**: Survey and response CRUD operations, business rules
- **`aiController.js`**: AI feature orchestration, delegates to AI services

**Pattern**: Controllers act as thin orchestration layer, delegating business logic to services.

#### 3. Services Layer (`/services`)
- **`BaseService.js`**: Abstract base class providing common CRUD operations
- **`SurveyService.js`**: Survey-specific business logic, extends BaseService
- **`UserService.js`**: User management operations
- **`llmService.js`**: AI/LLM integration abstraction layer

**Key Design Decision**: Service layer implements business logic and abstracts data access, making controllers lightweight and improving testability.

#### 4. Models Layer (`/models`)
- **`UserModel.js`**: User schema with authentication fields
- **`SurveyModel.js`**: Complex survey schema with embedded response sub-documents

**Data Design**: Responses are embedded in survey documents for better read performance and atomic operations, trading off some write scalability.

#### 5. Middleware Layer (`/middleware`)
- Authentication middleware (`authMiddleware.js`)
- Validation middleware
- Logging middleware (Morgan + Winston)
- Error handling middleware

### Frontend Architecture

#### Component Structure
```
src/
├── components/
│   ├── ai/              # AI-specific components
│   ├── common/          # Reusable UI components
│   ├── form/            # Form-related components
│   ├── responses/       # Response management
│   └── surveys/         # Survey-specific components
├── pages/               # Route-level components
├── services/            # API integration layer
├── hooks/               # Custom React hooks
└── utils/               # Helper functions
```

**Pattern**: Follows atomic design principles with clear component hierarchy and separation of concerns.

## Key Design Decisions and Trade-offs

### 1. Database Design

**Decision**: MongoDB with embedded responses in survey documents
- **Pros**: 
  - Atomic operations for survey + responses
  - Better read performance (single query)
  - Natural document structure
- **Cons**: 
  - Document size limitations (16MB MongoDB limit)
  - Potential concurrency issues with many simultaneous responses
  - Less flexible querying across responses

**Alternative Considered**: Separate responses collection with references
**Rationale**: For typical survey sizes and usage patterns, embedded approach provides better performance and consistency.

### 2. Service Layer Pattern

**Decision**: BaseService inheritance pattern
- **Pros**:
  - Code reuse for common CRUD operations
  - Consistent error handling and logging
  - Easy to extend with domain-specific logic
- **Cons**:
  - Inheritance can be rigid
  - Some operations might not fit the base pattern

**Alternative Considered**: Composition with repository pattern
**Rationale**: Inheritance provides sufficient flexibility while maintaining simplicity for this application scope.

### 3. Authentication Strategy

**Decision**: JWT tokens with bcrypt password hashing
- **Pros**:
  - Stateless authentication
  - Easy to scale horizontally
  - Standard, well-understood approach
- **Cons**:
  - Token revocation complexity
  - Payload size considerations

**Trade-off**: Chose simplicity and scalability over advanced features like refresh tokens (could be added later).

### 4. Error Handling Strategy

**Decision**: Centralized error handling with Winston logging
- **Pros**:
  - Consistent error responses
  - Comprehensive logging for debugging
  - Structured error information
- **Cons**:
  - Potential information leakage in development
  - Requires careful sanitization in production

### 5. API Design

**Decision**: RESTful API with nested resources
- **Pros**:
  - Intuitive resource hierarchy
  - Standard HTTP semantics
  - Easy to understand and document
- **Cons**:
  - Some operations don't map perfectly to REST
  - Can lead to deep nesting

**Example**: `POST /surveys/:id/responses` for submitting responses to specific surveys.

## LLM Integration Abstraction

### Architecture Overview

The LLM integration follows a **Strategy Pattern** with environment-based switching:

```
┌─────────────────────────────────────────────────────────┐
│                   llmService.js                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │getChatCompletion│    │     Environment Switch      │ │
│  │   (Main API)    │────│   USE_MOCK_LLM=true/false   │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│           │                           │                 │
│           ▼                           ▼                 │
│  ┌──────────────────┐         ┌──────────────────────┐  │
│  │getMockCompletion │         │ getRealCompletion    │  │
│  │                  │         │                      │  │
│  │• Static responses│         │ • OpenRouter API     │  │
│  │• No API calls    │         │ • DeepSeek model     │  │
│  │• Fast testing    │         │ • Real AI responses  │  │
│  └──────────────────┘         └──────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│            Higher-Level AI Functions                    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐│
│  │ generateSummary │ │  searchSurveys  │ │validateResp.││
│  └─────────────────┘ └─────────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Key Abstraction Features

#### 1. Dual-Mode Operation
```javascript
const getChatCompletion = async (messages, model, options) => {
  const useMockLLM = process.env.USE_MOCK_LLM === 'true';
  
  if (useMockLLM) {
    return getMockChatCompletion(messages, model, options);
  } else {
    return getRealChatCompletion(messages, model, options);
  }
};
```

**Benefits**:
- Development without API costs
- Consistent interface regardless of mode
- Easy testing with predictable responses
- Production deployment without code changes

#### 2. Template-Based Prompt Management
```javascript
// Prompts stored in /prompts/*.txt files
const getPrompt = (promptName, variables = {}) => {
  let prompt = loadedPrompts[promptName];
  // Template variable replacement: {{variable}} → value
  for (const key in variables) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    prompt = prompt.replace(regex, variables[key]);
  }
  return prompt;
};
```

**Benefits**:
- Prompts are version-controlled and editable
- Easy A/B testing of different prompts
- Non-technical users can modify prompts
- Template variables for dynamic content

#### 3. Response Processing Pipeline
```javascript
const extractAndParseJSON = (rawResponse) => {
  // 1. Remove markdown code blocks
  // 2. Extract JSON portions
  // 3. Handle parsing errors gracefully
  // 4. Return structured data
};
```

**Benefits**:
- Handles inconsistent LLM response formats
- Robust JSON extraction from markdown
- Consistent error handling
- Easy to extend for different response types

#### 4. Domain-Specific AI Functions

**`generateSummary(textToSummarize, guidelines, surveyQuestion, surveyArea)`**
- Uses summary prompt template
- Incorporates survey context
- Returns structured summary object

**`searchSurveys(query, surveysContextArray)`**
- Uses search prompt template
- Processes survey metadata
- Returns relevance-scored results

**`validateResponses(responsesArray, guidelines)`**
- Uses validation prompt template
- Checks against survey guidelines
- Returns problematic responses with feedback

### Mock vs Real Mode Benefits

#### Mock Mode (`USE_MOCK_LLM=true`)
- **Fast development cycle**: No API latency
- **Cost-effective**: No API charges during development
- **Predictable testing**: Consistent responses for unit tests
- **Offline development**: No internet dependency
- **CI/CD friendly**: No API keys needed in build pipelines

#### Real Mode (`USE_MOCK_LLM=false`)
- **Actual AI capabilities**: Real language understanding
- **Production readiness**: Live AI features
- **Quality assessment**: Test real AI response quality
- **Integration testing**: Full end-to-end validation

### Error Handling and Resilience

```javascript
try {
  const response = await getChatCompletion(messages, model, options);
  return extractAndParseJSON(response.choices[0].message.content);
} catch (error) {
  logger.error('LLM service error:', error);
  // Fallback strategies:
  // 1. Return mock response
  // 2. Return empty result with error flag
  // 3. Retry with exponential backoff
  throw new Error('AI service temporarily unavailable');
}
```

### Integration Points

#### Controllers → Services
```javascript
// aiController.js
const searchResults = await llmService.searchSurveys(query, surveysContext);
```

#### Services → LLM Service
```javascript
// SurveyService.js
const summary = await llmService.generateSummary(
  responsesText, 
  survey.guidelines, 
  survey.question, 
  survey.area
);
```

### Configuration Management

Environment variables control behavior:
- `USE_MOCK_LLM`: Switch between modes
- `OPENROUTER_API_KEY`: Real API authentication
- Model selection: Configurable in service constants

### Testing Strategy

- **Unit Tests**: Use mock mode for fast, predictable tests
- **Integration Tests**: Test both modes with separate test suites
- **E2E Tests**: Use mock mode to avoid API dependencies
- **Performance Tests**: Real mode for latency and cost analysis

This abstraction design enables:
1. **Rapid development** with mock responses
2. **Easy deployment** with environment switching
3. **Testable code** with predictable behavior
4. **Production readiness** with real AI capabilities
5. **Cost control** during development phases 