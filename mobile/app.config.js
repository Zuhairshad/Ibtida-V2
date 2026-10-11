// Extends app.json. Bundles every sound in assets/sounds with expo-notifications (so Android
// channels and iOS notifications can play them, and the Fajr alarm finds them in res/raw), and
// tells the app which ones exist through `extra.sounds`, so it only offers sounds that are there.
//
// Adhan recordings are not shipped in the repo. Add licensed recordings named
//   adhan_makkah.wav, adhan_madinah.wav, adhan_takbir.wav  (≤ 30 s for iOS notifications)
// to assets/sounds and rebuild; they then appear as choices automatically.
const fs = require('fs');
const path = require('path');

const SOUND_DIR = path.join(__dirname, 'assets', 'sounds');
const OK = /^[a-z0-9_]+\.(wav|mp3|ogg|caf|aiff)$/;

module.exports = ({ config }) => {
  const files = fs.existsSync(SOUND_DIR) ? fs.readdirSync(SOUND_DIR).filter(f => OK.test(f)).sort() : [];
  const plugins = (config.plugins || []).map(p => {
    const name = Array.isArray(p) ? p[0] : p;
    if (name !== 'expo-notifications') return p;
    const opts = Array.isArray(p) ? p[1] || {} : {};
    return ['expo-notifications', { ...opts, sounds: files.map(f => `./assets/sounds/${f}`) }];
  });
  return {
    ...config,
    plugins,
    extra: { ...config.extra, sounds: files },
  };
};
