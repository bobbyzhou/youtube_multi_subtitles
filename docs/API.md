# YouTube Multi-Subtitles API Documentation

## Overview

This Chrome extension provides bilingual subtitles for YouTube videos with translation capabilities.

## Core Classes

### BilingualSubtitles

Main content script class that handles subtitle extraction and display.

#### Constructor
```javascript
new BilingualSubtitles(options = {})
```

**Parameters:**
- `options.skipInit` (boolean): Skip automatic initialization (useful for testing)

#### Methods

##### `init()`
Initializes the plugin, loads settings, and sets up observers.

##### `setupPlugin()`
Sets up subtitle observers and event listeners for YouTube player.

##### `displayTranslationResult(originalText, translatedText)`
Displays translated text alongside original subtitles.

**Parameters:**
- `originalText` (string): Original subtitle text
- `translatedText` (string): Translated text

##### `escapeHtml(text)`
Escapes HTML entities in text for safe display.

**Parameters:**
- `text` (string): Text to escape

**Returns:** (string) Escaped text

##### `setCacheWithLimit(key, value)`
Adds translation to cache with size limit enforcement.

**Parameters:**
- `key` (string): Cache key (original text)
- `value` (string): Cached translation

## Background Script Functions

### `translateText(text, sourceLang, targetLang, apiKey)`

Main translation function that handles both official and free APIs.

**Parameters:**
- `text` (string|Array): Text to translate (single string or array)
- `sourceLang` (string): Source language code
- `targetLang` (string): Target language code  
- `apiKey` (string): Google Translate API key (optional)

**Returns:** (Promise<string|Array>) Translated text

### `isValidApiKey(apiKey)`

Validates Google Translate API key format.

**Parameters:**
- `apiKey` (string): API key to validate

**Returns:** (boolean) True if valid format

### `translateWithFreeAPI(text, sourceLang, targetLang)`

Translates text using free Google Translate API.

**Parameters:**
- `text` (string): Text to translate
- `sourceLang` (string): Source language code
- `targetLang` (string): Target language code

**Returns:** (Promise<string>) Translated text

## Performance Monitoring

### PerformanceMonitor

Tracks translation performance and generates reports.

#### Methods

##### `startTranslation(text)`
Starts tracking a translation operation.

**Parameters:**
- `text` (string): Text being translated

**Returns:** (Object) Tracker object with `addStep()` and `finish()` methods

##### `generateReport()`
Generates performance statistics report.

**Returns:** (Object) Performance metrics

## Configuration

### Settings Object
```javascript
{
  targetLanguage: 'zh-CN',    // Target language code
  sourceLanguage: 'auto',     // Source language detection
  apiKey: '',                 // Google Translate API key
  apiPreference: 'auto',      // 'auto', 'official', 'free'
  cacheTime: 24,             // Cache expiration hours
  displayPosition: 'bottom',  // Subtitle position
  fontSize: 'medium',        // Font size
  showOriginal: true         // Show original text
}
```

## Language Codes

Supported language codes include:
- `auto` - Auto-detect
- `en` - English
- `zh-CN` - Chinese (Simplified)
- `zh-TW` - Chinese (Traditional)
- `ja` - Japanese
- `ko` - Korean
- `es` - Spanish
- `fr` - French
- `de` - German
- `ru` - Russian

## Error Handling

All functions include comprehensive error handling:
- Network failures fall back to alternative APIs
- Invalid responses return fallback translations
- Cache errors are handled gracefully
- DOM manipulation errors don't break functionality

## Testing

The codebase includes comprehensive tests:
- Unit tests for individual functions
- Integration tests for full workflows
- Edge case testing for error conditions
- DOM operation testing with jsdom

Run tests with:
```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage report
npm run test:watch    # Watch mode for development
```
