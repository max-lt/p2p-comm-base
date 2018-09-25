import { EventEmitter } from 'events';
import { BasePeer, Peer } from './peer';
import { Logger, SimpleLogger } from './logger';
import { AbstractServer, AbstractTransport } from './transport';
import { wait } from './util/wait';
import { Module } from '.';
import { AbstractPacket } from './packets/abstract';
import { PoolPacketHandler } from './module';

/**
 * socket
 */
export interface Pool extends EventEmitter {

  logger: Logger;

  nodeId: string;
  host: string;
  port: number;

  listen(port?: number);

  broadcast(data: AbstractPacket);

  on(event: 'peer', listener: (peer: Peer) => void): this;
  on(event: 'data', listener: (data: Buffer) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'connection', listener: (transport: AbstractTransport) => void): this;
  on(event: 'listening', listener: (data: any) => void): this;

  once(event: 'peer', listener: (peer: Peer) => void): this;
  once(event: 'data', listener: (data: Buffer) => void): this;
  once(event: 'error', listener: (err: Error) => void): this;
  once(event: 'connection', listener: (transport: AbstractTransport) => void): this;
  once(event: 'listening', listener: (data: any) => void): this;

}

export class BasePool<T extends AbstractTransport> extends EventEmitter implements Pool {

  litening = false;

  // Defines either handshake is mandatory or not
  handshake: boolean;

  peers: PeerSet<T>;
  logger: Logger;
  server: AbstractServer<T>;

  nodeId: string;
  host: string;
  port: number;

  seeds: number[];
  filter: Set<string>;

  maxInbound = 8;
  maxOutbound = 8;

  moduleHandler: PoolPacketHandler;

  createTransport: (port: number) => AbstractTransport;

  constructor(
    opts: { seed: number[], nodeId },
    Transport: typeof AbstractTransport,
    Server: typeof AbstractServer,
    private mod: Module
  ) {
    super();
    this.port = 0;
    this.handshake = true;
    this.filter = new Set();
    this.peers = new PeerSet;
    this.logger = new SimpleLogger('pool');
    this.server = Server.create();
    this.seeds = opts && opts.seed || [];
    this.nodeId = opts.nodeId;

    this.moduleHandler = mod.Pool.create(this);
    this.createTransport = Transport.connect;

    this.logger.info('Created pool');
    this.initServer();
  }

  initServer() {
    this.server.on('error', (err) => {
      this.emit('error', err);
    });

    // Inbound
    this.server.on('connection', (transport) => {
      this.addInbound(transport);
      this.emit('connection', transport);
      this.logger.debug('Peer connection');
    });

    this.server.on('listening', () => {
      const data: any = this.server.address();
      this.logger.info('Pool server listening on.', data);
      this.port = data.port;
      this.litening = true;
      this.emit('listening', data);
      this.discoverSeeds();
    });
  }

  addInbound(transport: T) {
    const opts = { filter: this.filter, handshake: this.handshake };
    const peer: Peer = BasePeer.fromInbound(opts, transport, this.mod);
    this.bindPeer(peer);
  }

  discoverSeeds(seeds?: number[]) {
    (seeds || this.seeds).forEach((seed) => {
      try {
        this.addOutbound(seed);
      } catch (err) {
        this.logger.error('Failed to connect to seed', seed, err.message);
      }
    });
  }

  private async addOutbound(port: number) {
    const opts = { port, filter: this.filter, handshake: this.handshake };
    let i = 4;
    while (i--) {
      await wait(1000);
      const peer = BasePeer.fromOutbound(opts, this.mod);
      this.logger.log('Outbound peer', peer.port);
      this.bindPeer(peer);
      try {
        await peer.connect(this.createTransport(port));
        return;
      } catch (err) {
        this.logger.warn(`Failed to connect to peer: ${err.message}`);
      }
    }
  }

  private bindPeer(peer: Peer) {
    this.peers.add(peer);

    this.moduleHandler.bindPeer(peer);

    peer.on('error', (err) => {
      this.logger.error(err);
    });

    peer.once('close', (connected) => {
      this.logger.debug(`Peer close, was ${connected ? 'connected' : 'disconnected'}`);
      this.peers.delete(peer);
      this.logger.log(`${this.peers.size} peers connected.`);
    });

    peer.on('packet', (packet) => {
      this.moduleHandler.handlePacket(packet, null);
    });
  }

  listen(port?: number) {
    this.server.listen(port);
  }

  broadcast(packet: AbstractPacket) {
    this.logger.debug('m >>', packet.getTypeName(), packet.packetId, this.filter.has(packet.packetId));
    this.filter.add(packet.packetId);
    this.peers.broadcast(packet.toRaw());
  }

}

class PeerSet<T extends AbstractTransport> extends Set<Peer> {
  broadcast(data: Buffer, exceptions?: PeerSet<T>) {
    for (const peer of this) {
      if (exceptions && exceptions.has(peer)) {
        continue;
      }
      peer.write(data);
    }
  }
}