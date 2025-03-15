# ECHO ZERO: Claude AI Integration

This document details how the RAVEN AI assistant integrates with Anthropic's Claude AI through a proxy server architecture.

## 1. Architecture Overview

SIGNAL WARFARE uses a proxy server approach to integrate Claude:

```
[Browser Client] <---> [Local Express Proxy Server] <---> [Anthropic Claude API]
```

This architecture solves several problems:
- Avoids CORS issues that would occur with direct browser-to-Claude API calls
- Keeps API keys secure by storing them server-side
- Allows for request/response preprocessing and error handling

## 2. Proxy Server Implementation

The proxy server is implemented in `server.js` using Express.js:

```javascript
// Proxy endpoint for Claude API
app.post('/api/claude', async (req, res) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not found in environment variables' });
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }
    
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
```

Key features:
- Uses environment variables for secure API key storage
- Forwards the request body directly to Claude API
- Uses proper headers (Content-Type, x-api-key, anthropic-version)
- Handles error conditions and passes them back to the client

## 3. Client-Side Integration

The client uses a `claudeClient.js` class to communicate with the Claude API via the proxy:

```javascript
class ClaudeClient {
  constructor() {
    this.apiEndpoint = '/api/claude'; // Local proxy endpoint
    this.model = 'claude-3-opus-20240229';
    this.initialized = false;
  }

  async sendMessage(message, context, conversation) {
    // Limit conversation history to avoid context length errors
    const maxHistoryMessages = 10;
    const limitedConversation = conversation.slice(-maxHistoryMessages);
    
    try {
      // Build system prompt with game context
      const systemPrompt = this._buildSystemPrompt(context);
      
      // Ensure we have a full URL for the API endpoint
      const apiUrl = this.apiEndpoint.startsWith('/') 
        ? window.location.origin + this.apiEndpoint 
        : this.apiEndpoint;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...limitedConversation.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            })),
            { role: 'user', content: message }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Claude API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Error communicating with Claude:', error);
      throw error;
    }
  }
}
```

Key features:
- No API keys stored in client-side code
- Conversation history management to stay within token limits
- Proper error handling and retries
- System prompt generation with game context

## 4. System Prompt Design

The system prompt is critical for effective Claude integration. It provides:
1. Game state context for informed responses
2. Instructions on how to respond in the proper tone
3. Formatting guidance for response structure
4. Action directives that the game can parse and execute

Example of prompt construction:

```javascript
_buildSystemPrompt(context, reduced = false) {
  // Core prompt that's always included
  const corePrompt = `You are RAVEN (Rapid Autonomous Vector & Electronic Navigation), an AI assistant for electronic warfare operations.
  
  CURRENT TACTICAL SITUATION:
  Mission Phase: ${context.missionPhase}
  Mission Time: ${this._formatTime(context.missionTime)}
  Tactical Advantage: ${this._formatTacticalAdvantage(context.tacticalAdvantage)}`;

  // Standard full prompt
  return `${corePrompt}

  PLAYER ASSETS:
  ${this._formatAssets(context.playerAssets)}

  ENEMY ASSETS:
  ${this._formatEnemyAssets(context.enemyAssets)}

  RF ENVIRONMENT:
  ${this._formatRFEnvironment(context.rfEnvironment)}

  MISSION OBJECTIVES:
  ${this._formatObjectives(context.objectives)}

  Your role is to provide tactical analysis, suggestions, and execute commands in a realistic electronic warfare scenario. Respond in a concise, military style using appropriate technical terminology for electronic warfare.

  For any command that requires game actions, include an ACTION BLOCK with the format:
  <action>
    "type": "[ACTION_TYPE]",
    "parameters": { ... parameters specific to the action ... }
  </action>

  Available actions: 
  - DEPLOY (deploy assets like jammers, drones, sensors)
  - ANALYZE (analyze signals, terrain, threats, or coverage)
  - SCAN (scan areas for signals, enemies, or terrain features)
  - CONFIGURE (configure equipment parameters like frequency, power, antenna)
  - JAM (start or stop jamming operations)
  - INFO (provide information about mission, assets, enemies, signals)`;
}
```

## 5. Action Parsing

The client parses Claude's responses to extract action directives using the `actionParser.js` module:

```javascript
parseResponse(response) {
  // Regular expression to extract actions
  const actionRegex = /<action>([\s\S]*?)<\/action>/g;
  
  // Extract all action blocks
  const actionMatches = [...response.matchAll(actionRegex)];
  
  // Parse actions
  const actions = actionMatches.map(match => {
    try {
      // Parse JSON within action block
      return JSON.parse(match[1]);
    } catch (error) {
      console.error('Error parsing action JSON:', error);
      return null;
    }
  }).filter(action => action !== null);
  
  // Remove action blocks from response
  const message = response.replace(actionRegex, '').trim();
  
  return {
    message,
    actions
  };
}
```

## 6. Error Handling & Fallbacks

The system includes several layers of error handling and fallbacks:

1. **Context Length Management**:
   - Uses reduced context when approaching token limits
   - Truncates conversation history to most recent messages

2. **Network Error Handling**:
   - Graceful degradation when API is unavailable
   - Clear error messages to the user

3. **Fallback to Basic Mode**:
   - When Claude integration fails, the system falls back to basic pattern-based responses
   - Ensures the game remains functional without Claude

```javascript
async _processCommand(input) {
  this.analyzing = true;
  
  try {
    if (this.claudeEnabled) {
      try {
        await this._processWithClaude(input);
      } catch (claudeError) {
        this._addSystemMessage("CLAUDE AI CONNECTION ERROR. Falling back to standard RAVEN mode.");
        await this._processWithLegacySystem(input);
      }
    } else {
      await this._processWithLegacySystem(input);
    }
  } catch (error) {
    console.error('Critical error processing command:', error);
    this._addRavenMessage("I encountered a critical error processing your command. Please try a different command.");
  } finally {
    this.analyzing = false;
  }
}
```

## 7. Environment Configuration

The proxy server uses dotenv for environment variable management:

```javascript
// Load environment variables
dotenv.config();

// Access API key from environment
const apiKey = process.env.ANTHROPIC_API_KEY;
```

Required environment variables:
- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude
- `PORT`: (Optional) Port for the proxy server (defaults to 8000)

## 8. Security Considerations

1. **API Key Protection**:
   - Never exposed to client-side code
   - Stored in environment variables, not in code

2. **CORS Configuration**:
   - Proxy server uses CORS headers to control access
   - Configured for development with permissive settings

3. **Input Validation**:
   - Sanitizes user inputs before sending to Claude
   - Validates responses before processing

## 9. Setup Instructions

1. Create a `.env` file in the project root with your API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   PORT=8000
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   node server.js
   ```

4. Access the application at http://localhost:8000