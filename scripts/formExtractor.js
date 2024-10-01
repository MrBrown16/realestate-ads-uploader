const fs = require('fs');
const { chromium } = require('playwright');
const path = require('path');

const fieldStore = {};  // Global store for fields per domain

// Load credentials from JSON file
const credentials = JSON.parse(fs.readFileSync('./scripts/credentials.json', 'utf-8'));

// Generates a unique ID for each field based on its properties
function generateFieldID(field) {
  return `${field.type}-${field.name || field.label || field.id}`;
}

// Store the field under the specific domain in the fieldStore
function storeField(domain, field) {
  if (!fieldStore[domain]) fieldStore[domain] = {};
  const fieldID = generateFieldID(field);
  
  // If the field doesn't already exist, store it with options
  if (!fieldStore[domain][fieldID]) {
    console.log(field)
    // console.log(field.options)
    fieldStore[domain][fieldID] = { ...field }; // Initialize options as an empty array
  }
  
  return fieldID;
}

// Function to log in to a site with data-driven credentials
async function loginToSite(page, domainCredentials) {
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

// Function to extract and store dynamic form data
async function extractFormData(page, url, domain) {
  await page.goto(url);
  const currentForm = await mapDynamicForm(page, domain);
  
  // Sanitize URL to create a filename
  const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const baseFilename = `${sanitizedUrl}_form_data`;
  let version = 1;
  let filePath = `${baseFilename}.json`;

  // Check if the file already exists and if the content matches
  if (fs.existsSync(filePath)) {
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Check if the current form is different from the existing one
    if (!isFormEqual(currentForm, existingData)) {
      while (fs.existsSync(`${baseFilename}_v${version}.json`)) {
        version++;
      }
      filePath = `${baseFilename}_v${version}.json`;
    }
  }

  // Write the current form data to the determined file
  fs.writeFileSync(filePath, JSON.stringify(currentForm, null, 2));
  console.log(`Form data saved to ${filePath}.`);
}

// Modify how form fields are extracted in the mapDynamicForm function
// async function mapDynamicForm(page, domain) {
//   const formFields = [];
//   let initialForm = await mapFormChanges(page);
  
//   // Iterate through each form field
//   for (let field of initialForm) {
//     // Handle select field changes
//     if (field.type === 'select') {
//       console.log(field.options)
//       for (let option of field.options) {
//         await page.selectOption(`select[name="${field.name}"]`, option.value);
//         await page.waitForTimeout(100);  // Adjust wait time based on site speed

//         const updatedForm = await mapFormChanges(page);
//         if (!isFormEqual(initialForm, updatedForm)) {
//           console.log("select")
//           const fieldID = storeField(domain, ...field, field.options); // Store only once
//           formFields.push({ 
//             field: fieldID, 
//             option, 
//             changes: updatedForm 
//           });
//         }
//         initialForm = updatedForm;
//       }
//     } else if (field.inputType === 'radio' || field.inputType === 'checkbox') {
//       const options = await page.$$eval(`input[name="${field.name}"]`, inputs =>
//         inputs.map(input => ({
//           value: input.value,
//           text: input.nextSibling.textContent.trim(), // Assuming the label is next to the input
//           checked: input.checked
//         }))
//       );
//       console.log("radio")
//       // Store the options in the fieldStore
//       const fieldID = storeField(domain, ...field, options );

//       // For each option, check if it is not checked, check it, and map the form
//       for (let option of options) {
//         if (!option.checked) {
//           await page.check(`input[name="${field.name}"][value="${option.value}"]`);
//           await page.waitForTimeout(10);
//         }

//         const updatedForm = await mapFormChanges(page);
//         if (!isFormEqual(initialForm, updatedForm)) {
//           formFields.push({ 
//             field: fieldID, 
//             option, 
//             changes: updatedForm 
//           });
//         }
//         initialForm = updatedForm;
//       }
//     } else {
//       console.log("else")
//       // Directly store non-select, non-radio/checkbox fields
//       const fieldID = storeField(domain, field, [] ); // Store once, no options
//       formFields.push({
//         field: fieldID,
//       });
//     }
//   }

//   return formFields;
// }
async function mapDynamicForm(page, domain) {
  const specificFormFields = [];
  let initialForm = await mapFormChanges(page);

  // Iterate through each form field
  for (let field of initialForm) {
    // Handle select field changes
    if (field.type === 'select') {
      console.log(field.options);
      // Store the select field initially
      const fieldID = storeField(domain, { ...field, options: field.options });

      for (let option of field.options) {
        await page.selectOption(`select[name="${field.name}"]`, option.value);
        await page.waitForTimeout(100); // Adjust wait time based on site speed

        const updatedForm = await mapFormChanges(page);
        if (!isFormEqual(initialForm, updatedForm)) { // This only happens if the form is dynamic
          specificFormFields.push({ 
            field: fieldID, 
            option, 
            changes: updatedForm 
          });
        }
        initialForm = updatedForm;
      }
    } else if (field.inputType === 'radio' || field.inputType === 'checkbox') {
      console.log("radio");
      const options = await page.$$eval(`input[name="${field.name}"]`, inputs =>
        inputs.map(input => ({
          value: input.value,
          text: input.nextSibling.textContent.trim(), // Assuming the label is next to the input
          checked: input.checked
        }))
      );

      // Store the radio/checkbox field along with its options
      const fieldID = storeField(domain, { ...field, options });

      // For each option, check if it is not checked, check it, and map the form
      for (let option of options) {
        if (!option.checked) {
          await page.check(`input[name="${field.name}"][value="${option.value}"]`);
          await page.waitForTimeout(10);
        }

        const updatedForm = await mapFormChanges(page);
        if (!isFormEqual(initialForm, updatedForm)) {
          specificFormFields.push({ 
            field: fieldID, 
            option, 
            changes: updatedForm 
          });
        }
        initialForm = updatedForm;
      }
    } else {
      console.log("else");
      // Directly store non-select, non-radio/checkbox fields
      const fieldID = storeField(domain, { ...field, options: [] }); // Store once, no options
      specificFormFields.push({
        field: fieldID,
      });
    }
  }

  return specificFormFields;
}


// Modify the mapFormChanges function to account for option text when storing
async function mapFormChanges(page) {
  return await page.$$eval('form *', elements => {
    return elements.map(el => {
      const field = {};
      const labelEl = el.closest('label');

      if (labelEl) field.label = labelEl.textContent.trim(); // Capture label text
      field.id = el.id || el.name;
      field.name = el.name;
      field.type = el.tagName.toLowerCase();

      // Check for different input types and handle accordingly
      if (el.tagName === 'INPUT') {
        field.inputType = el.type;
      } else if (el.tagName === 'SELECT') {
        field.options = Array.from(el.options).map(opt => ({
          value: opt.value,
          text: opt.textContent.trim() // Store both value and text of select options
        }));
      }
      return field.id || field.label || field.name ? field : null;
    }).filter(Boolean);
  });
}

// Compares two form states to determine if they are equal
function isFormEqual(form1, form2) {
  return JSON.stringify(form1) === JSON.stringify(form2);
}

// Main function to execute the script
(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    for (const domain in credentials) {
      const domainCredentials = credentials[domain];
      
      // Create a new context for each domain 
      const context = await browser.newContext();
      const page = await context.newPage();

      // Perform login using the data-driven credentials
      await loginToSite(page, domainCredentials);

      // Loop through each form URL and extract data
      for (const url of domainCredentials.formUrls) {
        await extractFormData(page, url, domain);
      }

      fs.writeFileSync('field_store.json', JSON.stringify(fieldStore, null, 2));
      console.log('Field store saved to field_store.json.');

      await context.close();
    }
  } catch (error) {
    console.error(`Error encountered: ${error.message}`);
  } finally {
    await browser.close();
  }
})().catch(console.error);
