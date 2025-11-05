import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts'
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
 * Normalize GitHub repository URL to full format
 * Accepts: https://github.com/owner/repo, github.com/owner/repo, or owner/repo
 */
function normalizeGitHubUrl(url: string): string {
  // Remove leading/trailing whitespace
  url = url.trim();
  
  // If it's already a full URL, return as-is
  if (url.startsWith('https://github.com/') || url.startsWith('http://github.com/')) {
    return url.replace('http://', 'https://');
  }
  
  // If it starts with github.com/, add https://
  if (url.startsWith('github.com/')) {
    return `https://${url}`;
  }
  
  // If it's just owner/repo, add https://github.com/
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\/[a-zA-Z0-9._-]+$/.test(url)) {
    return `https://github.com/${url}`;
  }
  
  // Return as-is if it doesn't match any pattern (will be caught by validation)
  return url;
}

/**
 * Check if URL is a GitHub repository
 * Accepts: https://github.com/owner/repo, github.com/owner/repo, or owner/repo
 */
function isGitHubRepo(url: string): boolean {
  try {
    // Normalize the URL first
    const normalizedUrl = normalizeGitHubUrl(url);
    
    try {
      const urlObj = new URL(normalizedUrl);
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      
      // Must be github.com with at least owner/repo
      return urlObj.hostname === 'github.com' && 
             pathParts.length >= 2 && 
             pathParts[0].length > 0 && 
             pathParts[1].length > 0;
    } catch {
      // If URL parsing fails, check if it's owner/repo format
      const ownerRepoMatch = url.match(/^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)\/([a-zA-Z0-9._-]+)$/);
      return !!ownerRepoMatch;
    }
  } catch {
    return false;
  }
}

/**
 * Extract owner and repo from GitHub URL
 * Accepts: https://github.com/owner/repo, github.com/owner/repo, or owner/repo
 */
function extractGitHubInfo(url: string): { owner: string; repo: string } {
  // Normalize the URL first
  const normalizedUrl = normalizeGitHubUrl(url);
  
  try {
    const urlObj = new URL(normalizedUrl);
    const pathParts = urlObj.pathname.split('/').filter(part => part);
    
    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub repository URL. Please provide a URL in the format: https://github.com/owner/repository or owner/repository');
    }
    
    // Remove .git suffix if present
    const repo = pathParts[1].replace(/\.git$/, '');
    
    return {
      owner: pathParts[0],
      repo: repo
    };
  } catch {
    // Fallback: try to parse owner/repo format directly
    const ownerRepoMatch = url.match(/^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)\/([a-zA-Z0-9._-]+)$/);
    if (ownerRepoMatch) {
      return {
        owner: ownerRepoMatch[1],
        repo: ownerRepoMatch[3].replace(/\.git$/, '')
      };
    }
    throw new Error('Invalid GitHub repository URL. Please provide a URL in the format: https://github.com/owner/repository or owner/repository');
  }
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

CRITICAL INSTRUCTIONS: Provide SPECIFIC, REPOSITORY-TAILORED insights. Avoid generic statements that could apply to any project. Reference actual code structure, files, patterns, and unique characteristics visible in this repository.

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
    "architecture": "SPECIFIC: Describe actual architecture patterns visible in repository structure. Reference specific directories/files. Explain HOW this architecture achieves the project's goals. Compare to common patterns in similar projects. Example: 'Reflex uses a compiler-based architecture (see /reflex directory) where Python components are transpiled to React, enabling...'",
    "codeQuality": "QUANTITATIVE + QUALITATIVE: Provide specific metrics if visible (test files count, CI/CD presence, linting config). Analyze contributor patterns, commit frequency, issue resolution patterns. Reference specific code quality indicators. Count test directories/files from repository structure. Example: 'Code quality indicators: [X] test directories found, contributing guidelines present, active maintenance (" + repoData.issues.length + " issues with avg X days resolution)...'",
    "documentation": "SPECIFIC: Assess actual documentation quality. Reference specific documentation files found (README, docs directory, API docs, tutorials). Note gaps or strengths. Example: 'Comprehensive documentation: detailed README (" + repoData.readme.length + " chars), dedicated /docs directory with [count] files covering...'",
    "testing": "SPECIFIC: Identify test frameworks, test structure, coverage approach. Reference test directories/files visible. Example: 'Testing strategy: [framework name] used, [count] test files found in /tests directory, CI/CD integration suggests automated testing...'",
    "security": "SPECIFIC: Check for security files (.github/security, security policies, dependency scanning). Analyze security practices visible. Example: 'Security: [Security policy found/No security policy], dependency scanning [enabled via Dependabot/not visible]...'",
    "performance": "SPECIFIC: Identify performance-related patterns (caching, optimization strategies, benchmarks). Reference specific code patterns if visible. Example: 'Performance: [Optimization patterns found in.../No specific performance optimizations visible]...'"
  },
  "useCases": {
    "primary": ["SPECIFIC: Reference actual features visible in README/code. Explain HOW this repository enables each use case differently than alternatives. Example: 'Building Python-first web apps where developers can write both frontend and backend in Python (enabled by Reflex's component compilation model)'"],
    "secondary": ["SPECIFIC: Connect to actual capabilities, not generic applications"],
    "integrations": ["SPECIFIC: Identify actual tools/services that would integrate well based on technology stack. Explain HOW integration would work. Example: 'Integrates with Supabase because both use Python-first approach, enabling seamless data layer integration'"],
    "industries": ["SPECIFIC: Identify sub-industries with concrete examples. Explain WHY this repository is suitable. Example: 'Healthcare: Clinical trial data dashboards where Python ML models need web UIs without JavaScript expertise'"],
    "targetAudience": ["SPECIFIC: Define narrow user segments. Explain WHY each segment would choose this over alternatives. Example: 'Data scientists who need interactive web UIs without learning JavaScript, as evidenced by Reflex's pure Python approach'"],
    "businessModels": ["SPECIFIC: Connect business models to actual architecture/features. Example: 'SaaS model enabled by Reflex Cloud deployment capabilities (see deployment docs)'"],
    "marketOpportunities": ["SPECIFIC: Cite trends relevant to THIS technology type, not generic web dev trends. Connect to unique features. Example: 'Growing Python ML community (3M+ users) needs web UIs - Reflex addresses this gap with pure Python approach, differentiating from Streamlit's dashboard focus'"],
    "competitiveAdvantages": ["SPECIFIC: Compare to 2-3 direct competitors (identify based on topics/description). Explain UNIQUE features not found in competitors. Example: 'Unlike Streamlit (read-only dashboards) and Dash (requires JavaScript), Reflex enables full-stack Python apps with React-level interactivity via component compilation'"],
    "scalingPotential": "SPECIFIC: Reference actual architecture capabilities. Explain scalability characteristics based on technology choices.",
    "monetizationStrategies": ["SPECIFIC: Suggest features based on actual architecture. Connect monetization to technical capabilities. Example: 'Premium: Advanced component library (builds on Reflex's component model in /reflex/components)'"],
    "partnershipOpportunities": ["SPECIFIC: Identify actual companies/tools that would benefit. Explain WHY each partnership would be valuable. Example: 'Partnership with Jupyter project: Reflex could enable Jupyter notebooks to export interactive web apps'"],
    "investmentPotential": "SPECIFIC: Assess based on competitive positioning, market gap addressed, and technical differentiation. Reference actual metrics (stars growth, community size, market demand indicators).",
    "exitStrategies": ["SPECIFIC: Consider realistic acquisition targets based on technology fit and market position. Example: 'Acquisition by Vercel (frontend focus) or Anaconda (Python ecosystem) could integrate Reflex into their platforms'"]
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
    "analyzedAt": "[current ISO timestamp]",
    "analysisVersion": "1.1",
    "confidence": 0.75,
    "dataCompleteness": 0.85,
    "note": "Confidence reflects repository-specific analysis depth. Lower confidence indicates limited data availability, not analysis quality."
  }
}

CRITICAL QUALITY REQUIREMENTS:

1. **AVOID GENERIC STATEMENTS**: If a statement could describe 10+ similar projects, make it more specific.
   - ❌ BAD: "High code quality with consistent contributions"
   - ✅ GOOD: "High code quality evidenced by 85% test coverage, comprehensive type hints, and modular architecture visible in /src structure"

2. **REFERENCE CONCRETE DETAILS**: Always connect claims to visible evidence.
   - ❌ BAD: "Good documentation"
   - ✅ GOOD: "Comprehensive documentation: detailed README (" + repoData.readme.length + " chars), dedicated /docs directory with API references and tutorials"

3. **COMPARE TO COMPETITORS**: Every business section should reference 2-3 direct competitors.
   - Identify competitors based on: topics "${(repoData.repo.topics || []).join(', ') || 'None'}", description "${repoData.repo.description || 'No description'}", language "${repoData.repo.language || 'Unknown'}"
   - For each competitor: What this repo does BETTER, what it does WORSE, market positioning

4. **USE QUANTITATIVE METRICS**: Where possible, provide numbers, counts, percentages.
   - Test files: Count visible test directories
   - Documentation: Estimate coverage based on files found
   - Activity: Analyze commit frequency, contributor engagement
   - Security: Count security-related files/policies

5. **CONNECT FEATURES TO USE CASES**: Don't just list use cases - explain HOW this repository's features enable them.
   - Reference actual code patterns, architecture decisions, or unique capabilities

Be thorough, accurate, and provide actionable insights. Focus on:

1. **Entrepreneurial Perspective**: Analyze as a SPECIFIC business opportunity. Compare to identified competitors. Reference actual market gaps this addresses.
2. **Technical Excellence**: Evaluate SPECIFIC code patterns, architecture decisions visible in repository structure. Use metrics where available.
3. **Market Viability**: Assess SPECIFIC market demand based on unique features. Identify narrow target segments, not broad categories.
4. **Investment Potential**: Consider SPECIFIC competitive positioning and differentiation. Reference actual metrics (stars growth, community indicators).
5. **Strategic Opportunities**: Identify SPECIFIC partnerships based on technology fit. Explain WHY each opportunity is valuable.

CRITICAL: Generate "rankedApplications" with 8 SPECIFIC, CREATIVE application ideas tailored to this repository's unique characteristics. Consider:
- Unique features visible in repository structure
- Technology stack capabilities and how they're used
- Specific industry applications with concrete examples
- Integration opportunities with specific tools/services
- Competitive transformations this technology enables
- Specific market gaps this fills based on competitive analysis

Each application idea MUST be specific to this repo, not generic. Think creatively about how this technology could be transformed or applied based on its ACTUAL architecture and capabilities.

VALIDATION: Before finalizing, review each section and ask:
- Could this statement apply to 10+ similar projects? If yes, make it more specific.
- Does this reference concrete details from the repository? If no, add specific references.
- Is this comparing to competitors? If no, add competitive context.
- Are there quantitative metrics I can include? If yes, add them.

Provide specific, actionable insights that would help an entrepreneur or investor make informed decisions about this technology.
`;

  const errors: string[] = [];

  try {
    console.log('🔑 API Keys status:', {
      openai: !!openaiApiKey,
      anthropic: !!anthropicApiKey,
      mistral: !!mistralApiKey
    });

    // Try OpenAI first (using GPT-4o for better token limits)
    if (openaiApiKey) {
      console.log('🤖 Trying OpenAI GPT-4o...');
      try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o', // Using GPT-4o which has 128k context
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
            max_tokens: 8000 // Increased for GPT-4o, but still within safe limits
        })
      });

      if (response.ok) {
        const data = await response.json();
          let analysisText = data.choices[0].message.content;
          
          // Extract JSON from markdown code blocks if present
          const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch) {
            analysisText = jsonMatch[1];
          }
        
        // Try to parse JSON response
        try {
          const analysis = JSON.parse(analysisText);
          console.log('✅ OpenAI analysis successful');
          return analysis;
        } catch (parseError) {
            const errorMsg = `OpenAI: Failed to parse JSON response - ${parseError.message}. First 200 chars: ${analysisText.substring(0, 200)}`;
            console.log('❌', errorMsg);
            errors.push(errorMsg);
          }
        } else {
          const errorText = await response.text().catch(() => response.statusText);
          const errorMsg = `OpenAI: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`;
          console.log('❌', errorMsg);
          errors.push(errorMsg);
        }
      } catch (fetchError) {
        const errorMsg = `OpenAI: Network error - ${fetchError.message}`;
        console.log('❌', errorMsg);
        errors.push(errorMsg);
      }
    } else {
      errors.push('OpenAI: API key not configured');
    }

    // Fallback to Anthropic
    if (anthropicApiKey) {
      console.log('🤖 Trying Anthropic Claude-3.5-Sonnet...');
      try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01' // Keep API version for compatibility
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20240620', // Correct model name
            max_tokens: 8192, // Claude 3.5 Sonnet supports up to 8192 tokens
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
          let analysisText = data.content[0].text;
          
          // Extract JSON from markdown code blocks if present
          const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch) {
            analysisText = jsonMatch[1];
          }
        
        try {
          const analysis = JSON.parse(analysisText);
          console.log('✅ Anthropic analysis successful');
          return analysis;
        } catch (parseError) {
            const errorMsg = `Anthropic: Failed to parse JSON response - ${parseError.message}. First 200 chars: ${analysisText.substring(0, 200)}`;
            console.log('❌', errorMsg);
            errors.push(errorMsg);
          }
        } else {
          const errorText = await response.text().catch(() => response.statusText);
          const errorMsg = `Anthropic: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`;
          console.log('❌', errorMsg);
          errors.push(errorMsg);
        }
      } catch (fetchError) {
        const errorMsg = `Anthropic: Network error - ${fetchError.message}`;
        console.log('❌', errorMsg);
        errors.push(errorMsg);
      }
    } else {
      errors.push('Anthropic: API key not configured');
    }

    // Fallback to Mistral
    if (mistralApiKey) {
      console.log('🤖 Trying Mistral Large...');
      try {
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
            max_tokens: 6000
        })
      });

      if (response.ok) {
        const data = await response.json();
          let analysisText = data.choices[0].message.content;
          
          // Extract JSON from markdown code blocks if present
          const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch) {
            analysisText = jsonMatch[1];
          }
        
        try {
          const analysis = JSON.parse(analysisText);
          console.log('✅ Mistral analysis successful');
          return analysis;
        } catch (parseError) {
            const errorMsg = `Mistral: Failed to parse JSON response - ${parseError.message}. First 200 chars: ${analysisText.substring(0, 200)}`;
            console.log('❌', errorMsg);
            errors.push(errorMsg);
          }
        } else {
          const errorText = await response.text().catch(() => response.statusText);
          const errorMsg = `Mistral: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`;
          console.log('❌', errorMsg);
          errors.push(errorMsg);
        }
      } catch (fetchError) {
        const errorMsg = `Mistral: Network error - ${fetchError.message}`;
        console.log('❌', errorMsg);
        errors.push(errorMsg);
      }
    } else {
      errors.push('Mistral: API key not configured');
    }

    // All providers failed - throw detailed error
    const errorDetails = errors.length > 0 
      ? `\n\nProvider Errors:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
      : '\n\nNo API keys configured. Please set at least one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, MISTRAL_API_KEY';
    
    throw new Error(`All LLM providers failed to generate analysis.${errorDetails}`);

  } catch (error) {
    console.error('Error in LLM analysis:', error);
    throw new Error(`Failed to analyze repository: ${error.message}`);
  }
}

Deno.serve(async (req: Request) => {
  // SECURITY: Initialize headers early for error responses
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

  try {
    // SECURITY: Handle CORS preflight requests FIRST
  if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: headers,
      });
  }

  // Apply rate limiting
    const rateLimitResponse = await withRateLimit(
    rateLimiters.github,
    'GitHub analysis rate limit exceeded. Please try again in a minute.'
  )(req);
  
  if (rateLimitResponse) {
      // Update rate limit response with merged headers (CORS + security)
      const rateLimitHeaders = new Headers(rateLimitResponse.headers);
      Object.entries(headers).forEach(([key, value]) => {
        rateLimitHeaders.set(key, value);
      });
      // Ensure rate limit response has valid JSON body
      const rateLimitBody = rateLimitResponse.body 
        ? (typeof rateLimitResponse.body === 'string' ? rateLimitResponse.body : JSON.stringify({ error: 'Rate limit exceeded' }))
        : JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a minute.' });
      return new Response(rateLimitBody, {
        status: rateLimitResponse.status,
        headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' }
      });
    }

    // SECURITY: Limit request size
    const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
    let requestText = '';
    try {
      requestText = await req.text();
      if (requestText.length > MAX_REQUEST_SIZE) {
        return new Response(
          JSON.stringify({ error: 'Request too large' }),
          { 
            status: 413, 
            headers: { ...headers, 'Content-Type': 'application/json' } 
          }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to read request body' }),
        { 
          status: 400, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    try {
      const { url } = JSON.parse(requestText);

      // SECURITY: Validate input
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'URL is required and must be a non-empty string' }),
          { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }

      // SECURITY: Validate URL length
      if (url.length > 2048) {
        return new Response(
          JSON.stringify({ error: 'URL too long (max 2048 characters)' }),
          { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
    }

      // Validate GitHub repository URL
      if (!isGitHubRepo(url)) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid GitHub repository URL. Please provide a URL in one of these formats:\n- https://github.com/owner/repository\n- github.com/owner/repository\n- owner/repository'
          }),
          { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }

      // Normalize the URL for consistent storage
      const normalizedUrl = normalizeGitHubUrl(url);
      console.log(`🔍 Analyzing GitHub repository: ${normalizedUrl} (original: ${url})`);

      // Extract repository information (use normalized URL)
      const { owner, repo } = extractGitHubInfo(normalizedUrl);
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
        repository: `https://github.com/${owner}/${repo}`,
        analysis,
        metadata: {
          analyzedAt: new Date().toISOString(),
          dataSources: ['GitHub API', 'LLM Analysis'],
          confidence: analysis.analysisMetadata?.confidence || 0.8
        }
      }),
        { headers: { ...headers, 'Content-Type': 'application/json' } }
      );

  } catch (error) {
    console.error('GitHub analyzer error:', error);
    
      // SECURITY: Don't expose stack traces in production
      const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
      
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to analyze GitHub repository',
          ...(isProduction ? {} : { 
            details: error instanceof Error ? error.stack : String(error)
          })
        }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }
  } catch (outerError) {
    // Catch any errors that occur outside the inner try block
    console.error('❌ Outer error in github-analyzer:', outerError);
    return new Response(
      JSON.stringify({
        success: false,
        error: outerError instanceof Error ? outerError.message : 'An unexpected error occurred',
        type: 'outer_error'
      }),
      { 
        status: 500, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  }
})
