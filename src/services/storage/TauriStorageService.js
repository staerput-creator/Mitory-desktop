import { invoke } from '@tauri-apps/api/core';
import { BrowserStorageService, buildStandaloneGameHtml } from './BrowserStorageService';
import { assetStorage } from '../assetStorage';
import { isTauri } from '../runtime';
export class TauriStorageService {
  constructor() { this.local = new BrowserStorageService(); this.filePath = null; this.projectId = null; }
  async saveProject(project) {
    if (!isTauri()) return this.local.saveProject(project);
    if (this.projectId !== project.projectMeta.id) this.filePath = null;
    this.projectId = project.projectMeta.id;
    try {
      const jsonContent = JSON.stringify(project, null, 2);
      if (this.filePath) await invoke('save_story_file', { filePath: this.filePath, jsonContent });
      else {
        this.filePath = await invoke('save_story_file_as', { defaultName: `${project.projectMeta.title}.mtrsb`, jsonContent });
        if (!this.filePath) return { success: false, cancelled: true, error: 'Сохранение отменено' };
      }
      return { success: true, filePath: this.filePath, storageType: 'local', sizeBytes: new Blob([jsonContent]).size };
    } catch (error) { return { success: false, error: String(error) }; }
  }
  startNewProject() { this.filePath = null; this.projectId = null; }
  async saveAs(project) {
    const previousFilePath = this.filePath;
    const previousProjectId = this.projectId;
    this.filePath = null;
    const result = await this.saveProject(project);
    if (result.success) result.filePath = this.filePath;
    if (!result.success) {
      this.filePath = previousFilePath;
      this.projectId = previousProjectId;
    }
    return result;
  }
  async open(filePath = null) {
    if (!isTauri()) {
      const project = await this.local.open();
      return project;
    }
    try {
      const result = await invoke('open_story_file', { filePath });
      if (!result) return null;
      const project = result.project;
      if (project?.graph) {
        const graph = project.graph;
        const entities = project.entities || {};
        const meta = project.project || {};
        project.nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        project.edges = Array.isArray(graph.edges) ? graph.edges : [];
        project.regions = Array.isArray(entities.chapters) ? entities.chapters : [];
        project.characters = Array.isArray(entities.characters) ? entities.characters : [];
        project.variables = Array.isArray(entities.variables) ? entities.variables : [];
        project.projectMeta = { ...(project.projectMeta || {}), ...meta };
        project.viewport = graph.viewport || { x: 0, y: 0, zoom: 1 };
      }
      const metaId = project.projectMeta?.id || `canvas-${Date.now()}`;
      project.projectMeta = { ...(project.projectMeta || {}), id: metaId };
      this.filePath = result.filePath;
      this.projectId = metaId;
      assetStorage.hydrateFromProject(project);
      return project;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
  async getStartupFile() {
    if (!isTauri()) return null;
    try { return await invoke('get_startup_file'); }
    catch (error) { console.error(error); return null; }
  }
  async loadProject(id) { return this.local.loadProject(id); }
  async listProjects() { return isTauri() ? invoke('get_recent_projects') : this.local.listProjects(); }
  async exportJson(project) { return isTauri() ? this.saveAs(project) : this.local.exportJson(project); }
  async exportStandaloneHtml(project) {
    if (!isTauri()) return this.local.exportStandaloneHtml(project);
    try {
      const path = await invoke('export_html_game', {
        filePath: `${project.projectMeta.title}.html`,
        htmlContent: buildStandaloneGameHtml(project)
      });
      return { success: Boolean(path), cancelled: !path };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
export { TauriStorageService as TauriStorageAdapter };