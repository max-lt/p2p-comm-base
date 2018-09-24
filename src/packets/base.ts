import { AbstractPacket, OAbstractPacket, IAbstractPacket } from './abstract';
import { OMeta } from './util';

// tslint:disable-next-line:no-empty-interface
export interface IBasePacket extends IAbstractPacket { }
// tslint:disable-next-line:no-empty-interface
export interface OBasePacket extends OAbstractPacket { }

export class BasePacket<II, OI> extends AbstractPacket {

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

  toJSON(): OI & OMeta {
    return Object.assign(this.getMeta());
  }

  getSize(): number {
    return 0;
  }

}
