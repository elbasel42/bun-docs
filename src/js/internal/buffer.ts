// XXX: should more of this file be c++ imports?
const { validateNumber, validateInteger } = require("internal/validators");
const { ERR_INVALID_ARG_TYPE, ERR_OUT_OF_RANGE, ERR_BUFFER_OUT_OF_BOUNDS } = require("internal/errors");
const { isAnyArrayBuffer } = require("node:util/types");

const BufferFrom1 = $newCppFunction("JSBuffer.cpp", "jsFunction_BufferFrom_Array", 0);
const BufferFrom2 = $newCppFunction("JSBuffer.cpp", "jsFunction_BufferFrom_ArrayBuffer", 0);
const BufferFrom4 = $newCppFunction("JSBuffer.cpp", "jsFunction_BufferFrom_Size", 0);
const BufferFrom5 = $newCppFunction("JSBuffer.cpp", "jsFunction_BufferFrom_String", 0);

const ArrayIsArray = Array.isArray;

function boundsError(value, length, type?) {
  if (Math.floor(value) !== value) {
    validateNumber(value, type);
    throw ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
  }
  if (length < 0) throw ERR_BUFFER_OUT_OF_BOUNDS();
  throw ERR_OUT_OF_RANGE(type || "offset", `>= ${type ? 1 : 0} and <= ${length}`, value);
}

function checkBounds(buf, offset, byteLength) {
  validateNumber(offset, "offset");
  if (buf[offset] === undefined || buf[offset + byteLength] === undefined)
    boundsError(offset, buf.length - (byteLength + 1));
}

function checkInt(value, min, max, buf, offset, byteLength) {
  if (value > max || value < min) {
    const n = typeof min === "bigint" ? "n" : "";
    let range;
    if (byteLength > 3) {
      if (min === 0 || min === 0n) {
        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
      } else {
        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and ` + `< 2${n} ** ${(byteLength + 1) * 8 - 1}${n}`;
      }
    } else {
      range = `>= ${min}${n} and <= ${max}${n}`;
    }
    throw ERR_OUT_OF_RANGE("value", range, value);
  }
  checkBounds(buf, offset, byteLength);
}

function check_read(buf, offset, byteLength) {
  validateInteger(offset, "offset");
  const type = buf.length - byteLength;
  if (!(offset >= 0 && offset <= type)) boundsError(offset, type);
}

function check_int8(buf, value, offset, min, max) {
  validateNumber(offset, "offset");
  if (value > max || value < min) throw ERR_OUT_OF_RANGE("value", `>= ${min} and <= ${max}`, value);
  if (buf[offset] === undefined) boundsError(offset, buf.length - 1);
}

function check_int16(buf, value, offset, min, max) {
  checkInt(value, min, max, buf, offset, 1);
}

function check_int24(buf, value, offset, min, max) {
  checkInt(value, min, max, buf, offset, 2);
}

function check_int32(buf, value, offset, min, max) {
  checkInt(value, min, max, buf, offset, 3);
}

function check_int40(buf, value, offset, min, max) {
  checkInt(value, min, max, buf, offset, 4);
}

function check_int48(buf, value, offset, min, max) {
  checkInt(value, min, max, buf, offset, 5);
}

function check_bigint64(buf, value, offset, min, max) {
  checkInt(value, min, max, buf, offset, 7);
}

function fromString(string, encoding) {
  return BufferFrom5(string, encoding);
}

function fromArrayBuffer(arrayBuffer: ArrayBuffer, byteOffset?: number, length?: number) {
  return BufferFrom2(arrayBuffer, byteOffset, length);
}

function fromObject(obj) {
  if (obj.length !== undefined || isAnyArrayBuffer(obj.buffer)) {
    if (typeof obj.length !== "number") {
      return BufferFrom4(0);
    }
    return fromArrayLike(obj);
  }
  if (obj.type === "Buffer" && ArrayIsArray(obj.data)) {
    return fromArrayLike(obj.data);
  }
}

function fromArrayLike(obj) {
  if (obj.length <= 0) return BufferFrom4(0);
  if (obj.length < Buffer.poolSize >>> 1) {
    //   if (obj.length > poolSize - poolOffset) createPool();
    //   const b = new FastBuffer(allocPool, poolOffset, obj.length);
    //   TypedArrayPrototypeSet(b, obj, 0);
    //   poolOffset += obj.length;
    //   alignPool();
    //   return b;
  }
  return BufferFrom1(obj);
}

export default {
  validateNumber,
  validateInteger,
  ERR_INVALID_ARG_TYPE,
  ERR_OUT_OF_RANGE,
  boundsError,
  checkBounds,
  checkInt,
  check_read,
  check_int8,
  check_int16,
  check_int24,
  check_int32,
  check_int40,
  check_int48,
  check_bigint64,
  fromString,
  fromObject,
  fromArrayBuffer,
};
