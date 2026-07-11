(function () {
  const encoder = new TextEncoder();
  const crcTable = buildCrcTable();

  function create(entries) {
    const files = entries.map((entry) => normalizeEntry(entry));
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    files.forEach((file) => {
      const local = localHeader(file);
      localParts.push(local, file.data);
      centralParts.push(centralHeader(file, offset));
      offset += local.length + file.data.length;
    });

    const centralDirectory = concat(centralParts);
    const end = endRecord(files.length, centralDirectory.length, offset);
    return concat([...localParts, centralDirectory, end]);
  }

  function normalizeEntry(entry) {
    const name = String(entry.name || 'file').replace(/^\/+/, '');
    const data = entry.data instanceof Uint8Array ? entry.data : encoder.encode(String(entry.data || ''));
    const nameBytes = encoder.encode(name);
    return { name, nameBytes, data, crc: crc32(data) };
  }

  function localHeader(file) {
    const output = new Uint8Array(30 + file.nameBytes.length);
    const view = new DataView(output.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, file.crc, true);
    view.setUint32(18, file.data.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, file.nameBytes.length, true);
    view.setUint16(28, 0, true);
    output.set(file.nameBytes, 30);
    return output;
  }

  function centralHeader(file, offset) {
    const output = new Uint8Array(46 + file.nameBytes.length);
    const view = new DataView(output.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, file.crc, true);
    view.setUint32(20, file.data.length, true);
    view.setUint32(24, file.data.length, true);
    view.setUint16(28, file.nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, offset, true);
    output.set(file.nameBytes, 46);
    return output;
  }

  function endRecord(count, centralSize, centralOffset) {
    const output = new Uint8Array(22);
    const view = new DataView(output.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, count, true);
    view.setUint16(10, count, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralOffset, true);
    view.setUint16(20, 0, true);
    return output;
  }

  function concat(parts) {
    const length = parts.reduce((total, part) => total + part.length, 0);
    const output = new Uint8Array(length);
    let position = 0;
    parts.forEach((part) => {
      output.set(part, position);
      position += part.length;
    });
    return output;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[index]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function buildCrcTable() {
    const table = new Uint32Array(256);
    for (let number = 0; number < 256; number += 1) {
      let crc = number;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      table[number] = crc >>> 0;
    }
    return table;
  }

  window.ZipBuilder = { create };
})();
