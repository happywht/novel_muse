/**
 * Test script for inkos API integration
 */

const BASE_URL = 'http://localhost:3001/api/inkos';

async function testHealth() {
  console.log('\n=== Testing Health Endpoint ===');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    console.log('Health check result:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Health check failed:', error);
  }
}

async function testGenres() {
  console.log('\n=== Testing Genres Endpoint ===');
  try {
    const response = await fetch(`${BASE_URL}/genres`);
    const data = await response.json() as any;
    console.log('Genres count:', data.count);
    console.log('First 3 genres:', data.genres.slice(0, 3));
  } catch (error) {
    console.error('Genres fetch failed:', error);
  }
}

async function testDimensions() {
  console.log('\n=== Testing Dimensions Endpoint ===');
  try {
    const response = await fetch(`${BASE_URL}/dimensions`);
    const data = await response.json() as any;
    console.log('Dimensions count:', data.count);
    console.log('Categories:', data.categories);
    console.log('First 3 dimensions:', data.dimensions.slice(0, 3));
  } catch (error) {
    console.error('Dimensions fetch failed:', error);
  }
}

async function testImport() {
  console.log('\n=== Testing Import Endpoint ===');
  try {
    const response = await fetch(`${BASE_URL}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-key-123',
      },
      body: JSON.stringify({
        projectId: 'test-project-001',
        project: {
          id: 'test-project-001',
          title: 'Test Novel',
          genre: 'xuanhuan',
          premise: 'A young cultivator discovers ancient secrets',
          theme: 'Growth and redemption',
          synopsis: 'A story about a young man who finds his destiny',
          wordCountGoal: 100000,
          status: 'draft',
        },
        characters: [
          {
            id: 'char-001',
            name: 'Zhang Wei',
            role: 'protagonist',
            description: 'A young cultivator with mysterious origins',
            backstory: 'Found as an orphan in the mountains',
            personality: 'Determined and kind-hearted',
            goals: 'To uncover his true heritage',
            relationships: [],
          },
        ],
        chapters: [
          {
            id: 'chapter-001',
            title: 'The Beginning',
            synopsis: 'Zhang Wei discovers his powers',
            status: 'outline',
            order: 1,
            wordCount: 0,
          },
        ],
        world: {
          setting: 'Ancient cultivation world',
          rules: 'Qi cultivation based on five elements',
          timeline: 'Year 3000 of the Azure Dynasty',
          locations: [
            {
              id: 'loc-001',
              name: 'Azure Mountain Sect',
              description: 'A prestigious cultivation sect',
            },
          ],
        },
      }),
    });

    const data = await response.json();
    console.log('Import result:', JSON.stringify(data, null, 2));

    if ((data as any).taskId) {
      console.log('\nPolling task status...');
      await pollTaskStatus((data as any).taskId);
    }
  } catch (error) {
    console.error('Import test failed:', error);
  }
}

async function pollTaskStatus(taskId: string) {
  const maxAttempts = 10;
  const delay = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/status/${taskId}`, {
        headers: {
          'X-API-Key': 'test-key-123',
        },
      });
      const task = await response.json() as any;
      console.log(`Task status (attempt ${i + 1}):`, task.status, task.progress + '%', task.message);

      if (task.status === 'completed' || task.status === 'failed') {
        console.log('Task finished:', JSON.stringify(task, null, 2));
        break;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      console.error('Status poll failed:', error);
      break;
    }
  }
}

async function testSSEConnection() {
  console.log('\n=== Testing SSE Connection ===');
  try {
    const response = await fetch(`${BASE_URL}/stream?projectId=test-project-001`, {
      headers: {
        'X-API-Key': 'test-key-123',
      },
    });

    console.log('SSE connection established');

    const reader = response.body?.getReader();
    if (!reader) {
      console.log('No reader available');
      return;
    }

    let attempts = 0;
    while (attempts < 5) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('SSE stream ended');
        break;
      }

      const text = new TextDecoder().decode(value);
      console.log('SSE data received:', text.substring(0, 100));

      attempts++;
    }

    reader.releaseLock();
  } catch (error) {
    console.error('SSE test failed:', error);
  }
}

async function main() {
  console.log('Starting inkos API Integration Tests');
  console.log('====================================');

  await testHealth();
  await testGenres();
  await testDimensions();
  await testImport();
  await testSSEConnection();

  console.log('\n=== All Tests Completed ===');
}

main().catch(console.error);
