(function () {
  function build(sourceName) {
    const baseName = stripExtension(sourceName || 'media-source');
    return {
      suggestedTitle: `Transcript for ${sourceName || 'media source'}`,
      suggestedFileName: `${baseName}-transcript.txt`
    };
  }
  function normalizeText(value) { return String(value || '').replace(/\r\n/g, '\n').trim(); }
  function wordCount(value) { const text = normalizeText(value); return text ? text.split(/\s+/).length : 0; }
  function stripExtension(name) { const value = String(name || 'media-source'); const index = value.lastIndexOf('.'); return index > 0 ? value.slice(0, index) : value; }
  window.TranscriptReview = { build, normalizeText, wordCount };
})();
