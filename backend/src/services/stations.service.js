import fs from 'fs';
import path from 'path';
import { PATHS } from '../config/paths.js';

export function readStationsList() {
  const candidates = [
    path.join(PATHS.FRONT_API_DIR, 'stations.json'),
    path.join(PATHS.API_DIR, 'stations.json')
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const list = JSON.parse(raw || '[]');
        return Array.isArray(list) ? list : [];
      }
    } catch {}
  }
  return [];
}
