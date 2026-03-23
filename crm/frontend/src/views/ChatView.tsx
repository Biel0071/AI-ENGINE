import { FormEvent } from 'react';
import { ChatWindow, ConversationList } from '../components/inbox';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TextArea } from '../components/ui/FormField';
import { ChatMessage, Conversation, QuickReply } from '../types';

type ChatViewProps = {
  activeConversations: number;
  conversations: Conversation[];
  selectedConversationId: string | null;
  selectedConversation: Conversation | null;
  search: string;
  messages: ChatMessage[];
  loading: boolean;
  draft: string;
  quickReplies: QuickReply[];
  onSearch: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onDraftChange: (value: string) => void;
  onAppendQuickReply: (content: string) => void;
};

export default function ChatView({
  activeConversations,
  conversations,
  selectedConversationId,
  selectedConversation,
  search,
  messages,
  loading,
  draft,
  quickReplies,
  onSearch,
  onSelectConversation,
  onSendMessage,
  onDraftChange,
  onAppendQuickReply,
}: ChatViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Inbox</h2>
        <p className="text-sm text-slate-400">{activeConversations} conversas ativas</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px,1fr,320px]">
        <section className="rounded-xl border border-borderSoft bg-panel p-3 shadow-card">
          <Card title="Conversas" subtitle="Inbox WhatsApp">
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              searchQuery={search}
              onSearch={onSearch}
              onSelect={onSelectConversation}
            />
          </Card>
        </section>

        <section className="rounded-xl border border-borderSoft bg-panel p-3 shadow-card">
          <Card title={selectedConversation?.contactName || selectedConversation?.name || 'Chat'} subtitle={selectedConversation?.phone || ''}>
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              loading={loading}
              composer={
                <form onSubmit={onSendMessage} className="space-y-2">
                  <TextArea value={draft} onChange={(event) => onDraftChange(event.target.value)} className="h-24" />
                  <div className="flex justify-end">
                    <Button type="submit">Enviar</Button>
                  </div>
                </form>
              }
            />
          </Card>
        </section>

        <section className="rounded-xl border border-borderSoft bg-panel p-3 shadow-card">
          <Card title="Respostas rapidas" subtitle="Inserir no chat">
            <div className="space-y-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => onAppendQuickReply(reply.content)}
                  className="w-full rounded-lg border border-borderSoft bg-panelSoft px-3 py-2 text-left"
                >
                  <p className="text-sm font-medium">{reply.title}</p>
                  <p className="text-xs text-slate-400">{reply.category}</p>
                </button>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
