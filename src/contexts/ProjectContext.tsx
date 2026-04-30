import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Project {
  id: string;
  name: string;
  storyBoards?: any;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(() => {
    const saved = localStorage.getItem('current_project');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (currentProject) {
      localStorage.setItem('current_project', JSON.stringify(currentProject));
    } else {
      localStorage.removeItem('current_project');
    }
  }, [currentProject]);

  return (
    <ProjectContext.Provider value={{ currentProject, setCurrentProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
