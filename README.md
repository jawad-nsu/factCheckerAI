# Website Data Collector Chrome Extension

This Chrome extension allows you to collect website data and send it to a backend API for processing.

## Features

- Collects complete website data including:
  - Page URL and title
  - Full HTML content
  - Text content
  - Meta information
  - Links
  - Images
- Simple user interface
- Real-time data collection
- Secure data transmission

## Installation

1. Clone this repository or download the source code
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Configuration

Before using the extension, you need to configure the backend API endpoint:

1. Open `content.js`
2. Replace `'YOUR_BACKEND_API_ENDPOINT'` with your actual API endpoint
3. Make sure your backend API is set up to receive POST requests with JSON data

## Usage

1. Click the extension icon in your Chrome toolbar
2. Click the "Collect Page Data" button
3. The extension will collect the current page's data and send it to your configured backend API
4. You'll see a success or error message indicating the result

## Security Considerations

- The extension requires permissions to access website content
- Make sure to implement proper authentication in your backend API
- Consider implementing rate limiting to prevent abuse
- Handle sensitive data appropriately

## Development

To modify the extension:

1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## License

MIT License
