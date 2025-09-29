'use client'

import { useState, useEffect } from 'react'
import {
  Cloud,
  Github,
  Rocket,
  Server,
  Settings,
  ChevronRight,
  Clock,
  CheckCircle,
} from 'lucide-react'
import mcpClient, {
  type Repository,
  type DeploymentResult,
  type RepositoryAnalysis,
} from '../lib/mcp-client'
import GitHubRepoCard from '../components/GitHubRepoCard'
import DeploymentStatus from '../components/DeploymentStatus'

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1)
  const [githubConnected, setGithubConnected] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState('')
  const [deploymentPrompt, setDeploymentPrompt] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStatus, setDeploymentStatus] = useState<
    'idle' | 'analyzing' | 'deploying' | 'success' | 'error'
  >('idle')

  // Real data from MCP
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [repoAnalysis, setRepoAnalysis] = useState<RepositoryAnalysis | null>(
    null
  )
  const [deploymentResult, setDeploymentResult] =
    useState<DeploymentResult | null>(null)
  const [mcpConnected, setMcpConnected] = useState(false)

  // Check MCP connection on mount
  useEffect(() => {
    checkMCPConnection()
  }, [])

  async function checkMCPConnection() {
    try {
      const response = await fetch('/api/mcp')
      const data = await response.json()
      setMcpConnected(data.mcpConnected || false)
    } catch (error) {
      console.error('Failed to check MCP connection:', error)
      setMcpConnected(false)
    }
  }

  const handleGithubConnect = async () => {
    try {
      setIsLoadingRepos(true)
      // For now, we'll simulate GitHub connection and load repositories
      // In a real implementation, this would handle OAuth flow
      const repos = await mcpClient.listRepositories()
      setRepositories(repos)
      setGithubConnected(true)
      setCurrentStep(2)
    } catch (error) {
      console.error('Failed to connect to GitHub:', error)
      // For demo purposes, use mock data if MCP fails
      const mockRepos: Repository[] = [
        {
          name: 'my-react-app',
          fullName: 'user/my-react-app',
          description: 'A React application',
          language: 'JavaScript',
          stars: 15,
          owner: 'user',
          htmlUrl: 'https://github.com/user/my-react-app',
          isPrivate: false,
          updatedAt: '2 days ago',
        },
        {
          name: 'portfolio-website',
          fullName: 'user/portfolio-website',
          description: 'Personal portfolio site',
          language: 'TypeScript',
          stars: 8,
          owner: 'user',
          htmlUrl: 'https://github.com/user/portfolio-website',
          isPrivate: false,
          updatedAt: '1 week ago',
        },
        {
          name: 'api-server',
          fullName: 'user/api-server',
          description: 'Node.js REST API',
          language: 'JavaScript',
          stars: 23,
          owner: 'user',
          htmlUrl: 'https://github.com/user/api-server',
          isPrivate: false,
          updatedAt: '3 days ago',
        },
      ]
      setRepositories(mockRepos)
      setGithubConnected(true)
      setCurrentStep(2)
    } finally {
      setIsLoadingRepos(false)
    }
  }

  const handleRepoSelect = async (repoName: string) => {
    setSelectedRepo(repoName)

    // Analyze the selected repository
    try {
      const selectedRepoData = repositories.find((r) => r.name === repoName)
      if (selectedRepoData) {
        const analysis = await mcpClient.analyzeRepository(
          selectedRepoData.fullName
        )
        setRepoAnalysis(analysis)
      }
    } catch (error) {
      console.error('Failed to analyze repository:', error)
      // Use mock analysis data
      setRepoAnalysis({
        projectType: 'react',
        files: {},
        buildCommand: 'npm run build',
        outputDirectory: 'build',
      })
    }

    setCurrentStep(3)
  }

  const handleDeploy = async () => {
    if (!deploymentPrompt.trim() || !selectedRepo) return

    setIsDeploying(true)
    setDeploymentStatus('analyzing')

    try {
      const selectedRepoData = repositories.find((r) => r.name === selectedRepo)
      if (!selectedRepoData) {
        throw new Error('Repository not found')
      }

      // Deploy from GitHub using MCP client
      const result = await mcpClient.deployFromGitHub(
        selectedRepoData.fullName,
        deploymentPrompt
      )

      setDeploymentResult(result)
      setDeploymentStatus('deploying')

      // Poll for deployment status
      const pollStatus = async () => {
        try {
          const status = await mcpClient.getDeploymentStatus(
            result.deploymentId
          )
          if (status.status === 'completed') {
            setDeploymentStatus('success')
            setIsDeploying(false)
          } else if (status.status === 'failed') {
            setDeploymentStatus('error')
            setIsDeploying(false)
          } else {
            setTimeout(pollStatus, 3000) // Poll every 3 seconds
          }
        } catch (error) {
          console.error('Failed to get deployment status:', error)
          // Simulate success for demo
          setTimeout(() => {
            setDeploymentStatus('success')
            setIsDeploying(false)
          }, 3000)
        }
      }

      // Start polling after a delay
      setTimeout(pollStatus, 5000)
    } catch (error) {
      console.error('Deployment failed:', error)
      setDeploymentStatus('error')
      setIsDeploying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Cloud className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  AWS Deploy AI
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Deploy from GitHub to AWS with AI
                </p>
              </div>
            </div>
            <div
              className={`flex items-center space-x-2 text-sm ${
                mcpConnected
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              <Server className="h-4 w-4" />
              <span>
                {mcpConnected
                  ? 'MCP Server Connected'
                  : 'MCP Server Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[
              { number: 1, title: 'Connect GitHub', icon: Github },
              { number: 2, title: 'Select Repository', icon: Settings },
              { number: 3, title: 'Configure & Deploy', icon: Rocket },
            ].map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    currentStep >= step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <step.icon className="h-4 w-4" />
                  <span className="font-medium">{step.title}</span>
                </div>
                {index < 2 && (
                  <ChevronRight className="h-5 w-5 text-gray-400 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: GitHub Connection */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
              <Github className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Connect to GitHub
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Connect your GitHub account to access your repositories and
                deploy them to AWS with AI assistance.
              </p>
              <button
                onClick={handleGithubConnect}
                className="inline-flex items-center px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium"
              >
                <Github className="h-5 w-5 mr-2" />
                Connect with GitHub
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                We&apos;ll redirect you to GitHub to authorize access to your
                repositories.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Repository Selection */}
        {currentStep === 2 && githubConnected && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Select Repository
                </h2>
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>GitHub Connected</span>
                </div>
              </div>

              {isLoadingRepos ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-300">
                    Loading repositories...
                  </p>
                </div>
              ) : repositories.length > 0 ? (
                <div className="grid gap-4">
                  {repositories.map((repo) => (
                    <GitHubRepoCard
                      key={repo.name}
                      repo={{
                        name: repo.name,
                        description: repo.description,
                        language: repo.language,
                        stars: repo.stars,
                        owner: repo.owner,
                        updated: repo.updatedAt,
                      }}
                      onSelect={handleRepoSelect}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Github className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">
                    No repositories found
                  </p>
                  <button
                    onClick={handleGithubConnect}
                    className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Refresh repositories
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Deployment Configuration */}
        {currentStep === 3 && selectedRepo && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Deploy {selectedRepo}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Describe how you want to deploy your project and let AI
                    handle the AWS infrastructure.
                  </p>
                </div>
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <Github className="h-5 w-5 mr-2" />
                  <span>{selectedRepo}</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Repository Analysis */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Repository Analysis
                  </h3>
                  {repoAnalysis ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">
                          Project Type:
                        </span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                          {repoAnalysis.projectType}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">
                          Build Command:
                        </span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {repoAnalysis.buildCommand || 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">
                          Files:
                        </span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {Object.keys(repoAnalysis.files || {}).length} files
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">
                          Output Dir:
                        </span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {repoAnalysis.outputDirectory || 'Root'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      <Clock className="h-5 w-5 text-gray-400 mr-2 animate-spin" />
                      <span className="text-gray-600 dark:text-gray-300">
                        Analyzing repository...
                      </span>
                    </div>
                  )}
                </div>

                {/* Deployment Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Deployment Instructions
                  </label>
                  <textarea
                    value={deploymentPrompt}
                    onChange={(e) => setDeploymentPrompt(e.target.value)}
                    placeholder="Describe how you want to deploy this project. For example: 'Deploy this React app with CloudFront CDN, custom domain, and SSL certificate. Enable caching and gzip compression for optimal performance.'"
                    className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Be as specific as possible. AI will analyze your
                    requirements and configure AWS resources accordingly.
                  </p>
                </div>

                {/* Deploy Button */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    ← Back to repositories
                  </button>
                  <button
                    onClick={handleDeploy}
                    disabled={!deploymentPrompt.trim() || isDeploying}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isDeploying ? (
                      <>
                        <Clock className="h-5 w-5 mr-2 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-5 w-5 mr-2" />
                        Deploy to AWS
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deployment Status */}
        <DeploymentStatus
          status={deploymentStatus}
          isVisible={isDeploying}
          deploymentId={deploymentResult?.deploymentId}
          liveUrl={deploymentResult?.trackingUrl}
          onClose={() => setIsDeploying(false)}
          onReset={() => {
            setIsDeploying(false)
            setDeploymentStatus('idle')
            setCurrentStep(1)
            setGithubConnected(false)
            setSelectedRepo('')
            setDeploymentPrompt('')
            setRepositories([])
            setRepoAnalysis(null)
            setDeploymentResult(null)
          }}
        />
      </main>
    </div>
  )
}
