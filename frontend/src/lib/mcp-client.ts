// MCP Client service for communicating with the AWS Deploy AI server

interface MCPResponse {
  result?: unknown
  error?: {
    message: string
    code: number
  }
}

interface Repository {
  name: string
  fullName: string
  description: string
  language: string
  stars: number
  owner: string
  htmlUrl: string
  isPrivate: boolean
  updatedAt: string
}

interface DeploymentResult {
  deploymentId: string
  status: string
  message: string
  trackingUrl?: string
}

interface RepositoryAnalysis {
  projectType: string
  files: Record<string, string>
  packageJson?: Record<string, unknown>
  readme?: string
  buildCommand?: string
  outputDirectory?: string
}

class MCPClient {
  private baseUrl: string

  constructor(baseUrl: string = '/api/mcp') {
    this.baseUrl = baseUrl
  }

  private async makeRequest(
    method: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          params: params || {},
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: MCPResponse = await response.json()

      if (data.error) {
        throw new Error(data.error.message)
      }

      return data.result
    } catch (error) {
      console.error('MCP Request failed:', error)
      throw error instanceof Error ? error : new Error('Unknown error occurred')
    }
  }

  // GitHub Integration Methods
  async listRepositories(
    username?: string,
    page: number = 1,
    perPage: number = 10
  ): Promise<Repository[]> {
    const result = await this.makeRequest('list-github-repos', {
      username,
      page,
      per_page: perPage,
    })
    return result as Repository[]
  }

  async analyzeRepository(
    repository: string,
    branch?: string
  ): Promise<RepositoryAnalysis> {
    const result = await this.makeRequest('analyze-github-repo', {
      repository,
      branch: branch || 'main',
    })
    return result as RepositoryAnalysis
  }

  async deployFromGitHub(
    repository: string,
    prompt: string,
    branch?: string,
    path?: string
  ): Promise<DeploymentResult> {
    const result = await this.makeRequest('deploy-from-github', {
      repository,
      prompt,
      branch: branch || 'main',
      path,
    })
    return result as DeploymentResult
  }

  // Regular deployment methods
  async deployWebsite(
    prompt: string,
    files?: Array<{
      name: string
      content: string
      contentType: string
      path: string
    }>
  ): Promise<DeploymentResult> {
    const result = await this.makeRequest('deploy-website', {
      prompt,
      files,
    })
    return result as DeploymentResult
  }

  async getDeploymentStatus(
    deploymentId: string
  ): Promise<Record<string, unknown>> {
    const result = await this.makeRequest('get-deployment-status', {
      deploymentId,
    })
    return result as Record<string, unknown>
  }

  async getCostEstimate(prompt: string): Promise<Record<string, unknown>> {
    const result = await this.makeRequest('get-cost-estimate', {
      prompt,
    })
    return result as Record<string, unknown>
  }

  async analyzePrompt(prompt: string): Promise<Record<string, unknown>> {
    const result = await this.makeRequest('analyze-prompt', {
      prompt,
    })
    return result as Record<string, unknown>
  }
}

// Create a singleton instance
const mcpClient = new MCPClient()

export default mcpClient
export type { Repository, DeploymentResult, RepositoryAnalysis }
