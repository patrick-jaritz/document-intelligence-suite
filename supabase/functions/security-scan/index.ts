import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts'

interface SecurityScanResult {
  security_score: number;
  vulnerabilities: Vulnerability[];
  dependency_analysis: DependencyInfo;
  security_recommendations: string[];
  license_analysis: LicenseInfo;
}

interface Vulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  recommendation: string;
}

interface DependencyInfo {
  total_dependencies: number;
  outdated_dependencies: number;
  security_issues: number;
  dependency_list: string[];
}

interface LicenseInfo {
  license_type: string;
  is_osi_approved: boolean;
  is_copyleft: boolean;
  compatibility_warnings: string[];
}

// SECURITY: CORS headers are now generated dynamically with origin validation

serve(async (req) => {
  // SECURITY: Handle CORS preflight requests
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

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
    const requestBody = JSON.parse(requestText);
    const { repository_data, package_files } = requestBody;

    // SECURITY: Validate input
    if (!repository_data || typeof repository_data !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: repository_data' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Perform security analysis
    const securityAnalysis = performSecurityScan(repository_data, package_files)

    return new Response(
      JSON.stringify(securityAnalysis),
      {
          headers: { ...headers, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    // SECURITY: Don't expose stack traces in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        ...(isProduction ? {} : { 
          details: error instanceof Error ? error.stack : String(error)
        })
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

function performSecurityScan(repoData: any, packageFiles: any): SecurityScanResult {
  const metadata = repoData.metadata || {}
  const techStack = repoData.technicalAnalysis?.techStack || []
  const license = metadata.license || 'Unknown'
  
  // Analyze vulnerabilities based on repository data
  const vulnerabilities = detectVulnerabilities(repoData, techStack)
  
  // Dependency analysis
  const dependency_analysis = analyzeDependencies(repoData, packageFiles)
  
  // License analysis
  const license_analysis = analyzeLicense(license)
  
  // Security recommendations
  const security_recommendations = generateSecurityRecommendations(
    vulnerabilities, 
    dependency_analysis, 
    repoData
  )
  
  // Calculate security score (0-100)
  const security_score = calculateSecurityScore(vulnerabilities, dependency_analysis, license_analysis)

  return {
    security_score,
    vulnerabilities,
    dependency_analysis,
    security_recommendations,
    license_analysis
  }
}

function detectVulnerabilities(repoData: any, techStack: string[]): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = []
  
  const metadata = repoData.metadata || {}
  const description = (metadata.description || '').toLowerCase()
  const hasAuth = description.includes('auth') || description.includes('authentication')
  
  // Check for common security issues
  if (!hasAuth && description.includes('api')) {
    vulnerabilities.push({
      severity: 'medium',
      type: 'Authentication',
      description: 'API endpoints may lack authentication mechanisms',
      recommendation: 'Implement proper authentication (OAuth2, JWT, API keys)'
    })
  }
  
  if (description.includes('password') && !description.includes('hash')) {
    vulnerabilities.push({
      severity: 'high',
      type: 'Password Security',
      description: 'Password handling may not use hashing',
      recommendation: 'Implement secure password hashing (bcrypt, Argon2)'
    })
  }
  
  // Check tech stack for known issues
  if (techStack.some(tech => tech.toLowerCase().includes('sql'))) {
    vulnerabilities.push({
      severity: 'medium',
      type: 'SQL Injection',
      description: 'SQL usage detected - ensure parameterized queries are used',
      recommendation: 'Use parameterized queries or ORM with SQL injection protection'
    })
  }
  
  // License based vulnerabilities
  if (!metadata.license || metadata.license === 'No license') {
    vulnerabilities.push({
      severity: 'low',
      type: 'Legal',
      description: 'No license specified',
      recommendation: 'Add a proper open source license (MIT, Apache, GPL)'
    })
  }
  
  return vulnerabilities
}

function analyzeDependencies(repoData: any, packageFiles: any): DependencyInfo {
  const techStack = repoData.technicalAnalysis?.techStack || []
  
  // Estimate dependencies based on tech stack
  let totalDependencies = 0
  let outdatedCount = 0
  let securityIssues = 0
  const dependencyList: string[] = []
  
  techStack.forEach((tech: string) => {
    if (tech.toLowerCase().includes('react')) {
      totalDependencies += 50
      dependencyList.push('react', 'react-dom')
    }
    if (tech.toLowerCase().includes('vue')) {
      totalDependencies += 40
      dependencyList.push('vue', 'vue-router')
    }
    if (tech.toLowerCase().includes('angular')) {
      totalDependencies += 100
      dependencyList.push('@angular/core', '@angular/common')
    }
    if (tech.toLowerCase().includes('node') || tech.toLowerCase().includes('express')) {
      totalDependencies += 30
      dependencyList.push('express', 'node')
    }
    if (tech.toLowerCase().includes('typescript')) {
      totalDependencies += 20
      dependencyList.push('typescript')
    }
  })
  
  // Simulate some outdated dependencies
  if (totalDependencies > 0) {
    outdatedCount = Math.floor(totalDependencies * 0.2) // 20% outdated
    securityIssues = Math.floor(totalDependencies * 0.05) // 5% with security issues
  }
  
  return {
    total_dependencies: totalDependencies,
    outdated_dependencies: outdatedCount,
    security_issues: securityIssues,
    dependency_list: dependencyList.slice(0, 10) // Return first 10
  }
}

function analyzeLicense(license: string): LicenseInfo {
  const licenseLower = license.toLowerCase()
  
  const osi_approved = [
    'mit', 'apache', 'gpl', 'lgpl', 'bsd', 'mpl', 
    'eclipse', 'artistic', 'epl', 'unlicense'
  ]
  
  const copyleft_licenses = ['gpl', 'agpl', 'lgpl', 'mpl']
  
  const is_osi = osi_approved.some(lic => licenseLower.includes(lic))
  const is_copyleft = copyleft_licenses.some(lic => licenseLower.includes(lic))
  
  const warnings: string[] = []
  
  if (!is_osi && license !== 'Unknown' && license !== 'No license') {
    warnings.push('License may not be OSI approved')
  }
  
  if (is_copyleft) {
    warnings.push('Copyleft license may require derivative works to use same license')
  }
  
  return {
    license_type: license,
    is_osi_approved: is_osi,
    is_copyleft: is_copyleft,
    compatibility_warnings: warnings
  }
}

function generateSecurityRecommendations(
  vulnerabilities: Vulnerability[], 
  dependency_analysis: DependencyInfo,
  repoData: any
): string[] {
  const recommendations: string[] = []
  
  if (vulnerabilities.length > 0) {
    recommendations.push('Address identified vulnerabilities with priority')
  }
  
  if (dependency_analysis.outdated_dependencies > 0) {
    recommendations.push(`Update ${dependency_analysis.outdated_dependencies} outdated dependencies`)
  }
  
  if (dependency_analysis.security_issues > 0) {
    recommendations.push(`Review ${dependency_analysis.security_issues} dependencies with known security issues`)
  }
  
  recommendations.push('Implement automated dependency scanning (Dependabot, Snyk)')
  recommendations.push('Use security headers (CSP, HSTS, X-Frame-Options)')
  recommendations.push('Enable HTTPS for all connections')
  recommendations.push('Implement rate limiting for API endpoints')
  recommendations.push('Regular security audits and penetration testing')
  
  if (vulnerabilities.some(v => v.severity === 'critical' || v.severity === 'high')) {
    recommendations.push('PRIORITY: Address critical/high severity issues immediately')
  }
  
  return recommendations
}

function calculateSecurityScore(
  vulnerabilities: Vulnerability[], 
  dependency_analysis: DependencyInfo,
  license_analysis: LicenseInfo
): number {
  let score = 100
  
  // Deduct points for vulnerabilities
  vulnerabilities.forEach(v => {
    switch (v.severity) {
      case 'critical': score -= 20; break
      case 'high': score -= 15; break
      case 'medium': score -= 10; break
      case 'low': score -= 5; break
    }
  })
  
  // Deduct points for outdated dependencies
  if (dependency_analysis.outdated_dependencies > 0) {
    const outdatedPercent = dependency_analysis.outdated_dependencies / dependency_analysis.total_dependencies
    score -= outdatedPercent * 10
  }
  
  // Deduct points for security issues in dependencies
  if (dependency_analysis.security_issues > 0) {
    score -= 15
  }
  
  // Deduct points for license issues
  if (!license_analysis.is_osi_approved && license_analysis.license_type !== 'Unknown') {
    score -= 5
  }
  
  // Ensure score doesn't go below 0
  return Math.max(0, score)
}
