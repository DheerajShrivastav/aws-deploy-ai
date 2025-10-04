import { NextRequest, NextResponse } from 'next/server'

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'your_github_client_id'
const GITHUB_CLIENT_SECRET =
  process.env.GITHUB_CLIENT_SECRET || 'your_github_client_secret'
const GITHUB_REDIRECT_URI =
  process.env.GITHUB_REDIRECT_URI ||
  'http://localhost:3000/api/auth/github/callback'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'login') {
    // Step 1: Redirect to GitHub OAuth
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize')
    githubAuthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID)
    githubAuthUrl.searchParams.set('redirect_uri', GITHUB_REDIRECT_URI)
    githubAuthUrl.searchParams.set('scope', 'repo,user:email')
    githubAuthUrl.searchParams.set('state', generateRandomState())

    return NextResponse.redirect(githubAuthUrl.toString())
  }

  if (action === 'status') {
    // Check if user is already authenticated
    const token = request.cookies.get('github_token')?.value

    if (token) {
      try {
        // Verify token by making a request to GitHub API
        const response = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        })

        if (response.ok) {
          const user = await response.json()
          return NextResponse.json({
            authenticated: true,
            user: {
              login: user.login,
              name: user.name,
              avatar_url: user.avatar_url,
              public_repos: user.public_repos,
            },
          })
        }
      } catch (error) {
        console.error('Error verifying GitHub token:', error)
      }
    }

    return NextResponse.json({ authenticated: false })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

function generateRandomState(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
