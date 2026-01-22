import React, { useState, useRef, useEffect, useMemo } from 'react';
import { JobDescription, Candidate, ChatMessage, ChatSession, User } from '../../types/types';
import { getChatbotResponse } from '../../services/geminiService';
import { PaperAirplaneIcon, XCircleIcon, LogoIcon, PencilSquareIcon } from './Icons';

interface ChatbotProps {
    jobs: JobDescription[];
    candidates: Candidate[];
    currentUser: User;
}

const Chatbot: React.FC<ChatbotProps> = ({ jobs, candidates, currentUser }) => {
    const storageKey = `accionTalent_chatbotHistory_${currentUser.id}`;

    const [isOpen, setIsOpen] = useState(false);
    const [allChats, setAllChats] = useState<ChatSession[]>(() => {
        const savedChats = localStorage.getItem(storageKey);
        return savedChats ? JSON.parse(savedChats) : [];
    });
    const [activeChatId, setActiveChatId] = useState<number | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(allChats));
    }, [allChats, storageKey]);

    useEffect(() => {
        if (isOpen) {
            if (allChats.length === 0) {
                handleNewChat();
            } else if (activeChatId === null) {
                // Default to the most recent chat on open
                setActiveChatId(allChats[allChats.length - 1].id);
            }
        }
    }, [isOpen, allChats]);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [isOpen, allChats, activeChatId]);

    const activeChat = useMemo(() => {
        return allChats.find(chat => chat.id === activeChatId);
    }, [allChats, activeChatId]);

    const handleNewChat = () => {
        const newChat: ChatSession = {
            id: Date.now(),
            title: 'New Chat',
            messages: [{ role: 'model', parts: [{ text: "Hi! How can I help you today?" }] }],
        };
        setAllChats(prev => [...prev, newChat]);
        setActiveChatId(newChat.id);
    };

    const handleSelectChat = (chatId: number) => {
        setActiveChatId(chatId);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading || !activeChat) return;

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: inputValue }] };
        const currentInputValue = inputValue;
        setInputValue('');
        
        const updatedChats = allChats.map(chat => {
            if (chat.id === activeChatId) {
                const isFirstUserMessage = chat.messages.filter(m => m.role === 'user').length === 0;
                const newTitle = isFirstUserMessage ? currentInputValue.substring(0, 40) + (currentInputValue.length > 40 ? '...' : '') : chat.title;
                return { ...chat, title: newTitle, messages: [...chat.messages, userMessage] };
            }
            return chat;
        });

        setAllChats(updatedChats);
        setIsLoading(true);
        
        const currentChatHistory = updatedChats.find(c => c.id === activeChatId)?.messages || [];

        try {
            const responseText = await getChatbotResponse(currentChatHistory, currentInputValue, { jobs, candidates });
            const modelMessage: ChatMessage = { role: 'model', parts: [{ text: responseText }] };
            setAllChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, modelMessage] } : chat));
        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Sorry, I'm having trouble connecting right now. Please try again later." }] };
            setAllChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, errorMessage] } : chat));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="chatbot-container">
                <button onClick={() => setIsOpen(!isOpen)} className="chatbot-toggle" aria-label="Toggle AI Assistant">
                    {isOpen ? <XCircleIcon /> : <LogoIcon />}
                </button>
            </div>
            {isOpen && (
                <div className="chatbot-window-new">
                    <aside className="chatbot-sidebar">
                        <button className="new-chat-btn" onClick={handleNewChat}>
                            <PencilSquareIcon />
                            New Chat
                        </button>
                        <div className="chatbot-history-container">
                            <h4>Chat History</h4>
                            <div className="chatbot-history-list">
                                {[...allChats].reverse().map(chat => (
                                    <div 
                                        key={chat.id} 
                                        className={`chatbot-history-item ${chat.id === activeChatId ? 'active' : ''}`} 
                                        onClick={() => handleSelectChat(chat.id)}
                                        title={chat.title}
                                    >
                                        <p>{chat.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                    <div className="chatbot-main-content">
                        <header className="chatbot-header-new">
                             <div className="chatbot-header-title">
                                <div className="chatbot-header-logo"><LogoIcon /></div>
                                <h2>AI Assistant</h2>
                            </div>
                        </header>
                         <main className="chatbot-messages-new">
                            <div className="chatbot-message-list">
                                {activeChat?.messages.map((msg, index) => (
                                    <div key={`${activeChat.id}-${index}`} className={`chatbot-message-row ${msg.role === 'user' ? 'user' : 'model'}`}>
                                        {msg.role === 'model' && (<div className="chatbot-avatar"><LogoIcon /></div>)}
                                        <div className={`chatbot-message-bubble ${msg.role === 'user' ? 'user' : 'model'}`}>{msg.parts[0].text}</div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="chatbot-message-row model">
                                        <div className="chatbot-avatar"><LogoIcon /></div>
                                        <div className="chatbot-message-bubble model">
                                            <div className="typing-indicator">
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </main>
                        <footer className="chatbot-footer-new">
                            <form onSubmit={handleSendMessage} className="chatbot-input-form">
                                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ask about jobs or candidates..." disabled={isLoading} className="chatbot-input-new" />
                                <button type="submit" disabled={isLoading || !inputValue.trim()} className="chatbot-send-btn" aria-label="Send message"><PaperAirplaneIcon /></button>
                            </form>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
