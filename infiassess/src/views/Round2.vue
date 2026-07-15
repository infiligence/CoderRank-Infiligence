<template>
  <div class="r2-root">

    <!-- ===== ENTRY FORM ===== -->
    <div v-if="phase === 'entry'" class="r2-centered-wrap">
      <v-row align="center" justify="center" style="min-height:100vh">
        <v-col cols="12" sm="9" md="5">
          <div class="brand-logo text-center mb-8">
            <brand-logo />
          </div>
          <v-card class="ia-card pa-8" elevation="0">
            <div class="text-center mb-6">
              <v-icon size="48" color="primary" class="mb-3">mdi-code-braces-box</v-icon>
              <h2 class="black--text font-weight-700 text-h5">Round 2 — Coding Challenge</h2>
              <p class="text-body-2 mt-2" style="color:rgba(17,17,17,0.55)">
                Enter your registered details to continue
              </p>
            </div>
            <v-form ref="entryForm" @submit.prevent="registerCandidate" lazy-validation>
              <v-text-field
                v-model="form.name"
                label="Full Name"
                outlined
                dense
                prepend-inner-icon="mdi-account-outline"
                class="mb-3 ia-field"
                hide-details="auto"
                :rules="[v => !!v || 'Name is required']"
              />
              <v-text-field
                v-model="form.email"
                label="Email Address"
                type="email"
                outlined
                dense
                prepend-inner-icon="mdi-email-outline"
                class="mb-6 ia-field"
                hide-details="auto"
                :rules="[
                  v => !!v || 'Email is required',
                  v => /.+@.+\..+/.test(v) || 'Enter a valid email',
                ]"
              />
              <v-btn
                type="submit"
                color="primary"
                block
                large
                :loading="loading"
                class="ia-btn"
              >
                <v-icon left>mdi-arrow-right-circle-outline</v-icon>
                Continue
              </v-btn>
            </v-form>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- ===== AWAITING APPROVAL ===== -->
    <div v-else-if="phase === 'awaiting'" class="r2-centered-wrap">
      <v-row align="center" justify="center" style="min-height:100vh">
        <v-col cols="12" sm="9" md="5">
          <v-card class="ia-card pa-10 text-center" elevation="0">
            <div class="waiting-spinner mb-6">
              <v-progress-circular indeterminate color="secondary" size="56" width="3" />
            </div>
            <h2 class="black--text text-h5 font-weight-700 mb-3">Awaiting Approval</h2>
            <p class="text-body-1 mb-2" style="color:rgba(17,17,17,0.7)">
              Your Round 1 has been reviewed.
            </p>
            <p class="text-body-2 mb-6" style="color:rgba(17,17,17,0.5)">
              Please wait for the interviewer to unlock Round 2.<br>
              You will be able to proceed once your access is granted.
            </p>
            <v-divider class="ia-divider mb-5" />
            <div class="d-flex justify-center align-center" style="gap:8px">
              <v-icon small color="secondary">mdi-email-outline</v-icon>
              <span class="caption" style="color:#111111">{{ candidate ? candidate.email : '' }}</span>
            </div>
            <v-btn
              outlined
              small
              class="ia-btn-outline mt-6"
              :loading="checkingApproval"
              @click="recheckApproval"
            >
              <v-icon left small>mdi-refresh</v-icon>
              Check Again
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- ===== READY SCREEN ===== -->
    <div v-else-if="phase === 'ready'" class="r2-centered-wrap">
      <v-row align="center" justify="center" style="min-height:100vh">
        <v-col cols="12" sm="9" md="6">
          <div class="brand-logo text-center mb-8">
            <brand-logo />
          </div>
          <v-card class="ia-card pa-8" elevation="0">
            <div class="text-center mb-6">
              <v-icon size="52" color="primary" class="mb-3">mdi-lightning-bolt-circle</v-icon>
              <h2 class="black--text font-weight-700 text-h5 mb-1">Ready to code?</h2>
              <p class="text-body-1 mt-1" style="color:#111111;">{{ org ? org.name : orgSlug }}</p>
            </div>

            <v-divider class="ia-divider mb-5" />

            <div class="ready-meta d-flex justify-space-around mb-6">
              <div class="text-center">
                <v-icon color="primary" class="mb-1">mdi-clock-outline</v-icon>
                <div class="black--text font-weight-600">{{ org ? org.round2Timer : '—' }} min</div>
                <div class="caption" style="color:rgba(17,17,17,0.45)">Time Limit</div>
              </div>
              <div class="text-center">
                <v-icon color="primary" class="mb-1">mdi-puzzle-outline</v-icon>
                <div class="black--text font-weight-600">{{ problem ? problem.title : '—' }}</div>
                <div class="caption" style="color:rgba(17,17,17,0.45)">Problem</div>
              </div>
              <div class="text-center">
                <v-icon color="primary" class="mb-1">mdi-account-outline</v-icon>
                <div class="black--text font-weight-600">{{ candidate ? candidate.name.split(' ')[0] : '—' }}</div>
                <div class="caption" style="color:rgba(17,17,17,0.45)">Candidate</div>
              </div>
            </div>

            <v-card class="ia-info-card pa-4 mb-6" elevation="0">
              <p class="text-body-2 mb-2 black--text font-weight-600">Instructions</p>
              <ul class="instruction-list text-body-2" style="color:rgba(17,17,17,0.7)">
                <li>You may use any of the 15 supported languages.</li>
                <li>Run your code as many times as you need.</li>
                <li>The timer starts when you click "Start Round 2".</li>
                <li>Submit your final solution before time runs out.</li>
                <li>All executions and submissions are recorded.</li>
              </ul>
            </v-card>

            <v-btn
              color="primary"
              block
              large
              :loading="loading"
              class="ia-btn"
              @click="startRound"
            >
              <v-icon left>mdi-play-circle-outline</v-icon>
              Start Round 2
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- ===== CODING ENVIRONMENT ===== -->
    <div v-else-if="phase === 'coding'" class="r2-coding-wrap">

      <!-- Top toolbar -->
      <div class="r2-toolbar">
        <div class="toolbar-left">
          <brand-logo />
          <span class="toolbar-org ml-3">{{ org ? org.name : orgSlug }}</span>
        </div>

        <div class="toolbar-center d-flex align-center" style="gap:14px">
          <v-select
            v-model="selectedLanguage"
            :items="languageOptions"
            item-text="label"
            item-value="value"
            outlined
            dense
            hide-details
            class="lang-select"
            prepend-inner-icon="mdi-code-tags"
          />
          <div :class="['timer-chip', timerUrgent ? 'timer-urgent' : '', timerGrace ? 'timer-grace' : '']">
            <v-icon small :color="timerUrgent ? '#FF5252' : 'rgba(17,17,17,0.7)'" class="mr-1">mdi-clock-outline</v-icon>
            <span>{{ timerGrace ? 'Grace: ' : '' }}{{ timerDisplay }}</span>
          </div>
        </div>

        <div class="toolbar-right d-flex align-center" style="gap:10px">
          <v-btn
            color="secondary"
            small
            class="ia-btn"
            :loading="running"
            @click="runCode"
          >
            <v-icon left small>mdi-play</v-icon>
            Run
          </v-btn>
          <v-btn
            color="error"
            small
            class="ia-btn"
            @click="confirmSubmitDialog = true"
          >
            <v-icon left small>mdi-send-outline</v-icon>
            Submit
          </v-btn>
        </div>
      </div>

      <!-- Split editor area -->
      <div class="r2-split">

        <!-- Left: Problem description (40%) -->
        <div class="r2-problem-panel">
          <div class="panel-header">
            <v-icon small color="secondary" class="mr-2">mdi-text-box-outline</v-icon>
            <span class="panel-title">Problem</span>
            <span class="ml-2 problem-title-chip">{{ problem ? problem.title : '' }}</span>
          </div>
          <div class="problem-body custom-scrollbar" v-html="renderedProblem" />
        </div>

        <!-- Right: Editor + output (60%) -->
        <div class="r2-editor-panel">
          <div class="panel-header">
            <v-icon small color="primary" class="mr-2">mdi-code-braces</v-icon>
            <span class="panel-title">Solution</span>
            <span class="ml-auto caption" style="color:rgba(17,17,17,0.35)">
              {{ languageLabel }}
            </span>
          </div>

          <!-- Monaco editor wrapper -->
          <div class="editor-area">
            <code-editor
              v-model="code"
              :language="monacoLanguage"
              theme="vs"
            />
          </div>

          <!-- Output panel -->
          <div class="output-panel">
            <div class="output-header">
              <v-icon small color="rgba(17,17,17,0.4)" class="mr-1">mdi-console</v-icon>
              <span class="caption" style="color:rgba(17,17,17,0.4)">Output</span>
              <v-spacer />
              <span v-if="lastRunTime" class="caption" style="color:rgba(17,17,17,0.25)">
                Last run {{ lastRunTime }}
              </span>
            </div>
            <div class="output-body custom-scrollbar">
              <template v-if="outputLines.length">
                <div
                  v-for="(line, i) in outputLines"
                  :key="i"
                  :class="['output-line', line.type === 'info' ? 'output-info' : '']"
                >{{ line.text }}</div>
              </template>
              <div v-else class="output-placeholder">
                <!-- TODO [EXECUTION]: Wire Run button to WebSocket backend -->
                Code execution will be connected to backend. Click Run to execute your code.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit confirmation dialog -->
      <v-dialog v-model="confirmSubmitDialog" max-width="460" persistent>
        <v-card class="ia-card pa-6" elevation="0">
          <div class="d-flex align-center mb-4">
            <v-icon color="warning" size="28" class="mr-3">mdi-alert-circle-outline</v-icon>
            <span class="black--text text-h6 font-weight-600">Submit Solution?</span>
          </div>
          <p class="text-body-2 mb-2" style="color:rgba(17,17,17,0.7)">
            You have run the code <strong class="black--text">{{ executions.length }}</strong> time(s).
          </p>
          <p class="text-body-2 mb-5" style="color:rgba(17,17,17,0.55)">
            Your current code will be submitted as the final solution.
            <strong class="black--text">You cannot make changes after submission.</strong>
          </p>
          <div class="d-flex justify-end" style="gap:12px">
            <v-btn outlined class="ia-btn-outline" @click="confirmSubmitDialog = false" :disabled="submitting">
              Cancel
            </v-btn>
            <v-btn color="error" class="ia-btn" :loading="submitting" @click="submitRound">
              <v-icon left small>mdi-send</v-icon>
              Submit
            </v-btn>
          </div>
        </v-card>
      </v-dialog>
    </div>

    <!-- ===== THANK YOU SCREEN ===== -->
    <div v-else-if="phase === 'done'" class="r2-centered-wrap">
      <v-row align="center" justify="center" style="min-height:100vh">
        <v-col cols="12" sm="9" md="5">
          <v-card class="ia-card pa-10 text-center" elevation="0">
            <v-icon size="64" color="success" class="mb-4">mdi-check-circle-outline</v-icon>
            <h2 class="black--text text-h5 font-weight-700 mb-3">Solution Submitted</h2>
            <p class="text-body-1 mb-2" style="color:rgba(17,17,17,0.7)">
              Great work, <strong class="black--text">{{ candidate ? candidate.name : '' }}</strong>!
            </p>
            <p class="text-body-2 mb-6" style="color:rgba(17,17,17,0.5)">
              Your Round 2 solution has been submitted successfully.<br>
              The interviewer will review your code and get back to you.
            </p>
            <v-divider class="ia-divider mb-6" />
            <div class="d-flex justify-center align-center" style="gap:8px">
              <v-icon small color="secondary">mdi-email-outline</v-icon>
              <span class="caption" style="color:#111111">{{ candidate ? candidate.email : '' }}</span>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Loading overlay -->
    <v-overlay v-if="initializing" opacity="0.9" color="#F7F7F8" z-index="200">
      <v-progress-circular indeterminate color="primary" size="48" />
    </v-overlay>
  </div>
</template>

<script>
import { firebaseService } from '@/services/firebaseService'
import CodeEditor from '@/components/CodeEditor.vue'
import { monitoringService } from '@/services/monitoringService'

const LANGUAGE_MAP = [
  { label: 'Python3',            value: 'python3',     monacoId: 'python'     },
  { label: 'JavaScript (Node.js)', value: 'nodejs',    monacoId: 'javascript' },
  { label: 'TypeScript',         value: 'typescript',  monacoId: 'typescript' },
  { label: 'Java (OpenJDK)',      value: 'java',        monacoId: 'java'       },
  { label: 'C (gcc)',             value: 'c_gcc',       monacoId: 'c'          },
  { label: 'C++ (g++)',           value: 'cpp_gpp',     monacoId: 'cpp'        },
  { label: 'Go',                  value: 'go',          monacoId: 'go'         },
  { label: 'Rust',                value: 'rust',        monacoId: 'rust'       },
  { label: 'Ruby',                value: 'ruby',        monacoId: 'ruby'       },
  { label: 'PHP',                 value: 'php',         monacoId: 'php'        },
  { label: 'Swift',               value: 'swift',       monacoId: 'swift'      },
  { label: 'Kotlin',              value: 'kotlin',      monacoId: 'kotlin'     },
  { label: 'C# - .NET Core',      value: 'csharp',      monacoId: 'csharp'     },
  { label: 'Bash',                value: 'bash',        monacoId: 'shell'      },
  { label: 'R',                   value: 'r',           monacoId: 'r'          },
]

const STARTER_CODE = {
  python:     '# Write your solution here\ndef solution():\n    pass\n',
  javascript: '// Write your solution here\nfunction solution() {\n  \n}\n',
  typescript: '// Write your solution here\nfunction solution(): void {\n  \n}\n',
  java:       '// Write your solution here\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n',
  c:          '// Write your solution here\n#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
  cpp:        '// Write your solution here\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  go:         '// Write your solution here\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}\n',
  rust:       '// Write your solution here\nfn main() {\n    \n}\n',
  ruby:       '# Write your solution here\ndef solution\n  \nend\n',
  php:        '<?php\n// Write your solution here\nfunction solution() {\n    \n}\n',
  swift:      '// Write your solution here\nfunc solution() {\n    \n}\n',
  kotlin:     '// Write your solution here\nfun main() {\n    \n}\n',
  csharp:     '// Write your solution here\nusing System;\n\nclass Solution {\n    static void Main() {\n        \n    }\n}\n',
  shell:      '#!/bin/bash\n# Write your solution here\n',
  r:          '# Write your solution here\nsolution <- function() {\n  \n}\n',
}

export default {
  name: 'Round2',
  components: { CodeEditor },

  data() {
    return {
      phase: 'entry',       // entry | awaiting | ready | coding | done
      initializing: true,
      loading: false,
      submitting: false,
      checkingApproval: false,
      running: false,

      org: null,
      candidate: null,
      problem: null,
      orgSlug: '',
      driveId: '',
      drive: null,

      // Entry form
      form: { name: '', email: '' },

      // Editor state
      selectedLanguage: 'python3',
      code: STARTER_CODE['python'],
      executions: [],
      auditEvents: [],

      // Output
      outputLines: [],
      lastRunTime: null,

      // Timer
      timerSeconds: 0,
      timerInterval: null,
      graceSeconds: 0,
      graceInterval: null,
      timerGrace: false,
      startTime: null,

      // UI
      confirmSubmitDialog: false,
    }
  },

  computed: {
    languageOptions() {
      return LANGUAGE_MAP.map(l => ({ label: l.label, value: l.value }))
    },
    currentLangEntry() {
      return LANGUAGE_MAP.find(l => l.value === this.selectedLanguage) || LANGUAGE_MAP[0]
    },
    monacoLanguage() {
      return this.currentLangEntry.monacoId
    },
    languageLabel() {
      return this.currentLangEntry.label
    },
    timerUrgent() {
      if (this.timerGrace) return true
      return this.timerSeconds <= 300
    },
    timerDisplay() {
      const secs = this.timerGrace ? this.graceSeconds : this.timerSeconds
      const m = Math.floor(secs / 60).toString().padStart(2, '0')
      const s = (secs % 60).toString().padStart(2, '0')
      return `${m}:${s}`
    },
    renderedProblem() {
      if (!this.problem) return ''
      return this.renderMarkdown(this.problem.description)
    },
  },

  watch: {
    selectedLanguage(newLang) {
      const entry = LANGUAGE_MAP.find(l => l.value === newLang)
      if (entry) {
        this.code = STARTER_CODE[entry.monacoId] || '// Write your solution here\n'
      }
    },
  },

  async mounted() {
    this.orgSlug = this.$route.params.orgSlug
    this.driveId = this.$route.params.driveId

    try {
      const [org, drive, problem] = await Promise.all([
        firebaseService.getOrg(this.orgSlug),
        firebaseService.getDrive(this.orgSlug, this.driveId),
        firebaseService.getRound2Problem(this.orgSlug, this.driveId),
      ])
      this.org = org
      this.drive = drive
      this.problem = problem

      // Recover the candidate identity from their Round 1 session for this drive.
      const existing = this.recoverCandidate()
      if (existing) {
        this.candidate = existing
        await this.checkApproval()
      } else {
        this.phase = 'entry'
      }
    } catch (e) {
      console.error('Round2 init error', e)
    } finally {
      this.initializing = false
    }

    // monitoring starts when candidate clicks "Start Round 2"
  },

  beforeDestroy() {
    this.clearTimer()
    this.clearGrace()
    monitoringService.stop()
  },

  methods: {
    // Recover the candidate saved during Round 1 for this drive.
    recoverCandidate() {
      try {
        const raw = localStorage.getItem(`ia_r1session_${this.orgSlug}__${this.driveId}`)
        const session = raw ? JSON.parse(raw) : null
        return session && session.candidate ? session.candidate : null
      } catch {
        return null
      }
    },

    // ── Registration (fallback if no Round 1 session found) ───────────────────
    async registerCandidate() {
      if (!this.$refs.entryForm.validate()) return
      this.loading = true
      try {
        const candidate = await firebaseService.registerCandidate(this.orgSlug, this.driveId, {
          name: this.form.name.trim(),
          department: this.form.department ? this.form.department.trim() : '',
          collegeName: (this.org && this.org.name) || this.orgSlug,
          rollNumber: (this.form.rollNumber || this.form.email || '').trim(),
          placementDate: this.drive?.placementDate || new Date().toISOString().slice(0, 10),
        })
        this.candidate = candidate
        await this.checkApproval()
      } catch (e) {
        console.error('Registration error', e)
      } finally {
        this.loading = false
      }
    },

    // ── Approval ──────────────────────────────────────────────────────────────
    async checkApproval() {
      const approved = await firebaseService.checkRound2Approval(
        this.orgSlug,
        this.driveId,
        this.candidate.email
      )
      this.phase = approved ? 'ready' : 'awaiting'
    },

    async recheckApproval() {
      this.checkingApproval = true
      try {
        await this.checkApproval()
      } finally {
        this.checkingApproval = false
      }
    },

    // ── Start round ───────────────────────────────────────────────────────────
    async startRound() {
      this.loading = true
      this.startTime = Date.now()
      this.timerSeconds = (this.org?.round2Timer || 60) * 60
      this.phase = 'coding'
      this.loading = false
      this.$nextTick(() => this.startTimer())

      monitoringService.start({ orgSlug: this.orgSlug, driveId: this.driveId, email: this.candidate.email, round: 2 })
    },

    // ── Timer ─────────────────────────────────────────────────────────────────
    startTimer() {
      this.timerInterval = setInterval(() => {
        if (this.timerSeconds > 0) {
          this.timerSeconds--
        } else {
          this.clearTimer()
          this.enterGracePeriod()
        }
      }, 1000)
    },

    clearTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval)
        this.timerInterval = null
      }
    },

    enterGracePeriod() {
      this.timerGrace = true
      this.graceSeconds = 5 * 60
      this.graceInterval = setInterval(() => {
        if (this.graceSeconds > 0) {
          this.graceSeconds--
        } else {
          this.clearGrace()
          this.submitRound(true)
        }
      }, 1000)
    },

    clearGrace() {
      if (this.graceInterval) {
        clearInterval(this.graceInterval)
        this.graceInterval = null
      }
    },

    // ── Run code ──────────────────────────────────────────────────────────────
    async runCode() {
      if (this.running) return
      this.running = true
      const ts = Date.now()
      const execEntry = { code: this.code, language: this.currentLangEntry.value, timestamp: ts }

      // Log execution
      this.executions.push(execEntry)
      await firebaseService.logExecution(this.orgSlug, this.driveId, this.candidate.email, {
        code: this.code,
        language: this.currentLangEntry.value,
        timestamp: ts,
      })

      // TODO [EXECUTION]: Replace stub with WebSocket/API call to backend execution service
      // Example:
      // const ws = new WebSocket(`${process.env.VUE_APP_WS_URL}/run`)
      // ws.onmessage = (e) => { this.outputLines.push(...) }
      // ws.send(JSON.stringify({ code: this.code, language: this.currentLangEntry.value }))

      // Stub output for now
      const now = new Date()
      this.lastRunTime = now.toLocaleTimeString()
      this.outputLines = [
        {
          type: 'info',
          text: `[${this.lastRunTime}] Running ${this.currentLangEntry.label}...`,
        },
        {
          type: 'info',
          text: 'Code execution will be connected to backend. (stub)',
        },
      ]

      this.running = false
    },

    // ── Submit ────────────────────────────────────────────────────────────────
    async submitRound(autoSubmit = false) {
      if (this.submitting) return
      this.submitting = true
      this.confirmSubmitDialog = false
      this.clearTimer()
      this.clearGrace()

      if (autoSubmit) {
        await firebaseService.logAuditEvent(this.orgSlug, this.driveId, this.candidate.email, 2, {
          type: 'auto_submit',
          reason: 'timer_expired',
        })
      }

      monitoringService.stop()
      const monitoringSummary = monitoringService.getSummary()

      try {
        await firebaseService.submitRound2(this.orgSlug, this.driveId, this.candidate.email, {
          executions: this.executions,
          finalCode: this.code,
          language: this.currentLangEntry.value,
          startTime: this.startTime,
          submitTime: Date.now(),
          auditEvents: this.auditEvents,
          monitoringSummary,
        })
        this.phase = 'done'
      } catch (e) {
        console.error('Submit error', e)
      } finally {
        this.submitting = false
      }
    },

    // ── Markdown renderer ─────────────────────────────────────────────────────
    // Simple inline renderer — no external dependency needed for this content
    renderMarkdown(text) {
      if (!text) return ''
      let html = text
        // Escape HTML first
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Fenced code blocks
        .replace(/```([\s\S]*?)```/g, '<pre class="md-code"><code>$1</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Headers
        .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
        // Unordered lists (lines starting with "- ")
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        // Wrap consecutive <li> items in <ul>
        .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul class="md-list">${m}</ul>`)
        // Paragraphs: double newlines
        .replace(/\n{2,}/g, '</p><p class="md-p">')
        // Single newlines within paragraphs
        .replace(/\n/g, '<br>')

      return `<p class="md-p">${html}</p>`
    },

  },
}
</script>

<style scoped>
/* ── Root ───────────────────────────────────────────────────────────────────── */
.r2-root {
  min-height: 100vh;
  background: #F7F7F8;
  font-family: 'Inter', sans-serif;
}
.r2-centered-wrap {
  padding: 16px;
  background: linear-gradient(160deg, #F7F7F8 0%, #FFFFFF 60%, #FFFFFF 100%);
  min-height: 100vh;
}

/* ── Brand ──────────────────────────────────────────────────────────────────── */
.brand-logo {
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}
.brand-ia { color: #111111; }
.brand-assess { color: #111111; }

/* ── Cards ──────────────────────────────────────────────────────────────────── */
.ia-card {
  background: #FFFFFF !important;
  border: 1px solid rgba(17, 17, 17, 0.2) !important;
  border-radius: 12px !important;
}
.ia-info-card {
  background: rgba(17, 17, 17, 0.06) !important;
  border: 1px solid rgba(17, 17, 17, 0.15) !important;
  border-radius: 8px !important;
}
.ia-divider {
  border-color: rgba(17, 17, 17, 0.15) !important;
}

/* ── Fields ──────────────────────────────────────────────────────────────────── */
.ia-field >>> .v-input__slot {
  background: rgba(17, 17, 17, 0.04) !important;
  border-color: rgba(17, 17, 17, 0.25) !important;
}
.ia-field >>> fieldset {
  border-color: rgba(17, 17, 17, 0.25) !important;
}
.ia-field >>> .v-label {
  color: rgba(17, 17, 17, 0.45) !important;
}

/* ── Buttons ─────────────────────────────────────────────────────────────────── */
.ia-btn {
  text-transform: none !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  border-radius: 8px !important;
}
.ia-btn-outline {
  text-transform: none !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  border-radius: 8px !important;
  border-color: rgba(17, 17, 17, 0.4) !important;
  color: rgba(17, 17, 17, 0.75) !important;
}

/* ── Instructions ──────────────────────────────────────────────────────────── */
.instruction-list {
  padding-left: 18px;
  line-height: 2;
}
.ready-meta > div {
  padding: 8px 20px;
}

/* ── Toolbar ─────────────────────────────────────────────────────────────────── */
.r2-toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(17, 17, 17, 0.15);
  padding: 0 20px;
  height: 58px;
  gap: 12px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 700;
  flex-shrink: 0;
}
.toolbar-org {
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(17,17,17,0.4);
  padding-left: 10px;
  border-left: 1px solid rgba(17,17,17,0.1);
}
.toolbar-center {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: center;
}
.toolbar-right {
  flex-shrink: 0;
}

/* ── Language selector ───────────────────────────────────────────────────────── */
.lang-select {
  max-width: 220px;
}
.lang-select >>> .v-input__slot {
  background: rgba(17,17,17,0.05) !important;
  border-color: rgba(17,17,17,0.3) !important;
  min-height: 36px !important;
}
.lang-select >>> fieldset {
  border-color: rgba(17,17,17,0.3) !important;
}
.lang-select >>> .v-select__selections {
  font-size: 0.82rem;
}

/* ── Timer chip ──────────────────────────────────────────────────────────────── */
.timer-chip {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(17,17,17,0.06);
  border: 1px solid rgba(17,17,17,0.1);
  color: rgba(17,17,17,0.8);
  white-space: nowrap;
  transition: all 0.3s;
}
.timer-urgent {
  color: #FF5252 !important;
  border-color: rgba(255, 82, 82, 0.4) !important;
  background: rgba(255, 82, 82, 0.08) !important;
}
.timer-grace {
  color: #FF5252 !important;
  border-color: rgba(255, 82, 82, 0.5) !important;
  background: rgba(255, 82, 82, 0.1) !important;
  animation: pulse-red 1.2s ease-in-out infinite;
}
@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 82, 82, 0); }
  50% { box-shadow: 0 0 0 5px rgba(255, 82, 82, 0.15); }
}

/* ── Split layout ────────────────────────────────────────────────────────────── */
.r2-coding-wrap {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.r2-split {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Problem panel ───────────────────────────────────────────────────────────── */
.r2-problem-panel {
  width: 40%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(17, 17, 17, 0.12);
  background: #FFFFFF;
  overflow: hidden;
}

/* ── Editor panel ────────────────────────────────────────────────────────────── */
.r2-editor-panel {
  width: 60%;
  display: flex;
  flex-direction: column;
  background: #F7F7F8;
  overflow: hidden;
}

/* ── Panel header ────────────────────────────────────────────────────────────── */
.panel-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(17, 17, 17, 0.1);
  flex-shrink: 0;
}
.panel-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(17,17,17,0.55);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.problem-title-chip {
  font-size: 0.8rem;
  font-weight: 600;
  color: #111111;
  background: rgba(17, 17, 17, 0.1);
  border: 1px solid rgba(17, 17, 17, 0.2);
  padding: 1px 8px;
  border-radius: 4px;
}

/* ── Problem body ────────────────────────────────────────────────────────────── */
.problem-body {
  flex: 1;
  padding: 20px 22px;
  overflow-y: auto;
  color: rgba(17,17,17,0.82);
  font-size: 0.875rem;
  line-height: 1.75;
}

/* Markdown rendered styles (non-scoped doesn't work with v-html in scoped, use >>> hack) */
.problem-body >>> .md-p {
  margin-bottom: 12px;
  color: rgba(17,17,17,0.82);
}
.problem-body >>> .md-h1,
.problem-body >>> .md-h2,
.problem-body >>> .md-h3 {
  color: #111111;
  font-weight: 600;
  margin: 16px 0 8px;
}
.problem-body >>> .md-h2 { font-size: 1rem; }
.problem-body >>> .md-h3 { font-size: 0.9rem; }
.problem-body >>> .md-code {
  background: #F7F7F8;
  border: 1px solid rgba(17, 17, 17, 0.2);
  border-radius: 8px;
  padding: 14px 16px;
  margin: 12px 0;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  overflow-x: auto;
  color: #E0E0E0;
}
.problem-body >>> .md-inline-code {
  background: rgba(17, 17, 17, 0.15);
  color: #A8DADC;
  padding: 1px 5px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.82rem;
}
.problem-body >>> .md-list {
  padding-left: 20px;
  margin: 8px 0;
}
.problem-body >>> .md-list li {
  margin-bottom: 4px;
  color: rgba(17,17,17,0.75);
}

/* ── Editor area ─────────────────────────────────────────────────────────────── */
.editor-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── Output panel ────────────────────────────────────────────────────────────── */
.output-panel {
  height: 160px;
  border-top: 1px solid rgba(17, 17, 17, 0.12);
  display: flex;
  flex-direction: column;
  background: #F5F5F7;
  flex-shrink: 0;
}
.output-header {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  border-bottom: 1px solid rgba(17,17,17,0.05);
  flex-shrink: 0;
}
.output-body {
  flex: 1;
  padding: 10px 14px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8rem;
}
.output-placeholder {
  color: rgba(17,17,17,0.2);
  font-size: 0.78rem;
  line-height: 1.6;
}
.output-line {
  color: #E0E0E0;
  line-height: 1.6;
  white-space: pre-wrap;
}
.output-info {
  color: #111111;
}

/* ── Scrollbar ───────────────────────────────────────────────────────────────── */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(17, 17, 17, 0.25);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(17, 17, 17, 0.45);
}
</style>
