import { Octokit } from '@octokit/rest';
import { logger } from '../utils/logger.js';

export interface GitHubRepositoryData {
  name: string;
  language: string;
  files: { [key: string]: string };
  packageJson?: Record<string, unknown>;
  readme?: string;
  description?: string;
  stars?: number;
  forks?: number;
}

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    // GitHub token is optional for public repositories
    const token = process.env.GITHUB_TOKEN;
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async fetchRepositoryData(
    owner: string,
    repo: string
  ): Promise<GitHubRepositoryData> {
    logger.info('📦 Fetching repository data from GitHub', { owner, repo });

    try {
      // Fetch repository info
      const repoResponse = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      const repoInfo = repoResponse.data;

      // Fetch repository contents
      const contentsResponse = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '',
      });

      const contents = Array.isArray(contentsResponse.data)
        ? contentsResponse.data
        : [contentsResponse.data];

      // Fetch key files
      const files: { [key: string]: string } = {};
      const keyFiles = [
        'package.json',
        'README.md',
        'readme.md',
        'Dockerfile',
        'dockerfile',
        '.env.example',
        'requirements.txt',
        'pom.xml',
        'composer.json',
        'Cargo.toml',
        'go.mod',
        'index.js',
        'main.py',
        'app.py',
        'server.js',
        'index.ts',
        'main.ts',
        'next.config.js',
        'next.config.ts',
        'vite.config.js',
        'vite.config.ts',
        'tsconfig.json',
      ];

      for (const item of contents) {
        if (item.type === 'file' && keyFiles.includes(item.name)) {
          try {
            const fileResponse = await this.octokit.rest.repos.getContent({
              owner,
              repo,
              path: item.name,
            });

            if ('content' in fileResponse.data) {
              const content = Buffer.from(
                fileResponse.data.content,
                'base64'
              ).toString('utf-8');
              files[item.name] = content;
              logger.info(`📄 Fetched file: ${item.name}`, {
                size: content.length,
              });
            }
          } catch (error) {
            logger.warn(`⚠️ Failed to fetch ${item.name}`, {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      // Parse package.json if available
      let packageJson: Record<string, unknown> | undefined;
      if (files['package.json']) {
        try {
          packageJson = JSON.parse(files['package.json']);
        } catch (error) {
          logger.warn('Failed to parse package.json', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Get README content
      const readme = files['README.md'] || files['readme.md'] || '';

      const result: GitHubRepositoryData = {
        name: repo,
        language: repoInfo.language || 'Unknown',
        files: files,
        packageJson: packageJson,
        readme: readme,
        description: repoInfo.description || '',
        stars: repoInfo.stargazers_count || 0,
        forks: repoInfo.forks_count || 0,
      };

      logger.info('✅ Repository data fetched successfully', {
        filesCount: Object.keys(files).length,
        hasPackageJson: !!packageJson,
        language: result.language,
      });

      return result;
    } catch (error) {
      logger.error('❌ Failed to fetch repository data', {
        owner,
        repo,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return fallback data
      return {
        name: repo,
        language: 'Unknown',
        files: {},
        readme: '',
        description: `Repository: ${owner}/${repo}`,
        stars: 0,
        forks: 0,
      };
    }
  }

  async fetchFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string | null> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in response.data) {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
    } catch (error) {
      logger.warn(`Failed to fetch file: ${path}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return null;
  }
}
