const axios = require('axios');
const logger = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// As per plan: "DeepSeek LLM via OpenRouter"
const DEFAULT_MODEL = 'deepseek/deepseek-chat-v3-0324:free'; // Example, replace with the specific DeepSeek model identifier

const useMockLLM = process.env.USE_MOCK_LLM === 'true';

const promptsDir = path.join(__dirname, '../prompts');
const loadedPrompts = {};

/**
 * Loads all .txt prompts from the /prompts directory.
 */
async function loadPrompts() {
    try {
        const files = await fs.readdir(promptsDir);
        for (const file of files) {
            if (file.endsWith('.txt')) {
                const promptName = path.basename(file, '.txt');
                const filePath = path.join(promptsDir, file);
                const content = await fs.readFile(filePath, 'utf-8');
                loadedPrompts[promptName] = content;
                logger.info(`Loaded prompt: ${promptName}`);
            }
        }
    } catch (error) {
        logger.error('Failed to load prompts:', error);
        // Depending on the application's needs, you might want to throw the error
        // or handle it gracefully, perhaps by using default prompts or disabling AI features.
        throw new Error('Failed to load LLM prompts. AI features may be unavailable.');
    }
}

/**
 * Gets a loaded prompt by its name.
 * @param {string} promptName - The name of the prompt (e.g., 'summarizePrompt').
 * @param {object} variables - An object containing variables to replace in the prompt template.
 * @returns {string} The processed prompt.
 * @throws {Error} If the prompt is not found.
 */
function getPrompt(promptName, variables = {}) {
    if (!loadedPrompts[promptName]) {
        logger.error(`Prompt not found: ${promptName}. Ensure it was loaded correctly.`);
        throw new Error(`Prompt not found: ${promptName}`);
    }
    let prompt = loadedPrompts[promptName];
    for (const key in variables) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        prompt = prompt.replace(regex, variables[key]);
    }
    return prompt;
}

/**
 * Calls the OpenRouter API (DeepSeek model) for chat completions.
 * @param {Array<object>} messages - Array of message objects (e.g., [{ role: 'user', content: 'Hello' }]).
 * @param {string} model - The specific model to use (defaults to DEFAULT_MODEL).
 * @param {object} options - Additional options for the API call (e.g., temperature, max_tokens).
 * @returns {Promise<object>} The response data from the LLM.
 * @throws {Error} If the API call fails or OPENROUTER_API_KEY is not set.
 */
const getChatCompletion = async (messages, model = DEFAULT_MODEL, options = {}) => {
  if (useMockLLM) {
    logger.info('Using Mock LLM Service for chat completion');
    // Simulate a delay and return a mock response
    await new Promise(resolve => setTimeout(resolve, 500));
    if (messages.some(m => m.content.toLowerCase().includes('error test'))) {
        return Promise.reject(new Error('Mock LLM Error'));
    }
    return Promise.resolve({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'This is a mock response from the LLM service.',
          },
        },
      ],
      // Include other mock data as needed, like usage stats
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    });
  }

  if (!OPENROUTER_API_KEY) {
    logger.error('OPENROUTER_API_KEY is not set. Cannot call LLM service.');
    throw new Error('OpenRouter API key is not configured.');
  }

  const data = {
    model: model,
    messages: messages,
    ...options, // Spread additional options like temperature, max_tokens, etc.
  };

  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    // 'HTTP-Referer': 'YOUR_SITE_URL', // Recommended by OpenRouter
    // 'X-Title': 'YOUR_SITE_NAME',    // Recommended by OpenRouter
  };

  try {
    // Basic retry mechanism (e.g., retry once on failure)
    // For more robust retry logic, consider libraries like 'axios-retry' or 'p-retry'.
    let attempt = 0;
    const maxAttempts = 2;
    while(attempt < maxAttempts) {
        try {
            logger.info(`Attempting OpenRouter API call (attempt ${attempt + 1}/${maxAttempts}) to model ${model}`);
            const response = await axios.post(OPENROUTER_API_URL, data, { headers });
            logger.info(`OpenRouter API call successful for model ${model}`);
            return response.data;
        } catch (error) {
            attempt++;
            logger.error(`OpenRouter API call attempt ${attempt} failed: ${error.message}`);
            if (attempt >= maxAttempts) {
                if (error.response) {
                    logger.error(`LLM API Error Response: ${error.response.status} ${JSON.stringify(error.response.data)}`);
                    throw new Error(`LLM API request failed with status ${error.response.status}: ${error.response.data.error ? error.response.data.error.message : 'Unknown error'}`);
                } else {
                    throw new Error('LLM API request failed after multiple attempts.');
                }
            }
            // Optional: wait before retrying (e.g., exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); 
        }
    }
  } catch (error) {
    logger.error('Failed to get chat completion from LLM:', error.message);
    throw error; // Re-throw the error to be handled by the caller
  }
};

/**
 * Placeholder for LLM API call for summarization.
 * @param {string} textToSummarize - The text to be summarized.
 * @param {string} guidelines - Guidelines for the summarization.
 * @returns {Promise<string>} The summary.
 */
async function generateSummary(textToSummarize, guidelines, surveyQuestion = "N/A", surveyArea = "N/A") {
    logger.info('Attempting to generate summary...');
    const promptContent = getPrompt('summaryPrompt', { 
        responsesText: textToSummarize, 
        guidelines: guidelines || "No specific guidelines provided.",
        surveyQuestion,
        surveyArea
    });

    // TODO: Uncomment and adapt to call getChatCompletion
    // try {
    //     const messages = [{ role: 'user', content: promptContent }];
    //     const llmResponse = await getChatCompletion(messages, undefined, { /* options like temperature */ });
    //     const summary = llmResponse.choices[0].message.content;
    //     logger.info('Summary generated successfully by LLM.');
    //     return summary;
    // } catch (error) {
    //     logger.error('LLM call failed during summary generation:', error);
    //     throw new Error('Failed to generate summary using LLM.');
    // }

    // Placeholder until LLM call is active:
    return new Promise(resolve => setTimeout(() => resolve(`Mock summary based on: ${textToSummarize.substring(0,50)}... and guidelines: ${guidelines}`), 100));
}

/**
 * Calls LLM for natural language search.
 * @param {string} query - The natural language query.
 * @param {Array<object>} surveysContextArray - Context of all surveys for the LLM.
 * @returns {Promise<Array<object>>} Array of matched surveys with explanations.
 */
async function searchSurveys(query, surveysContextArray) {
    logger.info(`Searching surveys with query: ${query}`);
    // Prepare context string for the prompt
    const surveysContextString = surveysContextArray.map(s => `ID: ${s._id || s.id}\nTitle: ${s.title}\nArea: ${s.area}\nQuestion: ${s.question}\nGuidelines: ${s.guidelines}`).join('\n\n');

    const promptContent = getPrompt('searchPrompt', { 
        query, 
        surveysContext: surveysContextString 
    });

    // TODO: Uncomment and adapt to call getChatCompletion
    // try {
    //     const messages = [{ role: 'user', content: promptContent }];
    //     const llmResponse = await getChatCompletion(messages, undefined, { /* options */ });
    //     const searchResultRaw = llmResponse.choices[0].message.content;
    //     // Attempt to parse the JSON response from LLM
    //     try {
    //         const searchResults = JSON.parse(searchResultRaw);
    //         logger.info('Survey search successful and response parsed.');
    //         return searchResults;
    //     } catch (parseError) {
    //         logger.error('Failed to parse LLM search response as JSON:', parseError, 'Raw response:', searchResultRaw);
    //         throw new Error('LLM returned malformed search results.');
    //     }
    // } catch (error) {
    //     logger.error('LLM call failed during survey search:', error);
    //     throw new Error('Failed to search surveys using LLM.');
    // }

    // Placeholder until LLM call is active:
    return new Promise(resolve => setTimeout(() => resolve([
        { id: "mockId1", title: "Mock Survey 1 based on query", reason: `Matches query '${query}' due to keyword A.` },
        { id: "mockId2", title: "Mock Survey 2 based on query", reason: `Matches query '${query}' due to keyword B.` }
    ]), 100));
}

/**
 * Calls LLM for validating responses.
 * @param {Array<string>} responsesArray - Responses to validate.
 * @param {string} guidelines - Survey guidelines for validation.
 * @returns {Promise<Array<object>>} List of problematic responses with reasons.
 */
async function validateResponses(responsesArray, guidelines) {
    logger.info('Validating responses against guidelines...');
    const responsesJsonArray = JSON.stringify(responsesArray); // Pass as a JSON string array to the prompt

    const promptContent = getPrompt('validatePrompt', { 
        responsesJsonArray, 
        guidelines 
    });

    // TODO: Uncomment and adapt to call getChatCompletion
    // try {
    //     const messages = [{ role: 'user', content: promptContent }];
    //     const llmResponse = await getChatCompletion(messages, undefined, { /* options */ });
    //     const validationResultRaw = llmResponse.choices[0].message.content;
    //     // Attempt to parse the JSON response from LLM
    //     try {
    //         const validationResults = JSON.parse(validationResultRaw);
    //         logger.info('Response validation successful and response parsed.');
    //         return validationResults;
    //     } catch (parseError) {
    //         logger.error('Failed to parse LLM validation response as JSON:', parseError, 'Raw response:', validationResultRaw);
    //         throw new Error('LLM returned malformed validation results.');
    //     }
    // } catch (error) {
    //     logger.error('LLM call failed during response validation:', error);
    //     throw new Error('Failed to validate responses using LLM.');
    // }
    
    // Placeholder until LLM call is active:
    return new Promise(resolve => setTimeout(() => resolve([
        { responseIndex: 0, reason: `Response '${responsesArray[0]}' (first 20 chars) seems to violate guideline X based on: ${guidelines.substring(0,30)}...` },
        { responseIndex: responsesArray.length > 1 ? 1 : 0, reason: "Mock validation: Another response issue." }
    ].slice(0, responsesArray.length)), 100));
}

module.exports = {
  getChatCompletion,
  loadPrompts,
  getPrompt,
  generateSummary,
  searchSurveys,
  validateResponses,
  // Potentially add other LLM related functions here later
}; 