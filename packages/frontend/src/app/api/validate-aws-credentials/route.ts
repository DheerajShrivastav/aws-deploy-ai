import { NextRequest, NextResponse } from 'next/server'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'

interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  region: string
}

export async function POST(request: NextRequest) {
  try {
    const credentials: AWSCredentials = await request.json()

    // Validate required fields
    if (
      !credentials.accessKeyId ||
      !credentials.secretAccessKey ||
      !credentials.region
    ) {
      return NextResponse.json(
        { error: 'Missing required credentials fields' },
        { status: 400 }
      )
    }

    // Test AWS credentials by making a simple STS call
    const stsClient = new STSClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    })

    try {
      const command = new GetCallerIdentityCommand({})
      const response = await stsClient.send(command)

      return NextResponse.json({
        valid: true,
        accountId: response.Account,
        arn: response.Arn,
        userId: response.UserId,
        message: 'AWS credentials are valid',
      })
    } catch (awsError: any) {
      console.error('AWS credential validation failed:', awsError)

      let errorMessage = 'Invalid AWS credentials'

      if (awsError.name === 'InvalidUserError') {
        errorMessage = 'Access Key ID not found'
      } else if (awsError.name === 'SignatureDoesNotMatch') {
        errorMessage = 'Invalid Secret Access Key'
      } else if (awsError.name === 'AccessDenied') {
        errorMessage = 'Access denied - insufficient permissions'
      } else if (awsError.message) {
        errorMessage = awsError.message
      }

      return NextResponse.json(
        {
          error: errorMessage,
          valid: false,
        },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Credential validation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to validate credentials',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
