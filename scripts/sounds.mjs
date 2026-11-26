// Converts Kenney Casino Audio die impacts (OGG) to M4A/AAC, which every iPhone decodes.
// Usage: npm run sounds -- <folder with die-throw-1..4.ogg>
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const src = process.argv[2];
if (!src) throw new Error('usage: npm run sounds -- <folder with die-throw-1..4.ogg>');
for (let i = 1; i <= 4; i++) {
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', `${src}/die-throw-${i}.ogg`, '-ac', '1', '-c:a', 'aac', '-b:a', '96k', `public/sounds/die-${i}.m4a`]);
}
