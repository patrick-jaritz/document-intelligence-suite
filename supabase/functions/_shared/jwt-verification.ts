/**
 * JWT verification utilities for Edge Functions
 * Provides optional JWT verification for user-specific operations
 */

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

/**
 * Verify JWT token and extract user information
 * @param req - Request object
 * @returns User information if token is valid, null otherwise
 */
export async function verifyJWT(req: Request): Promise<{
  userId: string;
  email?: string;
  user: any;
} | null> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  
  // Skip if it's the anon key (not a JWT)
  if (token.length > 200) {
    // JWT tokens are typically longer, but anon keys are also long
    // We'll check if it's a valid JWT by trying to parse it
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      if (!supabaseUrl) {
        return null;
      }

      // Create a Supabase client to verify the JWT
      const supabase = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY') || '',
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      // Verify the token by getting the user
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return null;
      }

      return {
        userId: user.id,
        email: user.email,
        user,
      };
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  return null;
}

/**
 * Require JWT authentication for the request
 * Returns user info if authenticated, throws error otherwise
 * @param req - Request object
 * @returns User information
 * @throws Error if authentication fails
 */
export async function requireAuth(req: Request): Promise<{
  userId: string;
  email?: string;
  user: any;
}> {
  const userInfo = await verifyJWT(req);
  
  if (!userInfo) {
    throw new Error('Authentication required');
  }

  return userInfo;
}

/**
 * Optional authentication - returns user info if available, null otherwise
 * Does not throw errors
 * @param req - Request object
 * @returns User information or null
 */
export async function getOptionalAuth(req: Request): Promise<{
  userId: string;
  email?: string;
  user: any;
} | null> {
  return await verifyJWT(req);
}

