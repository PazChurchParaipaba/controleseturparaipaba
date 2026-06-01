import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://groezaseypdbpgymgpvo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb2V6YXNleXBkYnBneW1ncHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjkxNjYsImV4cCI6MjA4MTY0NTE2Nn0.5U5QeoGmZn_i9Y8POoUCkatBUAdSW-cjHRyfxpm_pyM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const fileContent = new Blob(['Hello World!'], { type: 'text/plain' });
  const filePath = `2026/maio/test_${Date.now()}.txt`;
  
  console.log('Uploading to:', filePath);
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documentos_setur')
    .upload(filePath, fileContent);
    
  console.log('Upload result:', uploadData, uploadError);
  
  const { data, error } = await supabase.storage.from('documentos_setur').list('2026/maio', {
    limit: 100,
    offset: 0,
  });
  console.log('List 2026/maio:', JSON.stringify(data, null, 2), error);
}

test();
