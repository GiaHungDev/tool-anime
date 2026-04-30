import { fetchWithAuth } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const veo3Service = {
  async getIngredientProjects() {
    const res = await fetchWithAuth(`${API_URL}/veo3/ingredient-project`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async createIngredientProject(data: { name: string, storyBoards?: any }) {
    const res = await fetchWithAuth(`${API_URL}/veo3/ingredient-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async deleteIngredientProject(id: string) {
    const res = await fetchWithAuth(`${API_URL}/veo3/ingredient-project/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete project');
    return res.json();
  }
};
