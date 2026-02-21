/**
 * Quick Test Script for FinMate RAG Chatbot
 * 
 * This script tests the RAG services without needing the full server running.
 * Useful for debugging and verifying the OpenAI integration.
 */

import { config } from 'dotenv';
import { generateEmbedding, createFinancialDataChunks, findRelevantChunks, embedFinancialData } from '../services/embeddingService';
import { generateRAGResponse, validateOpenAIConfig } from '../services/ragService';

// Load environment variables
config();

// Sample user data for testing
const mockUserData = {
    month: 2,
    year: 2026,
    daysLeft: 8,
    isEndOfMonth: false,
    transactions: {
        total: 45,
        expenses: 38,
        incomes: 7,
    },
    totalExpenses: 45000,
    totalIncome: 80000,
    savings: 35000,
    categoryBreakdown: {
        'Food & Dining': 15000,
        'Transportation': 8000,
        'Entertainment': 5000,
        'Shopping': 10000,
        'Bills & Utilities': 7000,
    },
    budget: {
        total: 50000,
        spent: 45000,
        remaining: 5000,
        percentage: 90,
        isOverBudget: false,
        categoryBudgets: {
            'Food & Dining': { budgeted: 15000, spent: 15000, remaining: 0 },
            'Transportation': { budgeted: 10000, spent: 8000, remaining: 2000 },
            'Entertainment': { budgeted: 5000, spent: 5000, remaining: 0 },
        },
    },
    reminders: [
        { title: 'Electricity Bill', amount: 3000, dueDate: new Date('2026-02-25'), type: 'utility' },
        { title: 'Internet Bill', amount: 1500, dueDate: new Date('2026-02-28'), type: 'utility' },
    ],
    achievements: {
        totalStars: 8,
        history: [
            { month: 1, year: 2026, status: 'awarded' },
            { month: 12, year: 2025, status: 'awarded' },
        ],
    },
    family: null,
};

async function testRAGChatbot() {
    console.log('🧪 Testing FinMate RAG Chatbot\n');

    // Test 1: Validate OpenAI configuration
    console.log('1️⃣ Checking OpenAI configuration...');
    if (!validateOpenAIConfig()) {
        console.error('❌ OpenAI API key is not configured!');
        console.log('\n💡 Please set OPENAI_API_KEY in your .env file');
        console.log('   Get your key from: https://platform.openai.com/api-keys\n');
        return;
    }
    console.log('✅ OpenAI is configured\n');

    try {
        // Test 2: Generate embeddings
        console.log('2️⃣ Testing embedding generation...');
        const testText = 'Budget status and spending analysis';
        const embedding = await generateEmbedding(testText);
        console.log(`✅ Generated embedding with ${embedding.length} dimensions\n`);

        // Test 3: Create financial data chunks
        console.log('3️⃣ Creating financial data chunks...');
        const chunks = createFinancialDataChunks(mockUserData);
        console.log(`✅ Created ${chunks.length} data chunks:`);
        chunks.forEach((chunk, idx) => {
            console.log(`   ${idx + 1}. ${chunk.metadata.type} - ${chunk.content.substring(0, 50)}...`);
        });
        console.log('');

        // Test 4: Embed all chunks
        console.log('4️⃣ Embedding financial data...');
        const embeddedChunks = await embedFinancialData(chunks);
        console.log(`✅ Embedded ${embeddedChunks.filter(c => c.embedding).length} chunks\n`);

        // Test 5: Test similarity search
        console.log('5️⃣ Testing semantic search...');
        const query = 'How much did I spend on food?';
        const relevantChunks = await findRelevantChunks(query, embeddedChunks, 3);
        console.log(`✅ Found ${relevantChunks.length} relevant chunks for: "${query}"`);
        relevantChunks.forEach((chunk, idx) => {
            console.log(`   ${idx + 1}. ${chunk.metadata.type}: ${chunk.content.substring(0, 60)}...`);
        });
        console.log('');

        // Test 6: Generate RAG response
        console.log('6️⃣ Testing RAG response generation...');
        const testQueries = [
            'How is my budget looking?',
            'Where did I spend the most money?',
            'Can I afford to spend ₹3000 today?',
        ];

        for (const query of testQueries) {
            console.log(`\n📝 Query: "${query}"`);
            const response = await generateRAGResponse(query, mockUserData, 'TestUser');
            console.log(`💬 Response: ${response.reply}`);
            console.log(`📊 Tokens used: ${response.tokensUsed}`);
        }

        console.log('\n\n✅ All tests passed! FinMate RAG is working correctly! 🎉\n');
        console.log('Next steps:');
        console.log('1. Start your server: npm run dev:server');
        console.log('2. Open FinMate in the app');
        console.log('3. Start chatting!\n');

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error('\nError details:', error);
        
        if (error.message?.includes('API key')) {
            console.log('\n💡 Make sure your OpenAI API key is valid and has credits');
            console.log('   Check your usage at: https://platform.openai.com/usage\n');
        }
    }
}

// Run tests
testRAGChatbot().catch(console.error);
