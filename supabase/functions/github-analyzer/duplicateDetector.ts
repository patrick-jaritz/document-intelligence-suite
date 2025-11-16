/**
 * Duplicate Detection for GitHub Repository Files
 * Detects duplicate files based on content similarity
 */

interface FileInfo {
  name: string;
  path: string;
  type: string;
  size?: number;
  content?: string;
  sha?: string;
}

interface DuplicateGroup {
  files: FileInfo[];
  similarity: number;
  reason: 'exact' | 'similar' | 'renamed';
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Extract file name without extension for comparison
 */
function getBaseName(path: string): string {
  const parts = path.split('/');
  const fileName = parts[parts.length - 1];
  return fileName.split('.')[0].toLowerCase();
}

/**
 * Detect duplicate files in repository
 */
export function detectDuplicates(files: FileInfo[]): Map<string, DuplicateGroup> {
  const duplicates = new Map<string, DuplicateGroup>();
  const processed = new Set<string>();
  
  // Group by exact SHA (same content)
  const shaGroups = new Map<string, FileInfo[]>();
  files.forEach(file => {
    if (file.sha) {
      if (!shaGroups.has(file.sha)) {
        shaGroups.set(file.sha, []);
      }
      shaGroups.get(file.sha)!.push(file);
    }
  });
  
  // Mark exact duplicates
  shaGroups.forEach((group, sha) => {
    if (group.length > 1) {
      const key = `exact-${sha}`;
      duplicates.set(key, {
        files: group,
        similarity: 1.0,
        reason: 'exact'
      });
      group.forEach(f => processed.add(f.path));
    }
  });
  
  // Check for similar files (same base name, different locations)
  const baseNameGroups = new Map<string, FileInfo[]>();
  files.forEach(file => {
    if (!processed.has(file.path) && file.type === 'file') {
      const baseName = getBaseName(file.name);
      if (!baseNameGroups.has(baseName)) {
        baseNameGroups.set(baseName, []);
      }
      baseNameGroups.get(baseName)!.push(file);
    }
  });
  
  baseNameGroups.forEach((group, baseName) => {
    if (group.length > 1) {
      const key = `renamed-${baseName}`;
      duplicates.set(key, {
        files: group,
        similarity: 0.9, // Assume high similarity for same base name
        reason: 'renamed'
      });
    }
  });
  
  // Check for similar content (for files we have content for)
  const filesWithContent = files.filter(f => f.content && f.content.length > 0);
  for (let i = 0; i < filesWithContent.length; i++) {
    if (processed.has(filesWithContent[i].path)) continue;
    
    for (let j = i + 1; j < filesWithContent.length; j++) {
      if (processed.has(filesWithContent[j].path)) continue;
      
      const file1 = filesWithContent[i];
      const file2 = filesWithContent[j];
      
      // Skip if already in same duplicate group
      let alreadyGrouped = false;
      duplicates.forEach(group => {
        if (group.files.includes(file1) && group.files.includes(file2)) {
          alreadyGrouped = true;
        }
      });
      if (alreadyGrouped) continue;
      
      // Calculate similarity
      const similarity = calculateSimilarity(file1.content!, file2.content!);
      
      // If similarity > 80%, consider them duplicates
      if (similarity > 0.8) {
        const key = `similar-${file1.path}-${file2.path}`;
        duplicates.set(key, {
          files: [file1, file2],
          similarity,
          reason: 'similar'
        });
        processed.add(file1.path);
        processed.add(file2.path);
      }
    }
  }
  
  return duplicates;
}

/**
 * Mark files with duplicate information
 */
export function markDuplicates(
  files: FileInfo[],
  duplicateGroups: Map<string, DuplicateGroup>
): Array<FileInfo & { isDuplicate?: boolean; duplicateGroup?: string; duplicateReason?: string }> {
  const duplicatePaths = new Set<string>();
  const fileToGroup = new Map<string, string>();
  
  duplicateGroups.forEach((group, key) => {
    group.files.forEach(file => {
      duplicatePaths.add(file.path);
      fileToGroup.set(file.path, key);
    });
  });
  
  return files.map(file => ({
    ...file,
    isDuplicate: duplicatePaths.has(file.path),
    duplicateGroup: fileToGroup.get(file.path),
    duplicateReason: fileToGroup.has(file.path) 
      ? duplicateGroups.get(fileToGroup.get(file.path)!)!.reason
      : undefined
  }));
}
