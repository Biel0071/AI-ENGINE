(async () => {
  try {
    const res1 = await fetch('http://127.0.0.1:3000/api/v2/projects/fenix-os/file?path=' + encodeURIComponent('/opt/fenix-os/grg/src/server.js'));
    console.log('Encoded Res Status:', res1.status);
    const d1 = await res1.json();
    console.log('Encoded Res Data:', d1);

    const res2 = await fetch('http://127.0.0.1:3000/api/v2/projects/fenix-os/file?path=/opt/fenix-os/grg/src/server.js');
    console.log('Unencoded Res Status:', res2.status);
    const d2 = await res2.json();
    console.log('Unencoded Res Data ok:', d2.ok, 'size:', d2.size);
  } catch (err) {
    console.error('Fetch error:', err);
  }
})();

