import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import type { Project } from '../contexts/ProjectContext';
import { veo3Service } from '../services/veo3Service';
import { api_tts } from '../services/api_tts';
import { Plus, FolderOpen, Trash2, Edit2, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectDashboard() {
  const { setCurrentProject } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await veo3Service.getIngredientProjects();
      setProjects(res);
    } catch (err) {
      toast.error('Lỗi khi tải danh sách dự án');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      setIsCreating(true);
      await Promise.all([
        veo3Service.createIngredientProject({ name: newProjectName }),
        api_tts.createProject(newProjectName).catch(e => console.error('Lỗi tạo TTS Project:', e))
      ]);
      toast.success('Tạo dự án thành công!');
      setNewProjectName('');
      fetchProjects();
    } catch (err) {
      toast.error('Lỗi khi tạo dự án');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa dự án này? Toàn bộ tài nguyên bên trong sẽ bị xóa!')) return;

    try {
      await veo3Service.deleteIngredientProject(id);
      toast.success('Đã xóa dự án');
      fetchProjects();
    } catch (err) {
      toast.error('Lỗi khi xóa dự án');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black/40 backdrop-blur-md p-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-orange-300 via-fuchsia-400 to-purple-400 uppercase drop-shadow-[0_0_15px_rgba(192,132,252,0.3)]">
            FLOW AI WORKSPACE
          </h1>
          <p className="text-gray-400 text-lg">Chọn một dự án để bắt đầu làm việc hoặc tạo mới</p>
        </div>

        <form onSubmit={handleCreateProject} className="flex gap-4 mb-12 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Nhập tên dự án mới..."
            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all"
            disabled={isCreating}
          />
          <button
            type="submit"
            disabled={isCreating || !newProjectName.trim()}
            className="px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-medium rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(192,132,252,0.3)]"
          >
            {isCreating ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            Tạo dự án mới
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 size={40} className="animate-spin text-fuchsia-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
            <FolderOpen size={64} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-300 mb-2">Chưa có dự án nào</h3>
            <p className="text-gray-500">Hãy tạo dự án đầu tiên của bạn để bắt đầu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setCurrentProject(project)}
                className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-fuchsia-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(192,132,252,0.15)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="relative z-10 flex justify-between items-start mb-4">
                  <div className="p-3 bg-fuchsia-500/20 rounded-xl text-fuchsia-300 group-hover:scale-110 group-hover:bg-fuchsia-500/30 transition-all">
                    <FolderOpen size={24} />
                  </div>
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Xóa dự án"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-fuchsia-300 transition-colors">
                    {project.name}
                  </h3>
                  <div className="flex items-center text-xs text-gray-500 mb-4">
                    <span>{new Date(project.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span className="mx-2">•</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{project.status}</span>
                  </div>
                </div>

                <div className="relative z-10 mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm text-fuchsia-400 font-medium opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  Mở dự án
                  <ArrowRight size={16} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
