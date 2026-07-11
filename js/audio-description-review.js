(function () {
  function stripExtension(name) {
    return String(name || 'video').replace(/\.[^.]+$/, '') || 'video';
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

  function build(sourceName) {
    return {
      suggestedTitle: `Audio description script for ${sourceName || 'video source'}`,
      suggestedFileName: `${stripExtension(sourceName)}-audio-description-script.md`,
      cues: [{ start: '00:00:00.000', end: '00:00:04.000', text: '', placement: 'During a pause' }]
    };
  }

  function validate(cues, durationSeconds) {
    const errors = [];
    let previousStart = -1;
    cues.forEach((cue, index) => {
      const number = index + 1;
      const start = timestampToSeconds(cue.start);
      const end = timestampToSeconds(cue.end);
      if (start === null) errors.push(`Description cue ${number} has an invalid start time.`);
      if (end === null) errors.push(`Description cue ${number} has an invalid end time.`);
      if (!String(cue.text || '').trim()) errors.push(`Description cue ${number} has no narration text.`);
      if (start !== null && end !== null && end <= start) errors.push(`Description cue ${number} must end after it starts.`);
      if (start !== null && previousStart >= 0 && start < previousStart) errors.push(`Description cue ${number} is out of chronological order.`);
      if (end !== null && Number(durationSeconds) > 0 && end > Number(durationSeconds) + 0.5) errors.push(`Description cue ${number} ends after the source video.`);
      if (start !== null) previousStart = start;
    });
    return errors;
  }

  function toMarkdown(title, sourceName, cues, notes) {
    const lines = [
      `# ${String(title || 'Audio Description Script').trim()}`,
      '',
      `Source: ${sourceName || 'video source'}`,
      `Reviewed: ${new Date().toLocaleString()}`,
      '',
      '## Production notes',
      '',
      String(notes || '').trim() || 'No additional production notes.',
      '',
      '## Description cues',
      ''
    ];
    cues.forEach((cue, index) => {
      lines.push(
        `### Cue ${index + 1}`, '',
        `Start: ${cue.start}`,
        `End: ${cue.end}`,
        `Placement: ${cue.placement || 'During a pause'}`, '',
        String(cue.text).trim(), ''
      );
    });
    return `${lines.join('\n')}\n`;
  }

  window.AudioDescriptionReview = { build, validate, toMarkdown, timestampToSeconds };
})();
