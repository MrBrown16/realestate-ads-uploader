import * as fs from 'fs';
import * as path from 'path';
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


interface FieldStore {
    [domain: string]: {
        [fieldID: string]: Field;
    };
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



// Utility function to extract form fields while preserving their order and maintaining element handles
const extractFormFields = async (container: ElementHandle, counters: any): Promise<ElementHandle[]> => {
    counters.cextractFormFields++
    const formElements = await container.$$('input, textarea, select, button, label');
    return formElements;  // Keep the reference to each form element (ElementHandle)
};
const findAllFormsbad = async (page: Page, selector: string, counters: any) => {
    // Declare the function outside of evaluate to prevent TypeScript mangling
    console.log('before evaluate')
    const result = await page.evaluate(collectElements, selector);

    console.log("result: ", result);
    return result;
};

// Function to recursively collect inputs, selects, textareas, and labels
function collectElements(selector: string) {
    console.log('in collectElements')
    const elements: Array<{ type: string, tag: string, outerHTML: string } | Element> = [];
    const shadow: Array<{ type: string, tag: string, outerHTML: string }> = [];

    const root = document.querySelector(selector);
    // const root = document.querySelector(selector);
    
    if (!root) return elements;
    const invalid = '.invalid, .ng-invalid'
    // Select all relevant form elements: inputs, selects, textareas, and labels
    const formElements = root.querySelectorAll('input, select, textarea, label, button, .form-item, .select-button, .switch-select, .switch-select-item, .select-dropdown-selector, .select-dropdown, [role="form"], [aria-label*="form"], [role="listbox"], [role="combobox"], [role="option"], .select__dropdown-item, [type="submit"], [type="button"], [type="checkbox"], [type="radio"], [contenteditable="true"], [ng-form], [ng-model], [v-model], [data-reactid], .form-control, .input-group, .form-group:has(input), mat-chip-listbox, mat-chip-option, ');
    formElements.forEach((element) => {
        elements.push(element);

        // Collect options if it's a <select> element
        if (element.tagName.toLowerCase() === 'select') {
            const options = Array.from((element as HTMLSelectElement).options);
            options.forEach((option) => {
                elements.push(option);
            });
        }
    });

    // Recursively handle shadow DOMs
    root.querySelectorAll("*").forEach((el: Element) => {
        if (el.shadowRoot) {
            const shadowSelector = el?.id || el?.nodeName
            const shadowChildren = collectElements(shadowSelector);
            shadow.push()
            elements.push(...shadowChildren);
        }
    });
    console.log('before filter')

    const formInputs = Array.from(elements).filter((input)=>{
        console.log('in isNavOrMenu')
        const element = input as Element
        const navSelectors = [
            'nav', 'header', 'footer', '.sidebar', '.menu', '.navbar',
            '.toolbar', '.pagination', '.breadcrumbs', '.search-bar',
            '.dropdown-menu', '#ad', '.ad', '.advertisement', '.banner',
            '.sponsored', '.promo', '.cta', '.widget', '.gadgets', '.card',
            '#top-bar', '.top-bar', '#bottom-bar', '.bottom-bar', '.sticky-footer',
            '.site-header', '.site-footer', '.overlay', '.toast', '.notification', '.alert',
            '.social', '.social-share', '.social-media', '.carousel', '.slider',
            '.nav-list', '.nav-item', '.header-menu-item', '.menu-container', 'oom-portal-header'
        ];

        let parent = element.parentElement;
        while (parent) {
            if (navSelectors.some(selector => parent!.matches(selector))) {
                return false; 
            }
            parent = parent.parentElement;
        }
        return true;
    });
    formInputs.forEach((element) => {
        element = element as Element
            elements.push({
                type: 'light-dom',
                tag: element.tagName.toLowerCase(),
                outerHTML: element.outerHTML,
            });

            // Collect options if it's a <select> element
            if (element.tagName.toLowerCase() === 'select') {
                const options = Array.from((element as HTMLSelectElement).options);
                options.forEach((element) => {
                    elements.push({
                        type: 'shadow-dom',
                        tag: element.tagName.toLowerCase(),
                        outerHTML: element.outerHTML,
                    });
                });
            }
        });
    
    return elements;
}

//just use document.forms
const findAllForms = async (page: Page, counters: any): Promise<{ container: ElementHandle, fields: ElementHandle[] }[]> => {
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
        const formFields = await extractFormFields(container, counters);

        const formSignature = await createFormSignature(formFields, counters);

        // Add only unique forms by signature
        if (!seenSignatures.has(formSignature)) {
            seenSignatures.add(formSignature);
            uniqueForms.push({ signature: formSignature, container, fields: formFields });  // Keep container and fields' live handles
        }
    }

    return uniqueForms;
};
// Function to create a signature for a form based on its fields
const createFormSignature = async (formFields: ElementHandle[], counters: any): Promise<string> => {
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



// Load credentials from JSON file
const credentials: CredentialsStore = JSON.parse(fs.readFileSync('./scripts/credentials.json', 'utf-8'));



// async function exploreForks(initialForm: Field[], currentFormData: Array<{ field: string; forks?: any }>, page: Page, domain: string) {
async function exploreForks(initialForm: Field[], currentFormData: Fork, fieldStore: FieldStore, page: Page, domain: string, counters: any) {
    let formState = initialForm;
    counters.cexploreForks++

    for (const field of formState) {
        if (['select', 'radio', 'checkbox'].includes(field.type)) {
            const fieldID = storeField(fieldStore, domain, { ...field, options: field.options }, counters);
            let forks: Fork[] = [];

            let options;

            if (field.options && field.options.length > 0) {
                options = field.options;  // Use field.options if defined
            } else {
                //TODO: not only find by name
                options = await page.$$eval(`input[name="${field.name}"]`, (inputs: HTMLInputElement[]) =>
                    inputs.map(input => ({
                        value: input.value,
                        text: input.nextSibling?.textContent?.trim() || '', // Fallback to an empty string
                        checked: (input as HTMLInputElement).checked || false
                    }))
                );
            }

            if (field.type === 'checkbox') {
                // Generate all possible combinations of checkbox states
                const combinations = generateCombinations(options, counters);

                for (const combination of combinations) {
                    // Set each checkbox to the corresponding checked/unchecked state in the combination
                    for (const option of options) {
                        if (combination.includes(option.value)) {
                            await page.check(`input[name="${field.name}"][value="${option.value}"]`);
                        } else {
                            await page.uncheck(`input[name="${field.name}"][value="${option.value}"]`);
                        }
                    }

                    await page.waitForTimeout(10); // Adjust wait time based on site speed
                    const updatedForm = await mapForm(fieldStore, page, domain, counters);

                    const remainingForm = updatedForm.filter(
                        updatedField => !formState.some(f => f.id === updatedField.id)
                    );

                    if (remainingForm.length > 0) {
                        let nestedFork: Fork = {
                            optionValues: [],
                            fork: []
                        };
                        await exploreForks(remainingForm, nestedFork, fieldStore, page, domain, counters);

                        const existingFork = forks.find(fork =>
                            JSON.stringify(fork.fork) === JSON.stringify(nestedFork) ||
                            JSON.stringify(fork.fork) === JSON.stringify(remainingForm.map(f => ({ field: storeField(fieldStore, domain, f, counters) })))
                        );

                        if (existingFork) {
                            existingFork.optionValues.push(...combination);
                        } else {
                            forks.push({
                                'optionValues': [...combination],
                                'fork': nestedFork.fork.length > 0 ? nestedFork.fork : remainingForm.map(f => ({ id: storeField(fieldStore, domain, f, counters) }))
                            });
                        }
                    }

                    formState = updatedForm; // Update the current state of the form
                }
            } else {
                // `select` and `radio` fields
                for (const option of options) {
                    if (field.type !== 'select' && !option.checked) {
                        await page.check(`input[name="${field.name}"][value="${option.value}"]`);
                    } else if (field.type === 'select') {
                        console.log("field:", field.name, "option.text: ", option.text)
                        await page.selectOption(`select[name="${field.name}"]`, option.value);
                    }

                    await page.waitForTimeout(10); // Adjust wait time based on site speed
                    const updatedForm = await mapForm(fieldStore, page, domain, counters);

                    const remainingForm = updatedForm.filter(
                        updatedField => !formState.some(f => f.id === updatedField.id)
                    );

                    if (remainingForm.length > 0) {
                        let nestedFork: Fork = {
                            optionValues: [],
                            fork: []
                        };
                        await exploreForks(remainingForm, nestedFork, fieldStore, page, domain, counters);

                        const existingFork = forks.find(fork =>
                            JSON.stringify(fork.fork) === JSON.stringify(nestedFork) ||
                            JSON.stringify(fork.fork) === JSON.stringify(remainingForm.map(f => ({ field: storeField(fieldStore, domain, f, counters) })))
                        );

                        if (existingFork) {
                            existingFork.optionValues.push(option.value);
                        } else {
                            forks.push({
                                'optionValues': [option.value],
                                'fork': nestedFork.fork.length > 0 ? nestedFork.fork : remainingForm.map(f => ({ id: storeField(fieldStore, domain, f, counters) }))
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
            const fieldID = storeField(fieldStore, domain, { ...field, options: [] }, counters);
            currentFormData.fork.push({
                id: fieldID
            });
        }
    }
}

async function mapDynamicForm(fieldStore: FieldStore, page: Page, domain: string, counters: any): Promise<FieldRef> {
    counters.mapDynamicForm++

    const initialFork: Fork = {
        optionValues: ['a'],
        fork: []
    };
    let initialField: FieldRef = {
        id: '',
        fork: []
    }
    let initialForm = await mapForm(fieldStore, page, domain, counters);
    await exploreForks(initialForm, initialFork, fieldStore, page, domain, counters);
    initialField.fork?.push(initialFork)
    return initialField;
}

async function mapForm(fieldStore: FieldStore, page: Page, domain: string, counters: any): Promise<Field[]> {
    counters.mapForm++

    const uniqueForms = await findAllForms(page, counters);
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
                    labelText: fieldProperties.id ? await labelContainsInput(page, fieldProperties.id, counters) : null
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
    const matchedInputs = await page.evaluate(({ labels, inputs, counters }) => {
        counters.matchedInputs++

        return inputs.map(input => {
            let matchingLabel = null;

            // Strategy 1: Find label with matching 'for' attribute
            if (input.id) {
                matchingLabel = labels.find(label => label.htmlFor === input.id) || input.labelText ? { texContent: input.labelText } : null;
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
    }, { labels, inputs, counters }); // Pass labels and inputs to the evaluate function
    inputs.forEach((input: Field) => {
        storeField(fieldStore, domain, input, counters)
    })
    return matchedInputs;
}

async function labelContainsInput(page: Page, id: string, counters: any) {
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

async function findFirstCommonParent(page: Page, selectors: string[]): Promise<void> {
    const commonParent = await page.evaluate((selectors) => {
        // Helper function to check if an element contains all other elements
        function containsAll(container: HTMLElement, elements: HTMLElement[]): boolean {
            return elements.every(el => container.contains(el));
        }

        // Get the elements based on the selectors
        const elements = selectors.map(sel => document.querySelector(sel) as HTMLElement).filter(Boolean);

        if (elements.length < 2) return null;  // No common parent for less than 2 elements

        // Start from the first element and traverse its ancestors
        let current: HTMLElement | null = elements[0];
        while (current) {
            if (containsAll(current, elements)) {
                return current;  // Found the common parent
            }
            current = current.parentElement;  // Traverse up
        }

        return null;  // No common ancestor found (edge case)
    }, selectors);

    console.log('First common parent:', commonParent ? commonParent.outerHTML : 'No common parent found');
}


// Main function to execute the script
(async () => {
    const browser = await chromium.launch({ headless: false });
    const fieldStore: FieldStore = {};  // Global store for fields per domain
    let counters = {
        cextractFormFields: 0,
        cfindAllForms: 0,
        ccreateFormSignature: 0,
        cexploreForks: 0,
        mapDynamicForm: 0,
        mapForm: 0,
        matchedInputs: 0,
        clabelContainsInput: 0,
        cisFormEqual: 0,
        cextractFormData: 0,
        cgenerateFieldID: 0,
        cstoreField: 0,
        cgenerateCombinations: 0
    }
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

            console.log(counters)
            // Loop through each form URL and extract data
            // for (const url of domainCredentials.formUrls) {
            //     await extractFormData(fieldStore, page, url, domain, counters);
            // }
            await findAllFormsbad(page, "body", counters)
            await page.pause()
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
    const { loginUrl, postLoginUrl, fields, submitButton, formUrls, loginButton, agreeButton, username, password } = domainCredentials;

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
        await page.goto(formUrls[0])
        page.getByRole('button', { name: 'Tovább' }).click()
        page.getByText('X').nth(4).click()
        page.waitForTimeout(1000)
        await page.pause()

    } catch (error: any) {
        console.error(`Login failed for ${loginUrl}: ${error.message}`);
    }
}


// Compares two form states to determine if they are equal
function isFormEqual(form1: any, form2: any): boolean {

    return JSON.stringify(form1) === JSON.stringify(form2);
}

// Function to extract and store dynamic form data
async function extractFormData(fieldStore: FieldStore, page: Page, url: string, domain: string, counters: any): Promise<void> {
    counters.cextractFormData++

    await page.goto(url);
    const currentForm = await mapDynamicForm(fieldStore, page, domain, counters); // Assuming this function is defined elsewhere
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
function generateFieldID(field: { type: string; name?: string; label?: string; id?: string }, counters: any): string {
    counters.cgenerateFieldID++

    return `${field.type}-${field.name}${field.label ? "-"+field.label:""}${field.id ? "-"+ field.id:""}`;
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
function storeField(fieldStore: FieldStore, domain: string, field: Field, counters: any): string {
    counters.cstoreField++

    if (!fieldStore[domain]) fieldStore[domain] = {};
    const fieldID = generateFieldID(field, counters);

    // If the field doesn't already exist, store it with options
    if (!fieldStore[domain][fieldID]) {
        fieldStore[domain][fieldID] = { ...field };
    }

    return fieldID;
}

// Helper function to generate all combinations of checkbox states
function generateCombinations(options: Array<{ value: string }>, counters: any): string[][] {
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


function findFieldById(fieldRefs: FieldRef[], id: string): FieldRef | undefined {
    return fieldRefs.find((fieldRef) => fieldRef.id === id);
}


function compareFormStateWithFork(state: Fork, fork: Fork[], optionFieldId: string): boolean {
    // Helper function to find a field by its ID in the form state

    // Step 1: Find the field in the form state where the fork occurs
    const fieldInState = findFieldById(state.fork, optionFieldId);

    if (!fieldInState) {
        // If the field with the given optionFieldId is not found in the state, return false
        return false;
    }

    // Step 2: Compare the forks
    function compareForks(fork1: Fork[], fork2: Fork[]): boolean {
        if (fork1.length !== fork2.length) return false;

        for (let i = 0; i < fork1.length; i++) {
            const f1 = fork1[i];
            const f2 = fork2[i];

            // Compare optionValues arrays
            if (f1.optionValues.length !== f2.optionValues.length ||
                !f1.optionValues.every((val, idx) => val === f2.optionValues[idx])) {
                return false;
            }

            // Recursively compare sub-forks
            if (!compareFieldRefs(f1.fork, f2.fork)) {
                return false;
            }
        }

        return true;
    }

    // Step 3: Compare the fieldRefs at the current level
    function compareFieldRefs(stateFieldRefs: FieldRef[], forkFieldRefs: FieldRef[]): boolean {
        if (stateFieldRefs.length !== forkFieldRefs.length) return false;

        for (let i = 0; i < stateFieldRefs.length; i++) {
            const stateFieldRef = stateFieldRefs[i];
            const forkFieldRef = forkFieldRefs[i];

            if (stateFieldRef.id !== forkFieldRef.id) {
                return false;
            }

            // If the field has forks, compare them recursively
            if (stateFieldRef.fork && forkFieldRef.fork) {
                if (!compareForks(stateFieldRef.fork, forkFieldRef.fork)) {
                    return false;
                }
            }
        }

        return true;
    }

    // Step 4: Start comparison from the field level where the option is mapped
    if (fieldInState.fork && fork.length > 0) {
        return compareForks(fieldInState.fork, fork);
    }

    return false;
}

// Your existing form mapping function (stub)
function mapFormToDataStructure(): Fork {
    // This would return the current form's structure in your custom format
    // Placeholder: Replace with your actual implementation
    return { fork: [], optionValues: [] };
}


// Main traversal function
function traverseForm(fieldStore: FieldStore, currentDomain: string) {
    // Initial form snapshot
    let initialFormState = mapFormToDataStructure();
    let visitedForks: Fork[] = [initialFormState]; // Stores visited form states

    function mapFork(fieldRefList: FieldRef[], optionValues: string[]) {
        // Traverse through fields and look for forks
        for (let fieldRef of fieldRefList) {
            let field = fieldStore[currentDomain][fieldRef.id];

            // Check if this field has options (fork-creating field)
            if (field.options && field.options.length > 1) {
                // For each option, select it and compare the new state
                for (let option of field.options) {
                    // Simulate selecting this option in the form (depends on your form interaction logic)
                    // Option's value could be applied here before mapping

                    let newFormState = mapFormToDataStructure(); // Get the updated form structure

                    // Compare new form state with the existing ones
                    let matchingFork = visitedForks.find((fork) => {
                        // compareFormStates(fork, newFormState)
                    });

                    if (matchingFork) {
                        // If it matches an existing fork, add this option's value to the optionValues array
                        // let correspondingFork = fieldRef.fork?.find(f => compareFormStates({ form: f.fork }, matchingFork));
                        // if (correspondingFork) {
                        //     correspondingFork.optionValues.push(option.value);
                        // }
                    } else {
                        // If it's a new form, create a new fork and add it to the fieldRef
                        let newFork: Fork = {
                            optionValues: [option.value],
                            fork: newFormState.fork // Map the new form's structure
                        };

                        if (!fieldRef.fork) {
                            fieldRef.fork = [];
                        }
                        fieldRef.fork.push(newFork);
                        visitedForks.push(newFormState); // Track this new form state
                    }
                }
            }
        }
    }

    // Start with the initial form state
    mapFork(initialFormState.fork, []);
}
