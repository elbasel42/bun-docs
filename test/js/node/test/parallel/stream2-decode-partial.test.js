//#FILE: test-stream2-decode-partial.js
//#SHA1: bc4bec1c0be7857c86b9cd75dbb76b939d9619ab
//-----------------
'use strict';
const { Readable } = require('stream');

test('Readable stream decodes partial UTF-8 characters correctly', async () => {
  let buf = '';
  const euro = Buffer.from([0xE2, 0x82, 0xAC]);
  const cent = Buffer.from([0xC2, 0xA2]);
  const source = Buffer.concat([euro, cent]);

  const readable = Readable({ encoding: 'utf8' });
  readable.push(source.slice(0, 2));
  readable.push(source.slice(2, 4));
  readable.push(source.slice(4, 6));
  readable.push(null);

  for await (const chunk of readable) {
    buf += chunk;
  }

  expect(buf).toBe('€¢');
});

//<#END_FILE: test-stream2-decode-partial.js
