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
    projectType: 'static' | 'react' | 'vue' | 'angular' | 'node' | 'python' | 'other';
}
export interface DeploymentFromGitHub {
    repository: GitHubRepository;
    content: RepositoryContent;
    deploymentType: string;
    buildCommand?: string;
    outputDirectory?: string;
}
export declare class GitHubService {
    private octokit;
    private tempDir;
    constructor(token?: string);
    analyzeRepository(repository: GitHubRepository): Promise<RepositoryContent>;
    private getFileContent;
    private determineProjectType;
    private getProjectFiles;
    cloneRepository(repository: GitHubRepository): Promise<string>;
    buildProject(projectPath: string, buildCommand?: string): Promise<string>;
    createDeploymentPackage(repository: GitHubRepository): Promise<DeploymentFromGitHub>;
    private getDeploymentType;
    private getBuildCommand;
    private getOutputDirectory;
    cleanup(projectPath: string): Promise<void>;
    getRepositoryInfo(owner: string, repo: string): Promise<{
        name: string;
        fullName: string;
        description: string | null;
        language: string | null;
        defaultBranch: string;
        stars: number;
        forks: number;
        isPrivate: boolean;
        cloneUrl: string;
        htmlUrl: string;
    }>;
    listUserRepositories(username?: string, page?: number, per_page?: number): Promise<{
        name: string;
        fullName: string;
        description: string | null;
        language: string | null | undefined;
        isPrivate: boolean;
        stars: number | undefined;
        forks: number | undefined;
        defaultBranch: string | undefined;
        updatedAt: string | null | undefined;
        htmlUrl: string;
    }[]>;
}
//# sourceMappingURL=github-service.d.ts.map