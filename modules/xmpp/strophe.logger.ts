import { Strophe } from 'strophe.js';
import ConnectionPlugin from './ConnectionPlugin';

/**
 * Interface for the connection object
 */
interface IConnection {
    rawInput: (stanza: string) => void;
    rawOutput: (stanza: string) => void;
}

/**
 * Interface for the log entry
 */
interface ILogEntry {
    timestamp: number;
    direction: 'incoming' | 'outgoing';
    stanza: string;
}

/**
 *  Logs raw stanzas and makes them available for download as JSON
 */
class StropheLogger extends ConnectionPlugin {
    private log: ILogEntry[];

    /**
     *
     */
    constructor() {
        super();
        this.log = [];
    }

    /**
     *
     * @param connection
     */
    init(connection: IConnection) {
        super.init(connection);
        this.connection.rawInput = this.logIncoming.bind(this);
        this.connection.rawOutput = this.logOutgoing.bind(this);
    }

    /**
     *
     * @param stanza
     */
    logIncoming(stanza: string) {
        this.log.push({ timestamp: new Date().getTime(), direction: 'incoming', stanza });
    }

    /**
     *
     * @param stanza
     */
    logOutgoing(stanza: string) {
        this.log.push({ timestamp: new Date().getTime(), direction: 'outgoing', stanza });
    }
}

/**
 *
 */
export default function() {
    Strophe.addConnectionPlugin('logger', new StropheLogger());
}
