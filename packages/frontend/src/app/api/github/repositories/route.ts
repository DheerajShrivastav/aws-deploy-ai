import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Get GitHub token from cookie
  const token = request.cookies.get('github_token')?.value

  if (!token) {
    return NextResponse.json(
      { error: 'Not authenticated with GitHub' },
      { status: 401 }
    )
  }

  try {
    // Fetch user's repositories from GitHub API
    const response = await fetch(
      'https://api.github.com/user/repos?sort=updated&per_page=50',
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const repos = await response.json()

    // Transform GitHub API response to our format
    const transformedRepos = repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || 'No description available',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      owner: repo.owner.login,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      isPrivate: repo.private,
      updatedAt: formatDate(repo.updated_at),
      defaultBranch: repo.default_branch || 'main',
    }))

    return NextResponse.json({
      repositories: transformedRepos,
      total: transformedRepos.length,
    })
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch repositories',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
  return `${Math.ceil(diffDays / 365)} years ago`
}
