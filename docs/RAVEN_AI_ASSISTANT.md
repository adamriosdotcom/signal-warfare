# RAVEN AI Assistant Documentation

RAVEN (Rapid Autonomous Vector & Electronic Navigation) is the AI assistant in SIGNAL WARFARE, serving as both a tactical advisor and interface for natural language commands.

## 1. Core Functionality

RAVEN provides four primary functions:

1. **Tactical Analysis**: Evaluates game state and provides situational awareness
2. **Command Processing**: Converts natural language inputs into game actions
3. **Educational Content**: Explains RF concepts and electronic warfare principles
4. **Mission Narration**: Guides the player through mission objectives and events

## 2. Technical Architecture

RAVEN consists of several interconnected components:

```
┌─────────────────┐    ┌────────────────┐    ┌─────────────────┐
│                 │    │                │    │                 │
│  User Interface │<-->│  RAVEN Core    │<-->│  Claude AI      │
│  (Input/Output) │    │  (Processing)  │    │  (NLP Engine)   │
│                 │    │                │    │                 │
└─────────────────┘    └────────────────┘    └─────────────────┘
                              ^
                              │
                              v
                       ┌─────────────────┐
                       │                 │
                       │  Game State     │
                       │  (Context)      │
                       │                 │
                       └─────────────────┘
```

### Key Components:

- **UI Elements**: Text input, message display, and suggestion buttons
- **RavenAI Class**: Core logic for command processing and response generation
- **Claude Integration**: Advanced NLP for natural language understanding
- **Action Parser**: Converts structured AI responses into game actions
- **Context Builder**: Provides game state information to the AI

## 3. User Interface

RAVEN's interface consists of:

```
┌───────────────────────────────────────────────┐
│ RAVEN ASSISTANT                         _     │
├───────────────────────────────────────────────┤
│                                               │
│ [System] RAVEN AI ASSISTANT ONLINE           │
│ [System] Combat electronic systems online...  │
│                                               │
│ [User] Deploy surveillance drone              │
│                                               │
│ [RAVEN] Deploying surveillance drone at       │
│ coordinates 500, 300. Drone will provide      │
│ signal intelligence within a 800m radius.     │
│                                               │
├───────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐   │
│ │ Analyze RF environment                  │   │
│ └─────────────────────────────────────────┘   │
│ ┌─────────────────────────────────────────┐   │
│ │ Deploy jammer at current position       │   │
│ └─────────────────────────────────────────┘   │
├───────────────────────────────────────────────┤
│ [                                     ] [▶]   │
└───────────────────────────────────────────────┘
```

### UI Components:

1. **Message History**: Shows past interactions with timestamps
2. **Suggestion Buttons**: Context-aware suggested actions
3. **Input Field**: For typing commands
4. **Send Button**: Submits commands for processing

## 4. Command Processing Pipeline

When a user enters a command, it flows through this pipeline:

1. **Input Capture**: Command is received from the UI
2. **Command Routing**: 
   - If Claude is enabled: Command is sent to Claude AI
   - If Claude is disabled: Command is processed by pattern matching
3. **Context Enrichment**: Game state is added to provide context
4. **Response Generation**: RAVEN crafts a response (via Claude or patterns)
5. **Action Extraction**: Actions are parsed from the response
6. **Command Execution**: Actions are executed in the game
7. **UI Update**: Response is displayed and suggestions are updated

## 5. Command Patterns

Without Claude, RAVEN uses regex patterns to match commands:

| Command Type | Pattern Examples | Function |
|--------------|------------------|----------|
| DEPLOY | `deploy (jammer\|drone\|sensor)` | Place assets on the map |
| ANALYZE | `analyze (signals\|terrain\|threats\|coverage)` | Analyze game elements | 
| SCAN | `scan (area\|surroundings\|sector) for (signals\|enemies)` | Scan specific areas |
| CONFIGURE | `configure (frequency\|power\|antenna) to (.+)` | Change asset settings |
| JAMMING | `(start\|stop) jamming (gps\|frequencies)` | Control jamming operations |
| HELP | `help (with\|on\|about) (\w+)` | Get assistance |
| INFO | `show (mission\|asset\|enemy\|signal) status` | Get status information |

Example implementation:

```javascript
_parseCommand(input) {
    // Normalize input
    const normalizedInput = input.toLowerCase();
    
    // Check against command patterns
    for (const pattern of this.commandPatterns) {
        for (const regex of pattern.patterns) {
            const match = normalizedInput.match(regex);
            if (match) {
                return {
                    type: pattern.type,
                    action: pattern.action,
                    matches: match.groups || {},
                    original: input
                };
            }
        }
    }
    
    return null;
}
```

## 6. Contextual Suggestions

RAVEN offers dynamic suggestions based on:

1. **Current Mission Phase**: Different suggestions for deployment, intel, operation, and defense phases
2. **Game State**: Suggestions based on available assets, enemy positions, and mission objectives
3. **Selected Assets**: Asset-specific actions when an asset is selected
4. **Recent Actions**: Follow-up suggestions after executing commands

Example implementation:

```javascript
_generateSuggestions() {
    // Clear current suggestions
    this.currentSuggestions = [];
    
    // Generate different suggestions based on game phase
    const missionPhase = gameState.missionPhase;
    
    switch (missionPhase) {
        case 'DEPLOYMENT':
            this.currentSuggestions.push({
                text: "Deploy surveillance drone at high elevation",
                command: "Deploy surveillance drone at highest elevation point"
            });
            break;
            
        case 'INTEL':
            this.currentSuggestions.push({
                text: "Scan for enemy signals",
                command: "Scan area for signals"
            });
            break;
        
        // More phases...
    }
    
    // If we have a selected asset, add asset-specific suggestions
    if (this.selectedAsset) {
        this._generateAssetSpecificSuggestions();
    }
    
    // Render suggestions to UI
    this._renderSuggestions();
}
```

## 7. Educational Content

RAVEN provides educational content about electronic warfare concepts:

1. **Signal Propagation**: Explanations of how RF signals travel and attenuate
2. **Frequency Bands**: Information about different frequency ranges and uses
3. **Antenna Theory**: How different antenna types affect signal directionality
4. **Jamming Techniques**: Descriptions of various jamming methods

Example:

```javascript
_getSignalEducationalContent(frequencyBand) {
    switch (frequencyBand) {
        case 'UHF':
            return "UHF (433MHz) signals provide good balance of range and penetration, ideal for remote drone control in varied terrain.";
            
        case 'GPS':
            return "GPS L1 band (1575.42MHz) is critical for positioning. Jamming this frequency disrupts enemy navigation capabilities.";
            
        case 'ISM2400':
            return "2.4GHz provides high bandwidth but limited range and penetration. Often used for drone video transmission.";
            
        // More bands...
    }
}
```

## 8. Implementation Overview

Key files and their functions:

- **ravenAI.js**: Main class implementing the RAVEN AI Assistant
- **claude-client.js**: Client for Claude AI integration
- **action-parser.js**: Parses Claude's responses for actionable commands
- **context-builder.js**: Builds game state context for Claude
- **settings-manager.js**: Manages Claude API settings

Example implementation workflow:

```javascript
// User sends a command
async _processUserInput() {
    const input = this.inputField.value.trim();
    if (!input) return;
    
    // Add user message to the chat
    this._addUserMessage(input);
    
    // Clear input field
    this.inputField.value = '';
    
    // Process the command
    await this._processCommand(input);
}

// Process with Claude when available
async _processWithClaude(input) {
    // Create context from game state
    const context = this.contextBuilder.buildContext();
    
    // Send to Claude
    const response = await claudeClient.sendMessage(input, context, this.messageHistory);
    
    // Parse the response
    const parsedResponse = actionParser.parseResponse(response);
    
    // Display the message to the user
    this._addRavenMessage(parsedResponse.message);
    
    // Execute any actions
    if (parsedResponse.actions && parsedResponse.actions.length > 0) {
        actionParser.executeActions(parsedResponse.actions);
    }
    
    // Generate new suggestions
    this._generateSuggestions();
}
```

## 9. Fallback System

When Claude integration is unavailable, RAVEN falls back to a pattern-based response system:

1. **Command Pattern Matching**: Uses regex to identify command intent
2. **Predefined Responses**: Hand-crafted responses for common commands
3. **Templated Outputs**: Fills in templates with game state information
4. **Canned Actions**: Predefined action sequences for recognized commands

This ensures the game remains functional even without an AI connection.

## 10. Future Enhancements

Potential RAVEN improvements:

1. **Voice Recognition**: Add speech-to-text for voice commands
2. **Memory Persistence**: Improved memory of past interactions and preferences
3. **Proactive Suggestions**: Alert the player to opportunities without prompting
4. **Mission Adaptation**: Adjust RAVEN's behavior based on mission success/failure
5. **Personality Settings**: Allow players to select different RAVEN personalities
6. **Offline Mode**: Enhanced fallback capabilities with local models