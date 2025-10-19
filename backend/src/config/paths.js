import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, '../../');
const ROOT_DIR = path.resolve(BACKEND_DIR, '..');

const PUBLIC_DIR = path.join(BACKEND_DIR, 'public');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');
const COMMENTS_AUDIO_DIR = path.join(PUBLIC_DIR, 'comments_audio');

const DATA_DIR = path.join(BACKEND_DIR, 'data');
const API_DIR = path.join(DATA_DIR, 'api');
const REPORTS_DIR = path.join(API_DIR, 'reports');

// Frontend public API data directory (existing JSON lists)
const FRONT_API_DIR = path.join(ROOT_DIR, 'frontend', 'public', 'api');

export const PATHS = {
  ROOT_DIR,
  BACKEND_DIR,
  PUBLIC_DIR,
  AUDIO_DIR,
  COMMENTS_AUDIO_DIR,
  DATA_DIR,
  API_DIR,
  REPORTS_DIR,
  FRONT_API_DIR
};

export function ensureAppPaths() {
  const dirs = [
    PUBLIC_DIR,
    AUDIO_DIR,
    COMMENTS_AUDIO_DIR,
    DATA_DIR,
    API_DIR,
    REPORTS_DIR
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
  const defaults = [
    { file: path.join(API_DIR, 'audios.json'), value: [] },
    { file: path.join(API_DIR, 'radio_comments.json'), value: {} },
    { file: path.join(API_DIR, 'podcast_comments.json'), value: {} },
    { file: path.join(REPORTS_DIR, 'audio_reports.json'), value: [] }
  ];
  for (const { file, value } of defaults) {
    if (!fs.existsSync(file)) {
      // Try to seed from frontend/public/api if available
      const basename = path.basename(file);
      const candidate = path.join(FRONT_API_DIR, basename);
      try {
        if (fs.existsSync(candidate)) {
          const raw = fs.readFileSync(candidate, 'utf8');
          fs.writeFileSync(file, raw);
          continue;
        }
      } catch {}
      fs.writeFileSync(file, JSON.stringify(value, null, 2));
    }
  }
}
