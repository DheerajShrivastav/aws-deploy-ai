import { useState, useEffect } from 'react'
import { Eye, EyeOff, Shield, Key, AlertCircle } from 'lucide-react'

interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  region: string
}

interface AWSCredentialsManagerProps {
  onCredentialsSet: (credentials: AWSCredentials) => void
  onCredentialsCleared: () => void
}

const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
]

export default function AWSCredentialsManager({
  onCredentialsSet,
  onCredentialsCleared,
}: AWSCredentialsManagerProps) {
  const [credentials, setCredentials] = useState<AWSCredentials>({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
  })
  const [showSecret, setShowSecret] = useState(false)
  const [isStored, setIsStored] = useState(false)

  useEffect(() => {
    // Check if credentials are already stored in localStorage
    try {
      const stored = localStorage.getItem('aws_credentials')
      if (stored) {
        const parsed = JSON.parse(stored)
        setCredentials(parsed)
        setIsStored(true)
        onCredentialsSet(parsed)
      }
    } catch (error) {
      console.error('Error loading stored credentials:', error)
    }
  }, [onCredentialsSet])

  const handleSave = () => {
    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      alert('Please fill in all required fields')
      return
    }

    try {
      // Store securely in localStorage (client-side only)
      localStorage.setItem('aws_credentials', JSON.stringify(credentials))
      setIsStored(true)
      onCredentialsSet(credentials)
    } catch (error) {
      console.error('Error storing credentials:', error)
      alert('Failed to store credentials')
    }
  }

  const handleClear = () => {
    try {
      localStorage.removeItem('aws_credentials')
      setCredentials({
        accessKeyId: '',
        secretAccessKey: '',
        region: 'us-east-1',
      })
      setIsStored(false)
      onCredentialsCleared()
    } catch (error) {
      console.error('Error clearing credentials:', error)
    }
  }

  if (isStored) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                AWS Credentials Configured
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Region: {credentials.region} • Key:{' '}
                {credentials.accessKeyId.substring(0, 8)}...
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="text-sm text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 underline"
          >
            Change
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <div>
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
            AWS Credentials Required
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your credentials are stored securely in your browser and won&apos;t
            be sent to our servers.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            AWS Access Key ID
          </label>
          <input
            type="text"
            value={credentials.accessKeyId}
            onChange={(e) =>
              setCredentials({ ...credentials, accessKeyId: e.target.value })
            }
            placeholder="AKIA..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            AWS Secret Access Key
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={credentials.secretAccessKey}
              onChange={(e) =>
                setCredentials({
                  ...credentials,
                  secretAccessKey: e.target.value,
                })
              }
              placeholder="Secret access key..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showSecret ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            AWS Region
          </label>
          <select
            value={credentials.region}
            onChange={(e) =>
              setCredentials({ ...credentials, region: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {AWS_REGIONS.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-1">Security Notice:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Credentials are stored only in your browser's local storage
              </li>
              <li>They are never transmitted to our servers</li>
              <li>Use IAM credentials with minimal required permissions</li>
              <li>
                Consider using temporary credentials for enhanced security
              </li>
            </ul>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={!credentials.accessKeyId || !credentials.secretAccessKey}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Save Credentials
          </button>
        </div>
      </div>
    </div>
  )
}
