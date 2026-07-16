import { db, auth } from '../firebase'
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp, where, onSnapshot, writeBatch
} from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

function isFirebaseConfigured() {
  try {
    return auth.app.options.apiKey !== 'YOUR_API_KEY'
  } catch {
    return false
  }
}

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export const firebaseService = {
  // ---- AUTH ----
  async adminLogin(email, password) {
    if (isFirebaseConfigured()) {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    }
    // Fallback: hardcoded admin
    if (email === 'admin@infiassess.com' && password === 'Admin@123') {
      localStorage.setItem('ia_admin', 'true')
      localStorage.setItem('ia_admin_email', email)
      return true
    }
    throw new Error('Invalid credentials')
  },

  async adminLogout() {
    if (isFirebaseConfigured()) {
      await signOut(auth)
    }
    localStorage.removeItem('ia_admin')
    localStorage.removeItem('ia_admin_email')
  },

  isAdminLoggedIn() {
    if (isFirebaseConfigured()) {
      return !!auth.currentUser
    }
    return !!localStorage.getItem('ia_admin')
  },

  // Resolves once Firebase auth state is known (currentUser is null on fresh
  // load until rehydration). Use this to guard admin pages.
  ensureAdmin() {
    if (!isFirebaseConfigured()) {
      return Promise.resolve(!!localStorage.getItem('ia_admin'))
    }
    return new Promise(resolve => {
      const unsub = onAuthStateChanged(auth, user => { unsub(); resolve(!!user) })
    })
  },

  // ---- ORG METHODS ----
  async getOrgs() {
    if (isFirebaseConfigured()) {
      const snap = await getDocs(collection(db, 'orgs'))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    }
    const raw = localStorage.getItem('ia_orgs')
    return raw ? JSON.parse(raw) : []
  },

  async getOrg(orgSlug) {
    if (isFirebaseConfigured()) {
      const snap = await getDocs(query(collection(db, 'orgs'), where('slug', '==', orgSlug)))
      if (snap.empty) return null
      const d = snap.docs[0]
      return { id: d.id, ...d.data() }
    }
    const raw = localStorage.getItem(`ia_org_${orgSlug}`)
    if (raw) return JSON.parse(raw)
    // Return mock for dev
    return {
      id: orgSlug,
      name: orgSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      round1Timer: 45,
      round2Timer: 60,
      placementDate: new Date().toISOString().slice(0, 10),
      round1Active: true,
      round2Active: false,
    }
  },

  async createOrg({ name, slug, round1Timer, round2Timer, placementDate }) {
    const org = { name, slug, round1Timer: round1Timer || 45, round2Timer: round2Timer || 60, placementDate: placementDate || new Date().toISOString().slice(0, 10), round1Active: true, round2Active: false, createdAt: Date.now() }
    if (isFirebaseConfigured()) {
      const ref = await addDoc(collection(db, 'orgs'), { ...org, createdAt: serverTimestamp() })
      return { id: ref.id, ...org }
    }
    const orgs = await this.getOrgs()
    const newOrg = { ...org, id: slug }
    orgs.push(newOrg)
    localStorage.setItem('ia_orgs', JSON.stringify(orgs))
    localStorage.setItem(`ia_org_${slug}`, JSON.stringify(newOrg))
    return newOrg
  },

  async updateOrg(orgId, updates) {
    if (isFirebaseConfigured()) {
      await updateDoc(doc(db, 'orgs', orgId), updates)
      return updates
    }
    const orgs = await this.getOrgs()
    const idx = orgs.findIndex(o => o.id === orgId)
    if (idx >= 0) {
      orgs[idx] = { ...orgs[idx], ...updates }
      localStorage.setItem('ia_orgs', JSON.stringify(orgs))
      localStorage.setItem(`ia_org_${orgId}`, JSON.stringify(orgs[idx]))
    }
  },

  async deleteOrg(orgId) {
    if (isFirebaseConfigured()) {
      await deleteDoc(doc(db, 'orgs', orgId))
      return
    }
    const orgs = await this.getOrgs()
    localStorage.setItem('ia_orgs', JSON.stringify(orgs.filter(o => o.id !== orgId)))
    localStorage.removeItem(`ia_org_${orgId}`)
  },

  // ---- DRIVES (placement drives under a college/org) ----
  // A college (org) can run many placement drives. Each drive has its own
  // Round 1 questions, timer, placement date and unique assessment URL.
  async getDrives(orgId) {
    if (isFirebaseConfigured()) {
      const snap = await getDocs(collection(db, 'orgs', orgId, 'drives'))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    }
    const raw = localStorage.getItem(`ia_drives_${orgId}`)
    return raw ? JSON.parse(raw) : []
  },

  async getDrive(orgId, driveId) {
    if (isFirebaseConfigured()) {
      const snap = await getDoc(doc(db, 'orgs', orgId, 'drives', driveId))
      return snap.exists() ? { id: snap.id, ...snap.data() } : null
    }
    const drives = await this.getDrives(orgId)
    return drives.find(d => d.id === driveId) || null
  },

  async createDrive(orgId, { name, placementDate, round1Timer, round2Timer }) {
    const date = placementDate || new Date().toISOString().slice(0, 10)
    const baseId = `${slugify(name) || 'drive'}-${date.replace(/[^0-9]/g, '')}`
    const drive = {
      name, placementDate: date,
      round1Timer: round1Timer || 45, round2Timer: round2Timer || 60,
      round1Counts: { logical: 10, problem: 10, coding: 5 }, // questions served per section
      round1Active: true, round2Active: false, createdAt: Date.now(),
    }
    if (isFirebaseConfigured()) {
      await setDoc(doc(db, 'orgs', orgId, 'drives', baseId), drive)
      return { id: baseId, ...drive }
    }
    const drives = await this.getDrives(orgId)
    let id = baseId, n = 1
    while (drives.find(d => d.id === id)) id = `${baseId}-${++n}`
    drives.push({ id, ...drive })
    localStorage.setItem(`ia_drives_${orgId}`, JSON.stringify(drives))
    return { id, ...drive }
  },

  async updateDrive(orgId, driveId, updates) {
    if (isFirebaseConfigured()) {
      await updateDoc(doc(db, 'orgs', orgId, 'drives', driveId), updates)
      return
    }
    const drives = await this.getDrives(orgId)
    const idx = drives.findIndex(d => d.id === driveId)
    if (idx >= 0) {
      drives[idx] = { ...drives[idx], ...updates }
      localStorage.setItem(`ia_drives_${orgId}`, JSON.stringify(drives))
    }
  },

  async deleteDrive(orgId, driveId) {
    const scope = `${orgId}__${driveId}`
    if (isFirebaseConfigured()) {
      // Delete subcollections first (Firestore doesn't cascade) so answer keys
      // and candidate data don't linger orphaned.
      for (const sub of ['questions', 'answers', 'meta', 'candidates']) {
        const snap = await getDocs(collection(db, 'orgs', orgId, 'drives', driveId, sub))
        for (const d of snap.docs) await deleteDoc(d.ref)
      }
      await deleteDoc(doc(db, 'orgs', orgId, 'drives', driveId))
      return
    }
    const drives = await this.getDrives(orgId)
    localStorage.setItem(`ia_drives_${orgId}`, JSON.stringify(drives.filter(d => d.id !== driveId)))
    localStorage.removeItem(`ia_dq_${scope}`)
    localStorage.removeItem(`ia_dqa_${scope}`)
    localStorage.removeItem(`ia_dc_${scope}`)
    localStorage.removeItem(`ia_dp_${scope}`)
  },

  // ---- QUESTIONS (per drive) ----
  // Correct answers are stored in a SEPARATE `answers` collection that
  // candidates cannot read — so they never reach the candidate's browser.
  // `questions` (public) holds everything except answer keys.

  // Candidate-facing: questions WITHOUT answer keys.
  async getDriveQuestions(orgId, driveId) {
    const strip = q => { const c = { ...q }; delete c.correctAnswer; delete c.correctAnswers; delete c.answerKey; delete c.testCases; return c }
    if (isFirebaseConfigured()) {
      const snap = await getDocs(query(collection(db, 'orgs', orgId, 'drives', driveId, 'questions'), orderBy('order')))
      return snap.docs.map(d => strip({ id: d.id, ...d.data() }))
    }
    const raw = localStorage.getItem(`ia_dq_${orgId}__${driveId}`)
    return (raw ? JSON.parse(raw) : []).map(strip)
  },

  async getRound1Questions(orgId, driveId) {
    return this.getDriveQuestions(orgId, driveId)
  },

  // Admin-facing: questions merged with their answer keys (for grading/editing).
  async getQuestionsWithAnswers(orgId, driveId) {
    if (isFirebaseConfigured()) {
      const qSnap = await getDocs(query(collection(db, 'orgs', orgId, 'drives', driveId, 'questions'), orderBy('order')))
      const aSnap = await getDocs(collection(db, 'orgs', orgId, 'drives', driveId, 'answers'))
      const ans = {}
      aSnap.docs.forEach(d => { ans[d.id] = d.data() })
      return qSnap.docs.map(d => ({ id: d.id, ...d.data(), ...(ans[d.id] || {}) }))
    }
    const rawQ = JSON.parse(localStorage.getItem(`ia_dq_${orgId}__${driveId}`) || '[]')
    const ans = JSON.parse(localStorage.getItem(`ia_dqa_${orgId}__${driveId}`) || '{}')
    return rawQ.map(q => ({ ...q, ...(ans[q.id] || {}) }))
  },

  async saveDriveQuestions(orgId, driveId, questions) {
    // `testCases` is the coding answer key (incl. hidden cases) → answers only.
    const ANSWER_FIELDS = ['correctAnswer', 'correctAnswers', 'answerKey', 'testCases']
    const publicQs = questions.map(q => {
      const c = { ...q }
      // Candidates may see only the VISIBLE test cases (input + expected output).
      if (Array.isArray(q.testCases)) {
        c.visibleTestCases = q.testCases
          .filter(tc => tc.visible)
          .map(tc => ({ input: tc.input, output: tc.output }))
      }
      ANSWER_FIELDS.forEach(f => delete c[f])
      return c
    })
    const answers = {}
    questions.forEach(q => {
      const a = {}
      ANSWER_FIELDS.forEach(f => { if (q[f] !== undefined) a[f] = q[f] })
      answers[q.id] = a
    })
    if (isFirebaseConfigured()) {
      const qCol = collection(db, 'orgs', orgId, 'drives', driveId, 'questions')
      const aCol = collection(db, 'orgs', orgId, 'drives', driveId, 'answers')
      // Batched writes — far faster than sequential setDoc/deleteDoc and atomic
      // per chunk (Firestore caps a batch at 500 ops, so chunk at 450).
      const ops = []
      for (const d of (await getDocs(qCol)).docs) ops.push(b => b.delete(d.ref))
      for (const d of (await getDocs(aCol)).docs) ops.push(b => b.delete(d.ref))
      for (const q of publicQs) {
        const { id, ...data } = q
        const qid = id || `q_${Date.now()}_${Math.floor(Math.random() * 1e4)}`
        ops.push(b => b.set(doc(db, 'orgs', orgId, 'drives', driveId, 'questions', qid), data))
        ops.push(b => b.set(doc(db, 'orgs', orgId, 'drives', driveId, 'answers', qid), answers[q.id] || {}))
      }
      for (let i = 0; i < ops.length; i += 450) {
        const batch = writeBatch(db)
        ops.slice(i, i + 450).forEach(fn => fn(batch))
        await batch.commit()
      }
      return questions
    }
    localStorage.setItem(`ia_dq_${orgId}__${driveId}`, JSON.stringify(publicQs))
    localStorage.setItem(`ia_dqa_${orgId}__${driveId}`, JSON.stringify(answers))
    return questions
  },

  // Map a question's language string to the runner's language id.
  runnerLang(lang) {
    const m = {
      c: 'c', 'c++': 'cpp', cpp: 'cpp', java: 'java',
      python: 'python', python3: 'python', py: 'python',
      javascript: 'javascript', js: 'javascript', node: 'javascript', nodejs: 'javascript',
    }
    return m[String(lang || '').trim().toLowerCase()] || 'python'
  },

  // Admin grading: run the code ONCE-compiled against all test cases (/batch),
  // returning per-case detail (admin can see hidden inputs/expected).
  // Returns { passed, total, results:[{ visible, input, expected, actual, passed, error }] }.
  async gradeCoding(runnerUrl, question, code, language) {
    const tests = Array.isArray(question.testCases) ? question.testCases : []
    if (!tests.length) return { passed: 0, total: 0, results: [] }
    if (!code || !code.trim()) {
      return { passed: 0, total: tests.length, results: tests.map(tc => ({ visible: !!tc.visible, input: tc.input, expected: tc.output, actual: '', passed: false, error: 'No code submitted' })) }
    }
    let data
    try {
      const resp = await fetch(`${runnerUrl}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code, inputs: tests.map(tc => tc.input) }),
      })
      data = await resp.json()
    } catch (e) {
      return { passed: 0, total: tests.length, results: tests.map(tc => ({ visible: !!tc.visible, input: tc.input, expected: tc.output, actual: '', passed: false, error: 'Runner not reachable' })) }
    }
    if (data.compileError) {
      return { passed: 0, total: tests.length, results: tests.map(tc => ({ visible: !!tc.visible, input: tc.input, expected: tc.output, actual: '', passed: false, error: 'Compilation failed' })) }
    }
    let passed = 0
    const results = tests.map((tc, i) => {
      const r = (data.results && data.results[i]) || {}
      const error = r.timedOut ? 'Timed out' : (r.stderr && r.exitCode !== 0 ? 'Runtime error' : '')
      const ok = !r.timedOut && String(r.stdout || '').trim() === String(tc.output).trim()
      if (ok) passed++
      return { visible: !!tc.visible, input: tc.input, expected: tc.output, actual: r.stdout || '', passed: ok, error }
    })
    return { passed, total: tests.length, results }
  },

  // Push a question's hidden test cases to the runner so it can grade candidate
  // submissions without the test cases ever reaching the candidate's browser.
  async pushTestsToRunner(runnerUrl, token, key, testCases) {
    const tests = (Array.isArray(testCases) ? testCases : []).map(tc => ({ input: tc.input, output: tc.output }))
    const resp = await fetch(`${runnerUrl}/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, key, tests }),
    })
    return resp.json()
  },

  // Candidate-flow grading: runner grades against the tests IT holds and returns
  // ONLY pass/total (never the test-case contents). { graded, passed, total }.
  async gradeCodingViaRunner(runnerUrl, key, language, code) {
    const resp = await fetch(`${runnerUrl}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, language, code }),
    })
    return resp.json()
  },

  // Marks per question type.
  MARKS: { single: 1, mcq: 1, code: 5 },

  // Round 1 sections (fixed order). Each drive's questions carry a `section` key.
  sections: [
    { key: 'logical', label: 'Logical Reasoning' },
    { key: 'problem', label: 'Problem Solving' },
    { key: 'coding', label: 'Short Coding' },
  ],

  // Validate & normalize an uploaded questions JSON array into the internal shape.
  // Accepts TWO formats:
  //  (a) Topic MCQ: { id, topic, difficulty, question, options:{A,B,C,D}, answer:"A" }
  //  (b) Generic:   { text, type, options:[...], correctAnswer / correctAnswers, starterCode }
  // `section` tags every question with the section it belongs to.
  normalizeQuestionsJson(raw, section = 'logical') {
    if (!Array.isArray(raw)) throw new Error('JSON root must be an array of questions')
    if (raw.length === 0) throw new Error('JSON array is empty — no questions found')
    const validTypes = ['single', 'mcq', 'text', 'code']
    return raw.map((q, i) => {
      const n = i + 1
      if (!q || typeof q !== 'object') throw new Error(`Question ${n}: must be an object`)

      // ── Format (a): { question, options: {A..}, answer } ──
      const isTopicMcq = typeof q.question === 'string' && q.options && typeof q.options === 'object' && !Array.isArray(q.options)
      if (isTopicMcq) {
        const text = q.question.trim()
        if (!text) throw new Error(`Question ${n}: missing "question"`)
        const keys = Object.keys(q.options)
        if (keys.length < 2) throw new Error(`Question ${n}: "options" needs at least 2 entries`)
        const options = keys.map(k => String(q.options[k]))
        const correctAnswer = (q.answer != null && q.options[q.answer] != null) ? String(q.options[q.answer]) : null
        return {
          id: q.id != null ? `q_${section}_${q.id}` : `q_${section}_${Date.now()}_${i}`,
          section, text, type: 'single', order: q.order || n,
          options, correctAnswer,
          answerKey: q.answer != null ? String(q.answer) : null,
          topic: q.topic || '', difficulty: q.difficulty || '',
        }
      }

      // ── Format (c): coding challenge { question, language, inputFormat, sampleInput, ... } ──
      const isCoding = typeof q.question === 'string' &&
        (section === 'coding' || q.sampleInput != null || q.inputFormat != null || (q.language != null && !q.options))
      if (isCoding) {
        const text = q.question.trim()
        if (!text) throw new Error(`Question ${n}: missing "question"`)
        const testCases = Array.isArray(q.testCases)
          ? q.testCases.map((tc, ti) => {
              if (!tc || typeof tc !== 'object') throw new Error(`Question ${n}, test case ${ti + 1}: must be an object`)
              return {
                input: String(tc.input != null ? tc.input : ''),
                output: String(tc.output != null ? tc.output : ''),
                visible: !!tc.visible,
              }
            })
          : []
        return {
          id: q.id != null ? `q_${section}_${q.id}` : `q_${section}_${Date.now()}_${i}`,
          section, text, type: 'code', order: q.order || n,
          language: q.language || '',
          topic: q.topic || '', difficulty: q.difficulty || '',
          inputFormat: q.inputFormat || '', outputFormat: q.outputFormat || '',
          constraints: q.constraints || '',
          sampleInput: q.sampleInput || '', sampleOutput: q.sampleOutput || '',
          starterCode: typeof q.starterCode === 'string' ? q.starterCode : '',
          testCases,
        }
      }

      // ── Format (b): generic ──
      if (typeof q.text !== 'string' || !q.text.trim()) throw new Error(`Question ${n}: missing "text" (or "question")`)
      const type = validTypes.includes(q.type) ? q.type : 'single'
      const out = { id: q.id || `q_${section}_${Date.now()}_${i}`, section, text: q.text.trim(), type, order: q.order || n }
      if (type === 'single' || type === 'mcq') {
        if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`Question ${n}: "options" needs at least 2 entries`)
        out.options = q.options.map(String)
        if (type === 'single') out.correctAnswer = q.correctAnswer != null ? String(q.correctAnswer) : null
        else out.correctAnswers = Array.isArray(q.correctAnswers) ? q.correctAnswers.map(String) : []
      }
      if (type === 'code') out.starterCode = typeof q.starterCode === 'string' ? q.starterCode : ''
      return out
    })
  },

  // Grade a Round 1 submission against the question pool.
  // Uses the candidate's stored selectionIds (the questions they were actually
  // served) when present, else falls back to answered ids. Returns totals,
  // per-section tallies and per-question details (given vs expected).
  // Auto-graded types: single, mcq. code/text are review-only (correct = null).
  gradeRound1(round1Data, questions) {
    // marks/maxMarks are the weighted score (MCQ=1, coding=5 proportional to
    // test cases passed). correct/total remain the MCQ-only tally.
    const result = { correct: 0, total: 0, marks: 0, maxMarks: 0, sections: {}, details: [] }
    if (!round1Data || !round1Data.answers) return result
    const answers = round1Data.answers
    const codingGrades = round1Data.codingGrades || {}
    const codeLanguages = round1Data.codeLanguages || {}
    const byId = {}
    questions.forEach(q => { byId[q.id] = q })

    let servedIds = []
    if (round1Data.selectionIds) {
      this.sections.forEach(s => (round1Data.selectionIds[s.key] || []).forEach(id => servedIds.push(id)))
    } else {
      servedIds = Object.keys(answers)
    }
    const order = { logical: 0, problem: 1, coding: 2 }
    const served = servedIds.map(id => byId[id]).filter(Boolean)
    served.sort((a, b) =>
      (order[a.section || 'logical'] - order[b.section || 'logical']) || ((a.order || 0) - (b.order || 0)))

    served.forEach(q => {
      const ans = answers[q.id]
      let correct = null
      let expected = null
      let given = null
      if (q.type === 'single') {
        expected = q.correctAnswer != null ? q.correctAnswer : null
        given = (ans != null && ans !== '') ? ans : null
        correct = expected != null ? given === expected : null
      } else if (q.type === 'mcq') {
        const ca = (q.correctAnswers || []).slice().sort()
        const ua = (Array.isArray(ans) ? ans : []).slice().sort()
        expected = ca.join(', ')
        given = ua.join(', ')
        correct = ca.length ? JSON.stringify(ca) === JSON.stringify(ua) : null
      } else if (q.type === 'code') {
        expected = q.sampleOutput || null
        given = ans || null
        correct = null // graded separately via test cases
      } else {
        given = ans || null
        correct = null
      }
      const sk = q.section || 'logical'
      if (!result.sections[sk]) result.sections[sk] = { correct: 0, total: 0, marks: 0, maxMarks: 0, graded: 0, pending: 0 }
      const sec = result.sections[sk]

      // ── Marks ──
      let marks = null
      let codingGrade = null
      if (q.type === 'single' || q.type === 'mcq') {
        result.maxMarks += this.MARKS[q.type]
        sec.maxMarks += this.MARKS[q.type]
        marks = correct ? this.MARKS[q.type] : 0
        result.marks += marks
        sec.marks += marks
        if (correct !== null) {
          result.total++
          sec.total++
          if (correct) { result.correct++; sec.correct++ }
        }
      } else if (q.type === 'code') {
        result.maxMarks += this.MARKS.code
        sec.maxMarks += this.MARKS.code
        codingGrade = codingGrades[q.id] || null
        if (codingGrade && codingGrade.total) {
          marks = Math.round((codingGrade.passed / codingGrade.total) * this.MARKS.code * 10) / 10
          result.marks += marks
          sec.marks += marks
          sec.graded++
        } else {
          sec.pending++ // not graded yet
        }
      }

      const language = q.type === 'code' ? (codeLanguages[q.id] || q.language || '') : (q.language || '')
      result.details.push({ question: q, section: sk, type: q.type, given, expected, correct, marks, codingGrade, rawAnswer: ans, language })
    })
    result.marks = Math.round(result.marks * 10) / 10
    Object.values(result.sections).forEach(s => { s.marks = Math.round(s.marks * 10) / 10 })
    return result
  },

  // ---- ROUND 2 PROBLEM (per drive) ----
  async getRound2Problem(orgId, driveId) {
    return this.getDriveProblem(orgId, driveId)
  },

  async getDriveProblem(orgId, driveId) {
    if (isFirebaseConfigured()) {
      const snap = await getDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'meta', 'problem'))
      return snap.exists() ? snap.data() : { title: '', description: '', starterCode: {} }
    }
    const raw = localStorage.getItem(`ia_dp_${orgId}__${driveId}`)
    return raw ? JSON.parse(raw) : { title: '', description: '', starterCode: {} }
  },

  async saveDriveProblem(orgId, driveId, problem) {
    if (isFirebaseConfigured()) {
      await setDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'meta', 'problem'), problem)
      return problem
    }
    localStorage.setItem(`ia_dp_${orgId}__${driveId}`, JSON.stringify(problem))
    return problem
  },

  // ---- CANDIDATES ----
  // Candidate identity = College + Roll Number + Placement Date.
  // The composite key is stored in `email` so all downstream (email-keyed)
  // submission/audit/execution helpers keep working unchanged.
  candidateKey({ collegeName, rollNumber, placementDate }) {
    const parts = [
      slugify(collegeName || ''),
      slugify(rollNumber || ''),
      (placementDate || '').replace(/[^0-9-]/g, ''),
    ].filter(Boolean)
    return parts.join('_') || `cand_${Date.now()}`
  },

  async registerCandidate(orgId, driveId, { name, department, collegeName, rollNumber, placementDate }) {
    const key = this.candidateKey({ collegeName, rollNumber, placementDate })
    const candidateData = {
      name, department, collegeName, rollNumber, placementDate,
      email: key, // composite key used as the stable candidate id
      orgId, driveId, registeredAt: Date.now(), round1Status: 'pending', round2Approved: false,
    }
    // Anti-malpractice: one active attempt per roll. A roll that has already
    // STARTED or SUBMITTED cannot be re-registered from another device/session.
    // (A 'pending' doc — registered but never started — may re-register, so a
    // pre-start refresh on a fresh browser still works.) Candidates can't READ
    // candidate docs (PII), so the block is enforced by the security rules: the
    // overwrite (which sets round1Status back to 'pending') is denied for a
    // started/submitted roll, surfacing here as permission-denied.
    const takenError = () => {
      const e = new Error('This roll number has already started or completed the assessment. If you believe this is a mistake, contact the invigilator.')
      e.code = 'already-taken'; return e
    }
    if (isFirebaseConfigured()) {
      const ref = doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', key)
      try {
        await setDoc(ref, candidateData)
      } catch (e) {
        if (e && (e.code === 'permission-denied' || /permission/i.test(String(e && e.message)))) throw takenError()
        throw e
      }
      return { id: key, ...candidateData }
    }
    // localStorage (no rules) — enforce the same policy directly.
    const scope = `${orgId}__${driveId}`
    const candidates = await this.getDriveCandidates(orgId, driveId)
    const found = candidates.find(c => c.id === key)
    if (found && (found.round1Status === 'in_progress' || found.round1Status === 'submitted')) throw takenError()
    if (!found) {
      candidates.push({ id: key, ...candidateData })
      localStorage.setItem(`ia_dc_${scope}`, JSON.stringify(candidates))
    }
    return { id: key, ...candidateData }
  },

  // Record that a candidate has started Round 1 (server-side), so a second
  // device using the same roll is blocked at registration from that moment.
  async markRound1Started(orgId, driveId, email) {
    if (isFirebaseConfigured()) {
      try {
        await updateDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', email), {
          round1Status: 'in_progress', round1StartedAt: Date.now(),
        })
      } catch (e) { /* non-fatal: display/logic falls back to submitTime */ }
      return
    }
    const scope = `${orgId}__${driveId}`
    const candidates = await this.getDriveCandidates(orgId, driveId)
    const idx = candidates.findIndex(c => c.id === email)
    if (idx >= 0 && candidates[idx].round1Status === 'pending') {
      candidates[idx].round1Status = 'in_progress'
      localStorage.setItem(`ia_dc_${scope}`, JSON.stringify(candidates))
    }
  },

  async checkRound2Approval(orgId, driveId, email) {
    if (isFirebaseConfigured()) {
      const snap = await getDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', email))
      return snap.exists() && snap.data().round2Approved === true
    }
    const candidates = await this.getDriveCandidates(orgId, driveId)
    const c = candidates.find(c => c.email === email)
    return c ? c.round2Approved === true : false
  },

  // Live subscription: fires `cb` whenever the drive's candidates change
  // (register / submit). Returns an unsubscribe function. No-op in localStorage.
  subscribeCandidates(orgId, driveId, cb) {
    if (!isFirebaseConfigured()) return () => {}
    return onSnapshot(
      collection(db, 'orgs', orgId, 'drives', driveId, 'candidates'),
      () => cb(),
      () => {} // ignore errors (e.g. transient permission)
    )
  },

  async getDriveCandidates(orgId, driveId) {
    if (isFirebaseConfigured()) {
      const snap = await getDocs(collection(db, 'orgs', orgId, 'drives', driveId, 'candidates'))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    }
    const raw = localStorage.getItem(`ia_dc_${orgId}__${driveId}`)
    return raw ? JSON.parse(raw) : []
  },

  async getCandidateData(orgId, driveId, candidateId) {
    if (isFirebaseConfigured()) {
      const base = ['orgs', orgId, 'drives', driveId, 'candidates', candidateId]
      const snap = await getDoc(doc(db, ...base))
      if (!snap.exists()) return null
      const candidate = { id: snap.id, ...snap.data() }
      const r1Snap = await getDoc(doc(db, ...base, 'submissions', 'round1'))
      const r2Snap = await getDoc(doc(db, ...base, 'submissions', 'round2'))
      const execSnap = await getDocs(collection(db, ...base, 'executions'))
      const auditR1Snap = await getDocs(query(collection(db, ...base, 'audit'), where('round', '==', 1)))
      const auditR2Snap = await getDocs(query(collection(db, ...base, 'audit'), where('round', '==', 2)))
      return {
        ...candidate,
        round1Data: r1Snap.exists() ? r1Snap.data() : null,
        round2Data: r2Snap.exists() ? r2Snap.data() : null,
        executions: execSnap.docs.map(d => d.data()),
        auditR1: auditR1Snap.docs.map(d => d.data()),
        auditR2: auditR2Snap.docs.map(d => d.data()),
      }
    }
    const scope = `${orgId}__${driveId}`
    const candidates = await this.getDriveCandidates(orgId, driveId)
    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate) return null
    const r1 = JSON.parse(localStorage.getItem(`ia_dr1_${scope}_${candidate.email}`) || 'null')
    const r2 = JSON.parse(localStorage.getItem(`ia_dr2_${scope}_${candidate.email}`) || 'null')
    const executions = JSON.parse(localStorage.getItem(`ia_dexec_${scope}_${candidate.email}`) || '[]')
    const auditR1 = JSON.parse(localStorage.getItem(`ia_daudit_${scope}_${candidate.email}_r1`) || '[]')
    const auditR2 = JSON.parse(localStorage.getItem(`ia_daudit_${scope}_${candidate.email}_r2`) || '[]')
    return { ...candidate, round1Data: r1, round2Data: r2, executions, auditR1, auditR2 }
  },

  async approveForRound2(orgId, driveId, candidateId) {
    if (isFirebaseConfigured()) {
      await updateDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', candidateId), { round2Approved: true, approvedAt: serverTimestamp() })
      return
    }
    const candidates = await this.getDriveCandidates(orgId, driveId)
    const idx = candidates.findIndex(c => c.id === candidateId)
    if (idx >= 0) {
      candidates[idx].round2Approved = true
      candidates[idx].approvedAt = Date.now()
      localStorage.setItem(`ia_dc_${orgId}__${driveId}`, JSON.stringify(candidates))
    }
  },

  async rejectCandidate(orgId, driveId, candidateId) {
    if (isFirebaseConfigured()) {
      await updateDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', candidateId), { rejected: true, round2Approved: false })
      return
    }
    const candidates = await this.getDriveCandidates(orgId, driveId)
    const idx = candidates.findIndex(c => c.id === candidateId)
    if (idx >= 0) {
      candidates[idx].rejected = true
      candidates[idx].round2Approved = false
      localStorage.setItem(`ia_dc_${orgId}__${driveId}`, JSON.stringify(candidates))
    }
  },

  // ---- SUBMISSIONS (per drive) ----
  // Persist Round 1 progress the moment a section is submitted (instant update
  // for admins). Marks the candidate 'in_progress' (not final).
  async saveRound1Progress(orgId, driveId, email, payload) {
    const data = { ...payload, email, updatedAt: Date.now() }
    const scope = `${orgId}__${driveId}`
    if (isFirebaseConfigured()) {
      await setDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', email, 'submissions', 'round1'), data, { merge: true })
      await updateDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', email), { round1Status: 'in_progress' })
      return true
    }
    localStorage.setItem(`ia_dr1_${scope}_${email}`, JSON.stringify(data))
    const candidates = await this.getDriveCandidates(orgId, driveId)
    const idx = candidates.findIndex(c => c.email === email)
    if (idx >= 0 && candidates[idx].round1Status !== 'submitted') {
      candidates[idx].round1Status = 'in_progress'
      localStorage.setItem(`ia_dc_${scope}`, JSON.stringify(candidates))
    }
    return true
  },

  async submitRound1(orgId, driveId, email, payload) {
    const data = { ...payload, email, submittedAt: Date.now() }
    const scope = `${orgId}__${driveId}`
    if (isFirebaseConfigured()) {
      await setDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', email, 'submissions', 'round1'), data)
      await updateDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', email), { round1Status: 'submitted', round1SubmittedAt: serverTimestamp() })
      return true
    }
    localStorage.setItem(`ia_dr1_${scope}_${email}`, JSON.stringify(data))
    const candidates = await this.getDriveCandidates(orgId, driveId)
    const idx = candidates.findIndex(c => c.email === email)
    if (idx >= 0) {
      candidates[idx].round1Status = 'submitted'
      localStorage.setItem(`ia_dc_${scope}`, JSON.stringify(candidates))
    }
    return true
  },

  // Fetch a candidate's Round 1 submission (works in Firestore + localStorage).
  async getRound1Submission(orgId, driveId, email) {
    if (isFirebaseConfigured()) {
      const snap = await getDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', email, 'submissions', 'round1'))
      return snap.exists() ? snap.data() : null
    }
    const raw = localStorage.getItem(`ia_dr1_${orgId}__${driveId}_${email}`)
    return raw ? JSON.parse(raw) : null
  },

  // Merge an admin-computed coding grade into the candidate's Round 1 submission
  // (used when the admin runs test cases from the review page). Feeds the score.
  async saveCandidateCodingGrade(orgId, driveId, email, questionId, grade) {
    const scope = `${orgId}__${driveId}`
    if (isFirebaseConfigured()) {
      await setDoc(
        doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', email, 'submissions', 'round1'),
        { codingGrades: { [questionId]: grade } },
        { merge: true }
      )
      return true
    }
    const key = `ia_dr1_${scope}_${email}`
    const sub = JSON.parse(localStorage.getItem(key) || 'null')
    if (sub) {
      sub.codingGrades = { ...(sub.codingGrades || {}), [questionId]: grade }
      localStorage.setItem(key, JSON.stringify(sub))
    }
    return true
  },

  async submitRound2(orgId, driveId, email, payload) {
    const data = { ...payload, email, submittedAt: Date.now() }
    if (isFirebaseConfigured()) {
      await setDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', email, 'submissions', 'round2'), data)
      await updateDoc(doc(db, 'orgs', orgId, 'drives', driveId, 'candidates', email), { round2Status: 'submitted', round2SubmittedAt: serverTimestamp() })
      return true
    }
    localStorage.setItem(`ia_dr2_${orgId}__${driveId}_${email}`, JSON.stringify(data))
    return true
  },

  // ---- AUDIT & EXECUTION LOGGING (per drive) ----
  async logAuditEvent(orgId, driveId, email, round, event) {
    const data = { ...event, round, email, timestamp: Date.now() }
    if (isFirebaseConfigured()) {
      await addDoc(collection(db, 'orgs', orgId, 'drives', driveId, 'candidates', email, 'audit'), data)
      return
    }
    const key = `ia_daudit_${orgId}__${driveId}_${email}_r${round}`
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.push(data)
    localStorage.setItem(key, JSON.stringify(existing))
  },

  async logExecution(orgId, driveId, email, { code, language, timestamp }) {
    const data = { code, language, timestamp: timestamp || Date.now(), email }
    if (isFirebaseConfigured()) {
      await addDoc(collection(db, 'orgs', orgId, 'drives', driveId, 'candidates', email, 'executions'), data)
      return
    }
    const key = `ia_dexec_${orgId}__${driveId}_${email}`
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.push(data)
    localStorage.setItem(key, JSON.stringify(existing))
  },
}
