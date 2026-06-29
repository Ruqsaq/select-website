/* HubSpot form bridge.
   Intercepts our HTML forms and POSTs the field values to the
   HubSpot Forms v3 endpoint. Each form type has its own config
   (selector, HubSpot form GUID, field name map, success handler).
   Honeypot field is checked first; bot-filled submissions are
   silently confirmed without ever hitting HubSpot. */
(function () {
  const PORTAL_ID = '46846982';

  const FORMS = [
    {
      // "How can we help?" contact form on every page (in the CTA band)
      selector: 'form.contact-form',
      formGuid: '05c49ac9-fe54-4c68-9740-651a57d0bb86',
      fieldMap: {
        name: 'firstname',
        phone: 'phone',
        email: 'email',
        message: 'message'
      },
      onSuccess: (form) => {
        form.innerHTML =
          '<div class="contact-form-success">' +
          '<h3>Thank you!</h3>' +
          '<p>We have received your message and will be in touch shortly.</p>' +
          '</div>';
      }
    },
    {
      // "Get a Quote" modal form
      selector: 'form.quote-form[data-quote-form]',
      formGuid: 'ce9e9c8d-c9d0-4d0f-8e06-5e529feef3c9',
      fieldMap: {
        name: 'firstname',
        company: 'company',
        email: 'email',
        phone: 'phone',
        origin: 'origin',
        destination: 'destination',
        equipment: 'equipment',
        pickup_date: 'pickup_date',
        commodity: 'commodity',
        weight: 'weight_lbs',
        message: 'message'
      },
      onSuccess: (form) => {
        const success =
          (form.parentElement && form.parentElement.querySelector('[data-quote-success]')) ||
          document.querySelector('[data-quote-success]');
        form.style.display = 'none';
        if (success) success.style.display = 'block';
      }
    },
    {
      // "Interested in Learning More?" timed popup on agents.html and tech.html
      // Uses the same HubSpot form as the main Contact Us form so leads land
      // in the same place.
      selector: 'form.quote-form[data-learn-form]',
      formGuid: '05c49ac9-fe54-4c68-9740-651a57d0bb86',
      fieldMap: {
        name: 'firstname',
        phone: 'phone',
        email: 'email',
        message: 'message'
      },
      onSuccess: (form) => {
        const success =
          (form.parentElement && form.parentElement.querySelector('[data-learn-success]')) ||
          document.querySelector('[data-learn-success]');
        form.style.display = 'none';
        if (success) success.style.display = 'block';
      }
    },
    {
      // "Become an Agent" modal form
      selector: 'form.quote-form[data-agent-form]',
      formGuid: 'ee30ca01-7b6c-4b91-a72f-f2f277dbd643',
      fieldMap: {
        name: 'firstname',
        email: 'email',
        phone: 'mobilephone',
        current_role: 'role',
        avg_monthly_margin: 'margin',
        message: 'message'
      },
      onSuccess: (form) => {
        const success =
          (form.parentElement && form.parentElement.querySelector('[data-agent-success]')) ||
          document.querySelector('[data-agent-success]');
        form.style.display = 'none';
        if (success) success.style.display = 'block';
      }
    }
  ];

  FORMS.forEach(wire);

  function wire(config) {
    const endpoint = 'https://api.hsforms.com/submissions/v3/integration/submit/' + PORTAL_ID + '/' + config.formGuid;

    document.querySelectorAll(config.selector).forEach(form => {
      const submitBtn = form.querySelector('[type="submit"]');
      const originalLabel = submitBtn ? submitBtn.textContent : 'Submit';

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Honeypot: real users never fill this hidden field; bots usually do.
        // Silently show success so the bot does not learn the form is protected.
        const honeypot = form.querySelector('.honeypot');
        if (honeypot && honeypot.value) {
          config.onSuccess(form);
          return;
        }

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
        Object.entries(config.fieldMap).forEach(([htmlName, hsName]) => {
          const input = form.querySelector('[name="' + htmlName + '"]');
          if (!input || !input.value || !String(input.value).trim()) return;
          let value = String(input.value).trim();
          // HubSpot date fields expect midnight UTC milliseconds
          if (input.type === 'date') {
            const parsed = new Date(value + 'T00:00:00Z').getTime();
            if (!isNaN(parsed)) value = parsed;
          }
          fields.push({ name: hsName, value: value });
        });

        const payload = {
          fields: fields,
          context: {
            pageUri: window.location.href,
            pageName: document.title
          }
        };

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            config.onSuccess(form);
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
