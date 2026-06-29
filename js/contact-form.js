/* Contact form -> HubSpot Forms API.
   Intercepts the "How can we help?" form submission on every page,
   POSTs the field values to the HubSpot Forms v3 endpoint, and shows
   a thank-you message in place of the form on success. */
(function () {
  const PORTAL_ID = '46846982';
  const FORM_GUID = '05c49ac9-fe54-4c68-9740-651a57d0bb86';

  // Map our HTML input "name" attribute -> HubSpot field internal name.
  // If a submission fails because HubSpot can't find a field, this is
  // the place to adjust the mapping.
  const FIELD_MAP = {
    name: 'firstname',
    phone: 'phone',
    email: 'email',
    message: 'message'
  };

  const ENDPOINT = 'https://api.hsforms.com/submissions/v3/integration/submit/' + PORTAL_ID + '/' + FORM_GUID;

  document.querySelectorAll('form.contact-form').forEach(form => {
    const submitBtn = form.querySelector('[type="submit"]');
    const originalLabel = submitBtn ? submitBtn.textContent : 'Submit';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Honeypot: real users never fill this hidden field; bots usually do.
      // If it's populated, silently pretend everything succeeded so the bot
      // does not learn the form is protected.
      const honeypot = form.querySelector('.honeypot');
      if (honeypot && honeypot.value) {
        showSuccess(form);
        return;
      }

      // Native required-field validation
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
      }
      clearError(form);

      const fields = [];
      Object.entries(FIELD_MAP).forEach(([htmlName, hsName]) => {
        const input = form.querySelector('[name="' + htmlName + '"]');
        if (input && input.value.trim()) {
          fields.push({ name: hsName, value: input.value.trim() });
        }
      });

      const payload = {
        fields: fields,
        context: {
          pageUri: window.location.href,
          pageName: document.title
        }
      };

      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          showSuccess(form);
        } else {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
          }
          const detail = await response.text().catch(() => '');
          console.error('HubSpot submission failed:', response.status, detail);
          showError(form, 'Something went wrong sending your message. Please try again, or email us at HQ@goselect.com.');
        }
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
        console.error('HubSpot submission error:', err);
        showError(form, 'Could not reach our server. Please try again, or email us at HQ@goselect.com.');
      }
    });
  });

  function showSuccess(form) {
    form.innerHTML =
      '<div class="contact-form-success">' +
      '<h3>Thank you!</h3>' +
      '<p>We have received your message and will be in touch shortly.</p>' +
      '</div>';
  }

  function showError(form, message) {
    let errEl = form.querySelector('.contact-form-error');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'contact-form-error';
      form.appendChild(errEl);
    }
    errEl.textContent = message;
  }

  function clearError(form) {
    const errEl = form.querySelector('.contact-form-error');
    if (errEl) errEl.remove();
  }
})();
