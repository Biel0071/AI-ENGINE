export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface Conversation {
  id: string;
  contactName?: string;
  name?: string;
  phone: string;
  lastMessage?: string;
  updatedAt?: string;
  unread?: number;
}

export interface ChatMessage {
  id: string;
  content?: string;
  text?: string;
  fromMe?: boolean;
  createdAt?: string;
  mediaType?: string | null;
}

export interface CampaignMessage {
  id?: string;
  type: 'text' | 'image' | 'audio' | 'video';
  content: string;
  mediaUrl?: string | null;
  delaySeconds?: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  selectedContacts: Array<{ id: string; name: string; phone: string }>;
  messages: CampaignMessage[];
  settings: {
    intervalSeconds: number;
    pauseEvery: number;
    pauseSeconds: number;
    typingDelaySeconds: number;
    startAt?: string | null;
  };
  queue?: {
    total: number;
    processed: number;
    sent: number;
    failed: number;
    paused: boolean;
  };
  createdAt?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  status?: string;
}

export interface FlowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config?: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Flow {
  id: string;
  name: string;
  status: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  rules: Array<{ id: string; type: string; value: string; active: boolean }>;
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export interface SessionStatus {
  sessionId: string;
  status: string;
  sessionName?: string;
}
