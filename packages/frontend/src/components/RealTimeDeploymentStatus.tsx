'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Server,
  Globe,
  Terminal,
  ExternalLink,
  Copy,
  RefreshCw,
  Zap,
  Shield,
  Monitor,
  Link as LinkIcon,
} from 'lucide-react'

interface DeploymentLog {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface DeploymentStatusData {
  deploymentId: string
  status: 'starting' | 'in-progress' | 'completed' | 'failed'
  progress: number
  currentStep: string
  instanceId?: string
  instanceType?: string
  publicIp?: string
  deploymentUrl?: string
  nginxUrl?: string
  directUrl?: string
  statusPageUrl?: string
  sshAccess?: string
  estimatedReadyTime?: string
  instructions?: string[]
  logs: string[]
  message: string
}

interface RealTimeDeploymentStatusProps {
  deploymentId: string
  repositoryName: string
  onClose: () => void
  onRetry?: () => void
}

export default function RealTimeDeploymentStatus({
  deploymentId,
  repositoryName,
  onClose,
  onRetry,
}: RealTimeDeploymentStatusProps) {
  const [deploymentData, setDeploymentData] = useState<DeploymentStatusData>({
    deploymentId,
    status: 'starting',
    progress: 0,
    currentStep: 'Initializing deployment...',
    logs: [],
    message: 'Starting deployment process...',
  })

  const [isPolling, setIsPolling] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  // Poll for deployment status
  useEffect(() => {
    if (!isPolling) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/deployment-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deploymentId }),
        })

        if (response.ok) {
          const data = await response.json()
          setDeploymentData(data)
          setLastUpdate(new Date())

          // Stop polling if deployment is completed or failed
          if (data.status === 'completed' || data.status === 'failed') {
            setIsPolling(false)
          }
        }
      } catch (error) {
        console.error('Failed to fetch deployment status:', error)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [deploymentId, isPolling])

  const copyToClipboard = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(item)
      setTimeout(() => setCopiedItem(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getStatusIcon = () => {
    switch (deploymentData.status) {
      case 'starting':
      case 'in-progress':
        return <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'failed':
        return <AlertCircle className="h-6 w-6 text-red-600" />
      default:
        return <Clock className="h-6 w-6 text-gray-600" />
    }
  }

  const getStatusColor = () => {
    switch (deploymentData.status) {
      case 'starting':
      case 'in-progress':
        return 'from-blue-600 to-cyan-600'
      case 'completed':
        return 'from-green-600 to-emerald-600'
      case 'failed':
        return 'from-red-600 to-pink-600'
      default:
        return 'from-gray-600 to-slate-600'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div
          className={`bg-gradient-to-r ${getStatusColor()} px-6 py-4 relative`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="flex items-center space-x-3 mb-2">
            {getStatusIcon()}
            <div>
              <h2 className="text-xl font-bold text-white">
                AWS Deployment: {repositoryName}
              </h2>
              <p className="text-white/80 text-sm">
                Deployment ID: {deploymentId}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-sm text-white/80 mb-1">
              <span>{deploymentData.currentStep}</span>
              <span>{deploymentData.progress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${deploymentData.progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Deployment Info */}
          {deploymentData.status === 'completed' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  🎉 Deployment Completed Successfully!
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Instance Details */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Server className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      Instance Details
                    </span>
                  </div>

                  {deploymentData.instanceId && (
                    <div className="pl-6 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Instance ID:
                        </span>
                        <div className="flex items-center space-x-1">
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {deploymentData.instanceId}
                          </code>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                deploymentData.instanceId!,
                                'instanceId'
                              )
                            }
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            {copiedItem === 'instanceId' ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>

                      {deploymentData.instanceType && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Instance Type:
                          </span>
                          <span className="text-sm font-medium">
                            {deploymentData.instanceType}
                          </span>
                        </div>
                      )}

                      {deploymentData.publicIp && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Public IP:
                          </span>
                          <div className="flex items-center space-x-1">
                            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {deploymentData.publicIp}
                            </code>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  deploymentData.publicIp!,
                                  'publicIp'
                                )
                              }
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              {copiedItem === 'publicIp' ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Access URLs */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      Access Your Application
                    </span>
                  </div>

                  <div className="pl-6 space-y-2">
                    {deploymentData.nginxUrl && (
                      <div className="flex items-center space-x-2">
                        <LinkIcon className="h-3 w-3 text-blue-500" />
                        <a
                          href={deploymentData.nginxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                        >
                          <span>Main URL</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              deploymentData.nginxUrl!,
                              'nginxUrl'
                            )
                          }
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {copiedItem === 'nginxUrl' ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-500" />
                          )}
                        </button>
                      </div>
                    )}

                    {deploymentData.directUrl && (
                      <div className="flex items-center space-x-2">
                        <Zap className="h-3 w-3 text-orange-500" />
                        <a
                          href={deploymentData.directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-800 text-sm font-medium flex items-center space-x-1"
                        >
                          <span>Direct URL (Port 3000)</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              deploymentData.directUrl!,
                              'directUrl'
                            )
                          }
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {copiedItem === 'directUrl' ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-500" />
                          )}
                        </button>
                      </div>
                    )}

                    {deploymentData.statusPageUrl && (
                      <div className="flex items-center space-x-2">
                        <Monitor className="h-3 w-3 text-purple-500" />
                        <a
                          href={deploymentData.statusPageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center space-x-1"
                        >
                          <span>Deployment Status Page</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              deploymentData.statusPageUrl!,
                              'statusPageUrl'
                            )
                          }
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {copiedItem === 'statusPageUrl' ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-500" />
                          )}
                        </button>
                      </div>
                    )}

                    {deploymentData.sshAccess && (
                      <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                        <div className="flex items-center space-x-2 mb-1">
                          <Terminal className="h-3 w-3 text-gray-500" />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            SSH Access:
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded flex-1">
                            {deploymentData.sshAccess}
                          </code>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                deploymentData.sshAccess!,
                                'sshAccess'
                              )
                            }
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          >
                            {copiedItem === 'sshAccess' ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              {deploymentData.instructions &&
                deploymentData.instructions.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                    <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Next Steps & Instructions</span>
                    </h4>
                    <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                      {deploymentData.instructions.map((instruction, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">
                            •
                          </span>
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {deploymentData.estimatedReadyTime && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Note:</strong> Application setup takes{' '}
                      {deploymentData.estimatedReadyTime}. Please wait before
                      accessing the URLs.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {deploymentData.status === 'failed' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Deployment Failed
                </h3>
              </div>
              <p className="text-red-700 dark:text-red-300 text-sm mb-3">
                {deploymentData.message}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Retry Deployment
                </button>
              )}
            </div>
          )}

          {/* Deployment Logs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Terminal className="h-5 w-5" />
                <span>Deployment Logs</span>
              </h3>
              <div className="text-xs text-gray-500">
                Last updated: {formatTimeAgo(lastUpdate)}
              </div>
            </div>

            <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
              {deploymentData.logs.length === 0 ? (
                <div className="text-gray-500">No logs available yet...</div>
              ) : (
                deploymentData.logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-500">
                      [{new Date().toLocaleTimeString()}]
                    </span>{' '}
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>

            {deploymentData.status === 'completed' &&
              deploymentData.nginxUrl && (
                <a
                  href={deploymentData.nginxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center font-medium flex items-center justify-center space-x-2"
                >
                  <Globe className="h-4 w-4" />
                  <span>Visit Application</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}
