import { AbstractPacket } from './packets/abstract';
import { Pool } from './pool';
import { Peer } from './peer';

// tslint:disable:no-empty-interface

export interface PeerPacketHandlerFactory {
  create(peer: Peer, ctx: object): PeerPacketHandler;
}

export interface PeerPacketHandler {
  handlePacket(packet): boolean;
}

export interface PoolPacketHandlerFactory {
  create(pool: Pool, ctx: object): PoolPacketHandler;
}

export interface PoolPacketHandler {
  bindPeer(peer: Peer);
  beforeBroadcast?(packet: AbstractPacket): boolean;
}

export interface NodePacketHandlerFactory {
  create(node: Node): NodePacketHandler;
}

export interface NodePacketHandler {
  handlePacket(packet): boolean;
}

export interface ModuleI {
  Node: NodePacketHandlerFactory;
  Pool: PoolPacketHandlerFactory;
  Peer: PeerPacketHandlerFactory;
  packets: Array<(typeof AbstractPacket)>;
}

interface ModuleOptionsI {
  Node?: NodePacketHandlerFactory;
  Pool?: PoolPacketHandlerFactory;
  Peer?: PeerPacketHandlerFactory;
  packets?: Array<(typeof AbstractPacket)>;
}

export class ModuleBuilder implements ModuleI {
  Node: NodePacketHandlerFactory;
  Pool: PoolPacketHandlerFactory;
  Peer: PeerPacketHandlerFactory;
  packets: Array<(typeof AbstractPacket)>;

  protected constructor(opts: ModuleOptionsI) {
    this.create(opts);
  }

  protected create(opts: ModuleOptionsI): this {
    this.Node = opts.Node;
    this.Pool = opts.Pool;
    this.Peer = opts.Peer;
    this.packets = opts.packets;
    return this;
  }
}

export class Module extends ModuleBuilder { }
