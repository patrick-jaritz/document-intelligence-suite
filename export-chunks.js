#!/usr/bin/env node

// Export chunks from Supabase and import to Pinecone
// Run with: node export-chunks.js

import { createClient } from '@supabase/supabase-js';
import { Pinecone } from '@pinecone-database/pinecone';

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';
const PINECONE_API_KEY = 'pcsk_31f3HZ_Kxf9YqfBxkxpw6RRvyNxyRSNNRES3Z3gSM87KxoVdNjXU5UJ7oNsyk9dvmdt3jV';
const INDEX_NAME = 'document-chunks';

async function exportAndImportChunks() {
  try {
    console.log('🔗 Connecting to Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('🌲 Connecting to Pinecone...');
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pc.index(INDEX_NAME);
    
    console.log('📥 Fetching chunks from Supabase...');
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('*')
      .order('chunk_index');
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    console.log(`📊 Found ${chunks.length} chunks in Supabase`);
    
    if (chunks.length === 0) {
      console.log('⚠️  No chunks found. Make sure you have processed documents first.');
      return;
    }
    
    // Prepare chunks for Pinecone
    const vectors = chunks.map((chunk, i) => {
      // Parse embedding if it's a string
      let embedding;
      if (typeof chunk.embedding === 'string') {
        try {
          embedding = JSON.parse(chunk.embedding);
        } catch (e) {
          console.warn(`⚠️  Failed to parse embedding for chunk ${i}:`, e.message);
          return null;
        }
      } else {
        embedding = chunk.embedding;
      }
      
      return {
        id: `${chunk.document_id}-${chunk.chunk_index}`,
        values: embedding,
        metadata: {
          chunk_text: chunk.chunk_text || '',
          chunk_index: chunk.chunk_index || 0,
          document_id: chunk.document_id || 'unknown',
          filename: chunk.filename || 'unknown',
          chunk_offset: chunk.chunk_offset || 0,
          provider: chunk.provider || 'unknown'
        }
      };
    }).filter(Boolean);
    
    console.log(`✅ Prepared ${vectors.length} vectors for Pinecone`);
    
    // Check if index is empty
    const stats = await index.describeIndexStats();
    console.log(`📊 Current index stats: ${stats.totalVectorCount} vectors`);
    
    if (stats.totalVectorCount > 0) {
      console.log('⚠️  Index already has vectors. Skipping import to avoid duplicates.');
      console.log('💡 To re-import, delete the index and recreate it.');
      return;
    }
    
    console.log('🚀 Uploading vectors to Pinecone...');
    
    // Upload in batches of 100 (Pinecone limit)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      console.log(`📤 Uploading batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectors.length/batchSize)} (${batch.length} vectors)...`);
      
      await index.upsert(batch);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ All vectors uploaded successfully!');
    
    // Verify upload
    const finalStats = await index.describeIndexStats();
    console.log(`📊 Final index stats: ${finalStats.totalVectorCount} vectors`);
    
    // Test a query
    console.log('🧪 Testing vector search...');
    const testQuery = await index.query({
      vector: vectors[0].values, // Use first vector as test
      topK: 3,
      includeMetadata: true
    });
    
    console.log('✅ Test query successful!');
    console.log(`Found ${testQuery.matches.length} similar vectors`);
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('🎯 Next step: Update rag-query Edge Function to use Pinecone');
    
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    console.error(error);
    process.exit(1);
  }
}

exportAndImportChunks();
