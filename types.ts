
export enum CallStatus {
  IDLE = 'IDLE',
  DIALING = 'DIALING',
  CONNECTED = 'CONNECTED',
  ENDED = 'ENDED'
}

export interface CallLog {
  id: string;
  number: string;
  timestamp: Date;
  duration: string;
}

export interface TranscriptionItem {
  text: string;
  role: 'user' | 'model';
}
