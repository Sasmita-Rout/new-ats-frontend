import { Candidate } from '../types/types';
import { GoogleGenAI } from "@google/genai";

declare var mammoth: any;
declare var pdfjsLib: any;

// Configure the PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}


const RESUME_VAULT_BASE_URL = 'http://localhost:8002/resume_vault';
//const RESUME_VAULT_BASE_URL = "https://intranet.accionlabs.com/resume_vault";

export const downloadResumeText = (candidate: Candidate) => {
    const textContent = candidate.resumeContent && candidate.resumeContent.trim().length > 0
        ? candidate.resumeContent
        : JSON.stringify(candidate, (key, value) => (key === 'originalResumeFile' ? undefined : value), 2);
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${candidate.name.replace(' ', '_')}_Resume.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const downloadOriginalResume = (candidate: Candidate) => {
    if (candidate.originalResumeFile) {
        const url = URL.createObjectURL(candidate.originalResumeFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = candidate.originalResumeFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
    }

    if (candidate.email) {
        const vaultUrl = `${RESUME_VAULT_BASE_URL}/api/v1/resumes/download/${encodeURIComponent(candidate.email)}`;
        window.open(vaultUrl, '_blank');
    }
};

export const getTextFromFile = async (file: File, ai?: GoogleGenAI): Promise<string> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        const fileType = file.type;
        const fileName = file.name.toLowerCase();

        if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith('.docx')) {
            reader.onload = async (event) => {
                try {
                    const result = await mammoth.extractRawText({ arrayBuffer: event.target.result });
                    resolve(result.value);
                } catch (error) { reject(new Error(`Failed to parse DOCX: ${error.message}`)); }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        } else if (fileType === "application/pdf" || fileName.endsWith('.pdf')) {
            reader.onload = async (event) => {
                const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
                try {
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let text = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        text += textContent.items.map(item => (item as any).str).join(' ') + '\n';
                    }
                    resolve(text);
                } catch (error) { reject(new Error(`Failed to parse PDF: ${error.message}`)); }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        } else if (fileType.startsWith("text/") || fileName.endsWith('.txt') || fileType === 'text/csv' || fileType === 'application/json' || fileName.endsWith('.csv') || fileName.endsWith('.json')) {
            reader.onload = (event) => resolve(event.target.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        } else if (fileType.startsWith("image/")) {
            if (!ai) {
                return reject(new Error("AI instance is required to parse images."));
            }
            reader.onload = async (event) => {
                try {
                    const base64Data = (event.target.result as string).split(',')[1];
                    const imagePart = {
                        inlineData: {
                            data: base64Data,
                            mimeType: file.type,
                        },
                    };
                    const textPart = {
                        text: "Extract all text from this image. Only return the extracted text, without any additional comments or explanations.",
                    };
                    // Fix: Updated model name to 'gemini-3-flash-preview' for basic text extraction.
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: { parts: [imagePart, textPart] },
                    });
                    resolve(response.text);
                } catch (error) {
                    reject(new Error(`Failed to parse image with AI: ${error.message}`));
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        }
        else {
            reject(new Error(`Unsupported file type: ${fileType || 'unknown'}.`));
        }
    });
};
