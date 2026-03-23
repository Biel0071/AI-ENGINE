import { create } from 'zustand';
import { Contact, Conversation, QuickReply, SessionStatus } from '../types';

interface AppState {
  selectedConversationId: string | null;
  contactsFilter: 'saved' | 'groups' | 'tags';
  selectedContacts: Contact[];
  quickReplies: QuickReply[];
  conversations: Conversation[];
  sessions: SessionStatus[];
  setSelectedConversationId: (id: string | null) => void;
  setContactsFilter: (filter: 'saved' | 'groups' | 'tags') => void;
  setSelectedContacts: (contacts: Contact[]) => void;
  setQuickReplies: (items: QuickReply[]) => void;
  setConversations: (items: Conversation[]) => void;
  setSessions: (items: SessionStatus[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedConversationId: null,
  contactsFilter: 'saved',
  selectedContacts: [],
  quickReplies: [],
  conversations: [],
  sessions: [],
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setContactsFilter: (contactsFilter) => set({ contactsFilter }),
  setSelectedContacts: (selectedContacts) => set({ selectedContacts }),
  setQuickReplies: (quickReplies) => set({ quickReplies }),
  setConversations: (conversations) => set({ conversations }),
  setSessions: (sessions) => set({ sessions }),
}));
