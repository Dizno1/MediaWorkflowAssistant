(function () {
  const extensionMap = {
    video: ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi'],
    audio: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff'],
    document: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'md'],
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

  function inspect(file) {
    const extension = getExtension(file.name);
    const mediaType = typeFromMime(file.type) || typeFromExtension(extension);

    return {
      name: file.name,
      mediaType,
      mimeType: file.type || 'Unknown',
      extension: extension || 'None',
      size: file.size,
      sizeLabel: formatBytes(file.size),
      lastModified: file.lastModified ? new Date(file.lastModified).toLocaleString() : 'Unknown',
      capabilities: inferCapabilities(mediaType)
    };
  }

  function inferCapabilities(mediaType) {
    const shared = ['prepare-for-ai'];
    const map = {
      video: ['create-captions', 'create-transcript', 'audio-description', 'compress-video', 'extract-audio', ...shared],
      audio: ['create-transcript', 'compress-audio', 'prepare-for-ai', 'extract-audio'],
      image: ['generate-alt-text', 'ocr-image', 'compress-image', ...shared],
      document: ['ocr-document', 'extract-document-text', ...shared],
      archive: ['inspect-archive', ...shared],
      unknown: shared
    };
    return map[mediaType] || shared;
  }

  window.MediaInspector = { inspect };
})();
