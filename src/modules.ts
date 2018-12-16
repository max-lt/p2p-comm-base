import {
  PoolPacketHandler, PeerPacketHandler,
  Module, ModuleI, NodePacketHandler, PeerPacketHandlerFactory, PoolPacketHandlerFactory, NodePacketHandlerFactory
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

export interface ModuleStore {
  addModule(mod: Module): void;
}

function handlePacketFactory(modules: (NodePacketHandler | PeerPacketHandler)[]) {
  return function (packet: AbstractPacket) {
    let handled = false;
    for (const mod of modules) {
      handled = mod.handlePacket(packet);
      if (handled) {
        return true;
      }
    }
    return false;
  };
}

function nodePacketHandlerAggregateFactory(): NodePacketHandlerFactory & ModuleStore {
  const factories: Module[] = [];
  return {
    create(parent: Node): NodePacketHandler {
      const modules: PeerPacketHandler[] = factories.map((f) => f.Node.create(parent));
      return {
        handlePacket: handlePacketFactory(modules)
      };
    },
    addModule(mod: Module) {
      if (!mod.Node) { return; }
      logger.debug('Node:Registering handler', mod.Peer['name']);
      factories.push(mod);
    }
  };
}

function poolPacketHandlerAggregateFactory(): PoolPacketHandlerFactory & ModuleStore {
  const factories: Module[] = [];
  return {
    create(pool: Pool, parentPoolCtx: object): PoolPacketHandler {
      const parent = pool;

      // Create isolated context map in pool context
      const ictxMap: Map<Module, IsolatedContext> = new Map;
      parentPoolCtx[ictxSymbol] = ictxMap;

      const modules: PoolPacketHandler[] = factories.map((f) => {
        const ictx = {};

        // Linking module instance to its isolated context
        parentPoolCtx[ictxSymbol].set(f, ictx);

        return f.Pool.create(parent, ictx);
      });

      return {
        bindPeer(peer: Peer) {
          for (const mod of modules) {
            mod.bindPeer(peer);
          }
        },
        beforeBroadcast(packet: AbstractPacket) {
          let handled = false;
          for (const mod of modules) {
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
      };
    },
    addModule(mod: Module) {
      if (!mod.Pool) { return; }
      logger.debug('Pool:Registering handler', mod.Pool['name']);
      factories.push(mod);
    }
  };
}

function peerPacketHandlerAggregateFactory(): PeerPacketHandlerFactory & ModuleStore {
  const factories: Module[] = [];
  return {
    create(peer: Peer, parentPoolCtx: object): PeerPacketHandler {
      const parent = peer;
      const modules: PeerPacketHandler[] = factories.map((f) => {
        const ictx = parentPoolCtx[ictxSymbol].get(f);
        return f.Peer.create(parent, ictx);
      });
      return {
        handlePacket: handlePacketFactory(modules)
      };
    },
    addModule(mod: Module) {
      if (!mod.Peer) { return; }
      logger.debug('Peer:Registering handler', mod.Peer['name']);
      factories.push(mod);
    }
  };
}

export class CompoundModule implements ModuleI {

  Node: NodePacketHandlerFactory & ModuleStore;
  Pool: PoolPacketHandlerFactory & ModuleStore;
  Peer: PeerPacketHandlerFactory & ModuleStore;
  packets: Array<(typeof AbstractPacket)>;

  constructor(modules?: Module[]) {
    this.create(modules);
  }

  protected create(modules?: Module[]) {
    this.Node = nodePacketHandlerAggregateFactory();
    this.Pool = poolPacketHandlerAggregateFactory();
    this.Peer = peerPacketHandlerAggregateFactory();
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
