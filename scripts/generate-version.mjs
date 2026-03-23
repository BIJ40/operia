import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const isoBuildTime = now.toISOString();
const generatedVersion = `${now.getUTCFullYear()}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
const version = process.env.APP_VERSION || generatedVersion;
const codename = process.env.APP_CODENAME || "Centre d'aide — Refonte UX & Permissions";

const versionTsPath = resolve('src/config/version.ts');
const versionJsonPath = resolve('public/version.json');

const versionTsContent = [
  `export const APP_VERSION = ${JSON.stringify(version)};`,
  `export const APP_BUILD_TIME = ${JSON.stringify(isoBuildTime)};`,
  `export const APP_CODENAME = ${JSON.stringify(codename)};`,
  '',
].join('\n');

const versionJsonContent = `${JSON.stringify({ version, buildTime: isoBuildTime }, null, 2)}\n`;

mkdirSync(dirname(versionTsPath), { recursive: true });
mkdirSync(dirname(versionJsonPath), { recursive: true });

writeFileSync(versionTsPath, versionTsContent, 'utf8');
writeFileSync(versionJsonPath, versionJsonContent, 'utf8');

console.log(`[version] ${version} (${isoBuildTime})`);
