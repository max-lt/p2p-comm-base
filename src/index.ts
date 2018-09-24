// tslint:disable:no-empty-interface

export interface PacketTypesI { }

export interface NodeModule { }

export interface PoolModule { }

export interface PeerModule { }

export interface Module {

  node: NodeModule;

  pool: PoolModule;

  peer: PeerModule;

  packets: Array<any>;

}

import * as util from './packets/util';
export { util };

import { AbstractPacket, OAbstractPacket, IAbstractPacket } from './packets/abstract';
export { AbstractPacket, OAbstractPacket, IAbstractPacket };
