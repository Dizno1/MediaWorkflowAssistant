(function () {
  async function createMix(sourceFile, cues, narrationClips, settings, signal, onProgress) {
    if (!(sourceFile instanceof File)) throw new Error('Narration mixing requires the original local video file.');
    if (!Array.isArray(cues) || !cues.length || !Array.isArray(narrationClips) || narrationClips.length !== cues.length) throw new Error('Narration audio is incomplete.');
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const OfflineContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AudioContextClass || !OfflineContextClass) throw new Error('This browser does not support local audio mixing.');
    const decoder = new AudioContextClass();
    try {
      const sourceBuffer = await decoder.decodeAudioData(await sourceFile.arrayBuffer());
      checkCancelled(signal);
      const decodedNarration = [];
      for (let index = 0; index < narrationClips.length; index += 1) {
        const clip = narrationClips[index];
        decodedNarration.push(await decoder.decodeAudioData(base64ArrayBuffer(clip.base64)));
        if (onProgress) onProgress({ progress: 15 + Math.round(((index + 1) / narrationClips.length) * 35), message: `Prepared narration cue ${index + 1} of ${narrationClips.length}.` });
        checkCancelled(signal);
      }
      const sampleRate = sourceBuffer.sampleRate;
      const duration = Math.max(sourceBuffer.duration, ...decodedNarration.map((buffer, index) => timestampToSeconds(cues[index].start) + buffer.duration));
      const channels = Math.max(2, sourceBuffer.numberOfChannels);
      const offline = new OfflineContextClass(channels, Math.ceil(duration * sampleRate), sampleRate);
      const original = offline.createBufferSource();
      original.buffer = sourceBuffer;
      const originalGain = offline.createGain();
      originalGain.gain.setValueAtTime(1, 0);
      original.connect(originalGain).connect(offline.destination);
      original.start(0);
      const duckLevel = clamp(Number(settings.sourceDucking) / 100, 0, 1);
      const narrationLevel = clamp(Number(settings.narrationVolume) / 100, 0.1, 1);
      decodedNarration.forEach((buffer, index) => {
        const start = timestampToSeconds(cues[index].start);
        const end = Math.min(duration, start + buffer.duration);
        originalGain.gain.setValueAtTime(1, Math.max(0, start - 0.08));
        originalGain.gain.linearRampToValueAtTime(duckLevel, start);
        originalGain.gain.setValueAtTime(duckLevel, end);
        originalGain.gain.linearRampToValueAtTime(1, Math.min(duration, end + 0.12));
        const narration = offline.createBufferSource();
        narration.buffer = buffer;
        const gain = offline.createGain();
        gain.gain.value = narrationLevel;
        narration.connect(gain).connect(offline.destination);
        narration.start(start);
      });
      if (onProgress) onProgress({ progress: 65, message: 'Mixed narration with the source audio.' });
      const rendered = await offline.startRendering();
      checkCancelled(signal);
      const blob = audioBufferToWav(rendered);
      if (onProgress) onProgress({ progress: 100, message: 'Created the described-audio WAV file.' });
      return blob;
    } catch (error) {
      if (error && error.name === 'AbortError') throw error;
      throw new Error(`The browser could not decode or mix this source audio. ${error.message || ''}`.trim());
    } finally {
      if (decoder.close) decoder.close();
    }
  }

  function timestampToSeconds(value) {
    const parsed = window.AudioDescriptionReview.timestampToSeconds(value);
    if (parsed === null) throw new Error(`Invalid narration timestamp: ${value}`);
    return parsed;
  }
  function checkCancelled(signal) { if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError'); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, Number.isFinite(value) ? value : max)); }
  function base64ArrayBuffer(value) {
    const binary = atob(String(value || ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
  }
  function audioBufferToWav(buffer) {
    const channels = buffer.numberOfChannels;
    const length = buffer.length * channels * 2 + 44;
    const array = new ArrayBuffer(length);
    const view = new DataView(array);
    writeString(view, 0, 'RIFF'); view.setUint32(4, length - 8, true); writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
    view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true);
    writeString(view, 36, 'data'); view.setUint32(40, length - 44, true);
    let offset = 44;
    for (let frame = 0; frame < buffer.length; frame += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[frame]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true); offset += 2;
      }
    }
    return new Blob([array], { type: 'audio/wav' });
  }
  function writeString(view, offset, value) { for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index)); }
  window.NarrationMixer = { createMix };
})();
