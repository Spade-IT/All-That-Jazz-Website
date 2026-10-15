(() => {
  'use strict';
  const form = document.getElementById('brief-form');
  const result = document.getElementById('brief-result');
  const output = document.getElementById('brief-output');
  const status = document.getElementById('brief-status');
  const resultHeading = document.getElementById('result-heading');
  const nameInput = document.getElementById('full-name');
  const briefInput = document.getElementById('event-brief');
  const copyButton = document.getElementById('copy-brief');
  let preparedBrief = '';
  let idempotencyKey=crypto.randomUUID();
  const submit=document.getElementById('submit-enquiry'),error=document.getElementById('form-error');submit.disabled=false;

  function moveTo(element) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  [nameInput, briefInput].forEach((input) => {
    input.addEventListener('input', () => input.setCustomValidity(''));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    nameInput.setCustomValidity(nameInput.value.trim() ? '' : 'Please enter your name.');
    briefInput.setCustomValidity(briefInput.value.trim().length >= 10 ? '' : 'Please add a little more detail (at least 10 characters).');
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const value = (key) => String(data.get(key) || '').trim();
    error.textContent='';submit.disabled=true;submit.textContent='Sending…';
    let receipt;
    try {
      const response=await fetch('/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:value('name'),company:value('company'),email:value('email'),eventType:value('eventType'),timeframe:value('timeframe'),brief:value('brief'),website:value('website'),consent:data.get('consent')==='on',idempotencyKey}),signal:AbortSignal.timeout(15000)});
      receipt=await response.json();if(!response.ok)throw new Error(receipt.fields?.map(f=>f.message).join(' ')||receipt.error||'Please try again.');
    } catch(e) {error.textContent=e.name==='TimeoutError'?'The connection timed out. Your details are preserved; retrying will not create a duplicate.':e.message||'Unable to send. Please try again.';return;}
    finally {submit.disabled=false;submit.textContent='Send enquiry ↗';}
    preparedBrief = [
      'ALL THAT JAZZ — EVENT BRIEF',
      'A new experience starts here.',
      '',
      'YOUR DETAILS',
      `Name: ${value('name')}`,
      `Company: ${value('company') || 'Not specified'}`,
      `Email: ${value('email')}`,
      '',
      'THE EXPERIENCE',
      `Event type: ${value('eventType')}`,
      `Timeframe: ${value('timeframe') || 'To be discussed'}`,
      '',
      'THE IDEA',
      value('brief'),
      '',
      `Received by All That Jazz. Reference: ${receipt.reference}`, 
      'Keep this copy for your records.'
    ].join('\n');

    output.value = preparedBrief;
    status.textContent = '';
    form.hidden = true;
    result.hidden = false;
    resultHeading.focus({ preventScroll: true });
    moveTo(result);
  });

  document.getElementById('edit-brief').addEventListener('click', () => {
    idempotencyKey=crypto.randomUUID();
    result.hidden = true;
    form.hidden = false;
    nameInput.focus({ preventScroll: true });
    moveTo(form);
  });

  document.getElementById('download-brief').addEventListener('click', () => {
    if (!preparedBrief) return;
    const blob = new Blob([preparedBrief], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'All_That_Jazz_Event_Brief.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Your brief is ready to download. Keep this copy for your records.';
  });

  copyButton.addEventListener('click', async () => {
    if (!preparedBrief) return;
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(preparedBrief);
        copied = true;
      }
    } catch (_) {
      // Local-file and embedded previews may not grant clipboard access.
    }
    if (!copied) {
      output.focus({ preventScroll: true });
      output.select();
      output.setSelectionRange(0, output.value.length);
      try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
    }
    if (copied) {
      status.textContent = 'Brief copied. Your enquiry has already been received.';
      copyButton.focus({ preventScroll: true });
    } else {
      status.textContent = 'Your brief is selected. Press Ctrl+C (or Command+C) to copy it, or use Download brief.';
    }
  });
})();
