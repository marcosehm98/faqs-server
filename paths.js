const path = require('path');
const fs   = require('fs');

const IS_PKG = typeof process.pkg !== 'undefined';

/** Carpeta escribible junto al .exe (o raíz del proyecto en desarrollo). */
function appDir() {
  return IS_PKG ? path.dirname(process.execPath) : __dirname;
}

/** Raíz de archivos empaquetados (snapshot pkg) o del proyecto. */
function rootDir() {
  return __dirname;
}

function envPath() {
  return path.join(appDir(), '.env');
}

function uploadsDir() {
  return path.join(appDir(), 'uploads');
}

function dataDir() {
  return path.join(appDir(), 'data');
}

function envExampleBeside() {
  return path.join(appDir(), '.env.example');
}

function envExampleBundled() {
  return path.join(rootDir(), '.env.example');
}

function resolveEnvExample() {
  if (fs.existsSync(envExampleBeside())) return envExampleBeside();
  if (fs.existsSync(envExampleBundled())) return envExampleBundled();
  return null;
}

function assetPath(...segments) {
  const beside = path.join(appDir(), ...segments);
  if (fs.existsSync(beside)) return beside;
  return path.join(rootDir(), ...segments);
}

function ensureRuntimeDirs() {
  [uploadsDir(), dataDir()].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function ensureEnvFile() {
  const target = envPath();
  if (fs.existsSync(target)) return false;
  const example = resolveEnvExample();
  if (example) {
    fs.copyFileSync(example, target);
    return true;
  }
  const template = [
    'PORT=3010',
    'BASE_PATH=/faqs-logihub',
    'ADMIN_EMAIL=admin@faq.local',
    'ADMIN_PASSWORD=admin123',
    'ADMIN_NAME=Administrador',
    'DATABASE_URL=mysql+pymysql://usuario:password@host:3306/faq_db?charset=utf8mb4',
    ''
  ].join('\n');
  fs.writeFileSync(target, template, 'utf8');
  return true;
}

module.exports = {
  isPkg: IS_PKG,
  appDir,
  rootDir,
  envPath,
  uploadsDir,
  dataDir,
  ensureRuntimeDirs,
  ensureEnvFile,
  assetPath
};
