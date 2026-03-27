#!/usr/bin/env node

// Pinecone Index Setup Script
// Run with: node setup-pinecone.js

import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = 'pcsk_31f3HZ_Kxf9YqfBxkxpw6RRvyNxyRSNNRES3Z3gSM87KxoVdNjXU5UJ7oNsyk9dvmdt3jV';
const INDEX_NAME = 'document-chunks';
const DIMENSION = 1536; // OpenAI text-embedding-3-small dimension

async function setupPinecone() {
  try {
    console.log('🌲 Initializing Pinecone...');
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    
    console.log('📋 Listing existing indexes...');
    const indexes = await pc.listIndexes();
    console.log('Existing indexes:', indexes.indexes?.map(i => i.name) || 'None');
    
    // Check if index already exists
    const existingIndex = indexes.indexes?.find(i => i.name === INDEX_NAME);
    
    if (existingIndex) {
      console.log(`✅ Index '${INDEX_NAME}' already exists!`);
      console.log('Index details:', {
        name: existingIndex.name,
        dimension: existingIndex.dimension,
        metric: existingIndex.metric,
        status: existingIndex.status
      });
    } else {
      console.log(`🚀 Creating new index '${INDEX_NAME}'...`);
      await pc.createIndex({
        name: INDEX_NAME,
        dimension: DIMENSION,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      
      console.log('✅ Index created successfully!');
      console.log('⏳ Waiting for index to be ready...');
      
      // Wait for index to be ready
      let attempts = 0;
      while (attempts < 30) {
        const index = await pc.describeIndex(INDEX_NAME);
        if (index.status?.ready) {
          console.log('🎉 Index is ready!');
          break;
        }
        console.log(`⏳ Index status: ${index.status?.state}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }
    
    console.log('\n📊 Final index details:');
    const index = await pc.describeIndex(INDEX_NAME);
    console.log({
      name: index.name,
      dimension: index.dimension,
      metric: index.metric,
      status: index.status,
      host: index.host
    });
    
    console.log('\n🎯 Next steps:');
    console.log('1. Export chunks from Supabase');
    console.log('2. Import chunks into Pinecone');
    console.log('3. Update rag-query Edge Function');
    
  } catch (error) {
    console.error('❌ Error setting up Pinecone:', error.message);
    process.exit(1);
  }
}

setupPinecone();
