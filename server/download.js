import { createServer } from 'http';
import { spawn } from 'child_process';
import { readdir } from 'fs/promises';
import { join, resolve } from 'path';

const AUDIO_DIR = resolve('public/audio');
const PORT = 3001;

const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // List downloaded files
  if (req.method === 'GET' && req.url === '/api/audio/list') {
    try {
      const files = await readdir(AUDIO_DIR);
      const audioFiles = files.filter(f => /\.(m4a|webm|opus|mp3|wav|ogg)$/i.test(f));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(audioFiles));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
    return;
  }

  // Download audio from YouTube
  if (req.method === 'POST' && req.url === '/api/audio/download') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { url } = JSON.parse(body);
        if (!url || typeof url !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url' }));
          return;
        }

        // Validate it's a YouTube URL
        if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not a YouTube URL' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });

        // yt-dlp: extract best audio, no conversion needed
        const args = [
          '-f', 'bestaudio',
          '--no-playlist',
          '-o', join(AUDIO_DIR, '%(title)s.%(ext)s'),
          '--progress',
          '--newline',
          url
        ];

        const proc = spawn('yt-dlp', args);

        proc.stdout.on('data', (data) => {
          const line = data.toString().trim();
          if (line) {
            res.write(`data: ${JSON.stringify({ status: 'progress', message: line })}\n\n`);
          }
        });

        proc.stderr.on('data', (data) => {
          const line = data.toString().trim();
          if (line) {
            res.write(`data: ${JSON.stringify({ status: 'progress', message: line })}\n\n`);
          }
        });

        proc.on('close', async (code) => {
          if (code === 0) {
            // Find the newest file in the audio dir
            const files = await readdir(AUDIO_DIR);
            const audioFiles = files.filter(f => /\.(m4a|webm|opus|mp3|wav|ogg)$/i.test(f));
            res.write(`data: ${JSON.stringify({ status: 'done', files: audioFiles })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ status: 'error', message: `yt-dlp exited with code ${code}` })}\n\n`);
          }
          res.end();
        });

        proc.on('error', (err) => {
          res.write(`data: ${JSON.stringify({ status: 'error', message: err.message })}\n\n`);
          res.end();
        });

      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Audio download server running on http://localhost:${PORT}`);
});
