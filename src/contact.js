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

  function moveTo(element) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  [nameInput, briefInput].forEach((input) => {
    input.addEventListener('input', () => input.setCustomValidity(''));
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    nameInput.setCustomValidity(nameInput.value.trim() ? '' : 'Please enter your name.');
    briefInput.setCustomValidity(briefInput.value.trim().length >= 10 ? '' : 'Please add a little more detail (at least 10 characters).');
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const value = (key) => String(data.get(key) || '').trim();
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
      'Prepared on the All That Jazz website. Not submitted automatically.',
      'Share with the team: https://www.instagram.com/allthatjazz_atj/'
    ].join('\n');

    output.value = preparedBrief;
    status.textContent = '';
    form.hidden = true;
    result.hidden = false;
    resultHeading.focus({ preventScroll: true });
    moveTo(result);
  });

  document.getElementById('edit-brief').addEventListener('click', () => {
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
    status.textContent = 'Your brief is ready to download. Share it with our team when you are ready.';
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
      status.textContent = 'Brief copied. You can paste it into your message to the team.';
      copyButton.focus({ preventScroll: true });
    } else {
      status.textContent = 'Your brief is selected. Press Ctrl+C (or Command+C) to copy it, or use Download brief.';
    }
  });
})();
