(function () {
  function timestamp(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const whole = Math.floor(value % 60);
    const milliseconds = Math.round((value - Math.floor(value)) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }

  function normalizeSegments(segments, fallbackText, durationSeconds) {
    const valid = (Array.isArray(segments) ? segments : []).map((segment) => ({
      startSeconds: Number(segment.start),
      endSeconds: Number(segment.end),
      text: String(segment.text || '').replace(/\s+/g, ' ').trim()
    })).filter((segment) => Number.isFinite(segment.startSeconds) && Number.isFinite(segment.endSeconds) && segment.endSeconds > segment.startSeconds && segment.text);
    if (valid.length) return splitLongSegments(valid);
    return distributeText(fallbackText, durationSeconds);
  }

  function splitLongSegments(segments) {
    const cues = [];
    segments.forEach((segment) => {
      const chunks = chunkText(segment.text, 84);
      const duration = segment.endSeconds - segment.startSeconds;
      chunks.forEach((text, index) => {
        const start = segment.startSeconds + duration * index / chunks.length;
        const end = segment.startSeconds + duration * (index + 1) / chunks.length;
        cues.push({ start: timestamp(start), end: timestamp(Math.max(start + 0.6, end)), text });
      });
    });
    return removeOverlaps(cues);
  }

  function distributeText(text, durationSeconds) {
    const chunks = chunkText(String(text || ''), 84);
    if (!chunks.length) return [];
    const duration = Math.max(Number(durationSeconds) || chunks.length * 3, chunks.length * 1.2);
    return chunks.map((chunk, index) => ({
      start: timestamp(duration * index / chunks.length),
      end: timestamp(duration * (index + 1) / chunks.length),
      text: chunk
    }));
  }

  function chunkText(text, maximumCharacters) {
    const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const chunks = [];
    let current = '';
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (current && candidate.length > maximumCharacters) {
        chunks.push(current);
        current = word;
      } else current = candidate;
    });
    if (current) chunks.push(current);
    return chunks;
  }

  function removeOverlaps(cues) {
    let previousEnd = 0;
    return cues.map((cue) => {
      const start = Math.max(previousEnd, toSeconds(cue.start));
      const end = Math.max(start + 0.6, toSeconds(cue.end));
      previousEnd = end;
      return { ...cue, start: timestamp(start), end: timestamp(end) };
    });
  }

  function toSeconds(value) {
    const match = String(value || '').match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/);
    return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000 : 0;
  }

  window.CaptionDrafting = { normalizeSegments, distributeText, timestamp };
})();
