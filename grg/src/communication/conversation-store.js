'use strict';

/**
 * FÊNIX OS — Conversation Store (Fase 14)
 * ========================================
 * Persistent store for agent-to-agent and human-to-agent communications,
 * messages, meeting minutes, and door knocks.
 *
 * Implements crash-resilient local persistence with in-memory caching.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_STORE_DIR = path.join(__dirname, '..', '..', 'data', 'communication');

class ConversationStore {
  constructor(options = {}) {
    this.storeDir = options.storeDir || DEFAULT_STORE_DIR;
    this.logger = options.logger || console;

    this.conversations = new Map(); // conversationId -> Conversation
    this.messages = new Map(); // messageId -> Message
    this.conversationMessages = new Map(); // conversationId -> Array<messageId>
    this.meetings = new Map(); // meetingId -> Meeting
    this.knocks = new Map(); // knockId -> Knock
    this.activityFeed = []; // Array of activity events (max 200)

    this._ensureStorageDirectory();
    this._loadSnapshot();
  }

  _ensureStorageDirectory() {
    try {
      if (!fs.existsSync(this.storeDir)) {
        fs.mkdirSync(this.storeDir, { recursive: true });
      }
    } catch (err) {
      this.logger.warn?.(`Failed to create communication store directory: ${err.message}`);
    }
  }

  _snapshotFilePath() {
    return path.join(this.storeDir, 'communication_snapshot.json');
  }

  _loadSnapshot() {
    const file = this._snapshotFilePath();
    if (!fs.existsSync(file)) return;

    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(data.conversations)) {
        for (const c of data.conversations) this.conversations.set(c.conversationId, c);
      }
      if (Array.isArray(data.messages)) {
        for (const m of data.messages) {
          this.messages.set(m.messageId, m);
          if (!this.conversationMessages.has(m.conversationId)) {
            this.conversationMessages.set(m.conversationId, []);
          }
          this.conversationMessages.get(m.conversationId).push(m.messageId);
        }
      }
      if (Array.isArray(data.meetings)) {
        for (const mt of data.meetings) this.meetings.set(mt.meetingId, mt);
      }
      if (Array.isArray(data.knocks)) {
        for (const k of data.knocks) this.knocks.set(k.knockId, k);
      }
      if (Array.isArray(data.activityFeed)) {
        this.activityFeed = data.activityFeed;
      }
    } catch (err) {
      this.logger.warn?.(`Failed to read communication snapshot: ${err.message}`);
    }
  }

  persist() {
    const file = this._snapshotFilePath();
    try {
      const snapshot = {
        savedAt: new Date().toISOString(),
        conversations: Array.from(this.conversations.values()),
        messages: Array.from(this.messages.values()),
        meetings: Array.from(this.meetings.values()),
        knocks: Array.from(this.knocks.values()),
        activityFeed: this.activityFeed.slice(-100)
      };
      fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), 'utf8');
      return true;
    } catch (err) {
      this.logger.warn?.(`Failed to persist communication snapshot: ${err.message}`);
      return false;
    }
  }

  // --- Conversations ---

  saveConversation(conv) {
    if (!conv || !conv.conversationId) throw new Error('Invalid conversation object');
    conv.updatedAt = new Date().toISOString();
    if (!conv.createdAt) conv.createdAt = conv.updatedAt;
    this.conversations.set(conv.conversationId, conv);
    this.persist();
    return conv;
  }

  getConversation(conversationId) {
    return this.conversations.get(conversationId) || null;
  }

  listConversations(filter = {}) {
    let list = Array.from(this.conversations.values());
    if (filter.status) {
      list = list.filter(c => c.status === filter.status);
    }
    if (filter.agentId) {
      list = list.filter(c => Array.isArray(c.participants) && c.participants.includes(filter.agentId));
    }
    if (filter.missionId) {
      list = list.filter(c => c.missionId === filter.missionId);
    }
    if (filter.projectId) {
      list = list.filter(c => c.projectId === filter.projectId);
    }
    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  // --- Messages ---

  saveMessage(msg) {
    if (!msg || !msg.messageId || !msg.conversationId) throw new Error('Invalid message object');
    if (!msg.createdAt) msg.createdAt = new Date().toISOString();
    this.messages.set(msg.messageId, msg);

    if (!this.conversationMessages.has(msg.conversationId)) {
      this.conversationMessages.set(msg.conversationId, []);
    }
    this.conversationMessages.get(msg.conversationId).push(msg.messageId);

    // Update conversation timestamp
    const conv = this.conversations.get(msg.conversationId);
    if (conv) {
      conv.updatedAt = msg.createdAt;
      conv.lastMessage = msg.content;
      conv.messageCount = (conv.messageCount || 0) + 1;
    }

    this.persist();
    return msg;
  }

  getMessage(messageId) {
    return this.messages.get(messageId) || null;
  }

  getMessagesForConversation(conversationId, limit = 100) {
    const msgIds = this.conversationMessages.get(conversationId) || [];
    const msgs = msgIds.map(id => this.messages.get(id)).filter(Boolean);
    return msgs.slice(-limit);
  }

  // --- Meetings ---

  saveMeeting(meeting) {
    if (!meeting || !meeting.meetingId) throw new Error('Invalid meeting object');
    meeting.updatedAt = new Date().toISOString();
    if (!meeting.createdAt) meeting.createdAt = meeting.updatedAt;
    this.meetings.set(meeting.meetingId, meeting);
    this.persist();
    return meeting;
  }

  getMeeting(meetingId) {
    return this.meetings.get(meetingId) || null;
  }

  listMeetings(filter = {}) {
    let list = Array.from(this.meetings.values());
    if (filter.status) {
      list = list.filter(m => m.status === filter.status);
    }
    if (filter.roomId) {
      list = list.filter(m => m.roomId === filter.roomId);
    }
    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  // --- Door Knocks ---

  saveKnock(knock) {
    if (!knock || !knock.knockId) throw new Error('Invalid knock object');
    knock.timestamp = knock.timestamp || new Date().toISOString();
    this.knocks.set(knock.knockId, knock);
    this.persist();
    return knock;
  }

  getKnock(knockId) {
    return this.knocks.get(knockId) || null;
  }

  listPendingKnocks(targetAgentId = null) {
    let list = Array.from(this.knocks.values()).filter(k => k.status === 'PENDING');
    if (targetAgentId) {
      list = list.filter(k => k.toAgent === targetAgentId);
    }
    return list;
  }

  // --- Activity Feed ---

  recordActivity(entry) {
    const activity = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      type: entry.type || 'SYSTEM',
      actor: entry.actor || 'SYSTEM',
      target: entry.target || null,
      summary: entry.summary || '',
      details: entry.details || null
    };

    this.activityFeed.unshift(activity);
    if (this.activityFeed.length > 200) {
      this.activityFeed.pop();
    }
    return activity;
  }

  getActivityFeed(limit = 50) {
    return this.activityFeed.slice(0, limit);
  }

  clear() {
    this.conversations.clear();
    this.messages.clear();
    this.conversationMessages.clear();
    this.meetings.clear();
    this.knocks.clear();
    this.activityFeed = [];
    const file = this._snapshotFilePath();
    if (fs.existsSync(file)) {
      try { fs.unlinkSync(file); } catch {}
    }
  }
}

module.exports = { ConversationStore };
