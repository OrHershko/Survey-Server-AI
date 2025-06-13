const llmService = require('../../services/llmService');
const fs = require('fs').promises;
const axios = require('axios');

// Mock dependencies
jest.mock('axios');
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn()
  }
}));

// Mock logger to avoid console output during tests
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('LLM Service', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.USE_MOCK_LLM;
    delete process.env.OPENROUTER_API_KEY;
  });

  describe('loadPrompts', () => {
    it('should load prompts from directory successfully', async () => {
      // Mock file system calls
      fs.readdir.mockResolvedValue(['test1.txt', 'test2.txt', 'notprompt.json']);
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('test1.txt')) {
          return Promise.resolve('Hello {{name}}');
        }
        if (filePath.includes('test2.txt')) {
          return Promise.resolve('Goodbye {{name}}');
        }
        return Promise.resolve('');
      });

      await llmService.loadPrompts();

      expect(fs.readdir).toHaveBeenCalledWith(expect.stringContaining('prompts'));
      expect(fs.readFile).toHaveBeenCalledTimes(2); // Only .txt files
    });

    it('should handle missing prompts directory', async () => {
      fs.readdir.mockRejectedValue(new Error('Directory not found'));

      await expect(llmService.loadPrompts()).rejects.toThrow('Failed to load LLM prompts');
    });

    it('should handle file read errors', async () => {
      fs.readdir.mockResolvedValue(['test.txt']);
      fs.readFile.mockRejectedValue(new Error('File read error'));

      await expect(llmService.loadPrompts()).rejects.toThrow('Failed to load LLM prompts');
    });
  });

  describe('getPrompt', () => {
    beforeEach(async () => {
      // Setup prompts for testing
      fs.readdir.mockResolvedValue(['greeting.txt', 'summary.txt']);
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('greeting.txt')) {
          return Promise.resolve('Hello {{name}}, welcome to {{place}}!');
        }
        if (filePath.includes('summary.txt')) {
          return Promise.resolve('Summary for {{topic}}: {{content}}');
        }
        return Promise.resolve('');
      });
      await llmService.loadPrompts();
    });

    it('should return prompt with variables replaced', () => {
      const result = llmService.getPrompt('greeting', { name: 'John', place: 'home' });
      expect(result).toBe('Hello John, welcome to home!');
    });

    it('should return prompt without variables if none provided', () => {
      const result = llmService.getPrompt('greeting');
      expect(result).toBe('Hello {{name}}, welcome to {{place}}!');
    });

    it('should handle partial variable replacement', () => {
      const result = llmService.getPrompt('greeting', { name: 'Alice' });
      expect(result).toBe('Hello Alice, welcome to {{place}}!');
    });

    it('should throw error for non-existent prompt', () => {
      expect(() => llmService.getPrompt('nonexistent')).toThrow('Prompt not found: nonexistent');
    });

    it('should handle complex variable patterns', () => {
      const result = llmService.getPrompt('summary', { 
        topic: 'AI Testing', 
        content: 'This is test content with {{nested}} patterns' 
      });
      expect(result).toBe('Summary for AI Testing: This is test content with {{nested}} patterns');
    });
  });

  describe('extractAndParseJSON', () => {
    it('should parse clean JSON object', () => {
      const input = '{"key": "value", "number": 42}';
      const result = llmService.extractAndParseJSON(input);
      expect(result).toEqual({ key: 'value', number: 42 });
    });

    it('should parse clean JSON array', () => {
      const input = '[{"id": 1}, {"id": 2}]';
      const result = llmService.extractAndParseJSON(input);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should remove markdown code blocks from JSON', () => {
      const input = '```json\n{"formatted": true}\n```';
      const result = llmService.extractAndParseJSON(input);
      expect(result).toEqual({ formatted: true });
    });

    it('should remove generic code blocks from JSON', () => {
      const input = '```\n{"formatted": true}\n```';
      const result = llmService.extractAndParseJSON(input);
      expect(result).toEqual({ formatted: true });
    });

    it('should extract JSON from text with prefix', () => {
      const input = 'Here is your JSON response:\n{"data": "extracted"}';
      const result = llmService.extractAndParseJSON(input);
      expect(result).toEqual({ data: 'extracted' });
    });

    it('should extract JSON array from text with prefix', () => {
      const input = 'The results are:\n[{"item": 1}, {"item": 2}]';
      const result = llmService.extractAndParseJSON(input);
      expect(result).toEqual([{ item: 1 }, { item: 2 }]);
    });

    it('should handle JSON with trailing text', () => {
      const input = '{"clean": true}\nSome trailing text here';
      const result = llmService.extractAndParseJSON(input);
      expect(result).toEqual({ clean: true });
    });

    it('should handle array JSON with trailing text', () => {
      const input = '[{"id": 1}]\nExtra content after';
      const result = llmService.extractAndParseJSON(input);
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should throw error for invalid JSON', () => {
      const input = 'This is not JSON at all';
      expect(() => llmService.extractAndParseJSON(input)).toThrow('Failed to parse JSON response');
    });

    it('should handle empty input', () => {
      const input = '';
      expect(() => llmService.extractAndParseJSON(input)).toThrow('Failed to parse JSON response');
    });

    it('should handle whitespace and newlines', () => {
      const input = '\n\n  {"spaced": true}  \n\n';
      const result = llmService.extractAndParseJSON(input);
      expect(result).toEqual({ spaced: true });
    });
  });

  describe('getMockChatCompletion', () => {
    beforeEach(() => {
      process.env.USE_MOCK_LLM = 'true';
    });

    it('should return mock response for normal messages', async () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await llmService.getMockChatCompletion(messages);
      
      expect(result).toHaveProperty('choices');
      expect(result.choices[0].message.role).toBe('assistant');
      expect(result.choices[0].message.content).toBe('This is a mock response from the LLM service.');
      expect(result).toHaveProperty('usage');
    });

    it('should return mock response with custom model', async () => {
      const messages = [{ role: 'user', content: 'Test message' }];
      const result = await llmService.getMockChatCompletion(messages, 'custom-model');
      
      expect(result.choices[0].message.content).toBe('This is a mock response from the LLM service.');
    });

    it('should return mock response with options', async () => {
      const messages = [{ role: 'user', content: 'Test' }];
      const options = { temperature: 0.7, max_tokens: 100 };
      const result = await llmService.getMockChatCompletion(messages, 'test-model', options);
      
      expect(result.usage.total_tokens).toBe(30);
    });

    it('should simulate error for error test messages', async () => {
      const messages = [{ role: 'user', content: 'error test please fail' }];
      
      await expect(llmService.getMockChatCompletion(messages)).rejects.toThrow('Mock LLM Error');
    });

    it('should handle multiple messages', async () => {
      const messages = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' }
      ];
      
      const result = await llmService.getMockChatCompletion(messages);
      expect(result.choices[0].message.content).toBe('This is a mock response from the LLM service.');
    });
  });

  describe('getRealChatCompletion', () => {
    beforeEach(() => {
      process.env.USE_MOCK_LLM = 'false';
      process.env.OPENROUTER_API_KEY = 'test-api-key';
    });

    it('should throw error when API key is not set', async () => {
      delete process.env.OPENROUTER_API_KEY;
      
      const messages = [{ role: 'user', content: 'Hello' }];
      await expect(llmService.getRealChatCompletion(messages)).rejects.toThrow('OpenRouter API key is not configured');
    });

    it('should make successful API call', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { role: 'assistant', content: 'Real response' } }],
          usage: { total_tokens: 50 }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await llmService.getRealChatCompletion(messages);
      
      expect(axios.post).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          model: 'deepseek/deepseek-chat-v3-0324:free',
          messages: messages
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API call with custom model and options', async () => {
      const mockResponse = { data: { choices: [], usage: {} } };
      axios.post.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user', content: 'Test' }];
      const customModel = 'custom-model';
      const options = { temperature: 0.5, max_tokens: 200 };
      
      await llmService.getRealChatCompletion(messages, customModel, options);
      
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: customModel,
          messages: messages,
          temperature: 0.5,
          max_tokens: 200
        }),
        expect.any(Object)
      );
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockError = new Error('Network error');
      const mockResponse = { data: { choices: [{ message: { content: 'Success' } }] } };
      
      axios.post
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);

      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await llmService.getRealChatCompletion(messages);
      
      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse.data);
    });

    it('should fail after max retry attempts', async () => {
      const mockError = new Error('Persistent error');
      axios.post.mockRejectedValue(mockError);

      const messages = [{ role: 'user', content: 'Hello' }];
      
      await expect(llmService.getRealChatCompletion(messages)).rejects.toThrow('LLM API request failed after multiple attempts');
      expect(axios.post).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should handle API error responses', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { error: { message: 'Unauthorized' } }
        }
      };
      axios.post.mockRejectedValue(mockError);

      const messages = [{ role: 'user', content: 'Hello' }];
      
      await expect(llmService.getRealChatCompletion(messages)).rejects.toThrow('LLM API request failed with status 401: Unauthorized');
    });
  });

  describe('getChatCompletion (main wrapper)', () => {
    it('should use mock when USE_MOCK_LLM is true', async () => {
      process.env.USE_MOCK_LLM = 'true';
      
      const messages = [{ role: 'user', content: 'Test' }];
      const result = await llmService.getChatCompletion(messages);
      
      expect(result.choices[0].message.content).toBe('This is a mock response from the LLM service.');
    });

    it('should use real API when USE_MOCK_LLM is false', async () => {
      process.env.USE_MOCK_LLM = 'false';
      process.env.OPENROUTER_API_KEY = 'test-key';
      
      const mockResponse = { data: { choices: [{ message: { content: 'Real response' } }] } };
      axios.post.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user', content: 'Test' }];
      const result = await llmService.getChatCompletion(messages);
      
      expect(result.choices[0].message.content).toBe('Real response');
    });
  });

  describe('High-level service functions', () => {
    beforeEach(async () => {
      // Setup environment for testing
      process.env.USE_MOCK_LLM = 'true';
      
      // Mock prompts
      fs.readdir.mockResolvedValue(['summaryPrompt.txt', 'searchPrompt.txt', 'validatePrompt.txt']);
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('summaryPrompt.txt')) {
          return Promise.resolve('Generate a summary for {{responsesText}} with guidelines: {{guidelines}}. Question: {{surveyQuestion}}, Area: {{surveyArea}}');
        }
        if (filePath.includes('searchPrompt.txt')) {
          return Promise.resolve('Search for {{query}} in context: {{surveysContext}}');
        }
        if (filePath.includes('validatePrompt.txt')) {
          return Promise.resolve('Validate responses {{responsesJsonArray}} with guidelines: {{guidelines}}');
        }
        return Promise.resolve('');
      });
      
      await llmService.loadPrompts();
    });

    describe('generateSummary', () => {
      it('should generate summary successfully', async () => {
        const result = await llmService.generateSummary('Test text to summarize', 'Test guidelines');
        
        expect(result).toBeDefined();
        // Mock now returns JSON structure for summary requests
        expect(result.summary).toBeDefined();
        expect(result.keyThemes).toBeDefined();
        expect(result.sentiment).toBeDefined();
        expect(result.confidence).toBeDefined();
      });

      it('should handle empty text', async () => {
        const result = await llmService.generateSummary('', 'Guidelines');
        expect(result).toBeDefined();
        expect(result.summary).toBeDefined();
      });

      it('should include all parameters in summary generation', async () => {
        const result = await llmService.generateSummary(
          'Test text', 
          'Guidelines', 
          'Survey Question', 
          'Survey Area'
        );
        expect(result).toBeDefined();
        expect(result.summary).toBeDefined();
      });
    });

    describe('searchSurveys', () => {
      it('should search surveys successfully', async () => {
        const surveysContext = [
          { _id: '1', title: 'Survey 1', description: 'Test survey 1' },
          { _id: '2', title: 'Survey 2', description: 'Test survey 2' }
        ];
        
        const result = await llmService.searchSurveys('test query', surveysContext);
        
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty('surveyId');
          expect(result[0]).toHaveProperty('relevanceScore');
          expect(result[0]).toHaveProperty('reason');
        }
      });

      it('should handle empty search query', async () => {
        const result = await llmService.searchSurveys('', []);
        expect(Array.isArray(result)).toBe(true);
      });

      it('should handle empty surveys context', async () => {
        const result = await llmService.searchSurveys('test query', []);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('validateResponses', () => {
      it('should validate responses successfully', async () => {
        const responses = ['Response 1', 'Response 2'];
        const guidelines = 'Test guidelines';
        
        const result = await llmService.validateResponses(responses, guidelines);
        
        expect(result).toHaveProperty('problematicResponses');
        expect(Array.isArray(result.problematicResponses)).toBe(true);
      });

      it('should handle empty responses', async () => {
        const result = await llmService.validateResponses([], 'Guidelines');
        expect(result).toHaveProperty('problematicResponses');
        expect(Array.isArray(result.problematicResponses)).toBe(true);
        expect(result.problematicResponses).toHaveLength(0);
      });

      it('should handle single response', async () => {
        const result = await llmService.validateResponses(['Single response'], 'Guidelines');
        expect(result).toHaveProperty('problematicResponses');
        expect(Array.isArray(result.problematicResponses)).toBe(true);
      });
    });
  });
}); 