// tslint:disable:no-empty-interface

export interface PacketTypesI { }

export interface NodeModule { }

export interface PoolModule {
  handlePacket(packet);
}

export interface PeerModule {
  handlePacket(packet);
}

export interface Module {

  node: NodeModule;

  pool: PoolModule;

  peer: PeerModule;

  packets: Array<any>;

}

import { BasePacket, OBasePacket, IBasePacket } from './packets/base';
export { BasePacket, OBasePacket, IBasePacket };

import * as util from './packets/util';
export { util };

import { OMeta as MetaInterface } from './packets/util';
export { MetaInterface };
