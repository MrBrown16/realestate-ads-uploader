import fs from 'fs';
import path from 'path';
import { chromium, Page, ElementHandle, Browser } from 'playwright';

// Define the types for the domain credentials and form fields
interface Fork {
    optionValues: string[];
    fork: FieldRef[];
}
interface FieldRef {
    id: string;
    fork?: Fork[];
}
interface Option {
    value: string;
    text: string;
    checked: boolean;
}
interface Field {
    id: string;
    name: string;
    type: string;
    required?: boolean;
    checked?: boolean;
    inputType?: string;
    value?: string;
    placeholder?: string;
    labelText?: string | null;
    options?: Option[];
}

interface CredentialsStore {
    [domain: string]: DomainCredentials;  // Key is a string (domain), value is DomainCredentials
}
interface DomainCredentials {
    loginUrl: string;
    postLoginUrl: string;
    fields: {
        username: string;
        password: string;
    };
    submitButton: string;
    loginButton?: string;
    agreeButton?: string;
    username: string;
    password: string;
    formUrls: string[];
}

interface FieldStore {
    [domain: string]: {
        [fieldID: string]: Field;
    };
}

interface FormData {
    form: FieldRef[]
}

let counters = {
    cextractFormFields:0,
    cfindAllForms:0,
    ccreateFormSignature:0,
    cexploreForks:0,
    mapDynamicForm:0,
    mapForm:0,
    matchedInputs:0,
    clabelContainsInput:0,
    cisFormEqual:0,
    cextractFormData:0,
    cgenerateFieldID:0,
    cstoreField:0,
    cgenerateCombinations:0
}

// Utility function to extract form fields while preserving their order and maintaining element handles
const extractFormFields = async (container: ElementHandle): Promise<ElementHandle[]> => {
    counters.cextractFormFields++
    const formElements = await container.$$('input, textarea, select, button, label');
    return formElements;  // Keep the reference to each form element (ElementHandle)
};

const findAllForms = async (page: Page): Promise<{ container: ElementHandle, fields: ElementHandle[] }[]> => {
    counters.cfindAllForms++
    
    // Traditional form elements, aria roles, etc.
    const formElements = await page.$$('form, input, textarea, select, button, ' +
        '[role="form"], [aria-label*="form"], ' +
        '[type="submit"], [type="button"], [contenteditable="true"]'
    );

    // Divs or sections containing inputs
    const formLikeContainers = await page.$$('div:has(input), section:has(input), ' +
        'div:has(textarea), div:has(select), fieldset, legend, ' +
        '[data-form], [data-role*="form"], [data-type="form"], ' +
        '[id*="form"], [class*="form"], [id*="login"], [class*="login"], ' +
        'form[style*="display:none"], div[style*="display:none"], ' +
        'dialog form, dialog:has(input), [role="dialog"]:has(form), ' +
        'nav:has(input), article:has(input), aside:has(input), ' +
        'table:has(input), ul:has(input), li:has(input)'
    );
// // Handle shadow DOM forms using `evaluate`
// const shadowFormsHandle = await page.evaluateHandle(() => {
//     const forms: Element[] = [];
//     document.querySelectorAll('*').forEach((el) => {
//         if (el.shadowRoot) {
//             forms.push(...Array.from(el.shadowRoot.querySelectorAll('form, input, textarea, select, button, label')));
//         }
//     });
//     return forms;
// }) as any;

// // Convert `JSHandle<Element[]>` to `ElementHandle<Node>[]`
// const shadowFormElements = await shadowFormsHandle.evaluate((forms: Element[]) => {
//     return forms.map(el => el as unknown as HTMLElement); // Convert to HTMLElement if needed
// });

// Get ElementHandle<Node>[] using valid selectors
// const elementHandles: ElementHandle<Node>[] = [];
// for (const el of shadowFormElements) {
//     const id = el.id; // or use a different selector
//     if (id) {
//         const handle = await page.$(`#${id}`); // Use a valid CSS selector
//         if (handle) {
//             elementHandles.push(handle);
//         } else {
//             console.warn(`Element with ID "${id}" not found.`);
//         }
//     } else {
//         console.warn('Element has no ID, cannot select.');
//     }
// }


    // Framework-specific form elements
    const frameworkSpecificElements = await page.$$('[ng-form], [ng-model], [v-model], [data-reactid], ' +
        '.form-control, .input-group, .form-group:has(input)'
    );

    // Combine all containers
    const allContainers: ElementHandle[] = [...formElements, ...formLikeContainers, ...frameworkSpecificElements];
    // const allContainers: ElementHandle[] = [...formElements, ...formLikeContainers, ...shadowFormElements, ...frameworkSpecificElements];

    // Deduplicate containers while preserving the order of inputs and retaining their handles
    const uniqueForms: { signature: string, container: ElementHandle, fields: ElementHandle[] }[] = [];
    const seenSignatures: Set<string> = new Set();  // Track form signatures for deduplication

    for (const container of allContainers) {
        // console.log(container)
        const formFields = await extractFormFields(container);

        const formSignature = await createFormSignature(formFields);

        // Add only unique forms by signature
        if (!seenSignatures.has(formSignature)) {
            seenSignatures.add(formSignature);
            uniqueForms.push({ signature: formSignature, container, fields: formFields });  // Keep container and fields' live handles
        }
    }

    return uniqueForms;
};
// Function to create a signature for a form based on its fields
const createFormSignature = async (formFields: ElementHandle[]): Promise<string> => {
    counters.ccreateFormSignature++
    const signatures = await Promise.all(
        formFields.map(async (field) => {
            const tag = await field.evaluate(node => (node as HTMLElement).tagName.toLowerCase());
            const id = await field.getAttribute('id');
            const name = await field.getAttribute('name');
            return `${tag}-${id || name || ''}`;
        })
    );

    // Join all field signatures into a single string
    return signatures.join('|');
};


const fieldStore: FieldStore = {};  // Global store for fields per domain

// Load credentials from JSON file
const credentials: CredentialsStore = JSON.parse(fs.readFileSync('./scripts/credentials.json', 'utf-8'));



// async function exploreForks(initialForm: Field[], currentFormData: Array<{ field: string; forks?: any }>, page: Page, domain: string) {
async function exploreForks(initialForm: Field[], currentFormData: Fork, page: Page, domain: string) {
    let formState = initialForm;
    counters.cexploreForks++

    for (const field of formState) {
        if (['select', 'radio', 'checkbox'].includes(field.type)) {
            const fieldID = storeField(domain, { ...field, options: field.options });
            let forks: Fork[] = [];

            let options;

            if (field.options && field.options.length > 0) {
                options = field.options;  // Use field.options if defined
            } else {
                options = await page.$$eval(`input[name="${field.name}"]`, (inputs: HTMLInputElement[]) =>
                    inputs.map(input => ({
                        value: input.value,
                        text: input.nextSibling?.textContent?.trim() || '', // Fallback to an empty string
                        checked: (input as HTMLInputElement).checked || false
                    }))
                ); // Execute this if field.options is undefined
            }

            if (field.type === 'checkbox') {
                // Generate all possible combinations of checkbox states
                const combinations = generateCombinations(options);

                for (const combination of combinations) {
                    // Set each checkbox to the corresponding checked/unchecked state in the combination
                    for (const option of options) {
                        if (combination.includes(option.value)) {
                            await page.check(`input[name="${field.name}"][value="${option.value}"]`);
                        } else {
                            await page.uncheck(`input[name="${field.name}"][value="${option.value}"]`);
                        }
                    }

                    // await page.waitForTimeout(10); // Adjust wait time based on site speed
                    const updatedForm = await mapForm(page);

                    const remainingForm = updatedForm.filter(
                        updatedField => !formState.some(f => f.id === updatedField.id)
                    );

                    if (remainingForm.length > 0) {
                        let nestedFork: Fork = {
                            optionValues: [],
                            fork: []
                        };
                        await exploreForks(remainingForm, nestedFork, page, domain);

                        const existingFork = forks.find(fork =>
                            JSON.stringify(fork.fork) === JSON.stringify(nestedFork) ||
                            JSON.stringify(fork.fork) === JSON.stringify(remainingForm.map(f => ({ field: storeField(domain, f) })))
                        );

                        if (existingFork) {
                            existingFork.optionValues.push(...combination);
                        } else {
                            forks.push({
                                'optionValues': [...combination],
                                'fork': nestedFork.fork.length > 0 ? nestedFork.fork : remainingForm.map(f => ({ id: storeField(domain, f) }))
                            });
                        }
                    }

                    formState = updatedForm; // Update the current state of the form
                }
            } else {
                // Same logic as before for `select` and `radio` fields
                for (const option of options) {
                    if (field.type !== 'select' && !option.checked) {
                        await page.check(`input[name="${field.name}"][value="${option.value}"]`);
                    } else if (field.type === 'select') {
                        console.log("field:",field.name,"option.text: ",option.text)
                        await page.selectOption(`select[name="${field.name}"]`, option.value);
                    }

                    // await page.waitForTimeout(10); // Adjust wait time based on site speed
                    const updatedForm = await mapForm(page);

                    const remainingForm = updatedForm.filter(
                        updatedField => !formState.some(f => f.id === updatedField.id)
                    );

                    if (remainingForm.length > 0) {
                        let nestedFork: Fork = {
                            optionValues: [],
                            fork: []
                        };
                        await exploreForks(remainingForm, nestedFork, page, domain);

                        const existingFork = forks.find(fork =>
                            JSON.stringify(fork.fork) === JSON.stringify(nestedFork) ||
                            JSON.stringify(fork.fork) === JSON.stringify(remainingForm.map(f => ({ field: storeField(domain, f) })))
                        );

                        if (existingFork) {
                            existingFork.optionValues.push(option.value);
                        } else {
                            forks.push({
                                'optionValues': [option.value],
                                'fork': nestedFork.fork.length > 0 ? nestedFork.fork : remainingForm.map(f => ({ id: storeField(domain, f) }))
                            });
                        }
                    }

                    formState = updatedForm; // Update the current state of the form
                }
            }

            currentFormData.fork.push({
                id: fieldID,
                fork: forks.length > 0 ? forks : undefined
            });
        } else if (['input', 'textarea'].includes(field.type)) {
            const fieldID = storeField(domain, { ...field, options: [] });
            currentFormData.fork.push({
                id: fieldID
            });
        }
    }
}

async function mapDynamicForm(page: Page, domain: string): Promise<Fork> {
    counters.mapDynamicForm++

    const formData: Fork = {
        optionValues: [],
        fork: []
    };

    let initialForm = await mapForm(page);
    await exploreForks(initialForm, formData, page, domain);

    return formData;
}

async function mapForm(page: Page): Promise<Field[]> {
    counters.mapForm++

    const uniqueForms = await findAllForms(page);
    const inputs: Field[] = [];
    const labels: { htmlFor: string, textContent: string, label: ElementHandle }[] = []; // Store label text keyed by htmlFor

    for (const { container } of uniqueForms) {
        const elements = await container.$$('label, input, textarea, select');

        for (const el of elements) {
            const tagName = await el.evaluate(node => node.tagName.toLowerCase());

            if (tagName === 'label') {
                const { htmlFor, textContent } = await el.evaluate(label => {
                    if (label instanceof HTMLLabelElement) {
                        // Perform a type check to ensure it's an HTMLLabelElement
                        return {
                            htmlFor: label.htmlFor || null,
                            textContent: label.textContent?.trim() || ''
                        };
                    }
                    return {
                        htmlFor: null,
                        textContent: ''
                    };
                });
                if (htmlFor) {
                    labels.push({
                        htmlFor: htmlFor,
                        textContent: textContent,
                        label: el
                    });
                }
            } else {
                const fieldProperties = await el.evaluate(el => {
                    let id = '';
                    let name = '';
                    let value = '';
                    let type = '';
                    let required = false;
                    let checked = false;
                    let options: Option[] | undefined;

                    if (el instanceof HTMLInputElement) {
                        id = el.id || el.name;
                        name = el.name;
                        value = el.value || '';
                        type = el.type;
                        required = el.required;
                        checked = el.checked;
                    } else if (el instanceof HTMLTextAreaElement) {
                        id = el.id || el.name;
                        name = el.name;
                        value = el.value || '';
                        type = 'textarea';
                        required = el.required;
                    } else if (el instanceof HTMLSelectElement) {
                        id = el.id || el.name;
                        name = el.name;
                        type = 'select';
                        required = el.required;
                        options = Array.from(el.options).map(opt => ({
                            value: opt.value,
                            text: opt.textContent?.trim() || '',
                            checked: false
                        }));
                    }

                    return {
                        id,
                        name,
                        type,
                        required,
                        value,
                        checked,
                        options
                    };
                });

                const field: Field = {
                    id: fieldProperties.id,
                    name: fieldProperties.name,
                    type: fieldProperties.type,
                    required: fieldProperties.required,
                    value: fieldProperties.type === 'checkbox' ? fieldProperties.checked ? fieldProperties.value : '' : fieldProperties.value,
                    labelText: fieldProperties.id ? await labelContainsInput(page, fieldProperties.id) : null
                };

                if (fieldProperties.type === 'checkbox') {
                    field.options = [{
                        value: field.value || 'on',
                        text: '',
                        checked: fieldProperties.checked
                    }];
                } else if (fieldProperties.type === 'radio') {
                    const existingRadioGroup = inputs.find(input => input.name === field.name && input.type === 'radio');
                    if (existingRadioGroup) {
                        existingRadioGroup.options?.push({
                            value: fieldProperties.value,
                            text: '',
                            checked: fieldProperties.checked
                        });
                    } else {
                        inputs.push({
                            ...field,
                            options: [{
                                value: fieldProperties.value,
                                text: '',
                                checked: fieldProperties.checked
                            }]
                        });
                    }
                    continue;
                } else if (fieldProperties.type === 'textarea') {
                    field.value = fieldProperties.value;
                } else if (fieldProperties.type === 'select') {
                    field.options = fieldProperties.options;
                }
                inputs.push(field);
            }
        }
    }
// Match inputs with labels
const matchedInputs = await page.evaluate(({labels, inputs}) => {
    counters.matchedInputs++

    return inputs.map(input => {
        let matchingLabel = null;

        // Strategy 1: Find label with matching 'for' attribute
        if (input.id) {
            matchingLabel = labels.find(label => label.htmlFor === input.id) || null;
        }

        // Strategy 2: Check if input has an associated label text
        if (!matchingLabel && input.id) {
            if (input.labelText && input.labelText.length > 0) {
                matchingLabel = { textContent: input.labelText };
            }
        }

        // Strategy 3: Check previous sibling
        if (!matchingLabel && input.id) {
            const inputElement = document.querySelector(`[id="${input.id}"]`);
            const prevSibling = inputElement?.previousElementSibling;
            if (prevSibling && prevSibling.tagName.toLowerCase() === 'label') {
                matchingLabel = {
                    textContent: prevSibling.textContent?.trim() || ''
                };
            }
        }

        // Strategy 4: Check if input and label are in the same parent container
        if (!matchingLabel && input.id) {
            const inputElement = document.querySelector(`[id="${input.id}"]`);
            const parent = inputElement?.parentElement;
            if (parent) {
                const parentLabel = Array.from(parent.querySelectorAll('label')).find(label => parent.contains(inputElement));
                if (parentLabel) {
                    matchingLabel = {
                        textContent: parentLabel.textContent?.trim() || ''
                    };
                }
            }
        }

        // Debugging log to help identify where it fails
        if (!matchingLabel) {
            console.warn(`No matching label found for input with ID or name: ${input.id || input.name}`);
        }

        // Strategy 5: Use placeholder as a fallback if no label is found
        if (!matchingLabel && input.placeholder) {
            matchingLabel = {
                textContent: input.placeholder.trim()
            };
        }

        // Return the input with its matched label (if found)
        return {
            ...input,
            labelText: matchingLabel ? matchingLabel.textContent : null
        };
    });
}, {labels, inputs}); // Pass labels and inputs to the evaluate function

return matchedInputs;
    // // Match inputs with labels
    // return inputs.map(input => {
    //     let matchingLabel: any
    //     // let matchingLabel: { htmlFor:string, textContent: string }|null

    //     // Strategy 1: Find label with matching 'for' attribute
    //     if (input.id) {
    //         matchingLabel = labels.find(label => label.htmlFor === input.id) || null;
    //     }

    //     // Strategy 2: Check if input is inside a label
    //     if (!matchingLabel && input.id) {
    //         if (input.labelText && input.labelText.length > 0) {
    //             matchingLabel = { textContent: input.labelText }
    //         }
    //     }


    //     // Strategy 3: Check previous sibling
    //     if (!matchingLabel) {
    //         const inputElement = document.querySelector(`[id="${input.id}"]`);
    //         const prevSibling = inputElement?.previousElementSibling;
    //         if (prevSibling && prevSibling.tagName.toLowerCase() === 'label') {
    //             matchingLabel = {
    //                 textContent: prevSibling.textContent?.trim() || ''
    //             };
    //         }
    //     }

    //     // Strategy 4: Check if input and label are in the same parent container
    //     if (!matchingLabel) {
    //         const inputElement = document.querySelector(`[id="${input.id}"]`);
    //         const parent = inputElement?.parentElement;
    //         if (parent) {
    //             const parentLabel = Array.from(parent.querySelectorAll('label')).find(label => parent.contains(inputElement));
    //             if (parentLabel) {
    //                 matchingLabel = {
    //                     textContent: parentLabel.textContent?.trim() || ''
    //                 };
    //             }
    //         }
    //     }

    //     // Debugging log to help identify where it fails
    //     if (!matchingLabel) {
    //         console.warn(`No matching label found for input with ID or name: ${input.id || input.name}`);
    //     }

    //     // Strategy 5: Use placeholder as a fallback if no label is found
    //     if (!matchingLabel && input.placeholder) {
    //         matchingLabel = {
    //             textContent: input.placeholder.trim()
    //         };
    //     }

    //     // Return the input with its matched label (if found)
    //     return {
    //         ...input,
    //         labelText: matchingLabel ? matchingLabel.textContent : null
    //     };
    // });
}

async function labelContainsInput(page: Page, id: string) {
    counters.clabelContainsInput++

    return page.evaluate((inputId) => {
        // Find the input element by ID
        const input = document.getElementById(inputId);
        if (!input) return null;

        // Strategy 2: Check if the input is directly inside a label element
        let parent = input.parentElement;
        while (parent) {
            if (parent.tagName.toLowerCase() === 'label') {
                return parent.textContent?.trim() || null;
            }
            parent = parent.parentElement;
        }

        return null; // No label found
    }, id);
}

// async function mapForm(page: Page): Promise<Field[]> {
//     return await page.$$eval('form *', (elements: Element[]) => {
//         const inputs: Field[] = [];
//         const labels: { htmlFor: string | null; labelText: string; element: HTMLLabelElement }[] = [];

//         elements.forEach(el => {
//             const tagName = el.tagName.toLowerCase();

//             // Collect labels
//             if (tagName === 'label') {
//                 labels.push({
//                     htmlFor: (el as HTMLLabelElement).htmlFor || null, // Capture the 'for' property or null if absent
//                     labelText: el.textContent?.trim() || '',
//                     element: el as HTMLLabelElement
//                 });
//             }

//             // Collect inputs (input, textarea, select)
//             if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
//                 const field: Field = {
//                     id: (el as HTMLInputElement).id || (el as HTMLInputElement).name,
//                     name: (el as HTMLInputElement).name,
//                     type: tagName, // input, textarea, select
//                     required: (el as HTMLInputElement).required || false, // capture 'required' property
//                     labelText: null
//                 };

//                 // Handle input types
//                 if (tagName === 'input') {
//                     field.inputType = (el as HTMLInputElement).type;

//                     if (field.inputType === 'checkbox') {
//                         field.checked = (el as HTMLInputElement).checked || false;
//                         field.options = [{
//                             value: (el as HTMLInputElement).value || 'on', // checkbox value (often "on")
//                             text: '',
//                             checked: field.checked
//                         }];
//                         inputs.push(field);
//                     } else if (field.inputType === 'radio') {
//                         // Handle radio buttons grouped by name
//                         const existingRadioGroup = inputs.find(input => input.name === field.name && input.type === 'radio');
//                         if (existingRadioGroup) {
//                             if (!existingRadioGroup.options) {
//                                 existingRadioGroup.options = []
//                             }
//                             existingRadioGroup.options.push({
//                                 value: (el as HTMLInputElement).value,
//                                 text: '',
//                                 checked: (el as HTMLInputElement).checked || false
//                             });
//                         } else {
//                             inputs.push({
//                                 id: (el as HTMLInputElement).id || (el as HTMLInputElement).name,
//                                 name: (el as HTMLInputElement).name,
//                                 type: 'radio',
//                                 options: [{
//                                     value: (el as HTMLInputElement).value,
//                                     text: '',
//                                     checked: (el as HTMLInputElement).checked || false
//                                 }]
//                             });
//                         }
//                     } else {
//                         inputs.push({
//                             ...field,
//                             value: (el as HTMLInputElement).value || '', // Default to empty if no value
//                             labelText: null
//                         });
//                     }
//                 } else if (tagName === 'textarea') {
//                     inputs.push({
//                         ...field,
//                         value: (el as HTMLTextAreaElement).value || '',
//                         labelText: null
//                     });
//                 } else if (tagName === 'select') {
//                     field.options = Array.from((el as HTMLSelectElement).options).map(opt => ({
//                         value: opt.value,
//                         text: opt.textContent?.trim() || '',
//                         checked: (el as HTMLInputElement).checked || false
//                     }));
//                     inputs.push({
//                         ...field
//                     });
//                 }
//             }
//         });

//         // Match inputs with labels
//         return inputs.map(input => {
//             let matchingLabel: { labelText: string } | null = null;

//             // Strategy 1: Find label with matching 'for' attribute
//             if (input.id) {
//                 matchingLabel = labels.find(label => label.htmlFor === input.id) || null;
//             }

//             // Strategy 2: Check if input is inside a label
//             if (!matchingLabel && input.id) {
//                 matchingLabel = labels.find(label => label.element.contains(document.getElementById(input.id)!)) || null;
//             }

//             // Strategy 3: Check previous sibling
//             if (!matchingLabel) {
//                 const inputElement = document.querySelector(`[id="${input.id}"]`);
//                 const prevSibling = inputElement?.previousElementSibling;
//                 if (prevSibling && prevSibling.tagName.toLowerCase() === 'label') {
//                     matchingLabel = {
//                         labelText: prevSibling.textContent?.trim() || ''
//                     };
//                 }
//             }

//             // Strategy 4: Check if input and label are in the same parent container
//             if (!matchingLabel) {
//                 const inputElement = document.querySelector(`[id="${input.id}"]`);
//                 const parent = inputElement?.parentElement;
//                 if (parent) {
//                     const parentLabel = Array.from(parent.querySelectorAll('label')).find(label => parent.contains(inputElement));
//                     if (parentLabel) {
//                         matchingLabel = {
//                             labelText: parentLabel.textContent?.trim() || ''
//                         };
//                     }
//                 }
//             }

//             // Debugging log to help identify where it fails
//             if (!matchingLabel) {
//                 console.warn(`No matching label found for input with ID or name: ${input.id || input.name}`);
//             }

//             // Strategy 5: Use placeholder as a fallback if no label is found
//             if (!matchingLabel && input.placeholder) {
//                 matchingLabel = {
//                     labelText: input.placeholder.trim()
//                 };
//             }

//             // Return the input with its matched label (if found)
//             return {
//                 ...input,
//                 labelText: matchingLabel ? matchingLabel.labelText : null
//             };
//         });
//     });
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
            // await loginToSitezenga(page, domainCredentials);
            await loginToSiteszuperpiac(page, domainCredentials);
            
            console.log(counters)
            // Loop through each form URL and extract data
            for (const url of domainCredentials.formUrls) {
                await extractFormData(page, url, domain);
            }

            // // Find all unique forms on the page with their ordered fields
            // const allForms = await findAllForms(page); // Assuming this function is defined elsewhere

            // // Log or process the forms and their fields in original order
            // allForms.forEach((form, index) => {
            //     console.log(`Form ${index + 1}:`);
            //     form.fields.forEach(field => {
            //         console.log(`- ${field.type} (id: ${field.getAttribute('id')}, name: ${field.asElement.name})`);
            //     });
            // });
            console.log(counters)
            fs.writeFileSync('results/field_store.json', JSON.stringify(fieldStore, null, 2));
            console.log('Field store saved to field_store.json.');

            await context.close();
        }
    } catch (error: any) {
        console.error(`Error encountered: ${error.message}`);
    } finally {
        await browser.close();
    }
})().catch(console.error);

// Function to log in to a site with data-driven credentials
async function loginToSiteszuperpiac(page: Page, domainCredentials: DomainCredentials): Promise<void> {
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
    } catch (error: any) {
        console.error(`Login failed for ${loginUrl}: ${error.message}`);
    }
}

// Function to log in to a site with data-driven credentials
async function loginToSitezenga(page: Page, domainCredentials: DomainCredentials): Promise<void> {
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
    } catch (error: any) {
        console.error(`Login failed for ${loginUrl}: ${error.message}`);
    }
}


// Compares two form states to determine if they are equal
function isFormEqual(form1: any, form2: any): boolean {
    counters.cisFormEqual++

    return JSON.stringify(form1) === JSON.stringify(form2);
}

// Function to extract and store dynamic form data
async function extractFormData(page: Page, url: string, domain: string): Promise<void> {
    counters.cextractFormData++

    await page.goto(url);
    const currentForm = await mapDynamicForm(page, domain); // Assuming this function is defined elsewhere
    console.log("currentForm: ", currentForm);

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
function generateFieldID(field: { type: string; name?: string; label?: string; id?: string }): string {
    counters.cgenerateFieldID++

    return `${field.type}-${field.name || field.label || field.id}`;
}

// Sets up an observer for pop-ups on the page
async function setupPopUpObserver(page: Page): Promise<void> {
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
                        popUpButtons.forEach(button => (button as HTMLElement).click()); // Click on all matching buttons
                        observer.disconnect(); // Stop observing once the pop-up is handled
                    }
                }
            }
        });

        // Start observing the entire document for child node additions (like pop-ups being injected)
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

// Store the field under the specific domain in the fieldStore
function storeField(domain: string, field: Field): string {
    counters.cstoreField++

    if (!fieldStore[domain]) fieldStore[domain] = {};
    const fieldID = generateFieldID(field);

    // If the field doesn't already exist, store it with options
    if (!fieldStore[domain][fieldID]) {
        fieldStore[domain][fieldID] = { ...field };
    }

    return fieldID;
}

// Helper function to generate all combinations of checkbox states
function generateCombinations(options: Array<{ value: string }>): string[][] {
    counters.cgenerateCombinations++

    const result: string[][] = [];
    const totalCombinations = 1 << options.length; // 2^number_of_checkboxes

    for (let i = 0; i < totalCombinations; i++) {
        const combination: string[] = [];
        for (let j = 0; j < options.length; j++) {
            if (i & (1 << j)) {
                combination.push(options[j].value);
            }
        }
        result.push(combination);
    }

    return result;
}