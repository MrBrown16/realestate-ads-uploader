// Function to determine if an element is inside a navigation or menu
export function isInNavOrMenu(element: Element): boolean {
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
            return true; // Exclude if it matches a navigation/menu container
        }
        parent = parent.parentElement;
    }
    return false;
}

// Example of processing inputs and filtering out those in navs/menus
// const allInputs = document.querySelectorAll('input, button'); // Select all inputs and buttons
// const formInputs = Array.from(allInputs).filter(input => !isInNavOrMenu(input));

function collectElementsBySelector(root: Element, selectors: string[]): Map<string, Element[]> {
    const elementMap = new Map<string, Element[]>();
    const seenElements = new Set<Element>(); // Track elements already matched by previous selectors

    selectors.forEach(selector => {
        const elements = Array.from(root.querySelectorAll(selector)); // Get elements for the current selector
        const uniqueElements = elements.filter(el => !seenElements.has(el)); // Filter out already seen elements

        if (uniqueElements.length > 0) {
            elementMap.set(selector, uniqueElements); // Add the elements to the map under the current selector
            uniqueElements.forEach(el => seenElements.add(el)); // Mark these elements as seen
        }
    });

    return elementMap;
}

// Usage
// const selectors = ['input', 'select', 'textarea', 'label', 'button', '.switch-select', '[role="listbox"]'];
// const result = collectElementsBySelector(document as unknown as Element, selectors);

// Example of accessing the result
// result.forEach((elements, selector) => {
//     console.log(`Selector: ${selector} matched elements:`, elements);
// });


function mapForms(){
    let forms = Array.from(document.forms)

    for(let form of forms){
        mapForm(form.elements)
    }
}
function mapForm(formCollection:HTMLFormControlsCollection){
    let form = Array.from(formCollection);
    for(let field of form){
        console.log(field)
        console.log(getLabel(field as HTMLElement))
    }
}

function getLabel(field:HTMLElement){
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement  ) {
        if (field.labels) {
            let label = Array.from(field.labels).reduce((res:string, item:HTMLLabelElement)=>res += item.innerText,"")
            if (label) {
                return label;
            }
        }
    }
    let label;
    while(!label){
        label = findLabelLikeElement(field)
        if (!field.parentElement) {
            break;
        }
        if (field.parentElement instanceof HTMLFormElement) {
            break;
        }
        field = field.parentElement
    }
    return label;
}

function findLabelLikeElement(field:HTMLElement){//TODO: extend with other cases
    if (field instanceof HTMLLabelElement || field.classList.contains("label") || 
        field.id.includes("label") || field.role?.includes("label") || 
        field.dataset?.["id"]?.includes("label") ) {
        
        if (field.innerText) {
            return field.innerText;
        }    
    }
    return;
}


// function sortByDocumentOrderComplex(elements: (HTMLElement | SelectOptions)[]) {
//     return elements.sort((a, b) => {
//         let aElement = a as HTMLElement;
//         let bElement = b as HTMLElement;
//         if (a instanceof SelectOptions) {
//             aElement = a.parent;
//         }
//         if (b instanceof SelectOptions) {
//             bElement = b.parent;
//         }
//         return aElement.compareDocumentPosition(bElement) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
//     });
// }