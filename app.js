import fs from 'fs/promises';
import path from 'path';
// Use the official OpenAI SDK (installed via `npm install openai`)
import OpenAI from 'openai';

// --- CONFIGURATION ---
// Accept SRT file path as a command-line argument
const SRT_FILE_PATH = process.argv[2];

if (!SRT_FILE_PATH) {
    console.error('Usage: node app.js <input.srt>');
    process.exit(1);
}
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini-2025-08-07';
// Default to 4 minutes per attempt; allow environment override.
const OPENAI_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || '240000', 10); // 4 minutes default
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 3. This is the prompt that will be sent with each chunk of the subtitle.
const AI_PROMPT = `This is a partial subtitle file. Convert it into a bilingual version (English + Chinese).

Keep all English lines exactly as they are.
Add the Chinese translation directly under each English line.
For translation, you don’t need to follow the English line breaks rigidly—merge or split as needed so the Chinese reads naturally.
The timing does not need to match every English phrase precisely; prioritize accurate and coherent meaning.
Reply ONLY with the updated subtitle file content. No explanations, no greetings.`;


/**
 * Calls the OpenAI Responses API to get the bilingual translation.
 * Includes a retry mechanism with exponential backoff for robustness.
 * @param {string} srtChunk - A chunk of the SRT file content.
 * @param {number} maxRetries - The maximum number of times to retry the API call.
 * @returns {Promise<string>} The translated SRT chunk from the API.
 */
async function getAITranslation(srtChunk, maxRetries = 3) {
    if (!OPENAI_API_KEY) {
        throw new Error(
            'OpenAI API key is not set. Please set the environment variable OPENAI_API_KEY (or OPENAI_KEY) in your shell, e.g. `export OPENAI_API_KEY="your_key"`.'
        );
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Defensive preview of the chunk for logs
            let preview = '';
            try {
                const lines = srtChunk.split(/\r?\n/).filter(Boolean);
                preview = (lines[1] || lines[0] || '').substring(0, 120);
            } catch (e) {
                preview = '[unavailable]';
            }
            console.log(`  - Calling OpenAI (${OPENAI_MODEL}) for chunk preview: "${preview}..." (Attempt ${attempt})`);

            // Use the Responses API for simplicity and newer SDKs
            // Use AbortController to enforce a timeout for the SDK call. Grow the timeout
            // for subsequent retry attempts so slow responses can still complete.
            const controller = new AbortController();
            const perAttemptTimeout = OPENAI_TIMEOUT_MS * attempt; // 1x, 2x, 3x...
            const timeout = setTimeout(() => controller.abort(), perAttemptTimeout);
            let response;
            try {
                // Pass the AbortSignal as a request option (second arg) so it isn't sent
                // as a parameter to the API. Some SDK versions treat unknown keys inside
                // the request object as API parameters, causing a 400 unknown_parameter error.
                response = await openai.responses.create({
                    model: OPENAI_MODEL,
                    input: `${AI_PROMPT}\n\n${srtChunk}`,
                    // max_output_tokens: 2048,
                }, { signal: controller.signal });
            } finally {
                clearTimeout(timeout);
            }

            // Parse a few possible output shapes to be robust across SDK versions
            let translatedText = null;
            try {
                // Prefer the convenient `output_text` if present (single concatenated text)
                if (typeof response.output_text === 'string' && response.output_text.trim()) {
                    translatedText = response.output_text;
                }
                if (response.output && Array.isArray(response.output) && response.output.length > 0) {
                    // Each item may have a `content` array with text nodes
                    const first = response.output[0];
                    if (first.content && Array.isArray(first.content)) {
                        translatedText = first.content.map(c => c.text || (typeof c === 'string' ? c : '')).join('');
                    } else if (typeof first === 'string') {
                        translatedText = first;
                    }
                }
            } catch (parseErr) {
                console.warn('Warning: failed to parse OpenAI response shape:', parseErr && parseErr.message);
            }

            // Fallback: try older `choices` shape (chat completions)
            if (!translatedText && response.choices && response.choices[0]) {
                const msg = response.choices[0].message;
                if (typeof msg === 'string') translatedText = msg;
                else if (Array.isArray(msg?.content)) translatedText = msg.content.map(c => c.text || c).join('');
                else translatedText = msg?.content || null;
            }

            if (!translatedText) {
                console.warn('OpenAI response did not contain translated text. Full response:', JSON.stringify(response, null, 2));
                throw new Error('Invalid response format from OpenAI. No text found.');
            }

            return translatedText;

            } catch (error) {
            console.warn(`  - Attempt ${attempt} failed: ${error && error.message}`);
            if (error && error.message && error.message.includes('aborted')) {
                console.warn(`    The request was aborted after ${perAttemptTimeout / 1000}s. Increase OPENAI_TIMEOUT_MS or reduce chunk size if this recurs.`);
            }
            console.warn('    Error details:', {
                name: error && error.name,
                message: error && error.message,
                code: error && error.code,
                status: error && error.status,
                stack: error && error.stack,
            });

            if (attempt < maxRetries) {
                const delay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s...
                console.log(`  - Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`  - All ${maxRetries} attempts failed for this chunk. Aborting.`);
                throw error; // Re-throw the last error after all retries fail
            }
        }
    }
    throw new Error('Failed to get translation after all retries.');
}


/**
 * Main function to process the SRT file.
 */
async function processSrtFile() {
    try {
        console.log(`1. Reading SRT file from: ${SRT_FILE_PATH}`);
        const fileContent = await fs.readFile(SRT_FILE_PATH, 'utf-8');

        // Split the file by blank lines. SRT files use double newlines to separate blocks.
        // This regex handles both Windows (\r\n) and Unix (\n) line endings.
        const srtBlocks = fileContent.trim().split(/\r?\n\r?\n/).map(b => b.trim()).filter(Boolean);
        console.log(`2. Sliced the file into ${srtBlocks.length} blocks.`);

        // Create chunks where each chunk has at least MIN_BLOCKS_PER_CHUNK subtitle blocks.
        const MIN_BLOCKS_PER_CHUNK = 50;
        const chunks = [];
        for (let i = 0; i < srtBlocks.length; i += MIN_BLOCKS_PER_CHUNK) {
            const slice = srtBlocks.slice(i, i + MIN_BLOCKS_PER_CHUNK);
            chunks.push(slice);
        }
        // If the last chunk is smaller than MIN_BLOCKS_PER_CHUNK and there's a previous chunk,
        // merge it into the previous chunk so we don't send too-short final slices.
        if (chunks.length > 1) {
            const last = chunks[chunks.length - 1];
            if (last.length < MIN_BLOCKS_PER_CHUNK) {
                chunks[chunks.length - 2] = chunks[chunks.length - 2].concat(last);
                chunks.pop();
            }
        }

        console.log(`3. Prepared ${chunks.length} chunk(s) for translation (each >= ${MIN_BLOCKS_PER_CHUNK} blocks where possible).`);

        let updatedSrtContent = '';
        for (let c = 0; c < chunks.length; c++) {
            const chunkBlocks = chunks[c];
            const chunkText = chunkBlocks.join('\n\n');
            console.log(`- Processing chunk ${c + 1} of ${chunks.length} (contains ${chunkBlocks.length} blocks)`);
            try {
                const translatedChunk = await getAITranslation(chunkText);
                // Expect the model to return the whole updated subtitle content for that chunk.
                updatedSrtContent += translatedChunk.trim() + '\n\n';
            } catch (chunkError) {
                console.error(`\n--- FAILED TO PROCESS CHUNK ${c + 1} ---`);
                console.error(`This chunk had ${chunkBlocks.length} blocks.`);
                console.error('This chunk will be skipped. The final file may be incomplete.');
            }
        }

        // Determine the output file path
        const dir = path.dirname(SRT_FILE_PATH);
        const originalName = path.basename(SRT_FILE_PATH, '.srt');
        const newFileName = `${originalName}.zh-CN.srt`;
        const outputFilePath = path.join(dir, newFileName);
        
        console.log(`4. All blocks processed. Writing bilingual SRT to: ${outputFilePath}`);
        await fs.writeFile(outputFilePath, updatedSrtContent.trim());

        console.log('✅ Success! File has been translated and saved.');

    } catch (error) {
        console.error('\n❌ An unrecoverable error occurred:', error.message);
        if (error.code === 'ENOENT') {
            console.error(`Error: The file was not found at "${SRT_FILE_PATH}". Please check the path.`);
        }
    }
}

// Run the script
processSrtFile();