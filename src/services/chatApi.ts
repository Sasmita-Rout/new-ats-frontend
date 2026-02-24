
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const chatApi = {
    // 1. Create New Session
    createSession: async (userId: string) => {
        const res = await fetch(`${API_BASE_URL}/chat/session/new`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        return res.json();
    },

    // 2. Get All Sessions (History List)
    getSessions: async (userId: string) => {
        const res = await fetch(`${API_BASE_URL}/chat/sessions/${userId}`);
        return res.json();
    },

    // 3. Get Single Session Message History
    getSessionHistory: async (sessionId: string) => {
        const res = await fetch(`${API_BASE_URL}/chat/session/${sessionId}`);
        return res.json();
    },

    // 3.1 Delete Session
    deleteSession: async (sessionId: string, userId: string) => {
        const res = await fetch(`${API_BASE_URL}/chat/session/${sessionId}?user_id=${encodeURIComponent(userId)}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            throw new Error('Failed to delete chat session');
        }
        return res.json().catch(() => ({}));
    },

    // 4. Send Message (User -> Backend -> Ollama -> Mongo)
    sendMessage: async (sessionId: string, userId: string, content: string) => {
        const res = await fetch(`${API_BASE_URL}/chat/session/${sessionId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, content })
        });
        return res.json();
    }
};
