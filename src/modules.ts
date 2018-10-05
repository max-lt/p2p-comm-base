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
    // this.contexts = new WeakMap;
    this.factories = [];
    this.modules = [];
  }

  create(parent: Pool, parentPoolCtx) {
    logger.debug('Pool:create', parentPoolCtx);
    this.parent = parent;
    this.modules = this.factories.map((f) => {
      const moduleSymbol = contexts.get(f);
      const ctx = parentPoolCtx[moduleSymbol] = {};
      return f.Pool.create(parent, ctx);
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
    logger.debug('Peer:create', parentPoolCtx);
    this.parent = parent;
    // this.modules = modules.map((m) => m.Peer.create(parent, isolatedCtx));

    this.modules = this.factories.map((f) => {
      const moduleSymbol = contexts.get(f);
      const ctx = parentPoolCtx[moduleSymbol];
      const mod = f.Peer.create(parent, ctx);
      return mod;
    });

    return this;
  }

  handlePacket(packet): boolean {
    logger.debug('Peer:handle packet');
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
    logger.debug('Main:Registering module', mod);

    contexts.set(mod, Symbol());
    this.Node.addModule(mod);
    this.Pool.addModule(mod);
    this.Peer.addModule(mod);
    this.packets.push(...mod.packets);

    return this;
  }

}
