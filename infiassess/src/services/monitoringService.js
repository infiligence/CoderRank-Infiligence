// monitoringService.js
// Tracks candidate behavior using built-in browser APIs only.
// Detects: tab switches, window blur/focus, paste events, DevTools open attempt.

import { firebaseService } from './firebaseService'

class MonitoringService {
  constructor() {
    this.orgSlug = null
    this.driveId = null
    this.email = null
    this.round = null
    this.active = false
    this.tabSwitchStart = null
    this.totalTabSwitches = 0
    this.totalTimeAway = 0 // ms
    this._handlers = {}
    this._devToolsTimer = null
  }

  start({ orgSlug, driveId, email, round }) {
    this.orgSlug = orgSlug
    this.driveId = driveId
    this.email = email
    this.round = round
    this.active = true

    // 1. Tab visibility (Page Visibility API)
    this._handlers.visibility = () => this._onVisibilityChange()
    document.addEventListener('visibilitychange', this._handlers.visibility)

    // 2. Window focus/blur
    this._handlers.blur = () => this._onWindowBlur()
    this._handlers.focus = () => this._onWindowFocus()
    window.addEventListener('blur', this._handlers.blur)
    window.addEventListener('focus', this._handlers.focus)

    // 3. Paste detection
    this._handlers.paste = (e) => this._onPaste(e)
    document.addEventListener('paste', this._handlers.paste)

    // 4. Right-click / context menu
    this._handlers.contextmenu = (e) => this._onContextMenu(e)
    document.addEventListener('contextmenu', this._handlers.contextmenu)

    // 5. DevTools detection (window size heuristic)
    this._startDevToolsDetection()

    this._log({ type: 'monitoring_start', round })
  }

  stop() {
    if (!this.active) return
    this.active = false

    document.removeEventListener('visibilitychange', this._handlers.visibility)
    window.removeEventListener('blur', this._handlers.blur)
    window.removeEventListener('focus', this._handlers.focus)
    document.removeEventListener('paste', this._handlers.paste)
    document.removeEventListener('contextmenu', this._handlers.contextmenu)

    if (this._devToolsTimer) {
      clearInterval(this._devToolsTimer)
      this._devToolsTimer = null
    }

    this._log({ type: 'monitoring_stop', round: this.round })
  }

  _onVisibilityChange() {
    if (document.hidden) {
      this.tabSwitchStart = Date.now()
      this.totalTabSwitches++
      this._log({
        type: 'tab_hidden',
        switchCount: this.totalTabSwitches,
        description: `Tab hidden (switch #${this.totalTabSwitches})`,
      })
    } else {
      const duration = this.tabSwitchStart ? Date.now() - this.tabSwitchStart : 0
      this.totalTimeAway += duration
      this.tabSwitchStart = null
      this._log({
        type: 'tab_visible',
        durationAway: duration,
        durationAwayFormatted: this._formatDuration(duration),
        totalTimeAway: this.totalTimeAway,
        description: `Tab returned after ${this._formatDuration(duration)} away`,
      })
    }
  }

  _onWindowBlur() {
    this._log({
      type: 'window_blur',
      description: 'Browser window lost focus',
    })
  }

  _onWindowFocus() {
    this._log({
      type: 'window_focus',
      description: 'Browser window regained focus',
    })
  }

  _onPaste(e) {
    const text = (e.clipboardData || window.clipboardData)?.getData('text') || ''
    this._log({
      type: 'paste',
      pastedLength: text.length,
      pastedSnippet: text.substring(0, 500), // first 500 chars
      description: `Pasted ${text.length} characters`,
    })
  }

  _onContextMenu() {
    this._log({
      type: 'right_click',
      description: 'Right-click detected',
    })
  }

  _startDevToolsDetection() {
    let devToolsOpen = false
    const threshold = 160 // px — devtools panel is usually > 160px

    this._devToolsTimer = setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth
      const heightDiff = window.outerHeight - window.innerHeight
      const isOpen = widthDiff > threshold || heightDiff > threshold

      if (isOpen && !devToolsOpen) {
        devToolsOpen = true
        this._log({
          type: 'devtools_opened',
          description: 'Browser DevTools may have been opened',
          widthDiff,
          heightDiff,
        })
      } else if (!isOpen && devToolsOpen) {
        devToolsOpen = false
        this._log({
          type: 'devtools_closed',
          description: 'Browser DevTools closed',
        })
      }
    }, 1000)
  }

  _log(event) {
    if (!this.orgSlug || !this.driveId || !this.email) return
    firebaseService.logAuditEvent(this.orgSlug, this.driveId, this.email, this.round, event)
  }

  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`
    const s = Math.floor(ms / 1000)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const rem = s % 60
    return `${m}m ${rem}s`
  }

  getSummary() {
    return {
      totalTabSwitches: this.totalTabSwitches,
      totalTimeAway: this.totalTimeAway,
      totalTimeAwayFormatted: this._formatDuration(this.totalTimeAway),
    }
  }
}

// Singleton
export const monitoringService = new MonitoringService()
