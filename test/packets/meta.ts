import * as assert from 'assert';

import { BasePacket } from '../../src/packets/base';

class MetaPacket extends BasePacket<{}, {}> {
  static type = 0;
  type = 0;
}

describe('packets.meta tests', () => {
  const packet = MetaPacket.fromObject({});

  it('sould be able to encode/decode packet metadata', () => {
    const copy = MetaPacket.fromRaw(packet.toRaw());
    assert.equal(packet.toRaw().toString('hex'), copy.toRaw().toString('hex'));
  });

  it('should be able to return it\'s raw size', () => {
    assert.equal(packet.toRaw().length, packet.getTotalSize());
  });

});
