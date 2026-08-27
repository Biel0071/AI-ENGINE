const { FenixHttpClient } = require('./src/clients/fenix-http-client.js');

async function main() {
    const client = new FenixHttpClient({ baseUrl: 'http://127.0.0.1:4400' });
    
    // Auth bypassed in server.js for testing
    client.token = 'dummy-token';
    
    console.log('\nSubmitting job...');
    const jobRes = await client.submit({
        source: 'mcp',
        prompt: 'Escreva um pequeno poema sobre uma fenix renascendo das cinzas.',
        tools: ['m1_architect_analyze']
    });
    
    console.log('Job response:', jobRes);
    if (!jobRes.jobId) return;
    
    const jobId = jobRes.jobId;
    console.log('\nPolling events for job:', jobId);
    
    let lastLength = 0;
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const events = await client.events(jobId);
        
        if (events.length > lastLength) {
            for (let j = lastLength; j < events.length; j++) {
                console.log(`[EVENT] ${events[j].type}:`, events[j].payload);
            }
            lastLength = events.length;
        }
        
        const last = events[events.length - 1];
        if (last && (last.type === 'job_completed' || last.type === 'job_failed')) {
            console.log('\nJob finished!');
            break;
        }
    }
}
main().catch(console.error);
