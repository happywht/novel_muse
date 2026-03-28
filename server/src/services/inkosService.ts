/**
 * inkos Service
 * Bridges Muse backend with inkos CLI core functionality
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  TaskInfo,
  TaskStatus,
  ImportRequest,
  ImportResult,
  ExportRequest,
  ExportResult,
  WriteChapterRequest,
  WriteChapterResult,
  AuditRequest,
  AuditResult,
  InkosConfig,
} from '../types/inkos';
import { sendTaskProgress, sendWriteChunk, sendAuditDimension } from '../middleware/sse';

/**
 * Task storage (in-memory for now, can be replaced with Redis/DB)
 */
class TaskStore {
  private tasks: Map<string, TaskInfo> = new Map();

  create(type: TaskInfo['type'], projectId: string): TaskInfo {
    const taskId = uuidv4();
    const now = new Date().toISOString();
    const task: TaskInfo = {
      taskId,
      type,
      status: 'pending',
      progress: 0,
      message: 'Task created',
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(taskId, task);
    return task;
  }

  get(taskId: string): TaskInfo | undefined {
    return this.tasks.get(taskId);
  }

  update(taskId: string, updates: Partial<TaskInfo>): TaskInfo | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    const updated = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  delete(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }
}

export const taskStore = new TaskStore();

/**
 * inkos Service
 */
export class InkosService {
  private inkosPath: string;
  private workspacePath: string;

  constructor() {
    // inkos CLI path (relative to server)
    this.inkosPath = path.resolve(__dirname, '../../../inkos');
    // Workspace for temporary inkos projects
    this.workspacePath = path.resolve(__dirname, '../../workspace/inkos');
  }

  /**
   * Get inkos CLI binary path
   */
  private getCliPath(): string {
    return path.join(this.inkosPath, 'packages/cli/dist/index.js');
  }

  /**
   * Ensure workspace directory exists
   */
  private async ensureWorkspace(): Promise<void> {
    try {
      await fs.mkdir(this.workspacePath, { recursive: true });
    } catch {
      // Directory already exists
    }
  }

  /**
   * Execute inkos CLI command
   */
  private async executeInkos(
    args: string[],
    options: { cwd?: string; env?: Record<string, string> } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const cliPath = this.getCliPath();
      const env = {
        ...process.env,
        ...options.env,
        NODE_ENV: 'production',
      };

      const proc: ChildProcess = spawn('node', [cliPath, ...args], {
        cwd: options.cwd || this.inkosPath,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode: exitCode || 0 });
      });

      proc.on('error', (error) => {
        reject(new Error(`Failed to execute inkos: ${error.message}`));
      });
    });
  }

  /**
   * Import Muse project to inkos format
   */
  async importProject(
    request: ImportRequest,
    projectId: string
  ): Promise<{ taskId: string }> {
    await this.ensureWorkspace();

    const task = taskStore.create('import', projectId);
    const taskDir = path.join(this.workspacePath, task.taskId);

    try {
      // Update task status
      taskStore.update(task.taskId, {
        status: 'running',
        message: 'Starting import...',
        progress: 10,
      });
      sendTaskProgress(projectId, task.taskId, 10, 'Starting import...');

      // Create task directory
      await fs.mkdir(taskDir, { recursive: true });

      // Convert Muse project to inkos format
      const inkosProject = await this.convertMuseToInkos(request);
      taskStore.update(task.taskId, {
        progress: 30,
        message: 'Converting project format...',
      });
      sendTaskProgress(projectId, task.taskId, 30, 'Converting project format...');

      // Write inkos project files
      await this.writeInkosProject(taskDir, inkosProject);
      taskStore.update(task.taskId, {
        progress: 60,
        message: 'Writing project files...',
      });
      sendTaskProgress(projectId, task.taskId, 60, 'Writing project files...');

      // Run inkos init in the task directory (init doesn't support --path, use cwd)
      const result = await this.executeInkos(['init'], {
        cwd: taskDir,
      });

      if (result.exitCode !== 0) {
        throw new Error(`inkos init failed: ${result.stderr}`);
      }

      const importResult: ImportResult = {
        projectId: request.projectId,
        inkosProjectPath: taskDir,
        chaptersWritten: request.chapters?.length || 0,
        charactersImported: request.characters?.length || 0,
        worldBuilt: !!request.world,
        message: 'Project imported successfully',
      };

      taskStore.update(task.taskId, {
        status: 'completed',
        progress: 100,
        message: 'Import completed',
        result: importResult,
        completedAt: new Date().toISOString(),
      });
      sendTaskProgress(projectId, task.taskId, 100, 'Import completed');

      return { taskId: task.taskId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      taskStore.update(task.taskId, {
        status: 'failed',
        error: errorMessage,
        message: 'Import failed',
      });
      sendTaskProgress(projectId, task.taskId, 0, `Import failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Export inkos project to Muse format
   */
  async exportProject(
    request: ExportRequest,
    projectId: string
  ): Promise<{ taskId: string }> {
    const task = taskStore.create('export', projectId);

    try {
      taskStore.update(task.taskId, {
        status: 'running',
        message: 'Starting export...',
        progress: 10,
      });
      sendTaskProgress(projectId, task.taskId, 10, 'Starting export...');

      // Read inkos project files
      const inkosProject = await this.readInkosProject(request.inkosProjectPath);
      taskStore.update(task.taskId, {
        progress: 40,
        message: 'Reading inkos project...',
      });
      sendTaskProgress(projectId, task.taskId, 40, 'Reading inkos project...');

      // Convert to Muse format
      const museProject = await this.convertInkosToMuse(inkosProject) as any;
      taskStore.update(task.taskId, {
        progress: 70,
        message: 'Converting to Muse format...',
      });
      sendTaskProgress(projectId, task.taskId, 70, 'Converting to Muse format...');

      const exportResult: ExportResult = {
        projectId: request.targetProjectId || '',
        chaptersExported: museProject.chapters?.length || 0,
        charactersExported: museProject.characters?.length || 0,
        worldExported: !!museProject.world,
        message: 'Export completed successfully',
      };

      taskStore.update(task.taskId, {
        status: 'completed',
        progress: 100,
        message: 'Export completed',
        result: { ...exportResult, museProject },
        completedAt: new Date().toISOString(),
      });
      sendTaskProgress(projectId, task.taskId, 100, 'Export completed');

      return { taskId: task.taskId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      taskStore.update(task.taskId, {
        status: 'failed',
        error: errorMessage,
        message: 'Export failed',
      });
      sendTaskProgress(projectId, task.taskId, 0, `Export failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Write chapter using inkos writer agent
   */
  async writeChapter(
    request: WriteChapterRequest,
    projectId: string
  ): Promise<{ taskId: string }> {
    const task = taskStore.create('write', projectId);

    try {
      taskStore.update(task.taskId, {
        status: 'running',
        message: 'Initializing writer agent...',
        progress: 5,
      });
      sendTaskProgress(projectId, task.taskId, 5, 'Initializing writer agent...');

      // Get project path
      const projectPath = await this.getProjectPath(projectId);
      if (!projectPath) {
        throw new Error('Project not found in workspace');
      }

      // Build inkos write command (write next doesn't support --path, use cwd)
      const args = ['write', 'next'];

      // Note: chapter number is auto-detected by inkos, but we can specify book-id if needed
      // args.push(String(request.chapterNumber));

      if (request.options?.model) {
        args.push('--model', request.options.model);
      }

      taskStore.update(task.taskId, {
        progress: 10,
        message: 'Starting chapter generation...',
      });
      sendTaskProgress(projectId, task.taskId, 10, 'Starting chapter generation...');

      // Execute write command with streaming
      const result = await this.executeInkosWithStreaming(
        args,
        projectPath,
        (progress, message, data) => {
          taskStore.update(task.taskId, {
            progress,
            message,
          });
          sendTaskProgress(projectId, task.taskId, progress, message);

          // Stream write chunks if available
          if (data?.chunk) {
            sendWriteChunk(projectId, task.taskId, data.chunk, data.wordCount || 0);
          }
        }
      );

      if (result.exitCode !== 0) {
        throw new Error(`inkos write failed: ${result.stderr}`);
      }

      // Parse result
      const writeResult: WriteChapterResult = {
        chapterId: request.chapterId,
        chapterNumber: request.chapterNumber,
        content: result.stdout,
        wordCount: result.stdout.split(/\s+/).length,
        tokenUsage: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
        revisions: 0,
        validationPassed: true,
      };

      taskStore.update(task.taskId, {
        status: 'completed',
        progress: 100,
        message: 'Chapter written successfully',
        result: writeResult,
        completedAt: new Date().toISOString(),
      });
      sendTaskProgress(projectId, task.taskId, 100, 'Chapter written successfully');

      return { taskId: task.taskId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      taskStore.update(task.taskId, {
        status: 'failed',
        error: errorMessage,
        message: 'Write failed',
      });
      sendTaskProgress(projectId, task.taskId, 0, `Write failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Run 33-dimension audit
   */
  async runAudit(
    request: AuditRequest,
    projectId: string
  ): Promise<{ taskId: string }> {
    const task = taskStore.create('audit', projectId);

    try {
      taskStore.update(task.taskId, {
        status: 'running',
        message: 'Starting 33-dimension audit...',
        progress: 5,
      });
      sendTaskProgress(projectId, task.taskId, 5, 'Starting 33-dimension audit...');

      // Get project path
      const projectPath = await this.getProjectPath(projectId);
      if (!projectPath) {
        throw new Error('Project not found in workspace');
      }

      // Build audit command (audit doesn't support --path, use cwd)
      const args = ['audit'];
      if (request.chapterId) {
        // Find chapter number from chapterId
        args.push(request.chapterId);
      }

      taskStore.update(task.taskId, {
        progress: 10,
        message: 'Running continuity check...',
      });
      sendTaskProgress(projectId, task.taskId, 10, 'Running continuity check...');

      // Execute audit with streaming
      const result = await this.executeInkosWithStreaming(
        args,
        projectPath,
        (progress, message, data) => {
          taskStore.update(task.taskId, { progress, message });
          sendTaskProgress(projectId, task.taskId, progress, message);

          // Stream dimension results if available
          if (data?.dimension) {
            sendAuditDimension(
              projectId,
              task.taskId,
              data.dimension,
              data.score || 0,
              data.issues || []
            );
          }
        }
      );

      if (result.exitCode !== 0) {
        throw new Error(`inkos audit failed: ${result.stderr}`);
      }

      // Parse audit result
      const auditResult = this.parseAuditResult(result.stdout, request);

      taskStore.update(task.taskId, {
        status: 'completed',
        progress: 100,
        message: 'Audit completed',
        result: auditResult,
        completedAt: new Date().toISOString(),
      });
      sendTaskProgress(projectId, task.taskId, 100, 'Audit completed');

      return { taskId: task.taskId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      taskStore.update(task.taskId, {
        status: 'failed',
        error: errorMessage,
        message: 'Audit failed',
      });
      sendTaskProgress(projectId, task.taskId, 0, `Audit failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskInfo | undefined {
    return taskStore.get(taskId);
  }

  /**
   * Cancel task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = taskStore.get(taskId);
    if (!task) return false;

    if (task.status === 'running') {
      taskStore.update(taskId, {
        status: 'cancelled',
        message: 'Task cancelled by user',
      });
      return true;
    }

    return false;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Get project path by ID
   */
  private async getProjectPath(projectId: string): Promise<string | null> {
    // Look for project in workspace
    const projectDirs = await fs.readdir(this.workspacePath);
    for (const dir of projectDirs) {
      const configPath = path.join(this.workspacePath, dir, 'project.yaml');
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        if (content.includes(projectId)) {
          return path.join(this.workspacePath, dir);
        }
      } catch {
        // File doesn't exist, continue
      }
    }
    return null;
  }

  /**
   * Convert Muse project to inkos format
   */
  private async convertMuseToInkos(request: ImportRequest): Promise<Record<string, unknown>> {
    return {
      config: {
        title: request.project.title,
        genre: request.project.genre || 'general',
        platform: 'web',
        wordCountGoal: request.project.wordCountGoal || 100000,
      },
      outline: {
        premise: request.project.premise || '',
        theme: request.project.theme || '',
        synopsis: request.project.synopsis || '',
        chapters: (request.chapters || []).map((ch, index) => ({
          number: ch.order || index + 1,
          title: ch.title,
          synopsis: ch.synopsis || '',
        })),
      },
      characters: (request.characters || []).map(char => ({
        id: char.id,
        name: char.name,
        role: char.role || 'supporting',
        description: char.description || '',
        backstory: char.backstory || '',
        personality: char.personality || '',
        goals: char.goals || '',
        relationships: char.relationships || [],
      })),
      world: request.world || {},
    };
  }

  /**
   * Convert inkos project to Muse format
   */
  private async convertInkosToMuse(inkosProject: Record<string, unknown>): Promise<Record<string, unknown>> {
    // This is a simplified conversion - expand based on actual inkos format
    return {
      project: {
        title: (inkosProject.config as any)?.title || 'Untitled',
        genre: (inkosProject.config as any)?.genre || 'general',
        wordCountGoal: (inkosProject.config as any)?.wordCountGoal || 100000,
      },
      chapters: ((inkosProject.outline as any)?.chapters || []).map((ch: any) => ({
        title: ch.title,
        synopsis: ch.synopsis,
        order: ch.number,
      })),
      characters: (inkosProject.characters as any[]) || [],
      world: inkosProject.world || {},
    };
  }

  /**
   * Write inkos project files
   */
  private async writeInkosProject(
    projectPath: string,
    project: Record<string, unknown>
  ): Promise<void> {
    // Write project.yaml
    const yaml = this.toYaml(project.config);
    await fs.writeFile(path.join(projectPath, 'project.yaml'), yaml);

    // Write outline.md
    const outline = this.toOutlineMarkdown(project);
    await fs.writeFile(path.join(projectPath, 'outline.md'), outline);

    // Write characters.json
    await fs.writeFile(
      path.join(projectPath, 'characters.json'),
      JSON.stringify(project.characters, null, 2)
    );

    // Write world.json
    await fs.writeFile(
      path.join(projectPath, 'world.json'),
      JSON.stringify(project.world, null, 2)
    );
  }

  /**
   * Read inkos project from disk
   */
  private async readInkosProject(projectPath: string): Promise<Record<string, unknown>> {
    const project: Record<string, unknown> = {};

    try {
      const configYaml = await fs.readFile(path.join(projectPath, 'project.yaml'), 'utf-8');
      project.config = this.parseYaml(configYaml);
    } catch {
      // Config doesn't exist
    }

    try {
      const outlineMd = await fs.readFile(path.join(projectPath, 'outline.md'), 'utf-8');
      project.outline = this.parseOutlineMarkdown(outlineMd);
    } catch {
      // Outline doesn't exist
    }

    try {
      const charactersJson = await fs.readFile(path.join(projectPath, 'characters.json'), 'utf-8');
      project.characters = JSON.parse(charactersJson);
    } catch {
      // Characters don't exist
    }

    try {
      const worldJson = await fs.readFile(path.join(projectPath, 'world.json'), 'utf-8');
      project.world = JSON.parse(worldJson);
    } catch {
      // World doesn't exist
    }

    return project;
  }

  /**
   * Execute inkos with streaming progress
   */
  private async executeInkosWithStreaming(
    args: string[],
    cwd: string,
    onProgress: (progress: number, message: string, data?: any) => void
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const cliPath = this.getCliPath();
      let stdout = '';
      let stderr = '';
      let progress = 0;

      const proc: ChildProcess = spawn('node', [cliPath, ...args], {
        cwd,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;

        // Parse progress from stdout (assuming inkos outputs progress)
        const progressMatch = text.match(/\[progress:(\d+)\]\s*(.*)/);
        if (progressMatch) {
          progress = parseInt(progressMatch[1], 10);
          onProgress(progress, progressMatch[2] || 'Processing...');
        }

        // Parse chunks for streaming
        const chunkMatch = text.match(/\[chunk\](.*?)\[\/chunk\]/s);
        if (chunkMatch) {
          onProgress(progress, 'Writing...', { chunk: chunkMatch[1] });
        }

        // Parse dimension results
        const dimensionMatch = text.match(/\[dimension:(\w+)\]\s*score:(\d+)\s*issues:(.*)/);
        if (dimensionMatch) {
          onProgress(progress, `Analyzing ${dimensionMatch[1]}...`, {
            dimension: dimensionMatch[1],
            score: parseInt(dimensionMatch[2], 10),
            issues: JSON.parse(dimensionMatch[3] || '[]'),
          });
        }
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode: exitCode || 0 });
      });

      proc.on('error', (error) => {
        reject(new Error(`Failed to execute inkos: ${error.message}`));
      });
    });
  }

  /**
   * Parse audit result from inkos output
   */
  private parseAuditResult(output: string, request: AuditRequest): AuditResult {
    // This is a simplified parser - expand based on actual inkos audit output
    try {
      const parsed = JSON.parse(output);
      return {
        projectId: request.projectId,
        chapterId: request.chapterId,
        overallScore: parsed.overallScore || 0,
        dimensions: parsed.dimensions || [],
        summary: parsed.summary || '',
        recommendations: parsed.recommendations || [],
        auditedAt: new Date().toISOString(),
      };
    } catch {
      // If JSON parsing fails, return a basic result
      return {
        projectId: request.projectId,
        chapterId: request.chapterId,
        overallScore: 0,
        dimensions: [],
        summary: 'Audit completed but result parsing failed',
        recommendations: ['Review inkos output manually'],
        auditedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Simple YAML serializer
   */
  private toYaml(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n${this.toYaml(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          yaml += `${spaces}  - ${item}\n`;
        }
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }

  /**
   * Simple YAML parser
   */
  private parseYaml(yaml: string): Record<string, unknown> {
    // Very basic YAML parser - use a library in production
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Convert outline to markdown
   */
  private toOutlineMarkdown(project: Record<string, unknown>): string {
    const outline = project.outline as any;
    const chapters = outline?.chapters || [];
    const config = project.config as any;

    let md = `# ${config?.title || 'Untitled'}\n\n`;
    md += `## Premise\n\n${outline?.premise || ''}\n\n`;
    md += `## Theme\n\n${outline?.theme || ''}\n\n`;
    md += `## Synopsis\n\n${outline?.synopsis || ''}\n\n`;
    md += `## Chapters\n\n`;

    for (const ch of chapters) {
      md += `### Chapter ${ch.number}: ${ch.title}\n\n${ch.synopsis || ''}\n\n`;
    }

    return md;
  }

  /**
   * Parse outline from markdown
   */
  private parseOutlineMarkdown(md: string): Record<string, unknown> {
    // Basic markdown parser
    const sections: Record<string, unknown> = {};
    const chapterMatches = md.matchAll(/### Chapter (\d+): (.+?)\n\n([\s\S]*?)(?=### Chapter|\n*$)/g);
    const chapters: Array<{ number: number; title: string; synopsis: string }> = [];

    for (const match of chapterMatches) {
      chapters.push({
        number: parseInt(match[1], 10),
        title: match[2],
        synopsis: match[3].trim(),
      });
    }

    sections.chapters = chapters;

    // Extract other sections
    const premiseMatch = md.match(/## Premise\n\n([\s\S]*?)(?=\n##|\n###)/);
    if (premiseMatch) {
      sections.premise = premiseMatch[1].trim();
    }

    const themeMatch = md.match(/## Theme\n\n([\s\S]*?)(?=\n##|\n###)/);
    if (themeMatch) {
      sections.theme = themeMatch[1].trim();
    }

    const synopsisMatch = md.match(/## Synopsis\n\n([\s\S]*?)(?=\n##|\n###)/);
    if (synopsisMatch) {
      sections.synopsis = synopsisMatch[1].trim();
    }

    return sections;
  }
}

// Export singleton instance
export const inkosService = new InkosService();
