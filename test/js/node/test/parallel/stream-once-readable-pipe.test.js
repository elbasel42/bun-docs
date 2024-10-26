//#FILE: test-stream-once-readable-pipe.js
//#SHA1: 4f12e7a8a1c06ba3cef54605469eb67d23306aa3
//-----------------
'use strict';

const { Readable, Writable } = require('stream');

// This test ensures that if have 'readable' listener
// on Readable instance it will not disrupt the pipe.

test('pipe works with readable listener before pipe', (done) => {
  let receivedData = '';
  const w = new Writable({
    write: (chunk, env, callback) => {
      receivedData += chunk;
      callback();
    },
  });

  const data = ['foo', 'bar', 'baz'];
  const r = new Readable({
    read: () => {},
  });

  const readableSpy = jest.fn();
  r.once('readable', readableSpy);

  r.pipe(w);
  r.push(data[0]);
  r.push(data[1]);
  r.push(data[2]);
  r.push(null);

  w.on('finish', () => {
    expect(receivedData).toBe(data.join(''));
    expect(readableSpy).toHaveBeenCalledTimes(1);
    done();
  });
});

test('pipe works with readable listener after pipe', (done) => {
  let receivedData = '';
  const w = new Writable({
    write: (chunk, env, callback) => {
      receivedData += chunk;
      callback();
    },
  });

  const data = ['foo', 'bar', 'baz'];
  const r = new Readable({
    read: () => {},
  });

  r.pipe(w);
  r.push(data[0]);
  r.push(data[1]);
  r.push(data[2]);
  r.push(null);

  const readableSpy = jest.fn();
  r.once('readable', readableSpy);

  w.on('finish', () => {
    expect(receivedData).toBe(data.join(''));
    expect(readableSpy).toHaveBeenCalledTimes(1);
    done();
  });
});

//<#END_FILE: test-stream-once-readable-pipe.js
