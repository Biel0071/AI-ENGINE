import ChatView from '../views/ChatView';
import ConnectionsView from '../views/ConnectionsView';

export default function DebugAll() {
  return (
    <div style={{ padding: 20 }}>
      <h1>DEBUG TODAS TELAS</h1>

      <h2>ChatView</h2>
      <ChatView
        activeConversations={1}
        conversations={[
          {
            id: 'debug-conversation',
            name: 'Debug User',
            contactName: 'Debug User',
            phone: '+55 11 99999-9999',
            lastMessage: 'Mensagem de teste',
            updatedAt: new Date().toISOString(),
            unread: 0,
          },
        ]}
        selectedConversationId="debug-conversation"
        selectedConversation={{
          id: 'debug-conversation',
          name: 'Debug User',
          contactName: 'Debug User',
          phone: '+55 11 99999-9999',
          lastMessage: 'Mensagem de teste',
          updatedAt: new Date().toISOString(),
          unread: 0,
        }}
        search=""
        messages={[
          {
            id: 'm1',
            content: 'Mensagem de teste no ChatView',
            fromMe: false,
            createdAt: new Date().toISOString(),
          },
        ]}
        loading={false}
        draft=""
        quickReplies={[
          {
            id: 'q1',
            title: 'Saudacao',
            category: 'Geral',
            content: 'Ola! Como posso ajudar?',
            tags: ['debug'],
          },
        ]}
        onSearch={() => {}}
        onSelectConversation={() => {}}
        onSendMessage={(event) => {
          event.preventDefault();
        }}
        onDraftChange={() => {}}
        onAppendQuickReply={() => {}}
      />

      <h2 style={{ marginTop: 24 }}>ConnectionsView</h2>
      <ConnectionsView
        sessions={[
          {
            sessionId: 'debug-session',
            sessionName: 'Sessao Debug',
            status: 'connected',
          },
        ]}
        loading={false}
        onStartSession={() => {}}
        onReconnect={() => {}}
      />
    </div>
  );
}
