import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = '/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: number;
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'agents' | 'dashboard'>('chat');

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await axios.get(`${API_BASE}/conversations`);
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      // Mock data for demo
      setConversations([
        { id: '1', title: 'Nova Conversa', lastMessage: 'Comece a conversar...', updatedAt: Date.now() }
      ]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/send-message`, {
        message: input,
        conversationId: currentConversation || undefined
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response || 'Desculpe, não entendi.',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (!currentConversation && response.data.conversationId) {
        setCurrentConversation(response.data.conversationId);
        loadConversations();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: 'Erro ao enviar mensagem. Tente novamente.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">🤖</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ZapAI CRM</h1>
              <p className="text-sm text-slate-400">Assistente Inteligente com Agentes Autônomos</p>
            </div>
          </div>
          
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'chat'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'agents'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🤖 Agentes
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              📊 Dashboard
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
            {/* Sidebar - Conversations */}
            <aside className="lg:col-span-1 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Conversas</h2>
              </div>
              <div className="overflow-y-auto h-[calc(100%-60px)] p-2">
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setCurrentConversation(conv.id)}
                    className={`w-full text-left p-3 rounded-lg mb-2 transition-all ${
                      currentConversation === conv.id
                        ? 'bg-purple-600/20 border border-purple-500'
                        : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                    }`}
                  >
                    <h3 className="text-white font-medium truncate">{conv.title}</h3>
                    <p className="text-sm text-slate-400 truncate">{conv.lastMessage}</p>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setCurrentConversation(null);
                    setMessages([]);
                  }}
                  className="w-full text-left p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-dashed border-slate-600 transition-all"
                >
                  <h3 className="text-slate-300 font-medium">+ Nova Conversa</h3>
                </button>
              </div>
            </aside>

            {/* Chat Area */}
            <section className="lg:col-span-3 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                      <span className="text-4xl">🤖</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Bem-vindo ao ZapAI CRM</h3>
                    <p className="text-slate-400 max-w-md">
                      Comece uma conversa com nosso assistente inteligente powered by AI Engine Core.
                      Ele pode ajudar com vendas, suporte e automações.
                    </p>
                  </div>
                )}
                
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : msg.role === 'system'
                          ? 'bg-red-600/20 border border-red-500 text-red-200'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-xs opacity-60 mt-1 block">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 rounded-2xl px-4 py-3">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-slate-700 p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">🤖 Enxame de Agentes Autônomos</h2>
              <p className="text-slate-400">Agentes especializados trabalhando em tempo real</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Agent Cards */}
              {[
                { name: 'Agente de Vendas', icon: '💼', status: 'Ativo', description: 'Gerencia funil de vendas e qualificação de leads' },
                { name: 'Agente de Suporte', icon: '🎧', status: 'Ativo', description: 'Responde dúvidas e resolve problemas de clientes' },
                { name: 'Agente de Marketing', icon: '📢', status: 'Ocupado', description: 'Cria campanhas e segmenta audiências' },
                { name: 'Agente Financeiro', icon: '💰', status: 'Ativo', description: 'Controla pagamentos e cobranças' },
                { name: 'Agente de Analytics', icon: '📊', status: 'Processando', description: 'Analisa dados e gera insights' },
                { name: 'Supervisor Geral', icon: '👑', status: 'Monitorando', description: 'Coordena todos os agentes e toma decisões estratégicas' }
              ].map((agent, idx) => (
                <div key={idx} className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 hover:border-purple-500 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {agent.icon}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      agent.status === 'Ativo' ? 'bg-green-500/20 text-green-400' :
                      agent.status === 'Ocupado' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{agent.name}</h3>
                  <p className="text-slate-400 text-sm">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">📊 Dashboard de Performance</h2>
              <p className="text-slate-400">Métricas em tempo real do seu negócio</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total de Leads', value: '1,234', change: '+12%', icon: '👥' },
                { label: 'Vendas Hoje', value: 'R$ 8.450', change: '+23%', icon: '💰' },
                { label: 'Taxa de Conversão', value: '18.5%', change: '+5%', icon: '📈' },
                { label: 'Tickets Abertos', value: '23', change: '-8%', icon: '🎫' }
              ].map((metric, idx) => (
                <div key={idx} className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{metric.icon}</span>
                    <span className={`text-sm font-semibold ${
                      metric.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {metric.change}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">{metric.value}</h3>
                  <p className="text-slate-400 text-sm">{metric.label}</p>
                </div>
              ))}
            </div>

            {/* Activity Chart Placeholder */}
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">📈 Atividade dos Últimos 7 Dias</h3>
              <div className="h-64 flex items-center justify-center bg-slate-700/30 rounded-xl">
                <p className="text-slate-400">Gráfico de atividade seria renderizado aqui</p>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">🕐 Atividades Recentes</h3>
              <div className="space-y-3">
                {[
                  { action: 'Nova venda realizada', time: '2 minutos atrás', icon: '✅' },
                  { action: 'Lead qualificado pelo agente', time: '15 minutos atrás', icon: '🎯' },
                  { action: 'Campanha de email enviada', time: '1 hora atrás', icon: '📧' },
                  { action: 'Ticket de suporte resolvido', time: '2 horas atrás', icon: '🎧' }
                ].map((activity, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-2xl">{activity.icon}</span>
                    <div className="flex-1">
                      <p className="text-white font-medium">{activity.action}</p>
                      <p className="text-slate-400 text-sm">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
