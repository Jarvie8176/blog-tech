/* global fetch, FormData, Blob, URL, AbortSignal, setTimeout */
import process from 'node:process';
import console from 'node:console';
import { readdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import mime from 'mime';
const require = createRequire(import.meta.url);
const { hash } = require('blake3-wasm');

const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const sha = process.env.RELEASE_SHA;
const projectName = 'blog-tech';
if (!token || !account || !/^[a-f0-9]{40}$/.test(sha ?? '')) {
  throw new Error('CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and RELEASE_SHA are required');
}
const secrets = new Set([token]);
async function api(path, { method = 'GET', body, auth = token } = {}) {
  const headers = { Authorization: `Bearer ${auth}` };
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(60000),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    let message = `${method} ${path}: HTTP ${response.status} ${JSON.stringify(data.errors?.map(({ code, message }) => ({ code, message })))}`;
    for (const secret of secrets) message = message.replaceAll(secret, '[redacted]');
    throw new Error(message);
  }
  return data.result;
}

const root = resolve('dist');
const entries = await readdir(root, { recursive: true, withFileTypes: true });
const manifest = {};
const assets = new Map();
for (const entry of entries.filter((entry) => entry.isFile())) {
  const path = join(entry.parentPath, entry.name);
  const name = path
    .slice(root.length + 1)
    .split('\\')
    .join('/');
  if (
    ['_headers', '_redirects', '_worker.js', '_routes.json'].includes(name) ||
    name.startsWith('functions/')
  ) {
    throw new Error(
      'This publisher accepts static artifacts only; review Functions or routing files separately',
    );
  }
  const content = await readFile(path);
  if (content.length > 25 * 1024 * 1024) throw new Error(`Pages asset too large: ${name}`);
  const value = content.toString('base64');
  const key = hash(value + extname(name).slice(1))
    .toString('hex')
    .slice(0, 32);
  manifest[`/${name}`] = key;
  assets.set(key, {
    key,
    value,
    metadata: { contentType: mime.getType(name) || 'application/octet-stream' },
    base64: true,
  });
}
if (!manifest['/index.html'] || Object.keys(manifest).length > 20000)
  throw new Error('Invalid static artifact');
const apiRoot = `/accounts/${account}/pages/projects/${projectName}`;
const project = await api(apiRoot);
if (project.production_branch !== 'main' || project.subdomain !== 'blog-tech-81q.pages.dev') {
  throw new Error('Unexpected Pages project or production branch');
}
const { jwt } = await api(`${apiRoot}/upload-token`);
secrets.add(jwt);
const hashes = [...assets.keys()];
const missing = new Set(
  await api('/pages/assets/check-missing', { method: 'POST', body: { hashes }, auth: jwt }),
);
let batch = [],
  bytes = 0;
async function upload() {
  if (!batch.length) return;
  await api('/pages/assets/upload', { method: 'POST', body: batch, auth: jwt });
  batch = [];
  bytes = 0;
}
for (const asset of assets.values()) {
  if (!missing.has(asset.key)) continue;
  const size = JSON.stringify(asset).length;
  if (batch.length && bytes + size > 20 * 1024 * 1024) await upload();
  batch.push(asset);
  bytes += size;
}
await upload();
await api('/pages/assets/upsert-hashes', { method: 'POST', body: { hashes }, auth: jwt });
const form = new FormData();
form.set('manifest', JSON.stringify(manifest));
form.set('branch', 'main');
form.set('commit_hash', sha);
form.set('commit_dirty', 'false');
form.set('commit_message', 'Publish verified main CI artifact');
const deployment = await api(`${apiRoot}/deployments`, { method: 'POST', body: form });
let state = deployment;
for (let attempt = 0; attempt < 12; attempt++) {
  if (state.latest_stage?.name === 'deploy' && state.latest_stage.status === 'success') break;
  if (state.latest_stage?.status === 'failure') throw new Error('Cloudflare deployment failed');
  await new Promise((resolve) => setTimeout(resolve, 5000));
  state = await api(`${apiRoot}/deployments/${deployment.id}`);
}
if (state.latest_stage?.name !== 'deploy' || state.latest_stage.status !== 'success') {
  throw new Error('Deployment did not reach success within one minute');
}
const canonical = (await api(apiRoot)).canonical_deployment;
if (
  canonical?.id !== deployment.id ||
  canonical.deployment_trigger?.metadata?.commit_hash !== sha
) {
  throw new Error('Canonical deployment does not match the verified source');
}
const publicUrl = 'https://blog.fnpg.me/tech/';
// A release-specific origin prevents cached HTML from a previous Pages alias
// surviving a publish (including deleted routes and the search entry manifest).
const deploymentOrigin = new URL(deployment.url);
if (
  deploymentOrigin.protocol !== 'https:' ||
  !/^[a-z0-9]+\.blog-tech-81q\.pages\.dev$/.test(deploymentOrigin.hostname)
)
  throw new Error('Unexpected immutable Pages deployment origin');
const settingsPath = `/accounts/${account}/workers/scripts/blog-tech-gateway/settings`;
const settings = await api(settingsPath);
const binding = settings.bindings?.[0];
if (
  settings.bindings?.length !== 1 ||
  binding?.name !== 'TECH_ORIGIN' ||
  binding.type !== 'plain_text'
) {
  throw new Error('Unexpected gateway bindings; review before publishing');
}
const gatewaySettings = new FormData();
gatewaySettings.set(
  'settings',
  new Blob(
    [
      JSON.stringify({
        bindings: [{ ...binding, text: deploymentOrigin.origin }],
      }),
    ],
    { type: 'application/json' },
  ),
  'settings.json',
);
await api(settingsPath, { method: 'PATCH', body: gatewaySettings });
if ((await api(settingsPath)).bindings?.[0]?.text !== deploymentOrigin.origin) {
  throw new Error('Gateway origin update did not persist');
}
let publicMatches = false;
for (let attempt = 0; attempt < 12; attempt++) {
  const check = await fetch(publicUrl, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  const html = await check.text();
  if (
    check.status === 200 &&
    html.includes('lang="zh-Hans"') &&
    html.includes(`/commit/${sha}`) &&
    !check.headers.get('x-robots-tag')?.includes('noindex')
  ) {
    publicMatches = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
if (!publicMatches) throw new Error('Public gateway did not serve the verified source');
const receipt = {
  source_sha: sha,
  pages_project: projectName,
  deployment_id: deployment.id,
  deployment_url: deployment.url,
  public_url: publicUrl,
  previous_deployment_id: project.canonical_deployment?.id ?? null,
  gateway_origin: deploymentOrigin.origin,
  previous_gateway_origin: binding.text,
  files: Object.keys(manifest).length,
  manifest_sha256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
};
await writeFile('cloudflare-deployment.json', JSON.stringify(receipt, null, 2) + '\n');
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `url=${publicUrl}\n`);
console.log(JSON.stringify(receipt, null, 2));
