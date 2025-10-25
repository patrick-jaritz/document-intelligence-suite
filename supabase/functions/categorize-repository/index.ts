import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface CategoryResult {
  categories: string[];
  primary_category: string;
  confidence: number;
  tags: string[];
  purpose: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { repository_data } = await req.json()

    if (!repository_data) {
      throw new Error('repository_data is required')
    }

    // Intelligent categorization based on metadata
    const categories = categorizeRepository(repository_data)

    return new Response(
      JSON.stringify(categories),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

function categorizeRepository(repoData: any): CategoryResult {
  const metadata = repoData.metadata || {}
  const techStack = repoData.technicalAnalysis?.techStack || []
  const description = (metadata.description || '').toLowerCase()
  const topics = (metadata.topics || []).map((t: string) => t.toLowerCase())
  const language = (metadata.language || '').toLowerCase()
  
  const categories: string[] = []
  const tags: string[] = []
  let primary_category = 'General'
  let purpose = 'General Purpose'

  // Language-based categorization
  if (language === 'javascript' || language === 'typescript') {
    tags.push('Web Development')
    if (topics.includes('react') || topics.includes('vue') || topics.includes('angular')) {
      categories.push('Frontend Framework')
      primary_category = 'Frontend Development'
    }
    if (topics.includes('node') || topics.includes('express') || topics.includes('koa')) {
      categories.push('Backend Framework')
      primary_category = 'Backend Development'
    }
  } else if (language === 'python') {
    tags.push('Data Science')
    if (topics.includes('ml') || topics.includes('machine-learning') || topics.includes('deep-learning')) {
      categories.push('Machine Learning')
      primary_category = 'AI/ML'
    }
    if (topics.includes('data') || topics.includes('analytics')) {
      categories.push('Data Analysis')
    }
  }

  // Purpose-based categorization
  if (description.includes('api') || description.includes('rest') || description.includes('graphql')) {
    categories.push('API')
    primary_category = 'API Development'
    tags.push('API')
  }
  
  if (description.includes('framework') || description.includes('library')) {
    categories.push('Framework')
    tags.push('Framework')
  }

  if (description.includes('ui') || description.includes('component') || description.includes('design')) {
    categories.push('UI/UX')
    tags.push('Design')
  }

  if (description.includes('cli') || description.includes('command-line')) {
    categories.push('CLI Tool')
    primary_category = 'Developer Tools'
    tags.push('CLI')
  }

  if (description.includes('database') || description.includes('orm') || description.includes('data')) {
    categories.push('Database Tool')
    tags.push('Database')
  }

  if (description.includes('auth') || description.includes('security') || description.includes('oauth')) {
    categories.push('Authentication')
    tags.push('Security')
  }

  if (description.includes('test') || description.includes('testing') || description.includes('spec')) {
    categories.push('Testing Tool')
    tags.push('Testing')
  }

  if (description.includes('deploy') || description.includes('ci/cd') || description.includes('devops')) {
    categories.push('DevOps')
    tags.push('DevOps')
  }

  if (description.includes('monitoring') || description.includes('analytics') || description.includes('logging')) {
    categories.push('Monitoring')
    tags.push('Observability')
  }

  // Tech stack-based categorization
  if (techStack.some((tech: string) => tech.toLowerCase().includes('react'))) {
    tags.push('React')
    categories.push('React Ecosystem')
  }

  if (techStack.some((tech: string) => tech.toLowerCase().includes('node'))) {
    tags.push('Node.js')
    categories.push('Node.js Ecosystem')
  }

  if (techStack.some((tech: string) => tech.toLowerCase().includes('docker') || tech.toLowerCase().includes('kubernetes'))) {
    tags.push('Container')
    categories.push('Containerization')
  }

  // Topic-based categorization
  if (topics.includes('learning') || topics.includes('tutorial')) {
    categories.push('Educational')
    tags.push('Learning')
  }

  if (topics.includes('hacktoberfest') || topics.includes('beginners')) {
    categories.push('Beginner Friendly')
    tags.push('Beginner')
  }

  if (topics.includes('awesome')) {
    categories.push('Curated List')
    primary_category = 'Resource Collection'
  }

  // Star-based categorization
  if (metadata.stars && metadata.stars > 10000) {
    tags.push('Popular')
    categories.push('Popular Project')
  }

  if (metadata.stars && metadata.stars > 50000) {
    tags.push('Very Popular')
    categories.push('Highly Popular')
  }

  // License-based
  if (metadata.license && metadata.license.toLowerCase().includes('mit')) {
    tags.push('MIT License')
  }

  if (metadata.license && metadata.license.toLowerCase().includes('apache')) {
    tags.push('Apache License')
  }

  // Remove duplicates
  const uniqueCategories = Array.from(new Set(categories))
  const uniqueTags = Array.from(new Set(tags))

  // Determine confidence based on how many indicators we found
  const confidence = Math.min(0.7 + (uniqueCategories.length * 0.05), 0.95)

  return {
    categories: uniqueCategories,
    primary_category: primary_category,
    confidence,
    tags: uniqueTags,
    purpose: determinePurpose(description, topics, techStack)
  }
}

function determinePurpose(description: string, topics: string[], techStack: string[]): string {
  const allText = `${description} ${topics.join(' ')} ${techStack.join(' ')}`.toLowerCase()

  if (allText.includes('api') || allText.includes('rest') || allText.includes('graphql')) {
    return 'API Development'
  }
  if (allText.includes('framework')) {
    return 'Framework Development'
  }
  if (allText.includes('library')) {
    return 'Library Development'
  }
  if (allText.includes('tool')) {
    return 'Developer Tool'
  }
  if (allText.includes('application') || allText.includes('app')) {
    return 'Application Development'
  }
  if (allText.includes('cli') || allText.includes('command')) {
    return 'Command Line Tool'
  }
  if (allText.includes('database')) {
    return 'Database Solution'
  }
  if (allText.includes('auth') || allText.includes('security')) {
    return 'Security Solution'
  }
  if (allText.includes('ui') || allText.includes('component')) {
    return 'UI Component Library'
  }
  
  return 'General Purpose Tool'
}
