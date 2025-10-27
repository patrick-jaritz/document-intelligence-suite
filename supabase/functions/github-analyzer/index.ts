import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { withRateLimit, rateLimiters } from '../_shared/rate-limiter.ts'

interface GitHubRepoAnalysis {
  metadata: {
    name: string;
    fullName: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    watchers: number;
    openIssues: number;
    license: string;
    topics: string[];
    createdAt: string;
    updatedAt: string;
    size: number;
    defaultBranch: string;
  };
  technicalAnalysis: {
    techStack: string[];
    architecture: string;
    codeQuality: string;
    documentation: string;
    testing: string;
    security: string;
    performance: string;
  };
  useCases: {
    primary: string[];
    secondary: string[];
    integrations: string[];
    industries: string[];
    targetAudience: string[];
    businessModels: string[];
    marketOpportunities: string[];
    competitiveAdvantages: string[];
    scalingPotential: string;
    monetizationStrategies: string[];
    partnershipOpportunities: string[];
    investmentPotential: string;
    exitStrategies: string[];
  };
  rankedApplications?: Array<{
    rank: number;
    title: string;
    description: string;
    feasibility: 'High' | 'Medium' | 'Low';
    marketDemand: 'High' | 'Medium' | 'Low';
    creativityScore: number;
  }>;
  recommendations: {
    strengths: string[];
    improvements: string[];
    risks: string[];
    adoptionPotential: string;
  };
  summary: {
    executive: string;
    technical: string;
    business: string;
    tlDr: string;
  };
  analysisMetadata: {
    analyzedAt: string;
    analysisVersion: string;
    confidence: number;
    dataCompleteness: number;
  };
}

interface GitHubRepoData {
  repo: any;
  readme: string;
  languages: any;
  contents: any[];
  issues: any[];
  pulls: any[];
  contributors: any[];
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!
const mistralApiKey = Deno.env.get('MISTRAL_API_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Check if URL is a GitHub repository
 */
function isGitHubRepo(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part);
    
    // Must be github.com with at least owner/repo
    return urlObj.hostname === 'github.com' && 
           pathParts.length >= 2 && 
           pathParts[0].length > 0 && 
           pathParts[1].length > 0;
  } catch {
    return false;
  }
}

/**
 * Extract owner and repo from GitHub URL
 */
function extractGitHubInfo(url: string): { owner: string; repo: string } {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(part => part);
  
  if (pathParts.length < 2) {
    throw new Error('Invalid GitHub repository URL. Please provide a URL in the format: https://github.com/owner/repository');
  }
  
  // Remove .git suffix if present
  const repo = pathParts[1].replace(/\.git$/, '');
  
  return {
    owner: pathParts[0],
    repo: repo
  };
}

/**
 * Fetch GitHub repository data using GitHub API
 */
async function fetchGitHubData(owner: string, repo: string): Promise<GitHubRepoData> {
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  
  try {
    // Fetch repository basic info
    const repoResponse = await fetch(`${baseUrl}`);
    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        throw new Error(`Repository not found: ${owner}/${repo}. Please check that the repository exists and is public, or verify the URL is correct.`);
      } else if (repoResponse.status === 403) {
        throw new Error(`Access denied: ${owner}/${repo}. This repository may be private or you may have exceeded GitHub API rate limits.`);
      } else {
        throw new Error(`GitHub API error: ${repoResponse.status} - ${repoResponse.statusText}`);
      }
    }
    const repo = await repoResponse.json();
    
    // Fetch README
    let readme = '';
    try {
      const readmeResponse = await fetch(`${baseUrl}/readme`);
      if (readmeResponse.ok) {
        const readmeData = await readmeResponse.json();
        readme = atob(readmeData.content);
      }
    } catch (error) {
      console.log('README not found or accessible');
    }
    
    // Fetch languages
    const languagesResponse = await fetch(`${baseUrl}/languages`);
    const languages = languagesResponse.ok ? await languagesResponse.json() : {};
    
    // Fetch repository contents (limited to top level)
    const contentsResponse = await fetch(`${baseUrl}/contents`);
    const contents = contentsResponse.ok ? await contentsResponse.json() : [];
    
    // Fetch recent issues (limited to 10)
    const issuesResponse = await fetch(`${baseUrl}/issues?state=all&per_page=10`);
    const issues = issuesResponse.ok ? await issuesResponse.json() : [];
    
    // Fetch recent pull requests (limited to 10)
    const pullsResponse = await fetch(`${baseUrl}/pulls?state=all&per_page=10`);
    const pulls = pullsResponse.ok ? await pullsResponse.json() : [];
    
    // Fetch contributors (limited to 20)
    const contributorsResponse = await fetch(`${baseUrl}/contributors?per_page=20`);
    const contributors = contributorsResponse.ok ? await contributorsResponse.json() : [];
    
    return {
      repo,
      readme,
      languages,
      contents,
      issues,
      pulls,
      contributors
    };
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    throw new Error(`Failed to fetch GitHub repository data: ${error.message}`);
  }
}

/**
 * Analyze repository using LLM
 */
async function analyzeRepositoryWithLLM(repoData: GitHubRepoData): Promise<GitHubRepoAnalysis> {
  const analysisPrompt = `
You are an expert software engineer, business analyst, and startup advisor with deep experience in technology entrepreneurship, venture capital, and market analysis. Analyze the following GitHub repository and provide a comprehensive, entrepreneur-focused analysis that covers technical excellence, business potential, market opportunities, and investment viability.

Repository Information:
- Name: ${repoData.repo.name}
- Full Name: ${repoData.repo.full_name}
- Description: ${repoData.repo.description || 'No description'}
- Language: ${repoData.repo.language || 'Unknown'}
- Stars: ${repoData.repo.stargazers_count}
- Forks: ${repoData.repo.forks_count}
- Open Issues: ${repoData.repo.open_issues_count}
- License: ${repoData.repo.license?.name || 'No license'}
- Topics: ${repoData.repo.topics?.join(', ') || 'None'}
- Size: ${repoData.repo.size} KB
- Created: ${repoData.repo.created_at}
- Updated: ${repoData.repo.updated_at}
- Default Branch: ${repoData.repo.default_branch}

Languages Distribution:
${JSON.stringify(repoData.languages, null, 2)}

README Content:
${repoData.readme.substring(0, 3000)}${repoData.readme.length > 3000 ? '...' : ''}

Repository Structure (Top Level):
${repoData.contents.map(item => `- ${item.name} (${item.type})`).join('\n')}

Recent Issues (${repoData.issues.length}):
${repoData.issues.slice(0, 5).map(issue => `- ${issue.title} (${issue.state})`).join('\n')}

Recent Pull Requests (${repoData.pulls.length}):
${repoData.pulls.slice(0, 5).map(pr => `- ${pr.title} (${pr.state})`).join('\n')}

Contributors (${repoData.contributors.length}):
${repoData.contributors.slice(0, 10).map(contrib => `- ${contrib.login} (${contrib.contributions} contributions)`).join('\n')}

Please provide a comprehensive analysis in the following JSON format:

{
  "metadata": {
    "name": "Repository name",
    "fullName": "Full repository name",
    "description": "Repository description",
    "language": "Primary language",
    "stars": number,
    "forks": number,
    "watchers": number,
    "openIssues": number,
    "license": "License type",
    "topics": ["topic1", "topic2"],
    "createdAt": "Creation date",
    "updatedAt": "Last update date",
    "size": number,
    "defaultBranch": "Default branch name"
  },
  "technicalAnalysis": {
    "techStack": ["Technology1", "Technology2"],
    "architecture": "Architecture description",
    "codeQuality": "Code quality assessment",
    "documentation": "Documentation quality assessment",
    "testing": "Testing strategy and coverage",
    "security": "Security considerations",
    "performance": "Performance characteristics"
  },
  "useCases": {
    "primary": ["Primary use case 1", "Primary use case 2"],
    "secondary": ["Secondary use case 1", "Secondary use case 2"],
    "integrations": ["Integration possibility 1", "Integration possibility 2"],
    "industries": ["Industry 1", "Industry 2"],
    "targetAudience": ["Audience 1", "Audience 2"],
    "businessModels": ["Business model 1", "Business model 2"],
    "marketOpportunities": ["Market opportunity 1", "Market opportunity 2"],
    "competitiveAdvantages": ["Competitive advantage 1", "Competitive advantage 2"],
    "scalingPotential": "Scaling potential assessment",
    "monetizationStrategies": ["Monetization strategy 1", "Monetization strategy 2"],
    "partnershipOpportunities": ["Partnership opportunity 1", "Partnership opportunity 2"],
    "investmentPotential": "Investment potential assessment",
    "exitStrategies": ["Exit strategy 1", "Exit strategy 2"]
  },
  "rankedApplications": [
    {
      "rank": 1,
      "title": "Application idea title specific to this repository",
      "description": "Detailed description of how this idea applies to this specific repo",
      "feasibility": "High|Medium|Low",
      "marketDemand": "High|Medium|Low",
      "creativityScore": 5
    }
  ],
  "recommendations": {
    "strengths": ["Strength 1", "Strength 2"],
    "improvements": ["Improvement 1", "Improvement 2"],
    "risks": ["Risk 1", "Risk 2"],
    "adoptionPotential": "Adoption potential assessment"
  },
  "summary": {
    "executive": "Executive summary for business stakeholders",
    "technical": "Technical summary for developers",
    "business": "Business value and market potential",
    "tlDr": "One-sentence summary"
  },
  "analysisMetadata": {
    "analyzedAt": "${new Date().toISOString()}",
    "analysisVersion": "1.0",
    "confidence": 0.85,
    "dataCompleteness": 0.90
  }
}

Be thorough, accurate, and provide actionable insights. Focus on:

1. **Entrepreneurial Perspective**: Analyze this as a potential business opportunity, considering market size, competitive landscape, and scalability
2. **Technical Excellence**: Evaluate the code quality, architecture, and technical sophistication
3. **Market Viability**: Assess the market demand, target customers, and business model potential
4. **Investment Potential**: Consider funding requirements, growth potential, and exit strategies
5. **Strategic Opportunities**: Identify partnerships, integrations, and market positioning strategies

CRITICAL: Generate "rankedApplications" with 8 SPECIFIC, CREATIVE application ideas tailored to this repository's unique characteristics. Consider:
- Unique features of this repository
- Technology stack capabilities
- Industry applications
- Integration opportunities
- Competitive transformations
- Market gaps this could fill

Each application idea MUST be specific to this repo, not generic. Think creatively about how this technology could be transformed or applied.

Provide specific, actionable insights that would help an entrepreneur or investor make informed decisions about this technology.
`;

  try {
    console.log('🔑 API Keys status:', {
      openai: !!openaiApiKey,
      anthropic: !!anthropicApiKey,
      mistral: !!mistralApiKey
    });

    // Try OpenAI first
    if (openaiApiKey) {
      console.log('🤖 Trying OpenAI GPT-4...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert software engineer, business analyst, and startup advisor with deep experience in technology entrepreneurship, venture capital, and market analysis. Provide detailed, accurate, entrepreneur-focused analysis of GitHub repositories in valid JSON format. Focus on business potential, market opportunities, investment viability, and strategic insights.'
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (response.ok) {
        const data = await response.json();
        const analysisText = data.choices[0].message.content;
        
        // Try to parse JSON response
        try {
          const analysis = JSON.parse(analysisText);
          console.log('✅ OpenAI analysis successful');
          return analysis;
        } catch (parseError) {
          console.log('❌ Failed to parse OpenAI response as JSON:', parseError.message);
        }
      } else {
        console.log('❌ OpenAI API error:', response.status, response.statusText);
      }
    }

    // Fallback to Anthropic
    if (anthropicApiKey) {
      console.log('🤖 Trying Anthropic Claude-3-Sonnet...');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: analysisPrompt
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const analysisText = data.content[0].text;
        
        try {
          const analysis = JSON.parse(analysisText);
          console.log('✅ Anthropic analysis successful');
          return analysis;
        } catch (parseError) {
          console.log('❌ Failed to parse Anthropic response as JSON:', parseError.message);
        }
      } else {
        console.log('❌ Anthropic API error:', response.status, response.statusText);
      }
    }

    // Fallback to Mistral
    if (mistralApiKey) {
      console.log('🤖 Trying Mistral Large...');
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mistralApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: 'You are an expert software engineer, business analyst, and startup advisor with deep experience in technology entrepreneurship, venture capital, and market analysis. Provide detailed, accurate, entrepreneur-focused analysis of GitHub repositories in valid JSON format. Focus on business potential, market opportunities, investment viability, and strategic insights.'
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (response.ok) {
        const data = await response.json();
        const analysisText = data.choices[0].message.content;
        
        try {
          const analysis = JSON.parse(analysisText);
          console.log('✅ Mistral analysis successful');
          return analysis;
        } catch (parseError) {
          console.log('❌ Failed to parse Mistral response as JSON:', parseError.message);
        }
      } else {
        console.log('❌ Mistral API error:', response.status, response.statusText);
      }
    }

    throw new Error('All LLM providers failed to generate analysis');

  } catch (error) {
    console.error('Error in LLM analysis:', error);
    throw new Error(`Failed to analyze repository: ${error.message}`);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Apply rate limiting
  const rateLimitResponse = withRateLimit(
    rateLimiters.github,
    'GitHub analysis rate limit exceeded. Please try again in a minute.'
  )(req);
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate GitHub repository URL
    if (!isGitHubRepo(url)) {
      return new Response(
        JSON.stringify({ error: 'URL must be a valid GitHub repository' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Analyzing GitHub repository: ${url}`);

    // Extract repository information
    const { owner, repo } = extractGitHubInfo(url);
    console.log(`📁 Repository: ${owner}/${repo}`);

    // Fetch repository data
    console.log('📊 Fetching repository data...');
    const repoData = await fetchGitHubData(owner, repo);
    console.log('✅ Repository data fetched successfully');

    // Analyze repository with LLM
    console.log('🤖 Analyzing repository with LLM...');
    const analysis = await analyzeRepositoryWithLLM(repoData);
    console.log('✅ Repository analysis completed');

    // Store analysis in database (optional)
    try {
      const { error: insertError } = await supabase
        .from('github_analyses')
        .insert({
          repository_url: url,
          repository_name: `${owner}/${repo}`,
          analysis_data: analysis,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.log('Warning: Failed to store analysis in database:', insertError);
      } else {
        console.log('✅ Analysis stored in database');
      }
    } catch (dbError) {
      console.log('Warning: Database storage failed:', dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        repository: `${owner}/${repo}`,
        analysis,
        metadata: {
          analyzedAt: new Date().toISOString(),
          dataSources: ['GitHub API', 'LLM Analysis'],
          confidence: analysis.analysisMetadata?.confidence || 0.8
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('GitHub analyzer error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to analyze GitHub repository'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
