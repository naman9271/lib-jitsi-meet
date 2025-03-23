import { Strophe } from 'strophe.js';
import { WebSocket } from 'ws';

import Listenable from '../util/Listenable';

/* eslint-disable no-empty-function */

/**
 * Mock {@link ChatRoom}.
 */
export class MockChatRoom extends Listenable {
    /**
     * {@link ChatRoom.addPresenceListener}.
     */
    addPresenceListener(): void {
    }
}

export interface IProto {
    socket: WebSocket | undefined;
}

export interface IConnectCallback {
    (status: Strophe.Status): void;
}

/**
 * Mock Strophe connection.
 */
export class MockStropheConnection extends Listenable {
    private sentIQs: any[];
    private _proto: IProto;
    private _connectCb!: IConnectCallback;

    /**
     * A constructor...
     */
    constructor() {
        super();
        this.sentIQs = [];
        this._proto = {
            socket: undefined
        };
    }

    /**
     * XMPP service URL.
     *
     * @returns {string}
     */
    get service(): string {
        return 'wss://localhost/xmpp-websocket';
    }

    /**
     * {@see Strophe.Connection.connect}
     */
    connect(jid: string, pass: string, callback: IConnectCallback): void {
        this._connectCb = callback;
    }

    /**
     * {@see Strophe.Connection.disconnect}
     */
    disconnect(): void {
        this.simulateConnectionState(Strophe.Status.DISCONNECTING);
        this.simulateConnectionState(Strophe.Status.DISCONNECTED);
    }

    /**
     * Simulates transition to the new connection status.
     *
     * @param {Strophe.Status} newState - The new connection status to set.
     * @returns {void}
     */
    simulateConnectionState(newState: Strophe.Status): void {
        if (newState === Strophe.Status.CONNECTED) {
            (this._proto.socket as any) = {
                readyState: WebSocket.OPEN
            };
        } else {
            this._proto.socket = undefined;
        }
        this._connectCb(newState);
    }

    /**
     * {@see Strophe.Connection.sendIQ}.
     */
    sendIQ(iq: any, resultCb?: () => void): void {
        this.sentIQs.push(iq);
        resultCb && resultCb();
    }
}
/* eslint-enable no-empty-function */
