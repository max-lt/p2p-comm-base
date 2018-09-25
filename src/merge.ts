import { PoolPacketHandler, PeerPacketHandler, Module } from './module';
import { AbstractPacket } from './packets/abstract';

export function mergeModules(modules: Module[]): Module {
  const packets: Array<Array<(typeof AbstractPacket)>> = [];

  class PoolPacketHandlerAggregate {

    modules: PoolPacketHandler[];

    static create(parent) {
      return (new this()).create(parent);
    }

    private create(parent) {
      this.modules = modules.map((m) => m.Pool.create(parent));
      return this;
    }

    bindPeer(peer) {
      for (const mod of this.modules) {
        mod.bindPeer(peer);
      }
    }
  }

  class PeerPacketHandlerAggregate {

    modules: PeerPacketHandler[];

    static create(parent) {
      return (new this()).create(parent);
    }

    private create(parent) {
      this.modules = modules.map((m) => m.Peer.create(parent));
      return this;
    }

    handlePacket(packet): boolean {
      let handled = false;
      for (const mod of this.modules) {
        handled = mod.handlePacket(packet);
        if (handled) {
          return true;
        }
      }
      return false;
    }
  }

  for (const mod of modules) {
    packets.push(mod.packets);
  }

  return Module.create({
    Peer: PeerPacketHandlerAggregate,
    Pool: PoolPacketHandlerAggregate,
    packets: [].concat.apply([], packets)
  });
}
