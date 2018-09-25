import { Pool } from './pool';

import * as assert from 'assert';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { AbstractTransport } from './transport';

import { Peer } from './peer';

export interface Node {

  id: string;
  listen(port?: number);

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


export abstract class BaseNode<T extends AbstractTransport> extends EventEmitter implements Node {

  id: string;
  pool: Pool;

  constructor(/*{ seed }, Transport: typeof AbstractTransport, Server: typeof AbstractServer, mods: Module*/) {
    super();
    this.id = randomBytes(8).toString('hex');
    // this.pool = new BasePool<T>({ seed, nodeId }, Transport, Server, mods /* mergeModules(mods) */);
  }

  init() {
    assert(this.pool);
    this.pool.on('listening', (data) => this.emit('listening', data));
    this.pool.on('data', (data) => this.emit('data', data));
    this.pool.on('peer', (peer) => this.emit('peer', peer));
    this.pool.on('error', (err) => this.emit('error', err));
  }

  send(data: Buffer) {
    this.pool.broadcast(data);
  }

  listen(port?: number) {
    assert(this.pool);
    this.pool.listen(port);
  }

}
