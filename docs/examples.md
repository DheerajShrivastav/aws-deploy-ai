# AWS Deploy AI - Examples and Use Cases

This document provides practical examples and use cases for AWS Deploy AI, demonstrating how to deploy various types of applications using natural language prompts.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Advanced Use Cases](#advanced-use-cases)
- [Real-World Scenarios](#real-world-scenarios)
- [Templates](#templates)
- [Best Practices](#best-practices)
- [Troubleshooting Examples](#troubleshooting-examples)

## Basic Examples

### 1. Personal Portfolio Website

Deploy a simple portfolio website with minimal configuration:

```javascript
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Create a professional portfolio website for a software developer.
    Include:
    - Modern, clean design with dark theme
    - Hero section with my name and title
    - About section describing my experience
    - Skills section with programming languages
    - Projects showcase with 3 sample projects
    - Contact form with email and LinkedIn
    - Responsive design for mobile devices
  `,
})
```

**Expected Output:**

- S3 bucket with website hosting enabled
- CloudFront distribution for fast global delivery
- Generated HTML, CSS, and JavaScript files
- Contact form with basic validation
- Mobile-responsive design

**Estimated Cost:** $2-5/month

### 2. Small Business Website

Deploy a business website with multiple pages:

```javascript
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Build a website for a local bakery called "Sweet Dreams Bakery".
    Features needed:
    - Homepage with hero image and welcome message
    - About us page with bakery history and team
    - Menu page with product categories and prices
    - Location and hours page with embedded map
    - Contact page with phone, email, and contact form
    - Warm, inviting color scheme with bakery imagery
    - Easy navigation between pages
  `,
})
```

**Expected Output:**

- Multi-page static website
- SEO-optimized structure
- Contact form integration
- Image optimization
- Professional bakery design

**Estimated Cost:** $3-8/month

### 3. Event Landing Page

Create a landing page for a specific event:

```javascript
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Create a landing page for "TechConf 2024" - a technology conference.
    Requirements:
    - Eye-catching hero section with event date and location
    - Speaker lineup with photos and bios
    - Schedule/agenda section
    - Registration call-to-action buttons
    - Sponsor logos section
    - FAQ section
    - Social media links
    - Countdown timer to event date
    - Professional conference design
  `,
})
```

**Expected Output:**

- Single-page application
- Interactive countdown timer
- Registration form
- Responsive design
- Social media integration

**Estimated Cost:** $2-6/month

## Advanced Use Cases

### 1. React Single Page Application

Deploy a modern React SPA with routing:

```javascript
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Deploy a React single-page application for a task management tool.
    Features:
    - User dashboard with task overview
    - Task creation and editing forms
    - Category-based task organization
    - Progress tracking and statistics
    - Local storage for persistence
    - Modern Material Design UI
    - Client-side routing with React Router
    - Responsive design for desktop and mobile
  `,
  files: {
    'package.json': JSON.stringify({
      name: 'task-manager',
      version: '1.0.0',
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.8.0',
        '@mui/material': '^5.11.0',
        '@emotion/react': '^11.10.0',
        '@emotion/styled': '^11.10.0',
      },
      scripts: {
        build: 'react-scripts build',
        start: 'react-scripts start',
      },
    }),
    'src/App.js': `
      import React from 'react';
      import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
      import Dashboard from './components/Dashboard';
      import TaskForm from './components/TaskForm';
      import './App.css';

      function App() {
        return (
          <Router>
            <div className="App">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/new-task" element={<TaskForm />} />
                <Route path="/edit-task/:id" element={<TaskForm />} />
              </Routes>
            </div>
          </Router>
        );
      }

      export default App;
    `,
  },
})
```

**Expected Output:**

- Built React application deployed to S3
- CloudFront with SPA routing support
- Optimized build with code splitting
- Progressive Web App features

**Estimated Cost:** $5-15/month

### 2. API-Powered Dashboard

Deploy a dashboard that connects to external APIs:

```javascript
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Create a cryptocurrency portfolio dashboard.
    Features:
    - Real-time price tracking for top 10 cryptocurrencies
    - Portfolio value calculation
    - Price charts and historical data
    - News feed integration
    - Responsive grid layout
    - Dark/light theme toggle
    - Data refresh every 30 seconds
    - Mobile-friendly design
    
    Use CoinGecko API for cryptocurrency data.
    Include error handling for API failures.
  `,
})
```

**Expected Output:**

- JavaScript application with API integration
- Real-time data updates
- Interactive charts
- Error handling and loading states
- Local storage for preferences

**Estimated Cost:** $3-10/month

### 3. E-commerce Product Catalog

Deploy a product showcase website:

```javascript
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Build an e-commerce product catalog for "Urban Fashion Store".
    Requirements:
    - Product grid with filtering and sorting
    - Product detail pages with image galleries
    - Shopping cart functionality (frontend only)
    - Category navigation
    - Search functionality
    - Product comparison feature
    - Wishlist/favorites
    - Customer reviews section
    - Professional e-commerce design
    - Mobile shopping experience
  `,
})
```

**Expected Output:**

- Multi-page e-commerce interface
- Product catalog with advanced filtering
- Shopping cart with local storage
- Image optimization and lazy loading
- SEO-friendly product pages

**Estimated Cost:** $8-20/month

## Real-World Scenarios

### 1. Restaurant Website with Online Ordering

```javascript
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Create a website for "Bella Vista Italian Restaurant".
    Must include:
    - Homepage with restaurant ambiance photos
    - Full menu with categories (appetizers, mains, desserts, drinks)
    - Online ordering system with item customization
    - Table reservation form
    - Location with Google Maps integration
    - Hours of operation and contact information
    - Special events and promotions section
    - Customer testimonials
    - Social media feed integration
    - Italian-themed design with warm colors
  `,
})

// Check deployment progress
setTimeout(async () => {
  const status = await mcpClient.callTool('get-deployment-status', {
    deploymentId: deployment.deploymentId,
  })
  console.log(`Deployment ${status.progress}% complete`)
  console.log(`Current step: ${status.currentStep}`)
}, 30000)
```

### 2. Non-Profit Organization Website

```javascript
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Develop a website for "Hope for Tomorrow" charity organization.
    Essential features:
    - Mission statement and impact stories
    - Donation page with multiple giving options
    - Volunteer registration and opportunities
    - Event calendar with upcoming fundraisers
    - Newsletter signup with email integration
    - Photo gallery from community events
    - Annual reports and transparency information
    - Success stories and testimonials
    - Social media integration
    - Accessibility compliance (WCAG 2.1)
    - Inspiring, trustworthy design
  `,
})
```

### 3. SaaS Product Landing Page

```javascript
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Create a landing page for "CloudSync Pro" - a file synchronization SaaS.
    Requirements:
    - Hero section with value proposition and demo video
    - Feature highlights with icons and descriptions
    - Pricing table with 3 tiers (Basic, Pro, Enterprise)
    - Customer testimonials and case studies
    - Free trial signup form
    - Feature comparison matrix
    - Security and compliance badges
    - FAQ section addressing common concerns
    - Live chat widget integration
    - A/B testing ready design
    - High conversion rate optimization
  `,
})
```

### 4. Educational Course Platform

```javascript
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Build a course catalog website for "CodeAcademy Plus".
    Features needed:
    - Course listings with difficulty levels and ratings
    - Instructor profiles and credentials
    - Course preview videos and curriculum outlines
    - Student enrollment and progress tracking
    - Interactive coding challenges and quizzes
    - Certificate generation upon completion
    - Student discussion forums
    - Progress analytics and achievements
    - Mobile learning optimization
    - Offline content download capability
    - Multi-language support
  `,
})
```

## Templates

### Template 1: Business Website

```javascript
const businessTemplate = {
  prompt: `
    Create a professional business website with the following structure:
    - Homepage with company overview and key services
    - About page with company history and team
    - Services page with detailed service descriptions
    - Portfolio/case studies showcasing past work
    - Blog section for content marketing
    - Contact page with multiple contact methods
    - Professional, trustworthy design
    - SEO optimization for local search
  `,
  estimatedCost: '$5-12/month',
  suitableFor: [
    'Small businesses',
    'Consulting firms',
    'Professional services',
  ],
}
```

### Template 2: Portfolio Website

```javascript
const portfolioTemplate = {
  prompt: `
    Design a creative portfolio website featuring:
    - Hero section with professional headshot and elevator pitch
    - Work showcase with project thumbnails and descriptions
    - Skills and expertise section
    - Experience timeline or resume
    - Client testimonials and recommendations
    - Blog or insights section
    - Contact form and social media links
    - Creative, visually appealing design
    - Fast loading and mobile optimized
  `,
  estimatedCost: '$2-8/month',
  suitableFor: ['Designers', 'Developers', 'Photographers', 'Freelancers'],
}
```

### Template 3: Event Website

```javascript
const eventTemplate = {
  prompt: `
    Build an event website including:
    - Event information and countdown timer
    - Speaker lineup with photos and bios
    - Schedule and agenda
    - Venue information and directions
    - Registration and ticketing
    - Sponsor recognition
    - Social media integration
    - Live updates and announcements
    - Event-specific branding and design
  `,
  estimatedCost: '$3-10/month',
  suitableFor: ['Conferences', 'Workshops', 'Festivals', 'Corporate events'],
}
```

## Best Practices

### 1. Prompt Engineering

**Good Prompt Example:**

```javascript
const goodPrompt = `
  Create a modern e-commerce website for sustainable fashion brand "EcoStyle".
  
  Specific requirements:
  - Clean, minimalist design with earth tones
  - Product catalog with filtering by size, color, material
  - Detailed product pages with multiple images
  - Size guide and sustainability information
  - Customer reviews and ratings
  - Shopping cart with guest checkout
  - Newsletter signup for eco-tips
  - About page highlighting sustainability mission
  - Mobile-first responsive design
  - Fast loading times (< 3 seconds)
  
  Target audience: Environmentally conscious millennials
  Brand personality: Modern, trustworthy, eco-friendly
`
```

**Poor Prompt Example:**

```javascript
const poorPrompt = `
  Make a website for my business. It should look good and have all the usual stuff.
`
```

### 2. File Organization

When providing custom files, organize them clearly:

```javascript
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: 'Deploy my React portfolio application',
  files: {
    // Root files
    'index.html': '<!DOCTYPE html>...',
    'package.json': '{"name": "portfolio"...}',

    // Source files
    'src/App.js': 'import React from "react"...',
    'src/index.js': 'import ReactDOM from "react-dom"...',
    'src/components/Header.js': 'export default function Header()...',
    'src/components/Footer.js': 'export default function Footer()...',

    // Styles
    'src/styles/App.css': 'body { margin: 0; }...',
    'src/styles/components.css': '.header { background: #fff; }...',

    // Assets (base64 encoded)
    'src/assets/logo.png': 'data:image/png;base64,iVBORw0KGgo...',
    'src/assets/hero-bg.jpg': 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  },
})
```

### 3. Cost Optimization

Get cost estimates before deployment:

```javascript
// Analyze costs first
const estimate = await mcpClient.callTool('get-cost-estimate', {
  prompt: 'High-traffic e-commerce website with 50,000 monthly visitors',
  traffic: {
    monthlyVisitors: 50000,
    averagePageViews: 8,
    averageFileSize: 3.5,
  },
})

console.log('Estimated monthly cost:', estimate.total.monthly)

// Proceed with deployment if cost is acceptable
if (estimate.total.monthly < 50) {
  const deployment = await mcpClient.callTool('deploy-website', {
    prompt: 'Deploy the e-commerce website...',
  })
}
```

### 4. Progressive Enhancement

Start simple and enhance based on needs:

```javascript
// Phase 1: Basic website
const phase1 = await mcpClient.callTool('deploy-website', {
  prompt: 'Create a simple 3-page business website with contact form',
})

// Phase 2: Add blog functionality
const phase2 = await mcpClient.callTool('deploy-website', {
  prompt:
    'Enhance the existing website with a blog section and newsletter signup',
})

// Phase 3: Add e-commerce features
const phase3 = await mcpClient.callTool('deploy-website', {
  prompt: 'Add product catalog and shopping cart to the website',
})
```

## Troubleshooting Examples

### 1. Deployment Stuck in Progress

```javascript
// Check deployment status
const status = await mcpClient.callTool('get-deployment-status', {
  deploymentId: 'deploy-abc123',
})

if (
  status.status === 'in-progress' &&
  Date.now() - new Date(status.createdAt).getTime() > 30 * 60 * 1000
) {
  console.log('Deployment taking longer than expected')
  console.log('Current step:', status.currentStep)
  console.log('Recent logs:', status.logs.slice(-5))

  // Consider restarting deployment
}
```

### 2. Custom Domain Issues

```javascript
// Deploy with custom domain troubleshooting
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Deploy my portfolio website to custom domain "johndoe.dev".
    
    If domain configuration fails:
    - Provide detailed DNS setup instructions
    - Include alternative CloudFront URL
    - Suggest domain verification steps
    - Provide troubleshooting guide
  `,
})
```

### 3. High Cost Optimization

```javascript
// Analyze and optimize costs
const analysis = await mcpClient.callTool('analyze-deployment', {
  prompt: `
    Optimize costs for a high-traffic blog website receiving 100,000 monthly visitors.
    Focus on:
    - CloudFront caching strategies
    - S3 storage class optimization
    - Image compression and optimization
    - CDN configuration for global audience
    - Minimize data transfer costs
  `,
})

console.log('Cost optimization recommendations:', analysis.recommendations)
```

### 4. Performance Issues

```javascript
// Deploy with performance optimization
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Create a high-performance news website with:
    - Optimized images with WebP format
    - Lazy loading for images and content
    - Minified CSS and JavaScript
    - Aggressive CloudFront caching
    - Gzip compression enabled
    - Page load time under 2 seconds
    - Lighthouse score above 90
    - Core Web Vitals optimization
  `,
})
```

## Integration Examples

### 1. CI/CD Pipeline Integration

```javascript
// GitHub Actions workflow example
const workflowExample = `
name: Deploy with AWS Deploy AI

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to AWS
        run: |
          npx @aws-deploy-ai/cli deploy \\
            --prompt "Deploy updated portfolio website" \\
            --files-dir "./dist" \\
            --deployment-id "${{ secrets.DEPLOYMENT_ID }}"
`;
```

### 2. Monitoring Integration

```javascript
// Set up monitoring after deployment
const deployment = await mcpClient.callTool('deploy-website', {
  prompt: `
    Deploy my e-commerce website with monitoring setup:
    - CloudWatch alarms for high error rates
    - Performance monitoring with Real User Monitoring
    - Cost alerts when monthly spend exceeds $20
    - Uptime monitoring with 99.9% availability target
    - Error tracking and reporting
  `,
})

// Set up additional monitoring
const monitoring = await setupMonitoring(deployment.deploymentId)
```

### 3. Multi-Environment Deployment

```javascript
// Deploy to multiple environments
const environments = ['development', 'staging', 'production']

for (const env of environments) {
  const deployment = await mcpClient.callTool('deploy-website', {
    prompt: `
      Deploy my React application to ${env} environment.
      
      Environment-specific configuration:
      - ${
        env === 'production'
          ? 'Custom domain and SSL'
          : 'Default CloudFront domain'
      }
      - ${
        env === 'production'
          ? 'Aggressive caching'
          : 'No caching for development'
      }
      - ${
        env === 'development'
          ? 'Debug mode enabled'
          : 'Production optimizations'
      }
      - Appropriate environment variables for ${env}
    `,
  })

  console.log(`${env} deployment:`, deployment.websiteUrl)
}
```

---

These examples demonstrate the flexibility and power of AWS Deploy AI for various use cases. Start with simple deployments and gradually explore more advanced features as your needs grow. The natural language interface makes it easy to iterate and improve your deployments over time.
