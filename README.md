> **Note:** This project is half-vibe-coded.

# add_translate_srt

A Node.js CLI tool to add a second language line under each original line in an SRT subtitle file using a large language model (LLM).

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



## How the Prompt Works (and How to Improve It)

**Current behavior:**
The prompt is designed to create a bilingual SRT file by adding a line of the second language (Chinese) **directly under** each English line. This is intentional and important: the output will always be English, then its translation, line by line, throughout the file.

**Why?**
This format is useful for language learners and for making subtitles that show both languages together. If you want a different output style (e.g., replace English, or use a different order), you must change the prompt in `app.js` (see the `AI_PROMPT` variable near the top).

**How to improve:**
- Edit the `AI_PROMPT` string in `app.js` to change the translation style, output format, or add extra instructions.
- You can experiment with different prompts for other languages, subtitle layouts, or even add formatting.

**Repo name:**
If you want to focus on bilingual/dual-language subtitles, consider renaming the repo to something like `bilingual-srt` or `srt-bilingualizer` for clarity.

Pull requests for prompt improvements or new output modes are welcome!

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
