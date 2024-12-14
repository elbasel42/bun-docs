// The fastest way as of April 2022 is to use DataView.
// DataView has intrinsics that cause inlining

interface BufferExt extends Buffer {
  $dataView?: DataView;

  toString(encoding?: BufferEncoding, start?: number, end?: number): string;
  toString(offset: number, length: number, encoding?: BufferEncoding): string;
}

export function readInt8(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 1);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getInt8(offset);
}

export function readUInt8(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 1);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getUint8(offset);
}

export function readInt16LE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 2);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getInt16(offset, true);
}

export function readInt16BE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 2);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getInt16(offset, false);
}

export function readUInt16LE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 2);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getUint16(offset, true);
}

export function readUInt16BE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 2);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getUint16(offset, false);
}

export function readInt32LE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 4);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getInt32(offset, true);
}

export function readInt32BE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 4);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getInt32(offset, false);
}

export function readUInt32LE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 4);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getUint32(offset, true);
}

export function readUInt32BE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 4);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getUint32(offset, false);
}

export function readIntLE(this: BufferExt, offset, byteLength) {
  const { ERR_INVALID_ARG_TYPE, validateInteger, boundsError } = require("internal/buffer");
  if (offset === undefined) throw ERR_INVALID_ARG_TYPE("offset", "number", offset);

  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));

  switch (byteLength) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      validateInteger(offset, "offset");
      if (!(offset >= 0 && offset <= this.length - byteLength)) boundsError(offset, this.length - byteLength);
      break;
  }
  switch (byteLength) {
    case 1: {
      return view.getInt8(offset);
    }
    case 2: {
      return view.getInt16(offset, true);
    }
    case 3: {
      const val = view.getUint16(offset, true) + view.getUint8(offset + 2) * 2 ** 16;
      return val | ((val & (2 ** 23)) * 0x1fe);
    }
    case 4: {
      return view.getInt32(offset, true);
    }
    case 5: {
      const last = view.getUint8(offset + 4);
      return (last | ((last & (2 ** 7)) * 0x1fffffe)) * 2 ** 32 + view.getUint32(offset, true);
    }
    case 6: {
      const last = view.getUint16(offset + 4, true);
      return (last | ((last & (2 ** 15)) * 0x1fffe)) * 2 ** 32 + view.getUint32(offset, true);
    }
  }
  boundsError(byteLength, 6, "byteLength");
}

export function readIntBE(this: BufferExt, offset, byteLength) {
  const { ERR_INVALID_ARG_TYPE, validateInteger, boundsError } = require("internal/buffer");
  if (offset === undefined) throw ERR_INVALID_ARG_TYPE("offset", "number", offset);

  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));

  switch (byteLength) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      validateInteger(offset, "offset");
      if (!(offset >= 0 && offset <= this.length - byteLength)) boundsError(offset, this.length - byteLength);
      break;
  }
  switch (byteLength) {
    case 1: {
      return view.getInt8(offset);
    }
    case 2: {
      return view.getInt16(offset, false);
    }
    case 3: {
      const val = view.getUint16(offset + 1, false) + view.getUint8(offset) * 2 ** 16;
      return val | ((val & (2 ** 23)) * 0x1fe);
    }
    case 4: {
      return view.getInt32(offset, false);
    }
    case 5: {
      const last = view.getUint8(offset);
      return (last | ((last & (2 ** 7)) * 0x1fffffe)) * 2 ** 32 + view.getUint32(offset + 1, false);
    }
    case 6: {
      const last = view.getUint16(offset, false);
      return (last | ((last & (2 ** 15)) * 0x1fffe)) * 2 ** 32 + view.getUint32(offset + 2, false);
    }
  }
  boundsError(byteLength, 6, "byteLength");
}

export function readUIntLE(this: BufferExt, offset, byteLength) {
  const { ERR_INVALID_ARG_TYPE, validateInteger, boundsError } = require("internal/buffer");
  if (offset === undefined) throw ERR_INVALID_ARG_TYPE("offset", "number", offset);

  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));

  switch (byteLength) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      validateInteger(offset, "offset");
      if (!(offset >= 0 && offset <= this.length - byteLength)) boundsError(offset, this.length - byteLength);
      break;
  }
  switch (byteLength) {
    case 1: {
      return view.getUint8(offset);
    }
    case 2: {
      return view.getUint16(offset, true);
    }
    case 3: {
      return view.getUint16(offset, true) + view.getUint8(offset + 2) * 2 ** 16;
    }
    case 4: {
      return view.getUint32(offset, true);
    }
    case 5: {
      return view.getUint8(offset + 4) * 2 ** 32 + view.getUint32(offset, true);
    }
    case 6: {
      return view.getUint16(offset + 4, true) * 2 ** 32 + view.getUint32(offset, true);
    }
  }
  boundsError(byteLength, 6, "byteLength");
}

export function readUIntBE(this: BufferExt, offset, byteLength) {
  const { ERR_INVALID_ARG_TYPE, validateInteger, boundsError } = require("internal/buffer");
  if (offset === undefined) throw ERR_INVALID_ARG_TYPE("offset", "number", offset);

  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));

  switch (byteLength) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      validateInteger(offset, "offset");
      if (!(offset >= 0 && offset <= this.length - byteLength)) boundsError(offset, this.length - byteLength);
      break;
  }
  switch (byteLength) {
    case 1: {
      return view.getUint8(offset);
    }
    case 2: {
      return view.getUint16(offset, false);
    }
    case 3: {
      return view.getUint16(offset + 1, false) + view.getUint8(offset) * 2 ** 16;
    }
    case 4: {
      return view.getUint32(offset, false);
    }
    case 5: {
      return view.getUint8(offset) * 2 ** 32 + view.getUint32(offset + 1, false);
    }
    case 6: {
      return view.getUint16(offset, false) * 2 ** 32 + view.getUint32(offset + 2, false);
    }
  }
  boundsError(byteLength, 6, "byteLength");
}

export function readFloatLE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 4);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getFloat32(offset, true);
}

export function readFloatBE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 4);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getFloat32(offset, false);
}

export function readDoubleLE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 8);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getFloat64(offset, true);
}

export function readDoubleBE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 8);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getFloat64(offset, false);
}

export function readBigInt64LE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 8);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getBigInt64(offset, true);
}

export function readBigInt64BE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 8);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getBigInt64(offset, false);
}

export function readBigUInt64LE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 8);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getBigUint64(offset, true);
}

export function readBigUInt64BE(this: BufferExt, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_read(this, offset, 8);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  return view.getBigUint64(offset, false);
}

export function writeInt8(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").check_int8(this, value, offset, -0x80, 0x7f);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setInt8(offset, value);
  return offset + 1;
}

export function writeUInt8(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").check_int8(this, value, offset, 0, 0xff);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setUint8(offset, value);
  return offset + 1;
}

export function writeInt16LE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").check_int16(this, value, offset, -0x8000, 0x7fff);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setInt16(offset, value, true);
  return offset + 2;
}

export function writeInt16BE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").check_int16(this, value, offset, -0x8000, 0x7fff);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setInt16(offset, value, false);
  return offset + 2;
}

export function writeUInt16LE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").check_int16(this, value, offset, 0, 0xffff);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setUint16(offset, value, true);
  return offset + 2;
}

export function writeUInt16BE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").check_int16(this, value, offset, 0, 0xffff);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setUint16(offset, value, false);
  return offset + 2;
}

export function writeInt32LE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").check_int32(this, value, offset, -0x80000000, 0x7fffffff);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setInt32(offset, value, true);
  return offset + 4;
}

export function writeInt32BE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").check_int32(this, value, offset, -0x80000000, 0x7fffffff);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setInt32(offset, value, false);
  return offset + 4;
}

export function writeUInt32LE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").check_int32(this, value, offset, 0, 0xffffffff);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setUint32(offset, value, true);
  return offset + 4;
}

export function writeUInt32BE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").check_int32(this, value, offset, 0, 0xffffffff);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setUint32(offset, value, false);
  return offset + 4;
}

export function writeIntLE(this: BufferExt, value, offset, byteLength) {
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  value = +value;

  switch (byteLength) {
    case 1: {
      require("internal/buffer").check_int8(this, value, offset, -0x80, 0x7f);
      view.setInt8(offset, value);
      break;
    }
    case 2: {
      require("internal/buffer").check_int16(this, value, offset, -0x8000, 0x7fff);
      view.setInt16(offset, value, true);
      break;
    }
    case 3: {
      require("internal/buffer").check_int24(this, value, offset, -0x800000, 0x7fffff);
      view.setUint16(offset, value & 0xffff, true);
      view.setInt8(offset + 2, Math.floor(value * 2 ** -16));
      break;
    }
    case 4: {
      require("internal/buffer").check_int32(this, value, offset, -0x80000000, 0x7fffffff);
      view.setInt32(offset, value, true);
      break;
    }
    case 5: {
      require("internal/buffer").check_int40(this, value, offset, -0x8000000000, 0x7fffffffff);
      view.setUint32(offset, value | 0, true);
      view.setInt8(offset + 4, Math.floor(value * 2 ** -32));
      break;
    }
    case 6: {
      require("internal/buffer").check_int48(this, value, offset, -0x800000000000, 0x7fffffffffff);
      view.setUint32(offset, value | 0, true);
      view.setInt16(offset + 4, Math.floor(value * 2 ** -32), true);
      break;
    }
    default: {
      require("internal/buffer").boundsError(byteLength, 6, "byteLength");
    }
  }
  return offset + byteLength;
}

export function writeIntBE(this: BufferExt, value, offset, byteLength) {
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  value = +value;

  switch (byteLength) {
    case 1: {
      require("internal/buffer").check_int8(this, value, offset, -0x80, 0x7f);
      view.setInt8(offset, value);
      break;
    }
    case 2: {
      require("internal/buffer").check_int16(this, value, offset, -0x8000, 0x7fff);
      view.setInt16(offset, value, false);
      break;
    }
    case 3: {
      require("internal/buffer").check_int24(this, value, offset, -0x800000, 0x7fffff);
      view.setUint16(offset + 1, value & 0xffff, false);
      view.setInt8(offset, Math.floor(value * 2 ** -16));
      break;
    }
    case 4: {
      require("internal/buffer").check_int32(this, value, offset, -0x80000000, 0x7fffffff);
      view.setInt32(offset, value, false);
      break;
    }
    case 5: {
      require("internal/buffer").check_int40(this, value, offset, -0x8000000000, 0x7fffffffff);
      view.setUint32(offset + 1, value | 0, false);
      view.setInt8(offset, Math.floor(value * 2 ** -32));
      break;
    }
    case 6: {
      require("internal/buffer").check_int48(this, value, offset, -0x800000000000, 0x7fffffffffff);
      view.setUint32(offset + 2, value | 0, false);
      view.setInt16(offset, Math.floor(value * 2 ** -32), false);
      break;
    }
    default: {
      require("internal/buffer").boundsError(byteLength, 6, "byteLength");
    }
  }
  return offset + byteLength;
}

export function writeUIntLE(this: BufferExt, value, offset, byteLength) {
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  value = +value;

  switch (byteLength) {
    case 1: {
      require("internal/buffer").check_int8(this, value, offset, 0, 0xff);
      view.setUint8(offset, value);
      break;
    }
    case 2: {
      require("internal/buffer").check_int16(this, value, offset, 0, 0xffff);
      view.setUint16(offset, value, true);
      break;
    }
    case 3: {
      require("internal/buffer").check_int24(this, value, offset, 0, 0xffffff);
      view.setUint16(offset, value & 0xffff, true);
      view.setUint8(offset + 2, Math.floor(value * 2 ** -16));
      break;
    }
    case 4: {
      require("internal/buffer").check_int32(this, value, offset, 0, 0xffffffff);
      view.setUint32(offset, value, true);
      break;
    }
    case 5: {
      require("internal/buffer").check_int40(this, value, offset, 0, 0xffffffffff);
      view.setUint32(offset, value | 0, true);
      view.setUint8(offset + 4, Math.floor(value * 2 ** -32));
      break;
    }
    case 6: {
      require("internal/buffer").check_int48(this, value, offset, 0, 0xffffffffffff);
      view.setUint32(offset, value | 0, true);
      view.setUint16(offset + 4, Math.floor(value * 2 ** -32), true);
      break;
    }
    default: {
      require("internal/buffer").boundsError(byteLength, 6, "byteLength");
    }
  }
  return offset + byteLength;
}

export function writeUIntBE(this: BufferExt, value, offset, byteLength) {
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  value = +value;

  switch (byteLength) {
    case 1: {
      require("internal/buffer").check_int8(this, value, offset, 0, 0xff);
      view.setUint8(offset, value);
      break;
    }
    case 2: {
      require("internal/buffer").check_int16(this, value, offset, 0, 0xffff);
      view.setUint16(offset, value, false);
      break;
    }
    case 3: {
      require("internal/buffer").check_int24(this, value, offset, 0, 0xffffff);
      view.setUint16(offset + 1, value & 0xffff, false);
      view.setUint8(offset, Math.floor(value * 2 ** -16));
      break;
    }
    case 4: {
      require("internal/buffer").check_int32(this, value, offset, 0, 0xffffffff);
      view.setUint32(offset, value, false);
      break;
    }
    case 5: {
      require("internal/buffer").check_int40(this, value, offset, 0, 0xffffffffff);
      view.setUint32(offset + 1, value | 0, false);
      view.setUint8(offset, Math.floor(value * 2 ** -32));
      break;
    }
    case 6: {
      require("internal/buffer").check_int48(this, value, offset, 0, 0xffffffffffff);
      view.setUint32(offset + 2, value | 0, false);
      view.setUint16(offset, Math.floor(value * 2 ** -32), false);
      break;
    }
    default: {
      require("internal/buffer").boundsError(byteLength, 6, "byteLength");
    }
  }
  return offset + byteLength;
}

export function writeFloatLE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").checkBounds(this, offset, 3);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setFloat32(offset, value, true);
  return offset + 4;
}

export function writeFloatBE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").checkBounds(this, offset, 3);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setFloat32(offset, value, false);
  return offset + 4;
}

export function writeDoubleLE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").checkBounds(this, offset, 7);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setFloat64(offset, value, true);
  return offset + 8;
}

export function writeDoubleBE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  value = +value;
  require("internal/buffer").checkBounds(this, offset, 7);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setFloat64(offset, value, false);
  return offset + 8;
}

export function writeBigInt64LE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_bigint64(this, value, offset, -0x8000000000000000n, 0x7fffffffffffffffn);
  if (typeof value !== "bigint") throw require("internal/buffer").ERR_INVALID_ARG_TYPE("value", "bigint", value);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setBigInt64(offset, value, true);
  return offset + 8;
}

export function writeBigInt64BE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_bigint64(this, value, offset, -0x8000000000000000n, 0x7fffffffffffffffn);
  if (typeof value !== "bigint") throw require("internal/buffer").ERR_INVALID_ARG_TYPE("value", "bigint", value);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setBigInt64(offset, value, false);
  return offset + 8;
}

export function writeBigUInt64LE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_bigint64(this, value, offset, 0n, 0xffffffffffffffffn);
  if (typeof value !== "bigint") throw require("internal/buffer").ERR_INVALID_ARG_TYPE("value", "bigint", value);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setBigUint64(offset, value, true);
  return offset + 8;
}

export function writeBigUInt64BE(this: BufferExt, value, offset) {
  if (offset === undefined) offset = 0;
  require("internal/buffer").check_bigint64(this, value, offset, 0n, 0xffffffffffffffffn);
  if (typeof value !== "bigint") throw require("internal/buffer").ERR_INVALID_ARG_TYPE("value", "bigint", value);
  const view = (this.$dataView ||= new DataView(this.buffer, this.byteOffset, this.byteLength));
  view.setBigUint64(offset, value, false);
  return offset + 8;
}

export function toJSON(this: BufferExt) {
  const type = "Buffer";
  const data = Array.from(this);
  return { type, data };
}

export function slice(this: BufferExt, start, end) {
  var { buffer, byteOffset, byteLength } = this;

  function adjustOffset(offset, length) {
    // Use Math.trunc() to convert offset to an integer value that can be larger
    // than an Int32. Hence, don't use offset | 0 or similar techniques.
    offset = Math.trunc(offset);
    if (offset === undefined || offset !== offset) {
      return 0;
    } else if (offset < 0) {
      offset += length;
      return offset > 0 ? offset : 0;
    } else {
      return offset < length ? offset : length;
    }
  }

  var start_ = adjustOffset(start, byteLength);
  var end_ = end !== undefined ? adjustOffset(end, byteLength) : byteLength;
  return new $Buffer(buffer, byteOffset + start_, end_ > start_ ? end_ - start_ : 0);
}

$getter;
export function parent(this: BufferExt) {
  return $isObject(this) && this instanceof $Buffer ? this.buffer : undefined;
}

$getter;
export function offset(this: BufferExt) {
  return $isObject(this) && this instanceof $Buffer ? this.byteOffset : undefined;
}

export function inspect(this: BufferExt, recurseTimes, ctx) {
  return Bun.inspect(this);
}
