/**
 * Type definitions for Claude Session Browser
 */

export interface Session {
  id: string;
  summary: string;
  mtime: number;
  size: number;
  project: string;
  filePath: string;
  isFavorite?: boolean;
}

export interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface Message {
  content: string | ContentBlock[];
  [key: string]: unknown;
}

export interface LogEntry {
  type: 'user' | 'assistant';
  timestamp: string;
  message: Message;
  isCompactSummary?: boolean;
}

export interface SessionData {
  loglines: LogEntry[];
  summary: string;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface SessionDetailResponse {
  loglines: LogEntry[];
  summary: string;
}
