import { GoogleGenAI } from "@google/genai";
import { JobDescription, Candidate, ChatMessage } from '../types/types';

// A helper function to truncate the context data to avoid overly large prompts
const getTruncatedJSON = (data: any[], maxChars: number = 8000) => {
    const stringified = JSON.stringify(data, null, 2);
    if (stringified.length > maxChars) {
        // Find a good place to cut (e.g., end of an object)
        let cutIndex = stringified.lastIndexOf('}', maxChars);
        if (cutIndex === -1) cutIndex = maxChars;
        return stringified.substring(0, cutIndex) + '\n  ...\n]';
    }
    return stringified;
};

export const getChatbotResponse = async (
    history: ChatMessage[],
    inputValue: string,
    context: { jobs: JobDescription[], candidates: Candidate[] }
): Promise<string> => {
    // Fix: Instantiate AI right before the call to ensure up-to-date config.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // The history from the client includes the latest user message.
    // The SDK's `create` method takes the history *before* the new message.
    let chatHistory = history.slice(0, -1).map(msg => ({
        role: msg.role,
        parts: msg.parts,
    }));

    // FIX: The Gemini API requires chat history to start with a user turn.
    // If the first message in our stored history is from the model (e.g., the initial greeting),
    // we must remove it before sending it to the API.
    if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
        chatHistory = chatHistory.slice(1);
    }

    // Fix: Updated model name to 'gemini-3-flash-preview' for chatbot tasks.
    const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        history: chatHistory,
        config: {
            systemInstruction: `You are "AccionBot", the expert AI assistant for the AccionTalent Applicant Tracking System (ATS). Your personality is helpful, professional, and slightly enthusiastic.

You have two primary capabilities:

1.  **Data Expert:** You can answer questions about recruitment data (jobs and candidates) using the JSON data provided with the user's prompt.
2.  **Application Guide:** You can explain how to use the AccionTalent application, detailing its features and guiding users on how to perform tasks. Your knowledge for this comes from the detailed feature overview below.

**Your Process:**
First, determine the user's intent.
- If they ask about specific data (e.g., "who are the candidates for the React job?", "list all active jobs"), use the provided JSON context to answer.
- If they ask how to do something or what a feature is (e.g., "how do I add a new job?", "what is 'Analyze Fit'?"), use the Application Feature Overview below to answer.
- If the question is ambiguous, you can ask for clarification.

**General Rules:**
- Be helpful and concise. Use bullet points for lists.
- Do not make up information. If the answer is not in the provided data or your knowledge base, state that you cannot find the information.
- When referencing a specific candidate or job from data, always mention their name or title.
- When explaining a feature, be clear and step-by-step if necessary.

---
### **AccionTalent Application Feature Knowledge Base**

**1. Core Navigation & Layout**
*   **Sidebar:** The main navigation on the left. The ATS section expands to show Dashboard, Projects, Candidates, etc.
*   **Header:** At the top. Contains a global search bar, notification bell, and user profile menu.
*   **Global Search:** In the header. Use it to quickly find any candidate or job in the system.
*   **Notifications:** Bell icon in the header. Alerts you to important events like new invitations.
*   **Profile Menu:** Click your name in the header to edit your profile, access settings, or log out.

**2. ATS Modules**
*   **Dashboard:** Your landing page. Recruiters see a personal overview (their pipeline, active projects, upcoming interviews). Admins see a system-wide overview (total candidates, project stats, etc.).
*   **Projects (Job Matching):** This is where you organize hiring.
    *   You create a 'Project' for a hiring initiative (e.g., "Q4 Engineering Hire").
    *   Inside a project, you create one or more 'Job Descriptions'.
    *   **How to add a job:** Go to a project's detail page and click "Upload JDs", "Generate with AI", or "Create Manually".
*   **All Candidates:** Your central candidate database.
    *   **How to add candidates:** Click the "Add Resumes" button to upload resume files (PDF, DOCX, TXT). They will be parsed by AI and added to the list.
    *   You can search, filter by many criteria (skills, status, location), and perform bulk actions like emailing or exporting.
*   **Calendar:** A full-month calendar view of all scheduled interviews. You can click on an event to see details.
*   **Communications:** An email composer.
    *   **How to email candidates:** First, go to the 'All Candidates' page, select the candidates you want to email using the checkboxes, then click "Email Selected". This will bring you to the Communications page with those candidates as recipients.
    *   It has an "Generate with AI" feature to help you write professional emails.
    *   Emails are sent using your computer's default email client (e.g., Outlook, Apple Mail).
*   **Reports:** Shows recruitment analytics. Recruiters see their personal performance (e.g., time to hire). Admins see global reports.
*   **History:** An audit trail. It logs every significant action taken by users in the application. Admins can view the history for any user.

**3. Key AI Features**
*   **Analyze Fit (on Project page):** This is a powerful feature. When viewing jobs in a project, click the "Analyze Fit" button on a job card. The AI will then search your entire candidate database, identify the most relevant candidates for that specific job, and present them in a ranked table with a match score and skill analysis.
*   **AI-Powered Parsing:** When you upload resumes or job descriptions, the AI reads the document and automatically fills in the details like name, skills, job title, etc.
*   **AI Email Generation (in Communications):** Helps you write emails. Give it a prompt like "write a rejection email" and it will create a professional draft.
*   **AI Job Generation (in Projects):** When creating a job, you can choose "Generate with AI". Give it a simple prompt (e.g., "senior react developer with AWS experience"), and it will generate a full, detailed job description for you to edit and save.

**4. Admin-Specific Features**
*   **Settings > Workspace:** Admins can export a full backup of all application data, import a backup (which overwrites everything), or reset the entire application to its default state.
---`,
        }
    });

    const jobsContext = getTruncatedJSON(context.jobs.map(j => ({ id: j.id, title: j.title, status: j.status, requiredSkills: j.requiredSkills })));
    const candidatesContext = getTruncatedJSON(context.candidates.map(c => ({ id: c.id, name: c.name, title: c.title, status: c.status, skills: c.skills })));

    // Prepend the dynamic data context to the user's latest message.
    const promptWithContext = `
Here is the current real-time data from the ATS. Use this for any questions about specific jobs or candidates:

**Jobs Data:**
${jobsContext}

**Candidates Data:**
${candidatesContext}

---

User question: "${inputValue}"
`;

    try {
        const response = await chat.sendMessage({ message: promptWithContext });
        return response.text;
    } catch (error) {
        console.error("Gemini API call failed:", error);
        throw new Error("Failed to get response from Gemini API.");
    }
};
