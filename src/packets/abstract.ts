import * as crypto from 'crypto';
import { PacketMetaI, metaLength, decodeRawMeta, metaLengths } from './util';
// import { types } from './types';

// const typesNames = Object.entries(types).reduce((acc, [k, v]) => (acc[v] = k, acc), {});

// tslint:disable-next-line:no-empty-interface
export interface IAbstractPacketI { }
export interface OAbstractPacketI {
  packetId: string;
  date: Date;
}
export abstract class AbstractPacket implements OAbstractPacketI {

  static type = -1;
  type = -1;

  packetId: string;
  date: Date;

  static fromRaw(data: Buffer): AbstractPacket {
    throw new Error('Not overwrited');
  }

  static fromObject(obj: Object) {
    throw new Error('Not overwrited');
  }

  abstract toRaw(): Buffer;

  abstract toJSON(): Object;

  protected fromOptions(opts: IAbstractPacketI) {
    this.packetId = crypto.randomBytes(8).toString('hex');
    this.date = new Date();
  }

  protected fromRaw(buf: Buffer) {
    const meta = this.decodeRawMeta(buf);
    this.packetId = meta.packetId;
    this.date = meta.date;
    this.type = meta.type;
  }

  protected encodeRawMeta(): Buffer {
    const meta = Buffer.alloc(metaLength);
    meta.writeUInt8(this.type, 0);
    meta.writeUInt32BE(this.getSize(), metaLengths.TYPE);
    meta.writeDoubleBE(+this.date, metaLengths.TYPE + metaLengths.LEN);
    meta.write(this.packetId, metaLengths.TYPE + metaLengths.LEN + metaLengths.DATE, this.packetId.length / 2, 'hex');
    return meta;
  }

  protected decodeRawMeta(buf: Buffer): PacketMetaI {
    return decodeRawMeta(buf);
  }

  protected getMeta(): PacketMetaI {
    return {
      packetId: this.packetId,
      date: this.date,
      type: this.type,
      size: this.getSize(),
    };
  }

  abstract getSize(): number;

  getTotalSize() {
    return this.getSize() + metaLength;
  }

  getTypeName() {
    // return typesNames[this.type] || `INVALID (${this.type})`;
    return `NOT-IMPLEMENTED (${this.type})`;
  }
}

export abstract class EmptyPacket extends AbstractPacket {
  protected fromRaw(buf: Buffer): this {
    super.fromRaw(buf);
    return this;
  }

  protected fromOptions(): this {
    super.fromOptions({});
    return this;
  }

  toJSON(): PacketMetaI {
    return Object.assign(this.getMeta(), { type: this.type });
  }

  toRaw(): Buffer {
    return this.encodeRawMeta();
  }

  getSize() {
    return 0;
  }
}
