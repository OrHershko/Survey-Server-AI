# Survey Server Backend Testing Suite

This directory contains comprehensive tests for the Survey Server Backend API, implementing the testing requirements specified in the project documentation.

## 🧪 Testing Strategy

### Test Environment Separation
- **Development Environment**: Uses real MongoDB and configured services
- **Test Environment**: Uses `mongodb-memory-server` for isolated testing
- **Mock Services**: All external LLM API calls are mocked using `USE_MOCK_LLM=true`

### Coverage Requirements
- **Target Coverage**: 70% minimum across all test types
- **Coverage Types**: Lines, Functions, Branches, Statements
- **Reporting**: HTML and LCOV reports generated

## 📁 Test Structure

```
tests/
├── README.md                     # This file
├── setup.js                      # Global test setup with Chai and MongoDB
├── env.setup.js                  # Environment configuration for tests
├── testRunner.js                 # Comprehensive test orchestrator
├── auth.test.js                  # Authentication API endpoint tests
├── survey.test.js                # Survey API endpoint tests
├── ai.test.js                    # AI service API endpoint tests
├── mocks/
│   ├── llmService.mock.js        # Comprehensive LLM service mock
│   └── llmService.js             # Simple Jest mock (legacy)
├── utils/
│   └── testHelpers.js            # Test utilities and data generators
├── services/
│   ├── userService.test.js       # User service unit tests
│   └── surveyService.test.js     # Survey service unit tests
├── middleware/
│   └── auth.test.js              # Authentication middleware tests
└── integration/
    └── llmService.test.js        # LLM service integration tests
```

## 🚀 Running Tests

### Quick Start
```bash
# Run all tests with coverage
npm test

# Run specific test suites
npm run test:auth          # Authentication tests only
npm run test:surveys       # Survey API tests only
npm run test:ai           # AI service tests only
npm run test:services     # All service unit tests
npm run test:middleware   # Middleware tests only
npm run test:integration  # Integration tests only

# Run grouped tests
npm run test:api          # All API endpoint tests
npm run test:unit         # All unit tests (services + middleware)

# Development options
npm run test:watch        # Watch mode for development
npm run test:verbose      # Verbose output
npm run test:strict       # Strict mode (fail on coverage < 70%)
```

### Advanced Usage
```bash
# Run with Jest directly
npm run test:jest

# Coverage only
npm run test:coverage

# Run specific test file
npx jest tests/auth.test.js

# Run tests matching pattern
npx jest --testNamePattern="should create user"

# Debug tests
npx jest --detectOpenHandles --forceExit
```

## 🛠️ Test Configuration

### Environment Variables
Tests automatically load environment variables from `.env.test`:

```bash
NODE_ENV=test
USE_MOCK_LLM=true
JWT_SECRET=test-jwt-secret
MONGODB_URI=mongodb://localhost:27017/test-db  # Overridden by memory server
```

### Jest Configuration
Key settings in `jest.config.js`:
- **Test Environment**: Node.js
- **Setup Files**: Automatic environment and database setup
- **Coverage Threshold**: 70% for all metrics
- **Timeout**: 30 seconds per test
- **Memory Server**: Automatic MongoDB memory server

## 📊 Test Categories

### 1. API Endpoint Tests (Integration)
**Files**: `auth.test.js`, `survey.test.js`, `ai.test.js`

Tests all HTTP endpoints using Supertest:
- **Authentication**: Registration, login, refresh, logout
- **Surveys**: CRUD operations, responses, validation
- **AI Services**: Summary generation, search, validation

**Coverage**:
- ✅ All HTTP methods (GET, POST, PUT, PATCH, DELETE)
- ✅ Success and error responses
- ✅ Authentication and authorization
- ✅ Input validation
- ✅ Rate limiting (where implemented)

### 2. Service Unit Tests
**Files**: `services/userService.test.js`, `services/surveyService.test.js`

Tests business logic in isolation:
- **User Service**: User management, password handling, validation
- **Survey Service**: Survey operations, response handling, analytics

**Coverage**:
- ✅ Business logic functions
- ✅ Data validation
- ✅ Error handling
- ✅ Edge cases

### 3. Middleware Tests
**Files**: `middleware/auth.test.js`

Tests Express middleware:
- **Authentication**: JWT validation, user attachment, error handling
- **Request context**: Headers, payloads, security

**Coverage**:
- ✅ Valid and invalid tokens
- ✅ Error scenarios
- ✅ Security edge cases

### 4. Integration Tests
**Files**: `integration/llmService.test.js`

Tests service integration with mocks:
- **LLM Service**: Mock validation, consistent responses
- **External APIs**: Proper mocking, no real calls

## 🎯 Mock Strategy

### LLM Service Mocking
All AI/LLM operations use comprehensive mocks to ensure:
- **No External Calls**: Zero real API requests during testing
- **Consistent Responses**: Predictable mock data for reliable tests
- **Error Simulation**: Mock errors for testing error handling
- **Performance**: Fast test execution without network delays

### Mock Features
```javascript
// Mock responses include:
{
  summary: "Mock AI-generated summary",
  keyThemes: ["Theme 1", "Theme 2", "Theme 3"],
  sentiment: "neutral",
  confidence: 0.85
}
```

### Database Mocking
- **MongoDB Memory Server**: Real MongoDB instance in memory
- **Test Isolation**: Each test gets clean database state
- **No Side Effects**: Tests don't interfere with each other

## 🔧 Test Utilities

### Test Helpers (`utils/testHelpers.js`)
Comprehensive utilities for test data generation:

```javascript
// User management
const user = await createTestUser();
const userData = generateUserData({ email: 'test@example.com' });

// Survey management
const survey = await createTestSurvey(userId);
const surveyData = generateSurveyData({ title: 'Test Survey' });

// Test scenarios
const { users, surveys, responses } = await createTestScenario({
  userCount: 2,
  surveyCount: 3,
  responseCount: 5
});

// Authentication context
const authContext = createAuthContext(user);
```

### Data Generation
Uses Faker.js for realistic test data:
- **Consistent**: Same patterns across tests
- **Realistic**: Proper email formats, names, content
- **Customizable**: Override specific fields as needed

## 📈 Coverage Reporting

### Coverage Metrics
- **Lines**: Individual code lines executed
- **Functions**: Functions/methods called
- **Branches**: Conditional paths taken
- **Statements**: JavaScript statements executed

### Reports Generated
1. **Console Output**: Summary during test runs
2. **HTML Report**: `coverage/lcov-report/index.html`
3. **LCOV File**: `coverage/lcov.info` for CI/CD integration

### Coverage Exclusions
Configured to exclude:
- Configuration files
- Test files themselves
- Node modules
- Build artifacts

## 🐛 Debugging Tests

### Common Issues
1. **Async Operations**: Ensure all promises are awaited
2. **Database State**: Tests should clean up after themselves
3. **Mock Conflicts**: Check mock implementations are correct
4. **Timeouts**: Increase timeout for slow operations

### Debug Commands
```bash
# Detect open handles
npx jest --detectOpenHandles

# Run single test with output
npx jest --testNamePattern="specific test" --verbose

# Check for memory leaks
npx jest --logHeapUsage
```

### Test Data Cleanup
Automatic cleanup in `beforeEach`:
```javascript
beforeEach(async () => {
  await cleanupTestData(['users', 'surveys']);
});
```

## 🔒 Security Testing

### Security Test Coverage
- **Input Validation**: SQL injection, XSS prevention
- **Authentication**: Token validation, session security
- **Authorization**: Role-based access control
- **Data Sanitization**: Malicious input handling

### Security Test Examples
```javascript
// XSS prevention
const maliciousData = {
  name: '<script>alert("xss")</script>',
  email: 'test@example.com'
};

// SQL injection prevention
const maliciousQuery = "'; DROP TABLE users; --";
```

## 📋 Test Checklist

Before deployment, ensure:

- [ ] All tests pass: `npm test`
- [ ] Coverage ≥ 70%: Check report
- [ ] No real API calls: Verify mock usage
- [ ] Authentication tests cover all endpoints
- [ ] Survey CRUD operations tested
- [ ] AI service mocking works correctly
- [ ] Error scenarios covered
- [ ] Input validation tested
- [ ] Security edge cases covered
- [ ] Performance within acceptable limits

## 🚫 Test Independence

### Principles
- **Isolated**: Each test runs independently
- **Stateless**: No shared state between tests
- **Deterministic**: Same input = same output
- **Fast**: Quick execution for development workflow

### Implementation
- Clean database before each test
- Generate unique test data
- Mock external dependencies
- Avoid shared global state

## 📝 Writing New Tests

### Guidelines
1. **Descriptive Names**: Clearly state what is being tested
2. **AAA Pattern**: Arrange, Act, Assert
3. **One Concept**: Test one thing per test case
4. **Mock External**: Mock all external dependencies
5. **Clean Up**: Ensure proper cleanup

### Example Structure
```javascript
describe('Feature Name', () => {
  beforeEach(async () => {
    await cleanupTestData(['relevant-collections']);
  });

  describe('Specific Functionality', () => {
    it('should perform expected behavior with valid input', async () => {
      // Arrange
      const testData = generateTestData();
      
      // Act
      const result = await serviceMethod(testData);
      
      // Assert
      expect(result).to.have.property('expectedField');
      expect(result.status).to.equal('success');
    });

    it('should handle error case appropriately', async () => {
      // Test error scenarios
    });
  });
});
```

## 🔄 Continuous Integration

### CI/CD Integration
The test suite is designed for CI/CD environments:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test
  env:
    NODE_ENV: test
    USE_MOCK_LLM: true

- name: Check Coverage
  run: npm run test:strict
```

### Pre-commit Hooks
Configured with Husky for quality gates:
- Run linting before commit
- Run tests before push
- Ensure code formatting

## 📞 Support

### Troubleshooting
1. **Database Issues**: Ensure MongoDB memory server is working
2. **Mock Issues**: Verify mock implementations match real services
3. **Coverage Issues**: Check excluded files and test completeness
4. **Performance Issues**: Review test timeouts and async operations

### Resources
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Chai Documentation](https://www.chaijs.com/)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

---

**Note**: This testing suite ensures reliable, maintainable code while preventing regressions and maintaining high code quality standards. 