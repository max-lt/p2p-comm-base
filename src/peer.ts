import { EventEmitter } from 'events';
import { format } from 'util';
import * as assert from 'assert';

import { SimpleLogger, Logger } from './logger';
import { Timer } from './util/timer';
import { BufferParser } from './parser';
import { AbstractTransport } from './transport';

import { Module } from '.';
import { AbstractPacket } from './packets/abstract';
import { PeerPacketHandler } from './module';

export interface Peer extends EventEmitter {

  id: string;
  port: number;
  host: string;

  outbound: boolean;
  connected: boolean;
  destroyed: boolean;

  logger: Logger;

  // TODO: filter with it's own module ?
  filter: Set<string>;

  on(event: 'connect', listener: () => void): this;
  on(event: 'close', listener: (had_error: boolean) => void): this;
  on(event: 'error', listener: (err: Error) => void): void;
  on(event: 'destroy', listener: () => void): void;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  once(event: 'connect', listener: () => void): this;
  once(event: 'close', listener: (had_error: boolean) => void): this;
  once(event: 'error', listener: (err: Error) => void): void;
  once(event: 'destroy', listener: () => void): void;
  once(event: string | symbol, listener: (...args: any[]) => void): this;

  destroy();

  error(err: Error | string);

  connect(transport: AbstractTransport);

  write(data: Buffer);

  send(packet: AbstractPacket);
}


export class BasePeer/* <T extends AbstractTransport> */ extends EventEmitter implements Peer {

  // debug
  protected static counter = 0;

  logger: Logger;
  transport: AbstractTransport;
  parser: BufferParser;

  outbound = false;
  connected = false;
  destroyed = false;

  version = -1;

  id: string;
  port: number;
  host: string;
  filter: Set<string>;

  connectTimeout: Timer;

  // pingTimeout: Timer;
  // pongTimeout: Timer;

  moduleHandler: PeerPacketHandler;

  constructor({ port, filter }, mod: Module) {
    super();
    this.port = port;

    this.connectTimeout = new Timer(5 * 1000);

    this.logger = new SimpleLogger('peer:' + BasePeer.counter++);
    this.filter = filter;
    this.parser = new BufferParser(mod.packets);
    this.init();

    // this.pingTimeout = new Timer(60 * 1000);
    // this.pongTimeout = new Timer(10 * 1000);

    this.moduleHandler = mod.Peer.create(this);
  }

  static fromInbound(options, transport, mod) {
    const peer = new this(options, mod);
    peer.accept(transport);
    return peer;
  }

  static fromOutbound(options, mod) {
    const peer = new this(options, mod);
    peer.outbound = true;
    return peer;
  }

  /**
   * Accept an inbound transport.
   */
  protected accept(transport: AbstractTransport) {
    this.connected = true;
    this.outbound = false;
    this.bind(transport);
    // this.expectHandshake();
  }

  /**
   * Create an outbound transport.
   */
  async connect(transport: AbstractTransport): Promise<void> {
    const port = this.port;
    this.logger.debug('Connecting to', port);
    this.connected = false;

    const error = await new Promise<Error | null>((resolve) => {
      this.connectTimeout.start(() => resolve(new Error('timeout')));
      transport.once('connect', () => resolve(null));
      transport.once('error', (err) => resolve(err));
    });

    this.connectTimeout.clear();

    if (error) {
      this.logger.debug('Failed to connect to', port);
      this.destroy();
      throw error;
    }

    this.port = port;
    this.connected = true;
    this.bind(transport);
    this.logger.log('EMIT CONNECT');
    this.emit('connect');
  }

  protected init() {

    this.parser.on('packet', (packet) => {
      try {
        this.moduleHandler.handlePacket(packet);
      } catch (e) {
        this.error(e);
        this.destroy();
      }
    });

    this.parser.on('error', (err) => {
      this.error(err);
    });

  }

  protected bind(transport: AbstractTransport) {
    assert(!this.transport, 'already bound');
    this.transport = transport;

    this.transport.on('error', (err: Error) => {
      this.logger.error('Peer error', err);
      this.error(err);
      this.destroy();
    });

    this.transport.on('data', (data: Buffer) => {
      this.feedParser(data);
    });

    this.transport.once('close', () => {
      console.log('transport close');
      this.destroy();
    });
  }

  protected feedParser(data: Buffer) {
    return this.parser.feed(data);
  }

  /* protected */
  error(err: Error | string) {
    if (typeof err === 'string') {
      const msg = format.apply(null, arguments);
      err = new Error(msg);
    }
    this.emit('error', err);
  }

  destroy() {
    this.logger.debug('destroying');
    if (this.destroyed) {
      this.logger.debug('already destroyed!');
      return;
    }

    this.connectTimeout.clear();
    // this.handshakeTimeout.clear();

    this.emit('close', this.connected);

    if (this.connected) {
      this.transport.destroy();
    }

    this.destroyed = true;
    this.connected = false;

    this.emit('destroy');
  }

  write(data: Buffer) {
    this.transport.write(data);
  }

  send(packet: AbstractPacket) {
    assert(!this.filter.has(packet.packetId), 'Send should not be used to braodcast');
    this.logger.debug('m ->', packet.getTypeName(), packet.packetId);
    this.write(packet.toRaw());
  }
}
