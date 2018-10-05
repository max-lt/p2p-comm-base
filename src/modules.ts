import {
  PoolPacketHandler, PeerPacketHandler,
  Module, ModuleI, NodePacketHandler
} from './module';

import { AbstractPacket } from './packets/abstract';
import { Peer } from './peer';
import { Pool } from './pool';
import { SimpleLogger } from './logger';

const logger = new SimpleLogger('mods');
const contexts: Map<Module, symbol> = new Map;

const ictxSymbol = Symbol('Isolated context');

// tslint:disable-next-line:no-empty-interface
declare interface IsolatedContext extends Object { }

class NodePacketHandlerAggregate {

  factories: Module[];
  modules: NodePacketHandler[];
  parent: Node;

  constructor() {
    this.factories = [];
    this.modules = [];
  }

  create(parent: Node) {

    return this;
  }

  handlePacket(packet): boolean {
    logger.debug('Node:handle packet');
    let handled = false;
    for (const mod of this.modules) {
      handled = mod.handlePacket(packet);
      if (handled) {
        return true;
      }
    }
    return false;
  }

  addModule(mod: Module) {
    if (!mod.Node) { return; }
    logger.debug('Node:Registering handler', mod.Node['name']);
    this.factories.push(mod);
  }
}

class PoolPacketHandlerAggregate {

  factories: Module[];
  modules: PoolPacketHandler[];
  parent: Pool;

  constructor() {
    this.factories = [];
    this.modules = [];
  }

  create(parent: Pool, parentPoolCtx) {
    // logger.debug('Pool:create', parentPoolCtx);
    this.parent = parent;

    // Create isolated context map in pool context
    const ictxMap: Map<Module, IsolatedContext> = new Map;
    parentPoolCtx[ictxSymbol] = ictxMap;

    this.modules = this.factories.map((f) => {
      const ictx = {};

      // Linking module instance to its isolated context
      parentPoolCtx[ictxSymbol].set(f, ictx);

      return f.Pool.create(parent, ictx);
    });

    return this;
  }

  beforeBroadcast(packet: AbstractPacket) {
    let handled = false;
    for (const mod of this.modules) {
      if (!mod.beforeBroadcast) {
        continue;
      }
      handled = mod.beforeBroadcast(packet);
      if (handled) {
        return true;
      }
    }
    return false;
  }

  bindPeer(peer: Peer) {
    for (const mod of this.modules) {
      mod.bindPeer(peer);
    }
  }

  addModule(mod: Module) {
    if (!mod.Pool) { return; }
    logger.debug('Pool:Registering handler', mod.Pool['name']);
    this.factories.push(mod);
  }
}

class PeerPacketHandlerAggregate {

  factories: Module[];
  modules: PeerPacketHandler[];
  parent: Peer;

  constructor() {
    this.factories = [];
    this.modules = [];
  }

  create(parent: Peer, parentPoolCtx) {
    // logger.debug('Peer:create', parentPoolCtx);
    this.parent = parent;

    this.modules = this.factories.map((f) => {
      const ictx = parentPoolCtx[ictxSymbol].get(f);
      return f.Peer.create(parent, ictx);
    });

    return this;
  }

  handlePacket(packet): boolean {
    // logger.debug('Peer:handle packet');
    let handled = false;
    for (const mod of this.modules) {
      handled = mod.handlePacket(packet);
      if (handled) {
        return true;
      }
    }
    return false;
  }

  addModule(mod: Module) {
    if (!mod.Peer) { return; }
    logger.debug('Peer:Registering handler', mod.Peer['name']);
    this.factories.push(mod);
  }
}

export class CompoundModule implements ModuleI {

  Node: NodePacketHandlerAggregate;
  Pool: PoolPacketHandlerAggregate;
  Peer: PeerPacketHandlerAggregate;
  packets: Array<(typeof AbstractPacket)>;

  static create(modules?: Module[]) {
    return (new this).create(modules);
  }

  private create(modules?: Module[]) {
    this.Node = new NodePacketHandlerAggregate;
    this.Pool = new PoolPacketHandlerAggregate;
    this.Peer = new PeerPacketHandlerAggregate;
    this.packets = [];

    if (modules) {
      for (const mod of modules) {
        this.addModule(mod);
      }
    }

    return this;
  }

  addModule(mod: Module) {
    contexts.set(mod, Symbol());
    this.Node.addModule(mod);
    this.Pool.addModule(mod);
    this.Peer.addModule(mod);
    this.packets.push(...mod.packets);

    return this;
  }

}
