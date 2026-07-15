/*
 * InfiAssess code runner.
 *
 * Endpoints:
 *   GET  /health                      → { ok, languages }
 *   POST /run    {language,code,stdin} → { ok, stage, stdout, stderr, exitCode, timedOut }
 *   POST /batch  {language,code,inputs:[..]} → compile ONCE, run each input
 *                                       → { ok, stage, compileError, results:[{stdout,...}] }
 *   POST /tests  {token,key,tests:[{input,output}]} → store hidden test cases (admin push)
 *   POST /grade  {key,language,code}   → run code vs stored tests → { passed, total }
 *                                       (never returns the test-case contents)
 *
 * ⚠️  Executes untrusted code — run behind the hardened container (read-only FS,
 * dropped caps, limits). NOT a full sandbox; block egress before public exposure.
 */
const http = require('http')
const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const PORT = process.env.RUNNER_PORT || 5055
const ADMIN_TOKEN = process.env.RUNNER_ADMIN_TOKEN || 'infiassess-runner-admin'
const RUN_TIMEOUT_MS = 5000
const COMPILE_TIMEOUT_MS = 10000
const MAX_OUTPUT = 100 * 1024

// Test cases pushed by the admin: { key: [{input, output}] }.
// Persisted to disk (RUNNER_DATA_DIR, a mounted volume in Docker) so they
// survive restarts. Falls back to in-memory if the dir isn't writable.
const DATA_DIR = process.env.RUNNER_DATA_DIR || path.join(os.tmpdir(), 'infiassess-runner')
const TESTS_FILE = path.join(DATA_DIR, 'tests.json')

function loadTests() {
  try { return JSON.parse(fs.readFileSync(TESTS_FILE, 'utf8')) } catch { return {} }
}
function persistTests() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(TESTS_FILE, JSON.stringify(TESTS))
  } catch (e) {
    console.warn('[infiassess-runner] could not persist tests:', e.message)
  }
}

const TESTS = loadTests()

const LANGS = {
  python: { file: 'main.py', run: ['python3', 'main.py'] },
  javascript: { file: 'main.js', run: ['node', 'main.js'] },
  c: { file: 'main.c', compile: ['cc', 'main.c', '-o', 'main', '-lm'], run: ['./main'] },
  cpp: { file: 'main.cpp', compile: ['c++', 'main.cpp', '-o', 'main'], run: ['./main'] },
  java: { file: 'Main.java', compile: ['javac', 'Main.java'], run: ['java', 'Main'] },
}

function json(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(obj))
}

function runProcess(cmd, args, { cwd, stdin, timeout }) {
  return new Promise(resolve => {
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let child
    try {
      child = spawn(cmd, args, { cwd })
    } catch (e) {
      return resolve({ stdout: '', stderr: String(e.message), code: -1, timedOut: false, spawnError: true })
    }
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL') }, timeout)
    child.stdout.on('data', d => { if (stdout.length < MAX_OUTPUT) stdout += d.toString() })
    child.stderr.on('data', d => { if (stderr.length < MAX_OUTPUT) stderr += d.toString() })
    child.on('error', e => { clearTimeout(timer); resolve({ stdout, stderr: stderr || String(e.message), code: -1, timedOut, spawnError: true }) })
    child.on('close', code => { clearTimeout(timer); resolve({ stdout, stderr, code, timedOut }) })
    if (stdin != null) { try { child.stdin.write(stdin) } catch (e) { /* ignore */ } }
    try { child.stdin.end() } catch (e) { /* ignore */ }
  })
}

// Write source + compile once. Returns { dir, spec, compileError } (compileError set on failure).
async function prepare(language, code) {
  const spec = LANGS[language]
  if (!spec) throw new Error(`Unsupported language: ${language}`)
  if (typeof code !== 'string' || !code.trim()) throw new Error('No code provided')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iarun-'))
  fs.writeFileSync(path.join(dir, spec.file), code)
  let compileError = null
  if (spec.compile) {
    const c = await runProcess(spec.compile[0], spec.compile.slice(1), { cwd: dir, timeout: COMPILE_TIMEOUT_MS })
    if (c.spawnError) compileError = `Toolchain unavailable: ${c.stderr}`
    else if (c.code !== 0) compileError = c.stderr || 'Compilation failed'
  }
  return { dir, spec, compileError }
}

function execOnce(dir, spec, stdin) {
  return runProcess(spec.run[0], spec.run.slice(1), { cwd: dir, stdin, timeout: RUN_TIMEOUT_MS })
}

function cleanup(dir) { fs.rm(dir, { recursive: true, force: true }, () => {}) }

async function handleRun(p, res) {
  let prep
  try { prep = await prepare(p.language, p.code) } catch (e) { return json(res, 400, { error: e.message }) }
  try {
    if (prep.compileError) return json(res, 200, { ok: false, stage: 'compile', stderr: prep.compileError, stdout: '' })
    const r = await execOnce(prep.dir, prep.spec, p.stdin || '')
    return json(res, 200, { ok: !r.timedOut && r.code === 0, stage: 'run', stdout: r.stdout, stderr: r.stderr, exitCode: r.code, timedOut: r.timedOut })
  } finally { cleanup(prep.dir) }
}

// Compile once, run every input.
async function handleBatch(p, res) {
  let prep
  try { prep = await prepare(p.language, p.code) } catch (e) { return json(res, 400, { error: e.message }) }
  try {
    if (prep.compileError) return json(res, 200, { ok: false, stage: 'compile', compileError: prep.compileError, results: [] })
    const inputs = Array.isArray(p.inputs) ? p.inputs : []
    const results = []
    for (const stdin of inputs) {
      const r = await execOnce(prep.dir, prep.spec, stdin || '')
      results.push({ stdout: r.stdout, stderr: r.stderr, exitCode: r.code, timedOut: r.timedOut })
    }
    return json(res, 200, { ok: true, stage: 'run', results })
  } finally { cleanup(prep.dir) }
}

// Grade against stored (hidden) test cases; returns only pass/total.
async function handleGrade(p, res) {
  const tests = TESTS[p.key]
  if (!Array.isArray(tests)) return json(res, 200, { graded: false, reason: 'no-tests', passed: 0, total: 0 })
  let prep
  try { prep = await prepare(p.language, p.code) } catch (e) { return json(res, 200, { graded: false, reason: e.message, passed: 0, total: tests.length }) }
  try {
    if (prep.compileError) return json(res, 200, { graded: true, passed: 0, total: tests.length, compileError: true })
    let passed = 0
    for (const tc of tests) {
      const r = await execOnce(prep.dir, prep.spec, tc.input || '')
      if (!r.timedOut && String(r.stdout).trim() === String(tc.output).trim()) passed++
    }
    return json(res, 200, { graded: true, passed, total: tests.length })
  } finally { cleanup(prep.dir) }
}

function handleTests(p, res) {
  if (p.token !== ADMIN_TOKEN) return json(res, 403, { error: 'forbidden' })
  if (!p.key || !Array.isArray(p.tests)) return json(res, 400, { error: 'key and tests required' })
  TESTS[p.key] = p.tests.map(t => ({ input: String(t.input || ''), output: String(t.output || '') }))
  persistTests()
  return json(res, 200, { ok: true, key: p.key, count: TESTS[p.key].length })
}

const ROUTES = { '/run': handleRun, '/batch': handleBatch, '/grade': handleGrade, '/tests': handleTests }

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, languages: Object.keys(LANGS) })
  if (req.method === 'POST' && ROUTES[req.url]) {
    let body = ''
    req.on('data', d => { body += d; if (body.length > 4 * 1024 * 1024) req.destroy() })
    req.on('end', () => {
      let p
      try { p = JSON.parse(body) } catch { return json(res, 400, { error: 'Invalid JSON' }) }
      Promise.resolve(ROUTES[req.url](p, res)).catch(e => json(res, 500, { error: String(e.message) }))
    })
    return
  }
  json(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`[infiassess-runner] http://localhost:${PORT}  languages=${Object.keys(LANGS).join(',')}  data=${DATA_DIR}  loadedKeys=${Object.keys(TESTS).length}`)
})
