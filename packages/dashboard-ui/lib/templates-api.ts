import { fetchWithAuth } from './api';

export interface Template {
  id: string;
  name: string;
  language: string;
  category: string | null;
  structure: any;
  bodyText: string | null;
  variables: string[];
  status: 'approved' | 'rejected' | 'pending';
  createdAt: string;
}

export interface ImportTemplateDto {
  name?: string;
  language?: string;
  category?: string;
  bodyText?: string;
  structure: any;
}

export const templatesApi = {
  list: async (): Promise<Template[]> => {
    return fetchWithAuth<Template[]>('/templates');
  },

  import: async (dto: ImportTemplateDto): Promise<Template> => {
    return fetchWithAuth<Template>('/templates/import', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  delete: async (id: string): Promise<void> => {
    return fetchWithAuth(`/templates/${id}`, {
      method: 'DELETE',
    });
  },

  get: async (id: string): Promise<Template> => {
    return fetchWithAuth<Template>(`/templates/${id}`);
  }
};
