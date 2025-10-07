'use client'

import { useState, useEffect } from 'react'
import {
  Key,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  Globe,
  Lock,
} from 'lucide-react'

interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  region: string
}

interface AWSCredentialsFormProps {
  onCredentialsSubmit: (credentials: AWSCredentials) => void
  onCancel: () => void
  isValidating?: boolean
}

const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-west-2', label: 'Europe (London)' },
  { value: 'eu-west-3', label: 'Europe (Paris)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
]

export default function AWSCredentialsForm({
  onCredentialsSubmit,
  onCancel,
  isValidating = false,
}: AWSCredentialsFormProps) {
  const [credentials, setCredentials] = useState<AWSCredentials>({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
  })

  const [showSecretKey, setShowSecretKey] = useState(false)
  const [rememberCredentials, setRememberCredentials] = useState(false)
  const [validationError, setValidationError] = useState('')

  // Load saved credentials from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aws_deploy_credentials')
      if (saved) {
        const parsedCreds = JSON.parse(saved)
        setCredentials(parsedCreds)
        setRememberCredentials(true)
      }
    } catch (error) {
      console.warn('Failed to load saved credentials:', error)
    }
  }, [])

  const validateCredentials = (creds: AWSCredentials): string => {
    if (!creds.accessKeyId.trim()) {
      return 'Access Key ID is required'
    }
    if (!creds.secretAccessKey.trim()) {
      return 'Secret Access Key is required'
    }
    if (!creds.region) {
      return 'AWS Region is required'
    }

    // Basic format validation
    if (!/^AKIA[0-9A-Z]{16}$/i.test(creds.accessKeyId.trim())) {
      return 'Access Key ID format appears invalid (should start with AKIA and be 20 characters)'
    }
    if (creds.secretAccessKey.trim().length !== 40) {
      return 'Secret Access Key should be 40 characters long'
    }

    return ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const error = validateCredentials(credentials)
    if (error) {
      setValidationError(error)
      return
    }

    setValidationError('')

    // Save to localStorage if user opted to remember
    if (rememberCredentials) {
      try {
        localStorage.setItem(
          'aws_deploy_credentials',
          JSON.stringify(credentials)
        )
      } catch (error) {
        console.warn('Failed to save credentials to localStorage:', error)
      }
    } else {
      // Remove saved credentials if user unchecked remember
      localStorage.removeItem('aws_deploy_credentials')
    }

    onCredentialsSubmit(credentials)
  }

  const handleInputChange = (field: keyof AWSCredentials, value: string) => {
    setCredentials((prev) => ({ ...prev, [field]: value }))
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('')
    }
  }

  const clearStoredCredentials = () => {
    localStorage.removeItem('aws_deploy_credentials')
    setCredentials({
      accessKeyId: '',
      secretAccessKey: '',
      region: 'us-east-1',
    })
    setRememberCredentials(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <Key className="h-6 w-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">
                AWS Credentials Required
              </h2>
              <p className="text-orange-100 text-sm">
                Enter your AWS credentials to deploy
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Security Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Security Notice
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Your credentials are stored locally in your browser only. We
                  never send or store them on our servers.
                </p>
              </div>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {validationError}
                </p>
              </div>
            </div>
          )}

          {/* Access Key ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AWS Access Key ID
            </label>
            <input
              type="text"
              placeholder="AKIAIOSFODNN7EXAMPLE"
              value={credentials.accessKeyId}
              onChange={(e) => handleInputChange('accessKeyId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={isValidating}
              autoComplete="off"
            />
          </div>

          {/* Secret Access Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AWS Secret Access Key
            </label>
            <div className="relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                value={credentials.secretAccessKey}
                onChange={(e) =>
                  handleInputChange('secretAccessKey', e.target.value)
                }
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={isValidating}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                disabled={isValidating}
              >
                {showSecretKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AWS Region
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <select
                value={credentials.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={isValidating}
              >
                {AWS_REGIONS.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Remember Credentials */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberCredentials}
              onChange={(e) => setRememberCredentials(e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              disabled={isValidating}
            />
            <label
              htmlFor="remember"
              className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-1"
            >
              <Lock className="h-3 w-3" />
              <span>Remember credentials (stored locally only)</span>
            </label>
          </div>

          {/* Clear Stored Credentials */}
          {rememberCredentials && (
            <button
              type="button"
              onClick={clearStoredCredentials}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              disabled={isValidating}
            >
              Clear stored credentials
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={isValidating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isValidating ||
                !credentials.accessKeyId ||
                !credentials.secretAccessKey
              }
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Start Deployment</span>
                </>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2">
            <p className="mb-1">💡 Need AWS credentials?</p>
            <p>
              Create them in AWS Console → IAM → Users → Security credentials →
              Create access key
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
