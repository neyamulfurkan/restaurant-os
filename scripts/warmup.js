// scripts/warmup.js
const routes = [
  '/',
  '/menu',
  '/booking',
  '/contact',
  '/login',
  '/signup',
  '/admin/login',
  '/admin/dashboard',
  '/admin/orders',
  '/admin/bookings',
  '/admin/menu',
  '/admin/inventory',
  '/admin/customers',
  '/admin/staff',
  '/admin/reports',
  '/admin/settings',
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function warmup() {
  console.log('\n🔥 Waiting for Next.js server to start...\n');
  
  // Wait for server to be ready
  await sleep(8000);
  
  console.log('🚀 Warming up routes...\n');
  
  let completed = 0;
  const total = routes.length;
  
  for (const route of routes) {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`http://localhost:3000${route}`, {
        headers: { 'User-Agent': 'warmup-script' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      completed++;
      const percentage = Math.round((completed / total) * 100);
      
      if (response.status === 200) {
        console.log(`✓ [${percentage}%] ${route.padEnd(30)} - ${duration}ms`);
      } else {
        console.log(`⚠ [${percentage}%] ${route.padEnd(30)} - ${response.status}`);
      }
    } catch (error) {
      completed++;
      const percentage = Math.round((completed / total) * 100);
      
      if (error.name === 'AbortError') {
        console.log(`⏱ [${percentage}%] ${route.padEnd(30)} - Timeout`);
      } else {
        console.log(`✗ [${percentage}%] ${route.padEnd(30)} - ${error.message}`);
      }
    }
    
    // Small delay between requests to avoid overwhelming server
    await sleep(100);
  }
  
  console.log('\n🎉 Warmup complete! Navigation should now be instant.\n');
  console.log('Press Ctrl+C to stop if needed.\n');
}

warmup().catch(console.error);