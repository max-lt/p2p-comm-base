import { AbstractPacket, OAbstractPacketI, IAbstractPacketI } from './abstract';
import { PacketMetaI } from './util';

// tslint:disable-next-line:no-empty-interface
export interface IBasePacketI extends IAbstractPacketI { }
// tslint:disable-next-line:no-empty-interface
export interface OBasePacketI extends OAbstractPacketI { }

export class BasePacket<II = {}, OI = {}> extends AbstractPacket {

  static fromRaw(data: Buffer) {
    return (new this()).fromRaw(data);
  }

  static fromObject(obj) {
    return (new this()).fromOptions(obj);
  }

  protected fromRaw(buf: Buffer) {
    super.fromRaw(buf);
    return this;
  }

  protected fromOptions(opts: II) {
    super.fromOptions(opts);
    return this;
  }

  toRaw(): Buffer {
    return this.encodeRawMeta();
  }

  toJSON(): OI & PacketMetaI {
    return Object.assign(this.getMeta());
  }

  getSize(): number {
    return 0;
  }

}
