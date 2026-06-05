import { EventEmitter } from 'node:events';

/**
 * In-process event bus. The bot writes to the DB and emits here; the WebSocket
 * layer subscribes and fans events out to connected operators.
 *
 * For a single instance this comfortably handles 1000+ live chats. To scale to
 * multiple instances, swap this for a Redis pub/sub adapter exposing the same
 * `emit` / `on` surface — nothing else needs to change.
 */

export type AppEvent =
  | { type: 'ticket:new'; ticket: SerializedTicket }
  | { type: 'ticket:updated'; ticket: SerializedTicket }
  | { type: 'message:new'; ticketId: number; message: SerializedMessage }
  | { type: 'presence'; operators: PresenceInfo[] };

export interface SerializedTicket {
  id: number;
  number: number;
  status: 'OPEN' | 'CLOSED';
  assignedOperatorId: number | null;
  assignedOperatorName: string | null;
  subject: string | null;
  customer: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  unreadForOperator: number;
  lastMessageAt: string;
  createdAt: string;
  closedAt: string | null;
}

export interface SerializedMessage {
  id: string;
  ticketId: number;
  sender: 'CUSTOMER' | 'OPERATOR' | 'SYSTEM';
  operatorId: number | null;
  operatorName: string | null;
  text: string | null;
  mediaType: string | null;
  mediaFileId: string | null;
  fileName: string | null;
  createdAt: string;
}

export interface PresenceInfo {
  operatorId: number;
  displayName: string;
  online: boolean;
}

class Bus extends EventEmitter {
  publish(event: AppEvent) {
    this.emit('event', event);
  }
  subscribe(handler: (event: AppEvent) => void) {
    this.on('event', handler);
    return () => this.off('event', handler);
  }
}

export const bus = new Bus();
// Operators may be many; lift the default listener cap.
bus.setMaxListeners(10000);
