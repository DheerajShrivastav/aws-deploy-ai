import { useState } from 'react'
import {
  Server,
  Database,
  Globe,
  Shield,
  Clock,
  DollarSign,
  CheckCircle,
  Edit3,
  AlertTriangle,
  Zap,
} from 'lucide-react'

interface DeploymentPlan {
  architecture: string
  services: Array<{
    name: string
    type: string
    purpose: string
    estimated_cost: string
  }>
  steps: Array<{
    step: number
    action: string
    description: string
    resources: string[]
  }>
  estimated_monthly_cost: string
  deployment_time: string
  requirements: string[]
  recommendations: string[]
}

interface DeploymentPlanPreviewProps {
  plan: DeploymentPlan
  repositoryName: string
  onApprove: (modifiedPlan: DeploymentPlan) => void
  onReject: () => void
  onModify: (feedback: string) => void
}

const SERVICE_ICONS: {
  [key: string]: React.ComponentType<{ className?: string }>
} = {
  EC2: Server,
  Lambda: Zap,
  S3: Database,
  CloudFront: Globe,
  RDS: Database,
  ELB: Shield,
  ALB: Shield,
  default: Server,
}

export default function DeploymentPlanPreview({
  plan,
  repositoryName,
  onApprove,
  onReject,
  onModify,
}: DeploymentPlanPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [editedPlan] = useState<DeploymentPlan>(plan)

  const handleApprove = () => {
    onApprove(editedPlan)
  }

  const handleModify = () => {
    if (feedback.trim()) {
      onModify(feedback)
      setFeedback('')
    }
  }

  const getServiceIcon = (serviceType: string) => {
    const IconComponent = SERVICE_ICONS[serviceType] || SERVICE_ICONS.default
    return <IconComponent className="h-5 w-5" />
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 relative">
            <button
              onClick={onReject}
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
            <h2 className="text-xl font-bold text-white mb-2">
              🤖 AI Deployment Plan for &quot;{repositoryName}&quot;
            </h2>
            <p className="text-blue-100 text-sm">
              Review and customize your deployment strategy
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Architecture Overview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <Server className="h-5 w-5 mr-2 text-blue-600" />
                Architecture Overview
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300">
                  {plan.architecture}
                </p>
              </div>
            </div>

            {/* Cost & Time Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-900 dark:text-green-100">
                    Estimated Monthly Cost
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {plan.estimated_monthly_cost}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    Deployment Time
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {plan.deployment_time}
                </p>
              </div>
            </div>

            {/* AWS Services */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                AWS Services Required
              </h3>
              <div className="grid gap-3">
                {plan.services.map((service, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                          {getServiceIcon(service.type)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {service.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {service.purpose}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {service.estimated_cost}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          per month
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deployment Steps */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Deployment Steps
              </h3>
              <div className="space-y-3">
                {plan.steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {step.action}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {step.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {step.resources.map((resource, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded"
                          >
                            {resource}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                  Requirements
                </h4>
                <ul className="space-y-2">
                  {plan.requirements.map((req, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 dark:text-gray-400 flex items-start"
                    >
                      <span className="text-orange-500 mr-2">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {plan.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 dark:text-gray-400 flex items-start"
                    >
                      <span className="text-green-500 mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modification Section */}
            {isEditing && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Edit3 className="h-4 w-4 mr-2 text-blue-600" />
                  Request Modifications
                </h4>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe any changes you'd like to the deployment plan. For example: 'Use Lambda instead of EC2', 'Add Redis cache', 'Include monitoring setup', etc."
                  className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              {!isEditing ? (
                <>
                  <button
                    onClick={handleApprove}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Approve & Deploy</span>
                  </button>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <Edit3 className="h-5 w-5" />
                    <span>Request Changes</span>
                  </button>

                  <button
                    onClick={onReject}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleModify}
                    disabled={!feedback.trim()}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Generate New Plan
                  </button>

                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    Back to Review
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
