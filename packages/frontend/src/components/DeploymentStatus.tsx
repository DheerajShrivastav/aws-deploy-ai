import {
  CheckCircle,
  AlertCircle,
  Clock,
  Rocket,
  ExternalLink,
} from 'lucide-react'

interface DeploymentStatusProps {
  status: 'idle' | 'analyzing' | 'deploying' | 'success' | 'error'
  isVisible: boolean
  deploymentId?: string
  liveUrl?: string
  onClose: () => void
  onReset: () => void
}

export default function DeploymentStatus({
  status,
  isVisible,
  deploymentId,
  liveUrl,
  onClose,
  onReset,
}: DeploymentStatusProps) {
  if (!isVisible) return null

  const getIcon = () => {
    switch (status) {
      case 'analyzing':
        return (
          <Clock className="h-12 w-12 text-blue-600 mx-auto animate-spin" />
        )
      case 'deploying':
        return (
          <Rocket className="h-12 w-12 text-orange-500 mx-auto animate-bounce" />
        )
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
      case 'error':
        return <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
      default:
        return null
    }
  }

  const getTitle = () => {
    switch (status) {
      case 'analyzing':
        return 'Analyzing Repository'
      case 'deploying':
        return 'Deploying to AWS'
      case 'success':
        return 'Deployment Successful!'
      case 'error':
        return 'Deployment Failed'
      default:
        return ''
    }
  }

  const getMessage = () => {
    switch (status) {
      case 'analyzing':
        return 'AI is analyzing your repository and deployment requirements...'
      case 'deploying':
        return 'Creating AWS resources and deploying your application...'
      case 'success':
        return 'Your application has been successfully deployed to AWS!'
      case 'error':
        return 'There was an error during deployment. Please try again.'
      default:
        return ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in duration-200">
        <div className="text-center">
          <div className="mb-6">{getIcon()}</div>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {getTitle()}
          </h3>

          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {getMessage()}
          </p>

          {status === 'success' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                {liveUrl && (
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Live Site
                  </a>
                )}
                <button
                  onClick={onReset}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Deploy Another
                </button>
              </div>
              {deploymentId && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Deployment ID:</span>{' '}
                    {deploymentId}
                  </p>
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="flex justify-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={onReset}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Start Over
              </button>
            </div>
          )}

          {(status === 'analyzing' || status === 'deploying') && (
            <div className="mt-6">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full animate-pulse"
                  style={{
                    width: status === 'analyzing' ? '30%' : '70%',
                    transition: 'width 1s ease-in-out',
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {status === 'analyzing' ? 'Step 1 of 3' : 'Step 2 of 3'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
