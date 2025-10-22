export interface GitHubRepositoryData {
    name: string;
    language: string;
    files: {
        [key: string]: string;
    };
    packageJson?: Record<string, unknown>;
    readme?: string;
    description?: string;
    stars?: number;
    forks?: number;
}
export declare class GitHubService {
    private octokit;
    constructor();
    fetchRepositoryData(owner: string, repo: string): Promise<GitHubRepositoryData>;
    fetchFileContent(owner: string, repo: string, path: string): Promise<string | null>;
}
//# sourceMappingURL=github.d.ts.map