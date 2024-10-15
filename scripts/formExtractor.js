const fs = require('fs');
const { chromium } = require('playwright');
const path = require('path');

const fieldStore = {};  // Global store for fields per domain

// Load credentials from JSON file
const credentials = JSON.parse(fs.readFileSync('./scripts/credentials.json', 'utf-8'));



// Store the field under the specific domain in the fieldStore
function storeField(domain, field) {
  if (!fieldStore[domain]) fieldStore[domain] = {};
  const fieldID = generateFieldID(field);

  // If the field doesn't already exist, store it with options
  if (!fieldStore[domain][fieldID]) {
    // console.log(field)
    // console.log(field.options)
    fieldStore[domain][fieldID] = { ...field };
  }

  return fieldID;
}

// Helper function to generate all combinations of checkbox states
function generateCombinations(options) {
  const result = [];
  const totalCombinations = 1 << options.length; // 2^number_of_checkboxes

  for (let i = 0; i < totalCombinations; i++) {
    const combination = [];
    for (let j = 0; j < options.length; j++) {
      if (i & (1 << j)) {
        combination.push(options[j].value);
      }
    }
    result.push(combination);
  }

  return result;
}


async function exploreForks(initialForm, currentFormData) {
  let formState = initialForm;

  for (let field of formState) {
    if (['select', 'radio', 'checkbox'].includes(field.type)) {
      const fieldID = storeField(domain, { ...field, options: field.options });
      let forks = [];

      const options = field.type === 'select'
        ? field.options
        : await page.$$eval(`input[name="${field.name}"]`, inputs =>
          inputs.map(input => ({
            value: input.value,
            text: input.nextSibling?.textContent.trim(),
            checked: input.checked
          }))
        );

      if (field.type === 'checkbox') {
        // Generate all possible combinations of checkbox states
        const combinations = generateCombinations(options);

        for (let combination of combinations) {
          // Set each checkbox to the corresponding checked/unchecked state in the combination
          for (let option of options) {
            if (combination.includes(option.value)) {
              await page.check(`input[name="${field.name}"][value="${option.value}"]`);
            } else {
              await page.uncheck(`input[name="${field.name}"][value="${option.value}"]`);
            }
          }

          await page.waitForTimeout(100); // Adjust wait time based on site speed
          const updatedForm = await mapForm(page);

          const remainingForm = updatedForm.filter(
            updatedField => !formState.some(f => f.id === updatedField.id)
          );

          if (remainingForm.length > 0) {
            let nestedFork = [];
            await exploreForks(remainingForm, nestedFork);

            const existingFork = forks.find(fork =>
              JSON.stringify(fork.fork) === JSON.stringify(nestedFork) ||
              JSON.stringify(fork.fork) === JSON.stringify(remainingForm.map(f => ({ field: storeField(domain, f) })))
            );

            if (existingFork) {
              existingFork['option-values'].push(combination);
            } else {
              forks.push({
                'option-values': [combination],
                'fork': nestedFork.length > 0 ? nestedFork : remainingForm.map(f => ({ field: storeField(domain, f) }))
              });
            }
          }

          formState = updatedForm; // Update the current state of the form
        }
      } else {
        // Same logic as before for `select` and `radio` fields
        for (let option of options) {
          if (field.type !== 'select' && !option.checked) {
            await page.check(`input[name="${field.name}"][value="${option.value}"]`);
          } else if (field.type === 'select') {
            await page.selectOption(`select[name="${field.name}"]`, option.value);
          }

          await page.waitForTimeout(100); // Adjust wait time based on site speed
          const updatedForm = await mapForm(page);

          const remainingForm = updatedForm.filter(
            updatedField => !formState.some(f => f.id === updatedField.id)
          );

          if (remainingForm.length > 0) {
            let nestedFork = [];
            await exploreForks(remainingForm, nestedFork);

            const existingFork = forks.find(fork =>
              JSON.stringify(fork.fork) === JSON.stringify(nestedFork) ||
              JSON.stringify(fork.fork) === JSON.stringify(remainingForm.map(f => ({ field: storeField(domain, f) })))
            );

            if (existingFork) {
              existingFork['option-values'].push([option.value]);
            } else {
              forks.push({
                'option-values': [[option.value]],
                'fork': nestedFork.length > 0 ? nestedFork : remainingForm.map(f => ({ field: storeField(domain, f) }))
              });
            }
          }

          formState = updatedForm; // Update the current state of the form
        }
      }

      currentFormData.push({
        field: fieldID,
        forks: forks.length > 0 ? forks : undefined
      });
    } else if (['input', 'textarea'].includes(field.type)) {
      const fieldID = storeField(domain, { ...field, options: [] });
      currentFormData.push({
        field: fieldID
      });
    }
  }
}

async function mapDynamicForm(page, domain) {
  const formData = [];



  let initialForm = await mapForm(page);
  await exploreForks(initialForm, formData);

  return formData;
}


// async function mapDynamicForm(page, domain) {
//   const formData = [];
//   let initialForm = await mapForm(page);
//   console.log("initialForm",initialForm)
//   // Iterate through each form field
//   for (let field of initialForm) {
//     // Handle select field changes
//     if (field.type === 'select') {
//       // Store the select field initially
//       const fieldID = storeField(domain, { ...field, options: field.options });

//       for (let option of field.options) {
//         await page.selectOption(`select[name="${field.name}"]`, option.value);
//         await page.waitForTimeout(100); // Adjust wait time based on site speed

//         const updatedForm = await mapForm(page);
//         if (!isFormEqual(initialForm, updatedForm)) { // This only happens if the form is dynamic
//           formData.push({ 
//             field: fieldID, 
//             option, 
//             changes: updatedForm 
//           });
//         }
//         initialForm = updatedForm;
//       }
//     } else if (field.inputType === 'radio' || field.inputType === 'checkbox') {
//       // console.log("radio");
//       const options = await page.$$eval(`input[name="${field.name}"]`, inputs =>
//         inputs.map(input => ({
//           value: input.value,
//           text: input.nextSibling.textContent.trim(), // Assuming the label is next to the input
//           checked: input.checked
//         }))
//       );

//       // Store the radio/checkbox field along with its options
//       const fieldID = storeField(domain, { ...field, options });

//       // For each option, check if it is not checked, check it, and map the form
//       for (let option of options) {
//         if (!option.checked) {
//           await page.check(`input[name="${field.name}"][value="${option.value}"]`);
//           await page.waitForTimeout(10);
//         }

//         const updatedForm = await mapForm(page);
//         if (!isFormEqual(initialForm, updatedForm)) {
//           formData.push({ 
//             field: fieldID, 
//             option, 
//             changes: updatedForm 
//           });
//         }
//         initialForm = updatedForm;
//       }
//     } else if(field.type === 'input' || field.type === 'textarea') {
//       // console.log("else");
//       // Directly store non-select, non-radio/checkbox fields
//       const fieldID = storeField(domain, { ...field, options : []}); // Store once, no options
//       formData.push({
//         field: fieldID,
//       });
//     }
//   }

//   return formData;
// }


const findAllForms = async (page) => {
  // Utility function to extract the form fields while preserving their order
  const extractFormFields = async (container) => {
    const formElements = await container.$$('input, textarea, select, button, label');
    return Promise.all(formElements.map(async (el) => {
      const id = await el.getAttribute('id');
      const name = await el.getAttribute('name');
      const tag = await el.evaluate(node => node.tagName.toLowerCase());
      return { tag, id, name, element: el };  // Preserve tag and reference to element
    }));
  };

  // Traditional form elements and ARIA roles
  const formElements = await page.$$('form, input, textarea, select, button, ' +
    '[role="form"], [aria-label*="form"], ' +
    '[type="submit"], [type="button"], [contenteditable="true"]'
  );

  // Divs or sections containing inputs and acting like forms
  const formLikeContainers = await page.$$('div:has(input), section:has(input), ' +
    'div:has(textarea), div:has(select), fieldset, legend, ' +
    '[data-form], [data-role*="form"], [data-type="form"], ' +
    '[id*="form"], [class*="form"], [id*="login"], [class*="login"], ' +
    'form[style*="display:none"], div[style*="display:none"], ' +
    'dialog form, dialog:has(input), [role="dialog"]:has(form), ' +
    'nav:has(input), article:has(input), aside:has(input), ' +
    'table:has(input), ul:has(input), li:has(input)'
  );

  // Handle shadow DOM forms
  const shadowForms = await page.evaluate(() => {
    const forms = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) {
        forms.push(...el.shadowRoot.querySelectorAll('form, input, textarea, select, button, label'));
      }
    });
    return forms;
  });

  // Framework-specific form elements
  const frameworkSpecificElements = await page.$$('[ng-form], [ng-model], [v-model], [data-reactid], ' +
    '.form-control, .input-group, .form-group:has(input)'
  );

  // Combine all containers
  const allContainers = [...formElements, ...formLikeContainers, ...shadowForms, ...frameworkSpecificElements];

  // Deduplicate containers while preserving the order of inputs
  const uniqueForms = [];
  const seenSignatures = new Set();  // Track form signatures for deduplication

  for (const container of allContainers) {
    const formFields = await extractFormFields(container);

    // Create a signature based on the concatenation of tag and identifier (id/name) without sorting
    const formSignature = formFields
      .map(field => `${field.tag}-${field.id || field.name || ''}`)
      .join('|');

    // If this form signature hasn't been seen, add it to the unique list
    if (!seenSignatures.has(formSignature)) {
      seenSignatures.add(formSignature);
      uniqueForms.push({ container, fields: formFields });  // Save form fields in original order
    }
  }

  // Return the unique forms, each with its ordered input fields
  return uniqueForms;
};


// async function mapForm(page) {
//   return await page.$$eval('form *', elements => {
//     const inputs = [];
//     const labels = [];

//     elements.forEach(el => {
//       console.log(el)
//       const tagName = el.tagName.toLowerCase();

//       // Collect labels
//       if (tagName === 'label') {
//         labels.push({
//           htmlFor: el.htmlFor || null, // Capture the 'for' property or null if absent
//           labelText: el.textContent.trim(),
//           element: el
//         });
//       }

//       // Collect inputs (input, textarea, select)
//       if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
//         const field = {
//           id: el.id || el.name,
//           name: el.name,
//           type: tagName, // input, textarea, select
//           required: el.required || false, // capture 'required' property
//           labelText: null
//         };

//         // Handle input types
//         if (tagName === 'input') {
//           field.inputType = el.type;

//           if (el.type === 'checkbox') {
//             field.checked = el.checked || false;
//             field.options = [{
//               value: el.value || 'on', // checkbox value (often "on")
//               labelText: null
//             }];
//             inputs.push(field);
//           } else if (el.type === 'radio') {
//             // Handle radio buttons grouped by name
//             const existingRadioGroup = inputs.find(input => input.name === el.name && input.type === 'radio');
//             if (existingRadioGroup) {
//               existingRadioGroup.options.push({
//                 value: el.value,
//                 labelText: null
//               });
//             } else {
//               inputs.push({
//                 id: el.id || el.name,
//                 name: el.name,
//                 type: 'radio',
//                 options: [{
//                   value: el.value,
//                   labelText: null
//                 }]
//               });
//             }
//           } else {
//             inputs.push({
//               ...field,
//               value: el.value || '', // Default to empty if no value
//               labelText: null
//             });
//           }
//         } else if (tagName === 'textarea') {
//           inputs.push({
//             ...field,
//             value: el.value || '',
//             labelText: null
//           });
//         } else if (tagName === 'select') {
//           field.options = Array.from(el.options).map(opt => ({
//             value: opt.value,
//             text: opt.textContent.trim(),
//           }));
//           inputs.push({
//             ...field
//           });
//         }
//       }
//     });
//     console.log(inputs)
//     console.log(labels)
//     // Match inputs with labels
//     return inputs.map(input => {
//       let matchingLabel = null;

//       // Strategy 1: Find label with matching 'for' attribute
//       if (input.id) {
//         matchingLabel = labels.find(label => label.htmlFor === input.id);
//       }

//       // Strategy 2: Check if input is inside a label
//       if (!matchingLabel && input.id) {
//         matchingLabel = labels.find(label => label.element.contains(document.getElementById(input.id)));
//       }

//       // Strategy 3: Check previous sibling
//       if (!matchingLabel) {
//         const inputElement = document.querySelector(`[id="${input.id}"]`);
//         const prevSibling = inputElement?.previousElementSibling;
//         if (prevSibling && prevSibling.tagName.toLowerCase() === 'label') {
//           matchingLabel = {
//             labelText: prevSibling.textContent.trim()
//           };
//         }
//       }

//       // Strategy 4: Check if input and label are in the same parent container
//       if (!matchingLabel) {
//         const inputElement = document.querySelector(`[id="${input.id}"]`);
//         const parent = inputElement?.parentElement;
//         if (parent) {
//           const parentLabel = Array.from(parent.querySelectorAll('label')).find(label => parent.contains(inputElement));
//           if (parentLabel) {
//             matchingLabel = {
//               labelText: parentLabel.textContent.trim()
//             };
//           }
//         }
//       }

//       // Debugging log to help identify where it fails
//       if (!matchingLabel) {
//         console.warn(`No matching label found for input with ID or name: ${input.id || input.name}`);
//       }

//       // Strategy 5: Use placeholder as a fallback if no label is found
//       if (!matchingLabel && input.placeholder) {
//         matchingLabel = {
//           labelText: input.placeholder.trim()
//         };
//       }


//       // Return the input with its matched label (if found)
//       return {
//         ...input,
//         labelText: matchingLabel ? matchingLabel.labelText : null
//       };
//     });
//   });
// }



// Main function to execute the script
(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    for (const domain in credentials) {
      const domainCredentials = credentials[domain];

      // Create a new context for each domain 
      const context = await browser.newContext();
      const page = await context.newPage();
      await setupPopUpObserver(page);

      // Perform login using the data-driven credentials
      await loginToSitezenga(page, domainCredentials);
      // await loginToSiteszuperpiac(page, domainCredentials);

      // Loop through each form URL and extract data
      for (const url of domainCredentials.formUrls) {
        await extractFormData(page, url, domain);
      }
      // Find all unique forms on the page with their ordered fields
      const allForms = await findAllForms(page);

      // Log or process the forms and their fields in original order
      allForms.forEach((form, index) => {
        console.log(`Form ${index + 1}:`);
        form.fields.forEach(field => {
          console.log(`- ${field.tag} (id: ${field.id}, name: ${field.name})`);
        });
      });

      fs.writeFileSync('results/field_store.json', JSON.stringify(fieldStore, null, 2));
      console.log('Field store saved to field_store.json.');

      await context.close();
    }
  } catch (error) {
    console.error(`Error encountered: ${error.message}`);
  } finally {
    await browser.close();
  }
})().catch(console.error);







// Function to log in to a site with data-driven credentials
async function loginToSiteszuperpiac(page, domainCredentials) {
  const { loginUrl, postLoginUrl, fields, submitButton, agreeButton, username, password } = domainCredentials;

  try {
    await page.goto(loginUrl);

    if (agreeButton) {
      await page.click(agreeButton);
    }

    // Fill the login form using data-driven field selectors
    await page.fill(fields.username, username);
    await page.fill(fields.password, password);

    // Submit login form
    await page.click(submitButton);

    // Wait for successful navigation or page load
    await page.waitForURL(postLoginUrl);
  } catch (error) {
    console.error(`Login failed for ${loginUrl}: ${error.message}`);
  }
}
// Function to log in to a site with data-driven credentials
async function loginToSitezenga(page, domainCredentials) {
  const { loginUrl, postLoginUrl, fields, submitButton, loginButton, agreeButton, username, password } = domainCredentials;

  try {
    await page.goto(loginUrl);

    if (loginButton) {
      await page.click(loginButton);
    }
    if (agreeButton) {
      await page.click(agreeButton);
    }

    // Fill the login form using data-driven field selectors
    await page.fill(fields.username, username);
    await page.fill(fields.password, password);

    // Submit login form
    await page.click(submitButton);

    // Wait for successful navigation or page load
    await page.waitForURL(postLoginUrl);
  } catch (error) {
    console.error(`Login failed for ${loginUrl}: ${error.message}`);
  }
}



// Compares two form states to determine if they are equal
function isFormEqual(form1, form2) {
  return JSON.stringify(form1) === JSON.stringify(form2);
}

// Function to extract and store dynamic form data
async function extractFormData(page, url, domain) {
  await page.goto(url);
  const currentForm = await mapDynamicForm(page, domain);
  console.log("currentForm: ", currentForm)
  // Sanitize URL to create a filename
  const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const baseFilename = `${sanitizedUrl}_form_data`;
  let version = 1;
  let filePath = `results/${baseFilename}_v${version}.json`;

  // Check if the file already exists and if the content matches
  if (fs.existsSync(filePath)) {
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Check if the current form is different from the existing one
    if (!isFormEqual(currentForm, existingData)) {
      while (fs.existsSync(`results/${baseFilename}_v${version}.json`)) {
        version++;
      }
    }
  }
  filePath = `results/${baseFilename}_v${version}.json`;

  // Write the current form data to the determined file
  fs.writeFileSync(filePath, JSON.stringify(currentForm, null, 2));
  console.log(`Form data saved to ${filePath}.`);
}


// Generates a unique ID for each field based on its properties
function generateFieldID(field) {
  return `${field.type}-${field.name || field.label || field.id}`;
}


async function setupPopUpObserver(page) {
  await page.evaluate(() => {
    // Define the pop-up observer
    const observer = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          // Detect the pop-up elements based on specific selectors or patterns
          const popUpButtons = document.querySelectorAll([
            '.fc-button.fc-vendor-preferences-accept-all',
            '.fc-button.fc-confirm-choices',
            'button[aria-label="Az összes elfogadása"]',
            'button[aria-label="Választások megerősítése"]',
          ].join(','));

          if (popUpButtons.length > 0) {
            console.log('Pop-up detected, attempting to dismiss...');
            popUpButtons.forEach(button => button.click()); // Click on all matching buttons
            observer.disconnect(); // Stop observing once pop-up is handled
          }
        }
      }
    });

    // Start observing the entire document for child node additions (like pop-ups being injected)
    observer.observe(document.body, { childList: true, subtree: true });
  });
}


