const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/atsbackend';

export const atsApiService = {
  async downloadResume(filename: string): Promise<Blob> {
    try {
      const resp = await fetch(`${API_BASE_URL}/download-resume?name=${encodeURIComponent(filename)}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!resp.ok) throw new Error(`Failed to download resume: ${resp.status} ${resp.statusText}`);
      const blob = await resp.blob();
      return blob;
    } catch (err) {
      console.error('atsApiService.downloadResume error:', err);
      throw err;
    }
  },

  async deleteResume(s3Key: string): Promise<void> {
    try {
      const resp = await fetch(`${API_BASE_URL}/delete-resume`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: s3Key }),
      });
      if (!resp.ok) throw new Error(`Failed to delete resume: ${resp.status} ${resp.statusText}`);
      return;
    } catch (err) {
      console.error('atsApiService.deleteResume error:', err);
      throw err;
    }
  }
};

export default atsApiService;
