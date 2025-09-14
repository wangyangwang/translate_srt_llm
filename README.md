
<div align="center">
   <h1>srt-bilingualizer-llm</h1>
   <p><em>A Node.js CLI tool to add a second language line under each original line in an SRT subtitle file using a large language model (LLM).</em></p>
   <strong>Note:</strong> This project is half-vibe-coded.
</div>



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




## Features

- Adds a second language line (default: Chinese) directly under each English line in SRT subtitles
- Uses OpenAI (or compatible) LLM for translation
- CLI interface: `node app.js input.srt`
- Simple, hackable codebase (see notes below)

---

## How the Prompt Works (and How to Improve It)


**Current behavior:**
The prompt is designed to create a bilingual SRT file by adding a line of the second language (Chinese) **directly under** each English line.

**Why?**
This format is useful for language learners and for making subtitles that show both languages together. If you want a different output style (e.g., replace English, or use a different order), you must change the prompt in `app.js` (see the `AI_PROMPT` variable near the top).

**How to improve:**
- Edit the `AI_PROMPT` string in `app.js` to change the translation style, output format, or add extra instructions.
- Experiment with prompts for other languages, subtitle layouts, or formatting.

Pull requests for prompt improvements or new output modes are welcome!




## How SRT File Slicing Works (and How to Improve It)

**Current method:**
- Splits the file into blocks using blank lines (each block = one subtitle entry)
- Groups every 50 blocks into a chunk (see `MIN_BLOCKS_PER_CHUNK` in `app.js`)
- If the last chunk is too small, it merges it with the previous chunk

**Limitations:**
- Simple and may not always produce optimal chunking for translation quality or API limits
- Does not consider token count, subtitle timing, or language boundaries

**Want to improve it?**
- See the chunking logic in `app.js` (search for `MIN_BLOCKS_PER_CHUNK`)
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
Ensure the `repository` field in `package.json` is correct before publishing.



## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions, issues, and PRs are welcome!
