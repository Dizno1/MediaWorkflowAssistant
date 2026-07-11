(function () {
  const extensionMap = {
    video: ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', 'wmv', '3gp', '3g2', 'mpg', 'mpeg', 'mts', 'm2ts'],
    audio: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma', 'aiff', 'aif', 'opus'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff'],
    document: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'md', 'csv'],
    archive: ['zip', '7z', 'rar', 'tar', 'gz']
  };

  function getExtension(fileName) {
    const parts = fileName.toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
  }

  function typeFromMime(mimeType) {
    if (!mimeType) return null;
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf' || mimeType.includes('document') || mimeType.includes('presentation') || mimeType.includes('spreadsheet') || mimeType.startsWith('text/')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) return 'archive';
    return null;
  }

  function typeFromExtension(extension) {
    for (const [type, extensions] of Object.entries(extensionMap)) {
      if (extensions.includes(extension)) return type;
    }
    return 'unknown';
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes === 0) return '0 bytes';
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds)) return 'Unknown';
    const whole = Math.round(seconds);
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const remainingSeconds = whole % 60;

    if (hours) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  function createBaseInspection(file) {
    const extension = getExtension(file.name);
    const mimeType = typeFromMime(file.type);
    const extensionType = typeFromExtension(extension);
    const mediaType = mimeType || extensionType;

    return {
      name: file.name,
      mediaType,
      mimeType: file.type || 'Unknown',
      extension: extension || 'None',
      size: file.size,
      sizeLabel: formatBytes(file.size),
      lastModified: file.lastModified ? new Date(file.lastModified).toLocaleString() : 'Unknown',
      hasAudio: mediaType === 'audio' || mediaType === 'video',
      hasVideo: mediaType === 'video',
      hasImages: mediaType === 'image',
      hasReadableText: mediaType === 'document' && ['txt', 'md', 'csv', 'rtf'].includes(extension),
      hasCaptions: false,
      hasTranscript: false,
      hasAudioDescription: false,
      durationSeconds: null,
      durationLabel: 'Unknown',
      width: null,
      height: null,
      dimensionsLabel: 'Unknown',
      recommendedSummary: '',
      capabilities: inferCapabilities(mediaType)
    };
  }

  function inspectMediaElement(file, inspection) {
    if (!['video', 'audio'].includes(inspection.mediaType)) {
      return Promise.resolve(inspection);
    }

    return new Promise((resolve) => {
      const element = inspection.mediaType === 'video' ? document.createElement('video') : document.createElement('audio');
      const objectUrl = URL.createObjectURL(file);
      let resolved = false;

      function finish() {
        if (resolved) return;
        resolved = true;
        URL.revokeObjectURL(objectUrl);
        resolve(inspection);
      }

      element.preload = 'metadata';
      element.onloadedmetadata = () => {
        inspection.durationSeconds = element.duration;
        inspection.durationLabel = formatDuration(element.duration);

        if (inspection.mediaType === 'video') {
          inspection.width = element.videoWidth || null;
          inspection.height = element.videoHeight || null;
          inspection.dimensionsLabel = inspection.width && inspection.height ? `${inspection.width} by ${inspection.height}` : 'Unknown';
        }

        finish();
      };
      element.onerror = finish;
      element.src = objectUrl;

      window.setTimeout(finish, 2500);
    });
  }

  function inferCapabilities(mediaType) {
    const shared = ['prepare-for-ai', 'accessibility-package'];
    const map = {
      video: ['create-captions', 'create-transcript', 'audio-description', 'render-accessible-video', 'compress-video', 'extract-audio', ...shared],
      audio: ['create-transcript', 'compress-audio', 'normalize-audio', ...shared],
      image: ['generate-alt-text', 'ocr-image', 'compress-image', 'resize-image', ...shared],
      document: ['ocr-document', 'extract-document-text', ...shared],
      archive: ['inspect-archive', ...shared],
      unknown: shared
    };
    return map[mediaType] || shared;
  }

  function summarize(inspection) {
    const article = ['audio', 'image', 'archive', 'unknown'].includes(inspection.mediaType) ? 'an' : 'a';
    const details = [];

    if (inspection.durationSeconds) details.push(`duration ${inspection.durationLabel}`);
    if (inspection.width && inspection.height) details.push(`dimensions ${inspection.dimensionsLabel}`);
    if (inspection.sizeLabel) details.push(`size ${inspection.sizeLabel}`);

    return `I found ${article} ${inspection.mediaType} file${details.length ? ` with ${details.join(', ')}` : ''}.`;
  }

  function nameFromUrl(url) {
    try {
      const parsed = new URL(url);
      const pathName = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname);
      return pathName || parsed.hostname;
    } catch (error) {
      return 'Web source';
    }
  }

  function getYouTubeId(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('/')[0] || null;
      if (parsed.hostname.endsWith('youtube.com')) {
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
        const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
        return match ? match[1] : null;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function inspectUrl(rawUrl) {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Use a web address that begins with http or https.');
    }

    const url = parsed.href;
    const name = nameFromUrl(url);
    const extension = getExtension(parsed.pathname);
    const youtubeId = getYouTubeId(url);
    let mediaType = youtubeId ? 'video' : typeFromExtension(extension);
    if (mediaType === 'unknown' && ['html', 'htm', 'php', 'asp', 'aspx'].includes(extension)) mediaType = 'document';

    const isDirectMedia = ['video', 'audio', 'image'].includes(mediaType) || extension === 'pdf' || ['txt', 'md', 'csv', 'json', 'xml'].includes(extension);
    const inspection = {
      name,
      sourceType: 'url',
      sourceUrl: url,
      sourceHost: parsed.hostname,
      mediaType,
      mimeType: 'Not available from the address alone',
      extension: extension || 'None',
      size: null,
      sizeLabel: 'Unknown',
      lastModified: 'Unknown',
      hasAudio: mediaType === 'audio' || mediaType === 'video',
      hasVideo: mediaType === 'video',
      hasImages: mediaType === 'image',
      hasReadableText: mediaType === 'document' || ['txt', 'md', 'csv', 'json', 'xml'].includes(extension),
      hasCaptions: false,
      hasTranscript: false,
      hasAudioDescription: false,
      durationSeconds: null,
      durationLabel: 'Unknown',
      width: null,
      height: null,
      dimensionsLabel: 'Unknown',
      capabilities: inferCapabilities(mediaType),
      isDirectMedia,
      youtubeId,
      recommendedSummary: ''
    };

    const kind = youtubeId ? 'a video page' : mediaType === 'unknown' ? 'a web page or link' : `a ${mediaType} source`;
    inspection.recommendedSummary = `I found ${kind} on ${parsed.hostname}.`;
    return Promise.resolve(inspection);
  }

  async function inspect(file) {
    const inspection = createBaseInspection(file);
    await inspectMediaElement(file, inspection);
    inspection.recommendedSummary = summarize(inspection);
    return inspection;
  }

  window.MediaInspector = { inspect, inspectUrl, formatBytes, formatDuration };
})();
