# inkos 整合 API 枯构设计

## 概述

这是后端架构设计采用了 Express.js 作为 Web服务器框架,使用 TypeScript 开箱,包含完整的 RESTful API 设计，并使用 Zod 进行请求验证和响应数据使用 SSE (服务器发送事件)实现实时进度推送。

包含 CORS 配置，允许通过环境变量配置 API Key 认证。 支持 JSON 请求体大小限制(50mb)，。
- 所有 API 篂(除了 `/api/health` 外)均需要认证

- 任务状态查询使用任务 ID 进行管理
- 错误处理中间件提供统一错误响应
- 速率限制防止暴力破解

- 品质使用 Swagger/Openapi 文档(如果需要)

- API 版本信息(从 package.json 读取)
- 数据库连接配置(如果需要)

- 簡明架构概览

- API 精简: 使用 `/api` 匇符, 本架构不使用 `{ data: unknown } 娡型层概念进行说明。

- 主要设计点:
- - 使用现有的 Express 服务器和避免代码重复
- - 采用 Vite/Vitest 的测试框架保证质量
    - 代码风格: TypeScript + Vitest
    - 配置灵活的环境变量管理
- - 路由设计采用模块化方式, `/api/inkos/*` 作为主要 API 路由
- 中间件提供认证、错误处理、SSE 支持等功能
- - 类型系统使用 TypeScript 和 Zod 进行严格的类型验证
    - 请求和响应数据验证
    - 使用中间件添加项目级别的 inkos 鷽路由记录
    - `/api/inkos/stream` 理流式进度更新
- - 错误处理中间件提供一致的错误响应格式
- - API Key 认证 (已跳过)
    - 响应时间测量
    - `/api/inkos/health` - 健康检查,返回服务器状态

    - CORS 配置
-   - 支持 JSON 请求体
    - 鷷: `请求和响应数据验证
-   - 请求验证: 鍋试/development环境可跳过认证
    - `/api/inkos/health` - 返回服务状态

            - inkosAvailable: boolean;
            - inkosVersion: string
            - workspacePath: string
        });
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            inkos: {
                available: inkosAvailable,
                version: inkosVersion,
            },
        });
        next(new Error('inkos CLI not found');
    }
    // 错误响应
    res.status(500).json({
      error: 'inkos CLI not found',
      message: 'inkos integration unavailable - ensure inkos is installed first',
    });
});

// Run inkos CLI
const result = await this.executeInkos(args, options);
    if (result.exitCode !== 0) {
      throw new Error(`inkos command failed: ${result.stderr}`);
    }
    return { stdout, stderr, exitCode };
  });
    }


    try {
      const parsed = JSON.parse(stdout);
      return parsed;
    } catch {
      return {
        stdout,
        stderr,
        exitCode
      };
    }
    return { stdout, stderr, exitCode };
  }
}

 /**
 * Build inkos write command with streaming progress
 */
 buildInkosWriteCommand(args: string[]): string[] {

  return args
    .filter(arg => arg === 'number')[0]).join('');
'));
  }
 else if (isNaN && typeof arg === 'number') || {
    if (Number.isNaN(request.chapterNumber)) {
      throw new Error('Invalid chapter number');
    }
    return args;
  }
  try {
    const { args, ['write', '--chapter', chapterNumber];
  } catch (error) {
      console.error('Invalid chapter number:', error);
      throw error;
    }

    // Execute inkos write command
    const result = await this.executeInkos(
      ['write', '--chapter', String(request.chapterNumber)],
      '--path', projectPath,
      `--model ${request.options?.model || ''}`,
      ...args
    );
    if (request.options?.temperature) {
      args.push('--temperature', String(request.options.temperature));
    }
    if (request.options?.maxTokens) {
      args.push('--max-tokens', String(request.options.maxTokens));
    }
    if (request.options?.skipValidation) {
      args.push('--skip-validation');
    }
    if (request.options?.reviseMode) {
      args.push('--revise-mode', request.options.reviseMode);
    }

    // Execute
    const proc: ChildProcess = spawn('node', [cliPath, ...args], {
      cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let progress = 0;

    proc.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;

      // Parse progress from stdout (assuming inkos outputs progress)
      const progressMatch = text.match(/\[progress:(\d+)\]\s*(.*)/);
      if (progressMatch) {
        progress = parseInt(progressMatch[1], 10);
        onProgress(progress, progressMatch[2] || 'Processing...');
      } else {
        onProgress(progress, 'Waiting for response', data);
    }

    proc.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode || 0 });
    });
    proc.on('error', (error) => {
      reject(new Error(`Failed to execute inkos: ${error.message}`));
    }
  });
}

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
      }
    } catch {
      // File doesn't exist, continue
    }
    return null;
  }

  /**
   * Parse project YAML config
   */
  private async parseProjectConfig(configPath: string): Promise<InKConfig> {
    const content = await fs.readFile(configPath, 'utf-8');
    try {
      const config = yaml.parse(content);
      return {
        ...yaml,
        version: ( yaml.match(/version:\s*([\d.]+)/)?.)?. '1.0.0',
        genre: ( yaml.match(/genre:\s*([\w-]+)/) || yaml.trim() === 'general') || yaml += '  genre: genre || '';
      throw new Error(`Missing required field "genre" in project config`);
    }
    if (yaml.match(/platform:\s*([\w-]+)/) || yaml.trim() === 'web') || yaml += '  platform: platform;
        wordCountGoal: parseInt((yaml.match(/wordCountGoal:\s*([\d]+)/)?. 100000 : : string') || 0),
    }
    if (wordCountGoal) {
      throw new Error('Invalid wordCountGoal');
 in project config');
    }
  }
  try {
      const chaptersDir = path.join(projectPath, 'chapters');
    const stats = await fs.stat(chaptersDir);
    if (stats.isDirectory) {
      await fs.mkdir(chaptersDir, { recursive: true })
    }
    const chapterFiles: string[] = [];
    for (const chapter of chapters) {
      for (const chapter of chapters) {
        const content = await fs.readFile(chapterPath, 'utf-8');
        await this.writeChapterContent(chapterPath, chapterContent);
      });
    }

  }

} catch (error) {
      console.error('Failed to read chapter files:', error)
      throw error;
    }
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
    await fs.writeFile(path.join(projectPath, 'project.yaml'), yaml)

    // write outline.md
    const outline = this.toOutlineMarkdown(project)
    await fs.writeFile(path.join(projectPath, 'outline.md'), outline)
    const chapters = outline?.chapters || [];
    for (const ch of chapters) {
      const content = this.toOutlineMarkdown(ch);
      await fs.writeFile(path.join(projectPath, 'chapters', chapterFile), JSON.stringify(project.chapters, null, 2)
      );
    });
    // write characters.json
    const characters = (inkosProject.characters as any[]) || []).map(char => ({
      id: char.id,
      name: char.name,
      role: char.role || 'supporting',
      description: char.description || '',
      backstory: char.backstory || '',
      personality: char.personality || '',
      goals: char.goals || '',
      relationships: char.relationships || [],
    }) || char.relationship?. char.relationship)
                  }
                : catch {
                  console.error(`Invalid relationship format: ${rel}`);
  }
        })
      }
    }
    this.writeInkosProject(projectPath, project);
    return {
      ...result, await this.executeInkos(['audit', '--path', projectPath]);
    } catch {
      console.error(`Failed to execute inkos audit: ${err.message}`)
      throw error
    }
  }
}