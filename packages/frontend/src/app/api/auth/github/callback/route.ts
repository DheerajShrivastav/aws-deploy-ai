import { NextRequest, NextResponse } from 'next/server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'your_github_client_id'
const GITHUB_CLIENT_SECRET =
  process.env.GITHUB_CLIENT_SECRET || 'your_github_client_secret'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  // Get the base URL for redirects
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?error=github_auth_failed`)
  }

  try {
    // Step 2: Exchange code for access token
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    )

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData.error)
      return NextResponse.redirect(`${baseUrl}/?error=github_token_failed`)
    }

    const accessToken = tokenData.access_token

    // Step 3: Get user information
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user information')
    }

    const userData = await userResponse.json()

    // Step 4: Create response with cookie
    const response = NextResponse.redirect(`${baseUrl}/?github_connected=true`)

    // Set HTTP-only cookie with the access token
    response.cookies.set('github_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    // Also set user info cookie (not HTTP-only so frontend can read it)
    response.cookies.set(
      'github_user',
      JSON.stringify({
        login: userData.login,
        name: userData.name,
        avatar_url: userData.avatar_url,
        public_repos: userData.public_repos,
      }),
      {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      }
    )

    return response
  } catch (error) {
    console.error('GitHub OAuth callback error:', error)
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
    return NextResponse.redirect(`${baseUrl}/?error=github_callback_failed`)
  }
}
