(function () {
  let context = null;
  let lastReport = null;

  function number(value, fallback) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
  function clamp(value) { return Math.max(0, Math.min(100, Math.round(value))); }
  function words(text) { return String(text || '').trim().split(/\s+/).filter(Boolean); }
  function artifactText(knowledge, typePattern) {
    const results = Array.isArray(knowledge && knowledge.results) ? knowledge.results : [];
    const match = results.slice().reverse().find((item) => typePattern.test(`${item.type || ''} ${item.mimeType || ''} ${item.name || ''}`));
    return match && (match.text || match.content) ? String(match.text || match.content) : '';
  }

  function localReport(inspection, knowledge) {
    const duration = number(inspection && inspection.durationSeconds, 0);
    const transcriptWords = number(knowledge && knowledge.accessibility && knowledge.accessibility.transcript && knowledge.accessibility.transcript.wordCount, 0);
    const captionCues = number(knowledge && knowledge.accessibility && knowledge.accessibility.captions && knowledge.accessibility.captions.cueCount, 0);
    const adCues = number(knowledge && knowledge.accessibility && knowledge.accessibility.audioDescription && knowledge.accessibility.audioDescription.cueCount, 0);
    const captionsPresent = Boolean(knowledge && knowledge.accessibility && knowledge.accessibility.captions && knowledge.accessibility.captions.present);
    const transcriptPresent = Boolean(knowledge && knowledge.accessibility && knowledge.accessibility.transcript && knowledge.accessibility.transcript.present);
    const adPresent = Boolean(knowledge && knowledge.accessibility && knowledge.accessibility.audioDescription && knowledge.accessibility.audioDescription.present);
    const mediaType = String(inspection && inspection.mediaType || 'unknown');
    const minutes = duration > 0 ? duration / 60 : 0;
    const readingWpm = minutes > 0 && transcriptWords > 0 ? Math.round(transcriptWords / minutes) : null;
    const cueDensity = minutes > 0 && captionCues > 0 ? Number((captionCues / minutes).toFixed(1)) : null;
    const adDensity = minutes > 0 && adCues > 0 ? Number((adCues / minutes).toFixed(1)) : null;

    const captionScore = clamp((captionsPresent ? 55 : 10) + (transcriptPresent ? 15 : 0) + (captionCues > 1 ? 15 : 0) + (readingWpm && readingWpm <= 180 ? 15 : readingWpm ? 5 : 0));
    const adScore = clamp(mediaType !== 'video' ? 100 : (adPresent ? 65 : 10) + (adCues > 1 ? 20 : 0) + (transcriptPresent ? 15 : 0));
    const visualScore = clamp(mediaType === 'audio' ? 100 : 35 + (adPresent ? 35 : 0) + ((inspection.width && inspection.height) ? 15 : 0) + (mediaType === 'image' && knowledge.accessibility && knowledge.accessibility.imageDescription && knowledge.accessibility.imageDescription.present ? 35 : 0));
    const narrationScore = clamp(mediaType !== 'video' ? 100 : (adPresent ? 60 : 10) + (adCues > 0 ? 20 : 0) + (knowledge.audio && knowledge.audio.describedMix ? 20 : 0));
    const speakerScore = clamp(transcriptPresent ? 45 + (captionCues > 0 ? 20 : 0) : 10);
    const sceneScore = clamp(mediaType === 'video' ? 35 + (adPresent ? 35 : 0) : mediaType === 'image' ? 55 : 100);
    const scores = { captionQuality: captionScore, audioDescriptionQuality: adScore, visualAccessibility: visualScore, narrationOptimization: narrationScore, speakerRecognition: speakerScore, sceneUnderstanding: sceneScore };
    const overall = clamp(Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.keys(scores).length);
    const findings = [];
    if (mediaType === 'video' && !adPresent) findings.push('No reviewed audio-description script is recorded, so scene coverage and narration placement cannot be verified.');
    if ((mediaType === 'video' || mediaType === 'audio') && !captionsPresent) findings.push('No reviewed caption file is recorded.');
    if (readingWpm && readingWpm > 180) findings.push(`Estimated spoken reading rate is ${readingWpm} words per minute, which may require shorter captions or more careful segmentation.`);
    if (captionCues === 1 && duration > 20) findings.push('Only one caption cue is recorded for a longer source. Check segmentation and timing.');
    if (mediaType === 'video' && adPresent && adDensity !== null && adDensity > 12) findings.push('Audio-description cue density is high. Check whether narration competes with dialogue or essential sound.');
    if (!findings.length) findings.push('No immediate rule-based quality warning was found. Human review remains required for meaning, timing, identity, and context.');
    return { generatedAt: new Date().toISOString(), overall, scores, metrics: { durationSeconds: duration || null, transcriptWords: transcriptWords || null, captionCues: captionCues || null, audioDescriptionCues: adCues || null, estimatedWordsPerMinute: readingWpm, captionCuesPerMinute: cueDensity, audioDescriptionCuesPerMinute: adDensity }, findings, source: 'Local quality analysis' };
  }

  function scoreLabel(score) { return score >= 85 ? 'Strong' : score >= 70 ? 'Good with review' : score >= 50 ? 'Needs improvement' : 'Incomplete or high risk'; }
  function escapeHtml(value) { const div = document.createElement('div'); div.textContent = String(value == null ? '' : value); return div.innerHTML; }
  function render(report) {
    const section = document.getElementById('advanced-analysis-section');
    const summary = document.getElementById('advanced-analysis-summary');
    const output = document.getElementById('advanced-analysis-output');
    if (!section || !output || !report) return;
    section.hidden = false;
    summary.textContent = `Accessibility analysis score: ${report.overall} out of 100. ${scoreLabel(report.overall)}.`;
    const labels = { sceneUnderstanding: 'Scene understanding', speakerRecognition: 'Speaker recognition', captionQuality: 'Caption quality', audioDescriptionQuality: 'Audio-description quality', visualAccessibility: 'Visual accessibility', narrationOptimization: 'Narration optimization' };
    output.innerHTML = `<div class="inspection-grid" aria-label="Advanced analysis scores">${Object.keys(labels).map((key) => `<div><strong>${labels[key]}</strong><span>${report.scores[key]} out of 100 - ${scoreLabel(report.scores[key])}</span></div>`).join('')}</div><h3>Quality findings</h3><ul>${report.findings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><h3>Measured indicators</h3><dl class="analysis-metrics">${Object.entries(report.metrics).filter((entry) => entry[1] !== null).map(([key, value]) => `<div><dt>${escapeHtml(key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()))}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><p class="muted">${escapeHtml(report.source)}. Scores guide review and do not replace human judgment.</p>`;
  }

  function setContext(inspection, knowledge, file) {
    context = { inspection, knowledge, file };
    lastReport = localReport(inspection, knowledge || {});
    render(lastReport);
    return lastReport;
  }

  async function runDeepAnalysis() {
    const status = document.getElementById('advanced-analysis-status');
    const button = document.getElementById('run-deep-analysis');
    if (!context || !context.inspection) return;
    if (!window.AIProviderLayer || !window.AIProviderLayer.getExecutionNotice('advanced-accessibility-analysis').canRun) {
      status.textContent = 'Deeper AI analysis is unavailable. Add a supported service in Advanced assistance settings. The local quality analysis remains available.';
      status.focus();
      return;
    }
    const guidance = window.AIProviderLayer.getExecutionNotice('advanced-accessibility-analysis');
    if (guidance.confirmationRequired && !window.confirm(`${guidance.provider && guidance.provider.name} will receive source-derived content for advanced accessibility analysis. ${guidance.provider && guidance.provider.costMessage}. Continue?`)) return;
    button.disabled = true; status.textContent = 'Analyzing scenes, speakers, visual accessibility, caption quality, and narration opportunities.';
    try {
      const sourceData = context.file ? await fileData(context.file) : null;
      const result = await window.AIProviderLayer.run('advanced-accessibility-analysis', { sourceData, inspection: context.inspection, knowledge: context.knowledge, localReport: lastReport }, { confirmed: true });
      const merged = normalizeProviderReport(result, lastReport);
      lastReport = merged; render(merged); status.textContent = `${result.providerName || 'The configured service'} completed the deeper analysis. Review the findings before publication.`;
      if (context.knowledge) { context.knowledge.analysis = context.knowledge.analysis || {}; context.knowledge.analysis.advancedAccessibility = merged; window.SharedKnowledge.save(context.knowledge); }
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; status.focus(); }
  }

  function normalizeProviderReport(result, fallback) {
    const report = result && result.report ? result.report : result;
    const scores = { ...fallback.scores };
    Object.keys(scores).forEach((key) => { if (report && report.scores && Number.isFinite(Number(report.scores[key]))) scores[key] = clamp(report.scores[key]); });
    return { ...fallback, generatedAt: new Date().toISOString(), overall: clamp(Object.values(scores).reduce((a,b) => a+b, 0) / Object.keys(scores).length), scores, findings: Array.isArray(report && report.findings) && report.findings.length ? report.findings.map(String) : fallback.findings, source: result.providerName ? `Advanced analysis by ${result.providerName}` : 'Advanced provider analysis' };
  }

  function fileData(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, mimeType: file.type, base64: String(reader.result || '').split(',')[1] || '' }); reader.onerror = () => reject(new Error('The source could not be prepared for analysis.')); reader.readAsDataURL(file); }); }
  document.addEventListener('DOMContentLoaded', () => { const button = document.getElementById('run-deep-analysis'); if (button) button.addEventListener('click', runDeepAnalysis); });
  window.AdvancedAccessibilityAnalysis = { setContext, localReport, render, getLastReport: () => lastReport };
})();
