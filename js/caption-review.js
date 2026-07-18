(function () {
  function stripExtension(name) {
    return String(name || 'media').replace(/\.[^.]+$/, '') || 'media';
  }

  function secondsToTimestamp(totalSeconds) {
    const safe = Math.max(0, Number(totalSeconds) || 0);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = Math.floor(safe % 60);
    const milliseconds = Math.round((safe - Math.floor(safe)) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }

  function timestampToSeconds(value) {
    const match = String(value || '').trim().match(/^(\d{2,}):(\d{2}):(\d{2})[.,](\d{3})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    const milliseconds = Number(match[4]);
    if (minutes > 59 || seconds > 59) return null;
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  function transcriptText(model, source) {
    const artifacts = window.OutputManager ? window.OutputManager.listForSource(source) : [];
    const runtime = artifacts.find((artifact) => artifact.workflowId === 'create-transcript' && artifact.content);
    if (runtime) {
      const lines = runtime.content.split(/\r?\n/);
      const blankIndex = lines.findIndex((line, index) => index > 3 && !line.trim());
      return lines.slice(blankIndex >= 0 ? blankIndex + 1 : 0).join(' ').trim();
    }
    return '';
  }

  function splitTranscript(text) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
    const cues = [];
    sentences.forEach((sentence) => {
      const words = sentence.trim().split(/\s+/);
      while (words.length) cues.push(words.splice(0, 12).join(' '));
    });
    return cues.filter(Boolean);
  }

  function build(sourceName, durationSeconds, model, source) {
    const text = transcriptText(model, source);
    const captionTexts = splitTranscript(text);
    const duration = Math.max(Number(durationSeconds) || 0, captionTexts.length * 3, 4);
    const cues = captionTexts.length ? captionTexts.map((captionText, index) => {
      const start = index * duration / captionTexts.length;
      const end = Math.min(duration, (index + 1) * duration / captionTexts.length);
      return { start: secondsToTimestamp(start), end: secondsToTimestamp(end), text: captionText };
    }) : [{ start: '00:00:00.000', end: '00:00:04.000', text: '' }];
    return {
      suggestedTitle: `Captions for ${sourceName || 'media source'}`,
      suggestedFileName: `${stripExtension(sourceName)}-captions.vtt`,
      cues,
      reusedTranscript: Boolean(captionTexts.length)
    };
  }

  // Automatically fixes the timing problems that are mechanically fixable — cues extending past
  // the media's real duration, and cues overlapping the previous one — rather than handing the
  // person dozens of invalid cues to repair by hand. Only a cue with no parseable timing at all is
  // dropped, since there is no time data to repair it from.
  function repair(cues, durationSeconds) {
    const duration = Number(durationSeconds) > 0 ? Number(durationSeconds) : null;
    const removed = [];
    let previousEnd = 0;
    const repaired = cues
      .map((cue, index) => {
        let start = timestampToSeconds(cue.start);
        let end = timestampToSeconds(cue.end);
        if (start === null || end === null) { removed.push(index + 1); return null; }
        if (end <= start) end = start + 1;
        if (start < previousEnd) start = previousEnd;
        if (end <= start) end = start + 1;
        if (duration !== null && start > duration) { removed.push(index + 1); return null; }
        if (duration !== null && end > duration) end = duration;
        if (end <= start) { removed.push(index + 1); return null; }
        previousEnd = end;
        return { ...cue, start: secondsToTimestamp(start), end: secondsToTimestamp(end) };
      })
      .filter(Boolean);
    return { cues: repaired, removedCount: removed.length };
  }

  function validate(cues, durationSeconds) {
    const errors = [];
    let previousEnd = -1;
    cues.forEach((cue, index) => {
      const number = index + 1;
      const start = timestampToSeconds(cue.start);
      const end = timestampToSeconds(cue.end);
      if (start === null) errors.push(`Cue ${number} has an invalid start time.`);
      if (end === null) errors.push(`Cue ${number} has an invalid end time.`);
      if (!String(cue.text || '').trim()) errors.push(`Cue ${number} has no caption text.`);
      if (start !== null && end !== null && end <= start) errors.push(`Cue ${number} must end after it starts.`);
      if (start !== null && previousEnd >= 0 && start < previousEnd) errors.push(`Cue ${number} overlaps the previous cue.`);
      if (end !== null && Number(durationSeconds) > 0 && end > Number(durationSeconds) + 0.5) errors.push(`Cue ${number} ends after the source media.`);
      if (end !== null) previousEnd = end;
    });
    return errors;
  }

  function toWebVtt(title, sourceName, cues) {
    const lines = ['WEBVTT', '', `NOTE ${String(title || 'Captions').replace(/\r?\n/g, ' ')}`, `NOTE Source: ${String(sourceName || '').replace(/\r?\n/g, ' ')}`, ''];
    cues.forEach((cue, index) => {
      lines.push(String(index + 1), `${cue.start.replace(',', '.')} --> ${cue.end.replace(',', '.')}`, String(cue.text).trim(), '');
    });
    return `${lines.join('\n')}\n`;
  }

  window.CaptionReview = { build, validate, repair, toWebVtt, timestampToSeconds, secondsToTimestamp };
})();
