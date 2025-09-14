# translate_srt

A Node.js tool to translate SRT subtitle files using OpenAI's API.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set your environment variables:
   ```bash
   export OPENAI_API_KEY="your_openai_api_key"
   export OPENAI_MODEL="gpt-5-mini-2025-08-07" # optional, default set in code
   ```
3. Run the app:
   ```bash
   node app.js
   ```

## Environment Variables
- `OPENAI_API_KEY` (required): Your OpenAI API key.
- `OPENAI_MODEL` (optional): Model name (default: `gpt-5-mini-2025-08-07`).
- `OPENAI_TIMEOUT_MS` (optional): Timeout in ms (default: 240000).


## How SRT File Slicing Works (and How to Improve It)

This tool splits the input SRT file into chunks for translation by:

- Splitting the file into blocks using blank lines (each block is a subtitle entry).
- Grouping every 50 blocks into a chunk (see `MIN_BLOCKS_PER_CHUNK` in `app.js`).
- If the last chunk is too small, it merges it with the previous chunk.

**Limitations:**
- This method is simple and may not always produce optimal chunking for translation quality or API limits.
- It does not consider token count, subtitle timing, or language boundaries.

**Want to improve it?**
- See the chunking logic in `app.js` (search for `MIN_BLOCKS_PER_CHUNK`).
- You could improve by:
   - Chunking by token count instead of block count
   - Smarter merging/splitting based on subtitle timing or content
   - Handling edge cases for very large or very small files

Pull requests are welcome!

## Usage Example
Translate an SRT file:
```bash
node app.js input.srt
```

## License
MIT

## Maintainer
Update `author` in `package.json`.

## Repository
Update `repository` in `package.json` before publishing.
