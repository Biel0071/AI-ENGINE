import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { useAppStore } from '../store/appStore';
import { ChatMessage, Conversation, QuickReply } from '../types';
import ChatView from '../views/ChatView';

export default function InboxPage() {
  const {
    conversations,
    selectedConversationId,
    setConversations,
    setSelectedConversationId,
    quickReplies,
    setQuickReplies,
  } = useAppStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  async function loadConversations() {
    const data = await api.get<Conversation[]>('/conversations');
    setConversations(data);
    if (!selectedConversationId && data[0]) {
      setSelectedConversationId(data[0].id);
    }
  }

  async function loadQuickReplies() {
    const data = await api.get<QuickReply[]>('/api/quick-replies');
    setQuickReplies(data);
  }

  async function loadMessages(conversationId: string) {
    setLoading(true);
    try {
      const data = await api.get<ChatMessage[]>(`/conversations/${conversationId}/messages`);
      setMessages(data);
      const draftPayload = await api.get<{ conversationId: string; draft: string }>(`/conversations/${conversationId}/draft`);
      setDraft(draftPayload.draft || '');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadConversations(), loadQuickReplies()]);
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }
    void loadMessages(selectedConversationId);
  }, [selectedConversationId]);

  useEffect(() => {
    function onMessage(payload: { conversationId: string }) {
      if (payload?.conversationId === selectedConversationId) {
        void loadMessages(payload.conversationId);
      }
      void loadConversations();
    }

    socket.on('message:new', onMessage);
    socket.on('conversation:update', onMessage);

    return () => {
      socket.off('message:new', onMessage);
      socket.off('conversation:update', onMessage);
    };
  }, [selectedConversationId]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selectedConversation || !draft.trim()) {
      return;
    }

    await api.post('/messages', {
      conversationId: selectedConversation.id,
      phone: selectedConversation.phone,
      text: draft,
      name: selectedConversation.contactName || selectedConversation.name || selectedConversation.phone,
    });

    setDraft('');
    await api.post(`/conversations/${selectedConversation.id}/draft`, { draft: '' });
    await loadMessages(selectedConversation.id);
  }

  async function persistDraft(value: string) {
    setDraft(value);
    if (!selectedConversation) {
      return;
    }

    await api.post(`/conversations/${selectedConversation.id}/draft`, { draft: value });
  }

  return (
    <ChatView
      activeConversations={conversations.length}
      conversations={conversations}
      selectedConversationId={selectedConversationId}
      selectedConversation={selectedConversation}
      search={search}
      messages={messages}
      loading={loading}
      draft={draft}
      quickReplies={quickReplies}
      onSearch={setSearch}
      onSelectConversation={setSelectedConversationId}
      onSendMessage={sendMessage}
      onDraftChange={(value) => void persistDraft(value)}
      onAppendQuickReply={(content) => setDraft((previous) => (previous ? `${previous}\n${content}` : content))}
    />
  );
}
