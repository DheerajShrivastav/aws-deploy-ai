import { ChevronRight } from 'lucide-react'

interface Repository {
  name: string
  description: string
  language: string
  stars: number
  owner?: string
  updated?: string
}

interface GitHubRepoCardProps {
  repo: Repository
  onSelect: (repoName: string) => void
  selected?: boolean
}

export default function GitHubRepoCard({
  repo,
  onSelect,
  selected = false,
}: GitHubRepoCardProps) {
  return (
    <div
      onClick={() => onSelect(repo.name)}
      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {repo.name}
            </h3>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium">
              {repo.language}
            </span>
            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
              <span>⭐ {repo.stars}</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
            {repo.description}
          </p>
          {repo.owner && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              by {repo.owner} {repo.updated && `• Updated ${repo.updated}`}
            </p>
          )}
        </div>
        <ChevronRight
          className={`h-5 w-5 transition-colors ${
            selected ? 'text-blue-500' : 'text-gray-400'
          }`}
        />
      </div>
    </div>
  )
}
