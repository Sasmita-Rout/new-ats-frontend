
import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatApi } from '../../services/chatApi';
import { PaperAirplaneIcon, XCircleIcon, LogoIcon, PencilSquareIcon, TrashIcon } from './Icons';
import { toast } from 'react-toastify';

interface ChatbotProps {
    currentUser: { id: number | string; name: string; email: string; role?: string; isSuperAdmin?: boolean };
    launcherVariant?: 'floating' | 'sidebar';
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    updated_at?: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ currentUser, launcherVariant = 'floating' }) => {
    // UI State
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Data State (from Backend)
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);

    // 1. Fetch Sessions on Open
    useEffect(() => {
        if (isOpen && currentUser?.id) {
            loadSessions();
        }
    }, [isOpen, currentUser]);

    const loadSessions = async () => {
        try {
            const data = await chatApi.getSessions(currentUser.email);
            setSessions(data);
            if (data.length > 0 && !activeSessionId) {
                // Load most recent session
                selectSession(data[0].id);
            } else if (data.length === 0) {
                // Create first session automatically
                handleNewChat();
            }
        } catch (error) {
            console.error("Failed to load chat history", error);
        }
    };

    // 2. Select Session -> Load Messages
    const selectSession = async (sessionId: string) => {
        setActiveSessionId(sessionId);
        setIsLoading(true);
        try {
            const sessionData = await chatApi.getSessionHistory(sessionId);
            // Messages from Mongo might have extra fields, we just need role/content
            setCurrentMessages(sessionData.messages || []);
        } catch (error) {
            toast.error("Failed to load conversation");
        } finally {
            setIsLoading(false);
        }
    };

    // 3. Create New Chat
    const handleNewChat = async () => {
        try {
            const res = await chatApi.createSession(currentUser.email);
            if (res.session_id) {
                await loadSessions(); // Refresh list
                setActiveSessionId(res.session_id);
                setCurrentMessages([]); // Empty start
            }
        } catch (error) {
            toast.error("Could not start new chat");
        }
    };

    // 4. Send Message
    const sendCurrentMessage = async () => {
        if (!inputValue.trim() || !activeSessionId) return;

        const userMsg = inputValue;
        setInputValue('');

        // Optimistic UI Update
        const optimisticMsg: ChatMessage = { role: 'user', content: userMsg };
        setCurrentMessages(prev => [...prev, optimisticMsg]);
        setIsLoading(true);

        try {
            const derivedIsSuperAdmin =
                currentUser.isSuperAdmin ||
                currentUser.role === 'super_admin' ||
                currentUser.role === 'admin' ||
                (currentUser.role || '').includes('Admin');

            const res = await chatApi.sendMessage(activeSessionId, currentUser.email, userMsg, derivedIsSuperAdmin);

            // Backend returns the full AI response
            if (res.ai_response) {
                const aiMsg: ChatMessage = { role: 'assistant', content: res.ai_response };
                setCurrentMessages(prev => [...prev, aiMsg]);

                // Refresh list to update titles/sorting if needed
                loadSessions();
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to send message");
            // Remove optimistic message on failure? Or show error state.
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        try {
            await chatApi.deleteSession(sessionId, currentUser.email);
            toast.success("Chat deleted successfully");
            const remaining = sessions.filter(s => s.id !== sessionId);
            setSessions(remaining);

            if (activeSessionId === sessionId) {
                if (remaining.length > 0) {
                    await selectSession(remaining[0].id);
                } else {
                    setActiveSessionId(null);
                    setCurrentMessages([]);
                    await handleNewChat();
                }
            }
        } catch (error) {
            toast.error("Failed to delete chat history");
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendCurrentMessage();
    };

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMessages, isOpen]);

    return (
        <>
            <div className={`chatbot-container ${launcherVariant === 'sidebar' ? 'sidebar-launcher' : ''}`}>
                <button
                    onClick={() => {
                        const nextOpen = !isOpen;
                        setIsOpen(nextOpen);
                        if (nextOpen) setIsMinimized(false);
                    }}
                    className={`chatbot-toggle ${launcherVariant === 'sidebar' ? 'sidebar' : ''}`}
                    aria-label="Toggle AI Assistant"
                >
                    {isOpen ? <XCircleIcon /> : <LogoIcon />}
                    {launcherVariant === 'sidebar' && <span>{isOpen ? 'Close Assistant' : 'AI Assistant'}</span>}
                </button>
            </div>
            {isOpen && (
                <div className={`chatbot-window-new ${isMinimized ? 'minimized' : ''}`}>
                    <aside className="chatbot-sidebar">
                        <button className="new-chat-btn" onClick={handleNewChat}>
                            <PencilSquareIcon />
                            New Chat
                        </button>
                        <div className="chatbot-history-container">
                            <h4>History</h4>
                            <div className="chatbot-history-list">
                                {sessions.map(chat => (
                                    <div
                                        key={chat.id}
                                        className={`chatbot-history-item ${chat.id === activeSessionId ? 'active' : ''}`}
                                        onClick={() => selectSession(chat.id)}
                                        title={chat.title}
                                    >
                                        <p>{chat.title || "New Chat"}</p>
                                        <button
                                            type="button"
                                            className="chat-history-delete-btn"
                                            title="Delete chat"
                                            aria-label="Delete chat"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void handleDeleteSession(chat.id);
                                            }}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                    <div className="chatbot-main-content">
                        <header className="chatbot-header-new">
                            <div className="chatbot-header-title">
                                <div className="chatbot-header-logo"><LogoIcon /></div>
                                <h2>AI Assistant (Beta)</h2>
                            </div>
                            <div className="chatbot-window-controls">
                                {isMinimized ? (
                                    <button
                                        type="button"
                                        className="chatbot-window-close chatbot-window-minimize"
                                        onClick={() => setIsMinimized(false)}
                                        aria-label="Maximize AI Assistant"
                                        title="Maximize"
                                    >
                                        <span className="material-symbols-outlined">open_in_full</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="chatbot-window-close chatbot-window-minimize"
                                        onClick={() => setIsMinimized(true)}
                                        aria-label="Minimize AI Assistant"
                                        title="Minimize"
                                    >
                                        <span className="material-symbols-outlined">remove</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="chatbot-window-close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close AI Assistant"
                                    title="Close"
                                >
                                    <XCircleIcon />
                                </button>
                            </div>
                        </header>
                        <main className="chatbot-messages-new">
                            <div className="chatbot-message-list">
                                {currentMessages.length === 0 && !isLoading && (
                                    <div className="chatbot-empty-state">
                                        <p>👋 Hi {currentUser.name}! I can help you find candidates or answer questions about your jobs.</p>
                                    </div>
                                )}
                                {currentMessages.map((msg, index) => (
                                    <div key={index} className={`chatbot-message-row ${msg.role === 'user' ? 'user' : 'model'}`}>
                                        {msg.role === 'assistant' && (<div className="chatbot-avatar"><LogoIcon /></div>)}
                                        <div className={`chatbot-message-bubble ${msg.role === 'user' ? 'user' : 'model'}`}>
                                            <ReactMarkdown>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="chatbot-message-row model">
                                        <div className="chatbot-avatar"><LogoIcon /></div>
                                        <div className="chatbot-message-bubble model">
                                            <div className="typing-indicator">
                                                <span></span><span></span><span></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </main>
                        <footer className="chatbot-footer-new">
                            <form onSubmit={handleSendMessage} className="chatbot-input-form">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                            e.preventDefault();
                                            void sendCurrentMessage();
                                        }
                                    }}
                                    placeholder="Ask: 'Who is best for the React job?'"
                                    disabled={isLoading}
                                    className="chatbot-input-new"
                                />
                                <button type="submit" disabled={isLoading || !inputValue.trim()} className="chatbot-send-btn">
                                    <PaperAirplaneIcon />
                                </button>
                            </form>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
