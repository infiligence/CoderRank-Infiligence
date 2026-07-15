<template>
  <div ref="editorContainer" class="code-editor-container"></div>
</template>

<script>
import * as monaco from 'monaco-editor'

export default {
  name: 'CodeEditor',
  props: {
    value: { type: String, default: '' },
    language: { type: String, default: 'python' },
    theme: { type: String, default: 'vs' },
    readOnly: { type: Boolean, default: false },
  },
  data() {
    return { editor: null }
  },
  mounted() {
    this.editor = monaco.editor.create(this.$refs.editorContainer, {
      value: this.value,
      language: this.language,
      theme: this.theme,
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      readOnly: this.readOnly,
      contextmenu: false,
      padding: { top: 12, bottom: 12 },
    })
    this.editor.onDidChangeModelContent(() => {
      this.$emit('input', this.editor.getValue())
    })
  },
  watch: {
    language(newLang) {
      if (this.editor) {
        const model = this.editor.getModel()
        monaco.editor.setModelLanguage(model, newLang)
      }
    },
    value(newVal) {
      if (this.editor && newVal !== this.editor.getValue()) {
        this.editor.setValue(newVal)
      }
    },
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.dispose()
    }
  },
}
</script>

<style scoped>
.code-editor-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
