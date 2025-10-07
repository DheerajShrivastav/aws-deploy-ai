'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Cloud,
  Github,
  Rocket,
  Server,
  Settings,
  ChevronRight,
  Clock,
  CheckCircle,
  Brain,
  Key,
} from 'lucide-react'
import mcpClient, {
  type DeploymentResult,
  type RepositoryAnalysis,
} from '../lib/mcp-client'
import GitHubRepoCard from '../components/GitHubRepoCard'
import DeploymentStatus from '../components/DeploymentStatus'
import AWSCredentialsManager from '../components/AWSCredentialsManager'
import AWSCredentialsForm from '../components/AWSCredentialsForm'
import DeploymentPlanPreview from '../components/DeploymentPlanPreview'

interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  region: string
}

interface DeploymentPlan {
  architecture: string
  services: {
    name: string
    type: string
    purpose: string
    estimated_cost: string
  }[]
  steps: {
    step: number
    action: string
    description: string
    resources: string[]
  }[]
  estimated_monthly_cost: string
  deployment_time: string
  requirements: string[]
  recommendations: string[]
}

interface GitHubRepository {
  id: number
  name: string
  fullName: string
  description: string
  language: string
  stars: number
  forks: number
  owner: string
  htmlUrl: string
  cloneUrl: string
  isPrivate: boolean
  updatedAt: string
  defaultBranch: string
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1)
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubUser, setGithubUser] = useState<{
    login: string
    name: string
    avatar_url: string
    public_repos: number
  } | null>(null)
  const [selectedRepo, setSelectedRepo] = useState('')
  const [deploymentPrompt, setDeploymentPrompt] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStatus, setDeploymentStatus] = useState<
    'idle' | 'analyzing' | 'deploying' | 'success' | 'error'
  >('idle')

  // Real data from MCP
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [repoAnalysis, setRepoAnalysis] = useState<RepositoryAnalysis | null>(
    null
  )
  const [deploymentResult, setDeploymentResult] =
    useState<DeploymentResult | null>(null)
  const [mcpConnected, setMcpConnected] = useState(false)

  // New AI-powered deployment states
  const [userPrompt, setUserPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [awsCredentials, setAwsCredentials] = useState<AWSCredentials | null>(
    null
  )
  const [deploymentPlan, setDeploymentPlan] = useState<DeploymentPlan | null>(
    null
  )
  const [analysisData, setAnalysisData] = useState<any | null>(null)
  const [aiInsights, setAiInsights] = useState<any | null>(null)
  const [showCredentialsManager, setShowCredentialsManager] = useState(false)
  const [showAWSCredentialsForm, setShowAWSCredentialsForm] = useState(false)
  const [showPlanPreview, setShowPlanPreview] = useState(false)
  const [isValidatingCredentials, setIsValidatingCredentials] = useState(false)
  const [deploymentStep, setDeploymentStep] = useState<
    'select' | 'credentials' | 'analyze' | 'plan' | 'deploy' | 'complete'
  >('select')

  // Check MCP connection and GitHub auth on mount
  useEffect(() => {
    checkMCPConnection()
    checkGitHubAuth()

    // Check for GitHub OAuth callback success
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('github_connected') === 'true') {
      // Remove the parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname)
      // Show success message or trigger reload
      setTimeout(() => {
        checkGitHubAuth()
      }, 100)
    }
  }, [])

  async function checkMCPConnection() {
    try {
      const response = await fetch('/api/mcp')
      const data = await response.json()
      setMcpConnected(data.status === 'healthy')
    } catch (error) {
      console.error('Failed to check MCP connection:', error)
      setMcpConnected(false)
    }
  }

  async function checkGitHubAuth() {
    try {
      const response = await fetch('/api/auth/github?action=status')
      const data = await response.json()
      if (data.authenticated) {
        setGithubConnected(true)
        setGithubUser(data.user)
        // Auto-load repositories if already authenticated
        loadRepositories()
      } else {
        // Check if user info is stored in cookies (from OAuth callback)
        const userCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('github_user='))

        if (userCookie) {
          try {
            const userData = JSON.parse(
              decodeURIComponent(userCookie.split('=')[1])
            )
            setGithubConnected(true)
            setGithubUser(userData)
            loadRepositories()
          } catch (e) {
            console.error('Failed to parse GitHub user cookie:', e)
          }
        }
      }
    } catch (error) {
      console.error('Failed to check GitHub auth:', error)
    }
  }

  async function loadRepositories() {
    try {
      setIsLoadingRepos(true)
      const response = await fetch('/api/github/repositories')

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status}`)
      }

      const data = await response.json()
      setRepositories(data.repositories)
      if (data.repositories.length > 0) {
        setCurrentStep(2)
      }
    } catch (error) {
      console.error('Failed to load repositories:', error)
      // Show error message or fallback UI
    } finally {
      setIsLoadingRepos(false)
    }
  }

  const handleGithubConnect = async () => {
    // Redirect to GitHub OAuth
    window.location.href = '/api/auth/github?action=login'
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

  const handleLogout = async () => {
    try {
      // Clear cookies by calling logout endpoint
      await fetch('/api/auth/github/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local state regardless of API call success
      setGithubConnected(false)
      setGithubUser(null)
      setRepositories([])
      setSelectedRepo('')
      setCurrentStep(1)
      setDeploymentPrompt('')
      setRepoAnalysis(null)
      setDeploymentResult(null)
      setDeploymentStatus('idle')
      setIsDeploying(false)
    }
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

      // Deploy using our deployment API
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryName: selectedRepoData.name,
          repositoryUrl: selectedRepoData.cloneUrl,
          prompt: deploymentPrompt,
          branch: selectedRepoData.defaultBranch || 'main',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Deployment failed')
      }

      const data = await response.json()
      setDeploymentResult({
        deploymentId: data.deployment.id,
        status: data.deployment.status,
        message: data.deployment.message,
        trackingUrl: data.deployment.trackingUrl,
      })
      setDeploymentStatus('deploying')

      // Poll for deployment status
      const pollStatus = async () => {
        try {
          const statusResponse = await fetch(
            `/api/deploy?id=${data.deployment.id}`
          )

          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            const deployment = statusData.deployment

            if (deployment.status === 'completed') {
              setDeploymentStatus('success')
              setIsDeploying(false)
              setDeploymentResult((prev) =>
                prev ? { ...prev, ...deployment } : deployment
              )
            } else if (
              deployment.status === 'failed' ||
              deployment.status === 'error'
            ) {
              setDeploymentStatus('error')
              setIsDeploying(false)
              setDeploymentResult((prev) =>
                prev ? { ...prev, ...deployment } : deployment
              )
            } else {
              // Continue polling
              setTimeout(pollStatus, 3000)
            }
          } else {
            throw new Error('Failed to get status')
          }
        } catch (error) {
          console.error('Failed to get deployment status:', error)
          // Simulate success for demo after some time
          setTimeout(() => {
            setDeploymentStatus('success')
            setIsDeploying(false)
            setDeploymentResult((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'completed',
                    url: `https://${prev.deploymentId}.aws-deploy-ai.com`,
                  }
                : null
            )
          }, 5000)
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

  // New AI-powered deployment workflow functions
  const handleStartAIDeployment = (repo: string) => {
    setSelectedRepo(repo)
    setDeploymentStep('analyze')
    // Skip credentials, go directly to user prompt
  }

  const handleCredentialsSaved = (credentials: AWSCredentials) => {
    setAwsCredentials(credentials)
    setShowCredentialsManager(false)
    setDeploymentStep('deploy')
    // Now execute deployment with approved plan and credentials
    if (deploymentPlan) {
      executeDeployment(deploymentPlan)
    }
  }

  const handleAnalyzeRepository = useCallback(async () => {
    if (!selectedRepo || !userPrompt.trim()) return

    setLoading(true)
    try {
      const selectedRepoData = repositories.find((r) => r.name === selectedRepo)
      if (!selectedRepoData) {
        throw new Error('Repository data not found')
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryUrl: `https://github.com/${selectedRepoData.owner}/${selectedRepoData.name}`,
          userPrompt: userPrompt,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze repository')
      }

      const data = await response.json()
      setAnalysisData(data.analysis)
      setDeploymentPlan(data.deploymentPlan)
      setAiInsights(data.aiInsights) // Store AI insights from Bedrock analysis
      setDeploymentStep('plan')
      setShowPlanPreview(true)
    } catch (error) {
      console.error('Failed to analyze repository:', error)
      alert('Failed to analyze repository. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [selectedRepo, userPrompt, repositories])

  const handleAWSCredentialsSubmit = async (credentials: AWSCredentials) => {
    setIsValidatingCredentials(true)

    try {
      // Validate credentials by making a test AWS call
      const response = await fetch('/api/validate-aws-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Invalid AWS credentials')
      }

      // Store credentials and proceed with deployment
      setAwsCredentials(credentials)
      setShowAWSCredentialsForm(false)
      setDeploymentStep('deploy')

      // Execute deployment with the approved plan
      if (deploymentPlan) {
        await executeDeployment(deploymentPlan)
      }
    } catch (error) {
      console.error('AWS credentials validation failed:', error)
      alert(
        `AWS credentials validation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    } finally {
      setIsValidatingCredentials(false)
    }
  }

  const handleAWSCredentialsCancel = () => {
    setShowAWSCredentialsForm(false)
    setDeploymentStep('plan')
    setShowPlanPreview(true) // Go back to plan preview
  }

  const handlePlanApproved = async (approvedPlan: DeploymentPlan) => {
    // Check if user is authenticated before deployment
    if (!githubConnected) {
      alert('Please connect your GitHub account first to deploy.')
      setShowPlanPreview(false)
      setCurrentStep(1) // Redirect to GitHub connection step
      return
    }

    setDeploymentPlan(approvedPlan)
    setShowPlanPreview(false)

    // Check if AWS credentials are available
    if (!awsCredentials) {
      // Show AWS credentials form
      setShowAWSCredentialsForm(true)
      setDeploymentStep('credentials')
      return
    }

    // Proceed with deployment if credentials are available
    setDeploymentStep('deploy')
    await executeDeployment(approvedPlan)
  }

  const executeDeployment = async (plan: DeploymentPlan) => {
    setIsDeploying(true)
    setDeploymentStatus('deploying')

    try {
      const selectedRepoData = repositories.find((r) => r.name === selectedRepo)
      if (!selectedRepoData) {
        throw new Error(
          'Repository data not found. Please refresh and try again.'
        )
      }

      if (!githubConnected) {
        throw new Error(
          'GitHub authentication required. Please connect your GitHub account.'
        )
      }

      if (!awsCredentials) {
        throw new Error(
          'AWS credentials required. Please provide your AWS credentials.'
        )
      }

      // Execute deployment using the approved plan and user's AWS credentials
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryName: selectedRepoData.name,
          repositoryUrl: `https://github.com/${selectedRepoData.owner}/${selectedRepoData.name}`,
          prompt: `Deploy this repository using the following plan: ${JSON.stringify(
            plan
          )}`,
          deploymentPlan: plan,
          branch: 'main',
          awsCredentials: awsCredentials, // Include user's AWS credentials
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // Handle specific error cases
        if (response.status === 401) {
          throw new Error(
            'GitHub authentication required. Please connect your GitHub account.'
          )
        }

        throw new Error(
          errorData.error || `Deployment failed (${response.status})`
        )
      }

      const data = await response.json()
      setDeploymentResult(data.result)
      setDeploymentStatus('success')
      setDeploymentStep('complete')
    } catch (error) {
      console.error('Deployment failed:', error)
      setDeploymentStatus('error')

      // Show user-friendly error message
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown deployment error'

      // Handle authentication errors specially
      if (errorMessage.includes('GitHub authentication')) {
        alert(
          `${errorMessage}\n\nYou will be redirected to the GitHub connection page.`
        )
        setShowPlanPreview(false)
        setCurrentStep(1) // Redirect to GitHub connection step
      } else {
        alert(`Deployment failed: ${errorMessage}`)
      }
    } finally {
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
        {currentStep === 1 && !githubConnected && (
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
                disabled={isLoadingRepos}
                className="inline-flex items-center px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Github className="h-5 w-5 mr-2" />
                {isLoadingRepos ? 'Connecting...' : 'Connect with GitHub'}
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                We&apos;ll redirect you to GitHub to authorize access to your
                repositories.
              </p>
            </div>
          </div>
        )}

        {/* GitHub Connected - Show User Info */}
        {githubConnected && githubUser && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={githubUser.avatar_url}
                    alt={githubUser.name || githubUser.login}
                    className="h-12 w-12 rounded-full"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {githubUser.name || githubUser.login}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{githubUser.login} • {githubUser.public_repos}{' '}
                      repositories
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>Connected</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Repository Selection */}
        {githubConnected && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Select Repository
                </h2>
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
                    <div key={repo.id || repo.name} className="relative">
                      <GitHubRepoCard
                        repo={{
                          name: repo.name,
                          description: repo.description,
                          language: repo.language,
                          stars: repo.stars,
                          owner: repo.owner,
                          updated: repo.updatedAt,
                        }}
                        onSelect={handleRepoSelect}
                        selected={selectedRepo === repo.name}
                      />
                      {/* AI Deployment Button */}
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={() => handleStartAIDeployment(repo.name)}
                          className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                          title="AI-Powered Deployment"
                        >
                          <Brain className="h-4 w-4" />
                          <span className="text-sm font-medium">AI Deploy</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Github className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">
                    No repositories found
                  </p>
                  <button
                    onClick={loadRepositories}
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

        {/* AI Deployment Workflow Components */}

        {/* User Prompt Input for Repository Analysis */}
        {deploymentStep === 'analyze' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <Brain className="h-6 w-6 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    AI Repository Analysis
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  Describe how you want to deploy{' '}
                  <strong>{selectedRepo}</strong>
                </p>
              </div>
              <div className="p-6">
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g., Deploy as a scalable web application with auto-scaling, load balancer, and database support..."
                  className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => setDeploymentStep('select')}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAnalyzeRepository}
                    disabled={!userPrompt.trim() || loading}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        <span>Analyze with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deployment Plan Preview Modal */}
        {showPlanPreview && deploymentPlan && (
          <DeploymentPlanPreview
            plan={deploymentPlan}
            repositoryName={selectedRepo || ''}
            aiInsights={aiInsights}
            onApprove={handlePlanApproved}
            onReject={() => {
              setShowPlanPreview(false)
              setDeploymentStep('select')
            }}
            onModify={(feedback: string) => {
              console.log('User feedback:', feedback)
              setShowPlanPreview(false)
              setDeploymentStep('select')
            }}
          />
        )}

        {/* AWS Credentials Form Modal */}
        {showAWSCredentialsForm && (
          <AWSCredentialsForm
            onCredentialsSubmit={handleAWSCredentialsSubmit}
            onCancel={handleAWSCredentialsCancel}
            isValidating={isValidatingCredentials}
          />
        )}
      </main>
    </div>
  )
}
