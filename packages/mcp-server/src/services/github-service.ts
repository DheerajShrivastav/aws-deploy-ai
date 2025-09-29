import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit } from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

export interface GitHubRepository {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
}

export interface RepositoryContent {
  files: Record<string, string>;
  packageJson?: any;
  readme?: string;
  projectType:
    | 'static'
    | 'react'
    | 'vue'
    | 'angular'
    | 'node'
    | 'python'
    | 'other';
}

export interface DeploymentFromGitHub {
  repository: GitHubRepository;
  content: RepositoryContent;
  deploymentType: string;
  buildCommand?: string;
  outputDirectory?: string;
}

export class GitHubService {
  private octokit: Octokit;
  private tempDir: string;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });

    this.tempDir = path.join(process.cwd(), 'temp', 'github');
  }

  /**
   * Analyze a GitHub repository and determine deployment configuration
   */
  async analyzeRepository(
    repository: GitHubRepository
  ): Promise<RepositoryContent> {
    logger.info('Analyzing GitHub repository', { repository });

    try {
      // Get repository contents
      const { data: contents } = await this.octokit.rest.repos.getContent({
        owner: repository.owner,
        repo: repository.repo,
        path: repository.path || '',
        ref: repository.branch || 'main',
      });

      if (!Array.isArray(contents)) {
        throw new Error('Repository path is not a directory');
      }

      // Download and analyze key files
      const files: Record<string, string> = {};
      let packageJson: any = null;
      let readme: string | undefined;
      let projectType: RepositoryContent['projectType'] = 'other';

      // Process each file/directory
      for (const item of contents) {
        if (item.type === 'file') {
          const fileContent = await this.getFileContent(repository, item.path);
          files[item.name] = fileContent;

          // Analyze specific files
          if (item.name === 'package.json') {
            try {
              packageJson = JSON.parse(fileContent);
            } catch (error) {
              logger.warn('Failed to parse package.json', { error });
            }
          } else if (item.name.toLowerCase().startsWith('readme')) {
            readme = fileContent;
          }
        }
      }

      // Determine project type
      projectType = this.determineProjectType(files, packageJson);

      // Get additional files based on project type
      if (projectType !== 'static') {
        await this.getProjectFiles(repository, files, projectType);
      }

      return {
        files,
        packageJson,
        readme,
        projectType,
      };
    } catch (error) {
      logger.error('Failed to analyze repository', { error, repository });
      throw new Error(
        `Failed to analyze repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get file content from GitHub repository
   */
  private async getFileContent(
    repository: GitHubRepository,
    filePath: string
  ): Promise<string> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: repository.owner,
        repo: repository.repo,
        path: filePath,
        ref: repository.branch || 'main',
      });

      if (Array.isArray(data) || data.type !== 'file') {
        throw new Error(`${filePath} is not a file`);
      }

      // Decode base64 content
      return Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (error) {
      logger.warn(`Failed to get file content: ${filePath}`, { error });
      return '';
    }
  }

  /**
   * Determine project type based on file analysis
   */
  private determineProjectType(
    files: Record<string, string>,
    packageJson: any
  ): RepositoryContent['projectType'] {
    // Check package.json dependencies
    if (packageJson) {
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      if (deps.react || deps['@types/react']) {
        return 'react';
      } else if (deps.vue || deps['@vue/core']) {
        return 'vue';
      } else if (deps['@angular/core']) {
        return 'angular';
      } else if (deps.express || deps.fastify || deps.koa) {
        return 'node';
      }
    }

    // Check for Python files
    if (
      Object.keys(files).some((name) => name.endsWith('.py')) ||
      files['requirements.txt'] ||
      files['Pipfile']
    ) {
      return 'python';
    }

    // Check for static files
    if (
      files['index.html'] ||
      Object.keys(files).some((name) => name.endsWith('.html'))
    ) {
      return 'static';
    }

    return 'other';
  }

  /**
   * Get additional project files based on project type
   */
  private async getProjectFiles(
    repository: GitHubRepository,
    files: Record<string, string>,
    projectType: RepositoryContent['projectType']
  ): Promise<void> {
    const additionalPaths: string[] = [];

    switch (projectType) {
      case 'react':
        additionalPaths.push('src', 'public', 'components');
        break;
      case 'vue':
        additionalPaths.push('src', 'components', 'views');
        break;
      case 'angular':
        additionalPaths.push('src', 'angular.json');
        break;
      case 'node':
        additionalPaths.push('src', 'routes', 'controllers');
        break;
      case 'python':
        additionalPaths.push('app', 'src', 'requirements.txt', 'Pipfile');
        break;
    }

    // Get files from additional paths (simplified - in practice, you'd recursively get directory contents)
    for (const additionalPath of additionalPaths) {
      try {
        const content = await this.getFileContent(repository, additionalPath);
        if (content) {
          files[additionalPath] = content;
        }
      } catch (error) {
        // Path might not exist, continue
        logger.debug(`Path not found: ${additionalPath}`, { repository });
      }
    }
  }

  /**
   * Clone repository to temporary directory for building
   */
  async cloneRepository(repository: GitHubRepository): Promise<string> {
    const repoUrl = `https://github.com/${repository.owner}/${repository.repo}.git`;
    const clonePath = path.join(
      this.tempDir,
      `${repository.owner}-${repository.repo}-${Date.now()}`
    );

    logger.info('Cloning repository', { repository, clonePath });

    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Clone repository
      const git: SimpleGit = simpleGit();
      await git.clone(repoUrl, clonePath, [
        '--depth',
        '1',
        '--branch',
        repository.branch || 'main',
      ]);

      logger.info('Repository cloned successfully', { clonePath });
      return clonePath;
    } catch (error) {
      logger.error('Failed to clone repository', { error, repository });
      throw new Error(
        `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Build project in cloned directory
   */
  async buildProject(
    projectPath: string,
    buildCommand?: string
  ): Promise<string> {
    logger.info('Building project', { projectPath, buildCommand });

    try {
      const git: SimpleGit = simpleGit(projectPath);

      // Default build commands based on package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      let finalBuildCommand = buildCommand;

      if (
        !finalBuildCommand &&
        (await fs
          .access(packageJsonPath)
          .then(() => true)
          .catch(() => false))
      ) {
        const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageContent);

        if (packageJson.scripts?.build) {
          finalBuildCommand = 'npm run build';
        } else if (packageJson.scripts?.start) {
          finalBuildCommand = 'npm install';
        }
      }

      if (finalBuildCommand) {
        // Execute build command (simplified - in practice, you'd use child_process)
        logger.info('Executing build command', { command: finalBuildCommand });
        // Note: For security and complexity reasons, actual command execution is omitted
        // In a real implementation, you'd use child_process.spawn with proper sandboxing
      }

      // Determine output directory
      const possibleOutputDirs = ['dist', 'build', 'out', '_site', 'public'];
      let outputDir = projectPath;

      for (const dir of possibleOutputDirs) {
        const dirPath = path.join(projectPath, dir);
        if (
          await fs
            .access(dirPath)
            .then(() => true)
            .catch(() => false)
        ) {
          outputDir = dirPath;
          break;
        }
      }

      logger.info('Build completed', { outputDir });
      return outputDir;
    } catch (error) {
      logger.error('Failed to build project', { error, projectPath });
      throw new Error(
        `Failed to build project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a deployment package from repository
   */
  async createDeploymentPackage(
    repository: GitHubRepository
  ): Promise<DeploymentFromGitHub> {
    try {
      // Analyze repository
      const content = await this.analyzeRepository(repository);

      // Determine deployment configuration
      const deploymentType = this.getDeploymentType(content);
      const buildCommand = this.getBuildCommand(content);
      const outputDirectory = this.getOutputDirectory(content);

      return {
        repository,
        content,
        deploymentType,
        buildCommand,
        outputDirectory,
      };
    } catch (error) {
      logger.error('Failed to create deployment package', {
        error,
        repository,
      });
      throw error;
    }
  }

  /**
   * Get deployment type based on project analysis
   */
  private getDeploymentType(content: RepositoryContent): string {
    switch (content.projectType) {
      case 'static':
        return 'static-website';
      case 'react':
      case 'vue':
      case 'angular':
        return 'spa';
      case 'node':
        return 'serverless-api';
      case 'python':
        return 'serverless-api';
      default:
        return 'static-website';
    }
  }

  /**
   * Get build command based on project type
   */
  private getBuildCommand(content: RepositoryContent): string | undefined {
    if (content.packageJson?.scripts?.build) {
      return 'npm run build';
    }

    switch (content.projectType) {
      case 'react':
      case 'vue':
      case 'angular':
        return 'npm install && npm run build';
      case 'node':
        return 'npm install';
      case 'python':
        return 'pip install -r requirements.txt';
      default:
        return undefined;
    }
  }

  /**
   * Get output directory based on project type
   */
  private getOutputDirectory(content: RepositoryContent): string | undefined {
    switch (content.projectType) {
      case 'react':
        return 'build';
      case 'vue':
        return 'dist';
      case 'angular':
        return 'dist';
      default:
        return undefined;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(projectPath: string): Promise<void> {
    try {
      await fs.rm(projectPath, { recursive: true, force: true });
      logger.info('Cleaned up temporary files', { projectPath });
    } catch (error) {
      logger.warn('Failed to cleanup temporary files', { error, projectPath });
    }
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return {
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        language: data.language,
        defaultBranch: data.default_branch,
        stars: data.stargazers_count,
        forks: data.forks_count,
        isPrivate: data.private,
        cloneUrl: data.clone_url,
        htmlUrl: data.html_url,
      };
    } catch (error) {
      logger.error('Failed to get repository info', { error, owner, repo });
      throw new Error(
        `Repository not found or access denied: ${owner}/${repo}`
      );
    }
  }

  /**
   * List user repositories
   */
  async listUserRepositories(
    username?: string,
    page: number = 1,
    per_page: number = 30
  ) {
    try {
      const { data } = await this.octokit.rest.repos.listForUser({
        username: username || 'authenticated-user',
        page,
        per_page,
        sort: 'updated',
        direction: 'desc',
      });

      return data.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        language: repo.language,
        isPrivate: repo.private,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at,
        htmlUrl: repo.html_url,
      }));
    } catch (error) {
      logger.error('Failed to list repositories', { error, username });
      throw new Error(`Failed to list repositories for user: ${username}`);
    }
  }
}
