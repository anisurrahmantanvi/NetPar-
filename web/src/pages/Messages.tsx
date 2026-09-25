import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, MessageSquare, ArrowLeft, Loader2, User } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Conversation, Message, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';

export const Messages: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Suggested / available contacts for new conversation
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);

  // Load conversations
  useEffect(() => {
    if (!currentUser) return;
    setLoadingConvs(true);

    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', currentUser.uid)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list: Conversation[] = [];
      for (const d of snap.docs) {
        const data = d.data() as Conversation;
        const conv: Conversation = { ...data, conversationId: d.id };

        // Identify peer user
        const peerId = conv.participantIds?.find(id => id !== currentUser.uid);
        if (peerId) {
          const uSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', peerId), limit(1)));
          if (!uSnap.empty) {
            conv.peerUser = uSnap.docs[0].data() as UserProfile;
          }
        }
        list.push(conv);
      }

      setConversations(list);
      setLoadingConvs(false);
    }, (err) => {
      console.warn("Conversations listener note:", err);
      setLoadingConvs(false);
    });

    return () => unsub();
  }, [currentUser]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);

    const q = query(
      collection(db, 'conversations', selectedConv.conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = [];
      snap.forEach(d => msgs.push({ ...d.data(), messageId: d.id } as Message));
      setMessages(msgs);
      setLoadingMessages(false);
    }, (err) => {
      console.warn("Messages err:", err);
      setLoadingMessages(false);
    });

    return () => unsub();
  }, [selectedConv]);

  // Load users to start new chat
  useEffect(() => {
    if (!currentUser) return;
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(15)));
        const users: UserProfile[] = [];
        snap.forEach(d => {
          if (d.id !== currentUser.uid) {
            users.push({ ...d.data(), uid: d.id } as UserProfile);
          }
        });
        setContacts(users);
      } catch (_) {}
    };
    fetchUsers();
  }, [currentUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedConv || !msgText.trim()) return;

    const text = msgText.trim();
    setMsgText('');

    try {
      const msgsRef = collection(db, 'conversations', selectedConv.conversationId, 'messages');
      await addDoc(msgsRef, {
        senderId: currentUser.uid,
        text,
        createdAt: serverTimestamp(),
        seen: false
      });

      // Update conversation lastMessage
      await setDoc(doc(db, 'conversations', selectedConv.conversationId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const startConversationWith = async (peer: UserProfile) => {
    if (!currentUser) return;

    // Check if existing conversation
    const existing = conversations.find(c => c.participantIds?.includes(peer.uid));
    if (existing) {
      setSelectedConv(existing);
      setShowNewChat(false);
      return;
    }

    // Create new conversation
    const convId = 'conv_' + [currentUser.uid, peer.uid].sort().join('_');
    const newConvData: Conversation = {
      conversationId: convId,
      participantIds: [currentUser.uid, peer.uid],
      lastMessage: 'Conversation started',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      peerUser: peer
    };

    await setDoc(doc(db, 'conversations', convId), newConvData);
    setSelectedConv(newConvData);
    setShowNewChat(false);
  };

  if (!currentUser) {
    return (
      <div className="main-feed-area" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px' }}>Sign in to View Messages</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Direct messaging and encrypted communications require an iConnecto account.</p>
        <button
          onClick={() => navigate('/login')}
          style={{ background: 'var(--primary-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="main-feed-area" style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* Conversations Sidebar */}
      <div 
        style={{
          width: selectedConv ? '280px' : '100%',
          borderRight: '1px solid var(--bg-border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--bg-border)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Messages</h2>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            style={{
              background: 'var(--primary-gradient)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            + New
          </button>
        </div>

        {/* New Chat Picker Dropdown */}
        {showNewChat && (
          <div style={{ padding: '12px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--bg-border)', maxHeight: '200px', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>START CHAT WITH</div>
            {contacts.map(c => (
              <div 
                key={c.uid}
                onClick={() => startConversationWith(c)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', marginBottom: '4px', background: 'var(--bg-card)' }}
              >
                <img src={c.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=60&q=80'} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.displayName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConvs ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Loader2 size={24} className="animate-spin" color="var(--primary)" />
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No messages yet. Click <strong>+ New</strong> to start a conversation.
            </div>
          ) : (
            conversations.map(c => {
              const isSelected = selectedConv?.conversationId === c.conversationId;
              const peerName = c.peerUser?.displayName || 'User';
              const peerPhoto = c.peerUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80';

              return (
                <div
                  key={c.conversationId}
                  onClick={() => setSelectedConv(c)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--bg-hover)' : 'transparent',
                    borderBottom: '1px solid var(--bg-border)'
                  }}
                >
                  <img src={peerPhoto} alt={peerName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{peerName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {c.lastMessage}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Room Area */}
      {selectedConv ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
          {/* Room Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid var(--bg-border)' }}>
            <button
              onClick={() => setSelectedConv(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ArrowLeft size={20} />
            </button>
            <img 
              src={selectedConv.peerUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'} 
              alt=""
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedConv.peerUser?.displayName || 'User'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>Active on iConnecto</div>
            </div>
          </div>

          {/* Messages Feed */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loadingMessages ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Loader2 size={24} className="animate-spin" color="var(--primary)" />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Say hello to {selectedConv.peerUser?.displayName}! 👋
              </div>
            ) : (
              messages.map(m => {
                const isMe = m.senderId === currentUser.uid;
                return (
                  <div
                    key={m.messageId}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                      background: isMe ? 'var(--primary-gradient)' : 'var(--bg-hover)',
                      color: isMe ? '#fff' : 'var(--text-main)',
                      padding: '10px 14px',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: '0.92rem',
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                    }}
                  >
                    {m.text}
                  </div>
                );
              })
            )}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--bg-border)' }}>
            <input
              type="text"
              placeholder="Type a message..."
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--bg-hover)',
                border: '1px solid var(--bg-border)',
                borderRadius: '99px',
                padding: '10px 18px',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.92rem'
              }}
            />
            <button
              type="submit"
              disabled={!msgText.trim()}
              style={{
                background: 'var(--primary-gradient)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: msgText.trim() ? 'pointer' : 'not-allowed',
                opacity: msgText.trim() ? 1 : 0.6
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '20px' }}>
          <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Select a Conversation</h3>
          <p style={{ fontSize: '0.88rem', marginTop: '4px' }}>Choose an existing message or start a new chat with anyone.</p>
        </div>
      )}
    </div>
  );
};
