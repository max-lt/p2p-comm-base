import { AbstractPacket } from './packets/abstract';
import { Pool } from './pool';
import { Peer } from './peer';

// tslint:disable:no-empty-interface

export declare class PeerPacketHandler {
  constructor(peer: Peer);
  static create(peer: Peer): PeerPacketHandler;
  handlePacket(packet, next?): any;
}

export declare class PoolPacketHandler {
  constructor(pool: Pool);
  static create(pool: Pool): PoolPacketHandler;
  handlePacket(packet, next?): any;
  bindPeer(peer: Peer, next?);
}

export declare class NodePacketHandler {
  handlePacket(parent, packet, next?): any;
}

export interface ModuleI {
  Node: typeof NodePacketHandler;
  Pool: typeof PoolPacketHandler;
  Peer: typeof PeerPacketHandler;
  packets: Array<(typeof AbstractPacket)>;
}

interface ModuleOptionsI {
  Node?: typeof NodePacketHandler;
  Pool?: typeof PoolPacketHandler;
  Peer?: typeof PeerPacketHandler;
  packets?: Array<(typeof AbstractPacket)>;
}

export class Module implements ModuleI {

  Node: typeof NodePacketHandler;
  Pool: typeof PoolPacketHandler;
  Peer: typeof PeerPacketHandler;
  packets: Array<(typeof AbstractPacket)>;

  private constructor() { }

  static create(opts: ModuleOptionsI) {
    return (new this).create(opts);
  }

  private create(opts: ModuleOptionsI): this {
    this.Node = opts.Node;
    this.Pool = opts.Pool;
    this.Peer = opts.Peer;
    this.packets = opts.packets;
    return this;
  }
}
