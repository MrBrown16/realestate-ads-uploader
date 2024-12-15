"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var playwright_1 = require("playwright");
// Utility function to extract form fields while preserving their order and maintaining element handles
var extractFormFields = function (container, counters) { return __awaiter(void 0, void 0, void 0, function () {
    var formElements;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                counters.cextractFormFields++;
                return [4 /*yield*/, container.$$('input, textarea, select, button, label')];
            case 1:
                formElements = _a.sent();
                return [2 /*return*/, formElements]; // Keep the reference to each form element (ElementHandle)
        }
    });
}); };
var findAllFormsbad = function (page, selector, counters) { return __awaiter(void 0, void 0, void 0, function () {
    var result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, page.evaluate(collectElements, { selector: selector, isInNavOrMenu: isInNavOrMenu })];
            case 1:
                result = _a.sent();
                console.log("result: ", result);
                return [2 /*return*/, result];
        }
    });
}); };
// Function to recursively collect inputs, selects, textareas, and labels
function collectElements(par) {
    var elements = [];
    var root = document.querySelector(par.selector);
    var isnm = par.isInNavOrMenu;
    // const root = document.querySelector(selector);
    if (!root)
        return elements;
    // Select all relevant form elements: inputs, selects, textareas, and labels
    var formElements = root.querySelectorAll('input, select, textarea, label, button');
    formElements.forEach(function (element) {
        elements.push(element);
        // Collect options if it's a <select> element
        if (element.tagName.toLowerCase() === 'select') {
            var options = Array.from(element.options);
            options.forEach(function (option) {
                elements.push(option);
            });
        }
    });
    // Recursively handle shadow DOMs
    root.querySelectorAll("*").forEach(function (el) {
        if (el.shadowRoot) {
            var shadowSelector = (el === null || el === void 0 ? void 0 : el.id) || (el === null || el === void 0 ? void 0 : el.nodeName);
            var shadowChildren = collectElements({ selector: shadowSelector, isInNavOrMenu: isnm });
            elements.push.apply(elements, shadowChildren);
        }
    });
    var formInputs = Array.from(elements).filter(function (input) { return !par.isInNavOrMenu(input); });
    return formInputs;
}
function isInNavOrMenu(element) {
    var navSelectors = [
        'nav', 'header', 'footer', '.sidebar', '.menu', '.navbar',
        '.toolbar', '.pagination', '.breadcrumbs', '.search-bar',
        '.dropdown-menu', '#ad', '.ad', '.advertisement', '.banner',
        '.sponsored', '.promo', '.cta', '.widget', '.gadgets', '.card',
        '#top-bar', '.top-bar', '#bottom-bar', '.bottom-bar', '.sticky-footer',
        '.site-header', '.site-footer', '.overlay', '.toast', '.notification', '.alert',
        '.social', '.social-share', '.social-media', '.carousel', '.slider',
        '.nav-list', '.nav-item'
    ];
    var parent = element.parentElement;
    while (parent) {
        if (navSelectors.some(function (selector) { return parent.matches(selector); })) {
            return true; // Exclude if it matches a navigation/menu container
        }
        parent = parent.parentElement;
    }
    return false;
}
// // Function to recursively collect inputs, selects, textareas, and labels
// function collectElements(selector:string) {
//     const elements: Array<{ type: string, tag: string, outerHTML: string }> = [];
//     const root = document.querySelector(selector);
//     // const root = document.querySelector(selector);
//     if (!root) return elements;
//     // Select all relevant form elements: inputs, selects, textareas, and labels
//     const formElements = root.querySelectorAll('input, select, textarea, label, button');
//     formElements.forEach((element) => {
//       elements.push({
//         type: 'light-dom',
//         tag: element.tagName.toLowerCase(),
//         outerHTML: element.outerHTML,
//     });
//     // Collect options if it's a <select> element
//     if (element.tagName.toLowerCase() === 'select') {
//         const options = Array.from((element as HTMLSelectElement).options);
//         options.forEach((option) => {
//             elements.push({
//                 type: 'select-option',
//                 tag: 'option',
//                 outerHTML: option.outerHTML,
//             });
//         });
//     }
// });
// // Recursively handle shadow DOMs
// root.querySelectorAll("*").forEach((el: Element) => {
//     if (el.shadowRoot) {
//         const shadowSelector = el?.id || el?.nodeName
//         const shadowChildren = collectElements(shadowSelector);
//         elements.push(...shadowChildren);
//     }
// });
// return elements;
// }
var findAllForms = function (page, counters) { return __awaiter(void 0, void 0, void 0, function () {
    var formElements, formLikeContainers, frameworkSpecificElements, allContainers, uniqueForms, seenSignatures, _i, allContainers_1, container, formFields, formSignature;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                counters.cfindAllForms++;
                return [4 /*yield*/, page.$$('form, input, textarea, select, button, ' +
                        '[role="form"], [aria-label*="form"], ' +
                        '[type="submit"], [type="button"], [contenteditable="true"]')];
            case 1:
                formElements = _a.sent();
                return [4 /*yield*/, page.$$('div:has(input), section:has(input), ' +
                        'div:has(textarea), div:has(select), fieldset, legend, ' +
                        '[data-form], [data-role*="form"], [data-type="form"], ' +
                        '[id*="form"], [class*="form"], [id*="login"], [class*="login"], ' +
                        'form[style*="display:none"], div[style*="display:none"], ' +
                        'dialog form, dialog:has(input), [role="dialog"]:has(form), ' +
                        'nav:has(input), article:has(input), aside:has(input), ' +
                        'table:has(input), ul:has(input), li:has(input)')];
            case 2:
                formLikeContainers = _a.sent();
                return [4 /*yield*/, page.$$('[ng-form], [ng-model], [v-model], [data-reactid], ' +
                        '.form-control, .input-group, .form-group:has(input)')];
            case 3:
                frameworkSpecificElements = _a.sent();
                allContainers = __spreadArray(__spreadArray(__spreadArray([], formElements, true), formLikeContainers, true), frameworkSpecificElements, true);
                uniqueForms = [];
                seenSignatures = new Set();
                _i = 0, allContainers_1 = allContainers;
                _a.label = 4;
            case 4:
                if (!(_i < allContainers_1.length)) return [3 /*break*/, 8];
                container = allContainers_1[_i];
                return [4 /*yield*/, extractFormFields(container, counters)];
            case 5:
                formFields = _a.sent();
                return [4 /*yield*/, createFormSignature(formFields, counters)];
            case 6:
                formSignature = _a.sent();
                // Add only unique forms by signature
                if (!seenSignatures.has(formSignature)) {
                    seenSignatures.add(formSignature);
                    uniqueForms.push({ signature: formSignature, container: container, fields: formFields }); // Keep container and fields' live handles
                }
                _a.label = 7;
            case 7:
                _i++;
                return [3 /*break*/, 4];
            case 8: return [2 /*return*/, uniqueForms];
        }
    });
}); };
// Function to create a signature for a form based on its fields
var createFormSignature = function (formFields, counters) { return __awaiter(void 0, void 0, void 0, function () {
    var signatures;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                counters.ccreateFormSignature++;
                return [4 /*yield*/, Promise.all(formFields.map(function (field) { return __awaiter(void 0, void 0, void 0, function () {
                        var tag, id, name;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, field.evaluate(function (node) { return node.tagName.toLowerCase(); })];
                                case 1:
                                    tag = _a.sent();
                                    return [4 /*yield*/, field.getAttribute('id')];
                                case 2:
                                    id = _a.sent();
                                    return [4 /*yield*/, field.getAttribute('name')];
                                case 3:
                                    name = _a.sent();
                                    return [2 /*return*/, "".concat(tag, "-").concat(id || name || '')];
                            }
                        });
                    }); }))];
            case 1:
                signatures = _a.sent();
                // Join all field signatures into a single string
                return [2 /*return*/, signatures.join('|')];
        }
    });
}); };
// Load credentials from JSON file
var credentials = JSON.parse(fs.readFileSync('./scripts/credentials.json', 'utf-8'));
// async function exploreForks(initialForm: Field[], currentFormData: Array<{ field: string; forks?: any }>, page: Page, domain: string) {
function exploreForks(initialForm, currentFormData, fieldStore, page, domain, counters) {
    return __awaiter(this, void 0, void 0, function () {
        var formState, _i, formState_1, field, fieldID, forks, options, combinations, _loop_1, _a, combinations_1, combination, _loop_2, _b, options_1, option, fieldID;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    formState = initialForm;
                    counters.cexploreForks++;
                    _i = 0, formState_1 = formState;
                    _c.label = 1;
                case 1:
                    if (!(_i < formState_1.length)) return [3 /*break*/, 16];
                    field = formState_1[_i];
                    if (!['select', 'radio', 'checkbox'].includes(field.type)) return [3 /*break*/, 14];
                    fieldID = storeField(fieldStore, domain, __assign(__assign({}, field), { options: field.options }), counters);
                    forks = [];
                    options = void 0;
                    if (!(field.options && field.options.length > 0)) return [3 /*break*/, 2];
                    options = field.options; // Use field.options if defined
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, page.$$eval("input[name=\"".concat(field.name, "\"]"), function (inputs) {
                        return inputs.map(function (input) {
                            var _a, _b;
                            return ({
                                value: input.value,
                                text: ((_b = (_a = input.nextSibling) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || '', // Fallback to an empty string
                                checked: input.checked || false
                            });
                        });
                    })];
                case 3:
                    //TODO: not only find by name
                    options = _c.sent();
                    _c.label = 4;
                case 4:
                    if (!(field.type === 'checkbox')) return [3 /*break*/, 9];
                    combinations = generateCombinations(options, counters);
                    _loop_1 = function (combination) {
                        var _d, options_2, option, updatedForm, remainingForm, nestedFork_1, existingFork;
                        var _e;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    _d = 0, options_2 = options;
                                    _f.label = 1;
                                case 1:
                                    if (!(_d < options_2.length)) return [3 /*break*/, 6];
                                    option = options_2[_d];
                                    if (!combination.includes(option.value)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, page.check("input[name=\"".concat(field.name, "\"][value=\"").concat(option.value, "\"]"))];
                                case 2:
                                    _f.sent();
                                    return [3 /*break*/, 5];
                                case 3: return [4 /*yield*/, page.uncheck("input[name=\"".concat(field.name, "\"][value=\"").concat(option.value, "\"]"))];
                                case 4:
                                    _f.sent();
                                    _f.label = 5;
                                case 5:
                                    _d++;
                                    return [3 /*break*/, 1];
                                case 6: return [4 /*yield*/, page.waitForTimeout(10)];
                                case 7:
                                    _f.sent(); // Adjust wait time based on site speed
                                    return [4 /*yield*/, mapForm(fieldStore, page, domain, counters)];
                                case 8:
                                    updatedForm = _f.sent();
                                    remainingForm = updatedForm.filter(function (updatedField) { return !formState.some(function (f) { return f.id === updatedField.id; }); });
                                    if (!(remainingForm.length > 0)) return [3 /*break*/, 10];
                                    nestedFork_1 = {
                                        optionValues: [],
                                        fork: []
                                    };
                                    return [4 /*yield*/, exploreForks(remainingForm, nestedFork_1, fieldStore, page, domain, counters)];
                                case 9:
                                    _f.sent();
                                    existingFork = forks.find(function (fork) {
                                        return JSON.stringify(fork.fork) === JSON.stringify(nestedFork_1) ||
                                            JSON.stringify(fork.fork) === JSON.stringify(remainingForm.map(function (f) { return ({ field: storeField(fieldStore, domain, f, counters) }); }));
                                    });
                                    if (existingFork) {
                                        (_e = existingFork.optionValues).push.apply(_e, combination);
                                    }
                                    else {
                                        forks.push({
                                            'optionValues': __spreadArray([], combination, true),
                                            'fork': nestedFork_1.fork.length > 0 ? nestedFork_1.fork : remainingForm.map(function (f) { return ({ id: storeField(fieldStore, domain, f, counters) }); })
                                        });
                                    }
                                    _f.label = 10;
                                case 10:
                                    formState = updatedForm; // Update the current state of the form
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _a = 0, combinations_1 = combinations;
                    _c.label = 5;
                case 5:
                    if (!(_a < combinations_1.length)) return [3 /*break*/, 8];
                    combination = combinations_1[_a];
                    return [5 /*yield**/, _loop_1(combination)];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8: return [3 /*break*/, 13];
                case 9:
                    _loop_2 = function (option) {
                        var updatedForm, remainingForm, nestedFork_2, existingFork;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0:
                                    if (!(field.type !== 'select' && !option.checked)) return [3 /*break*/, 2];
                                    return [4 /*yield*/, page.check("input[name=\"".concat(field.name, "\"][value=\"").concat(option.value, "\"]"))];
                                case 1:
                                    _g.sent();
                                    return [3 /*break*/, 4];
                                case 2:
                                    if (!(field.type === 'select')) return [3 /*break*/, 4];
                                    console.log("field:", field.name, "option.text: ", option.text);
                                    return [4 /*yield*/, page.selectOption("select[name=\"".concat(field.name, "\"]"), option.value)];
                                case 3:
                                    _g.sent();
                                    _g.label = 4;
                                case 4: return [4 /*yield*/, page.waitForTimeout(10)];
                                case 5:
                                    _g.sent(); // Adjust wait time based on site speed
                                    return [4 /*yield*/, mapForm(fieldStore, page, domain, counters)];
                                case 6:
                                    updatedForm = _g.sent();
                                    remainingForm = updatedForm.filter(function (updatedField) { return !formState.some(function (f) { return f.id === updatedField.id; }); });
                                    if (!(remainingForm.length > 0)) return [3 /*break*/, 8];
                                    nestedFork_2 = {
                                        optionValues: [],
                                        fork: []
                                    };
                                    return [4 /*yield*/, exploreForks(remainingForm, nestedFork_2, fieldStore, page, domain, counters)];
                                case 7:
                                    _g.sent();
                                    existingFork = forks.find(function (fork) {
                                        return JSON.stringify(fork.fork) === JSON.stringify(nestedFork_2) ||
                                            JSON.stringify(fork.fork) === JSON.stringify(remainingForm.map(function (f) { return ({ field: storeField(fieldStore, domain, f, counters) }); }));
                                    });
                                    if (existingFork) {
                                        existingFork.optionValues.push(option.value);
                                    }
                                    else {
                                        forks.push({
                                            'optionValues': [option.value],
                                            'fork': nestedFork_2.fork.length > 0 ? nestedFork_2.fork : remainingForm.map(function (f) { return ({ id: storeField(fieldStore, domain, f, counters) }); })
                                        });
                                    }
                                    _g.label = 8;
                                case 8:
                                    formState = updatedForm; // Update the current state of the form
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _b = 0, options_1 = options;
                    _c.label = 10;
                case 10:
                    if (!(_b < options_1.length)) return [3 /*break*/, 13];
                    option = options_1[_b];
                    return [5 /*yield**/, _loop_2(option)];
                case 11:
                    _c.sent();
                    _c.label = 12;
                case 12:
                    _b++;
                    return [3 /*break*/, 10];
                case 13:
                    currentFormData.fork.push({
                        id: fieldID,
                        fork: forks.length > 0 ? forks : undefined
                    });
                    return [3 /*break*/, 15];
                case 14:
                    if (['input', 'textarea'].includes(field.type)) {
                        fieldID = storeField(fieldStore, domain, __assign(__assign({}, field), { options: [] }), counters);
                        currentFormData.fork.push({
                            id: fieldID
                        });
                    }
                    _c.label = 15;
                case 15:
                    _i++;
                    return [3 /*break*/, 1];
                case 16: return [2 /*return*/];
            }
        });
    });
}
function mapDynamicForm(fieldStore, page, domain, counters) {
    return __awaiter(this, void 0, void 0, function () {
        var initialFork, initialField, initialForm;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    counters.mapDynamicForm++;
                    initialFork = {
                        optionValues: ['a'],
                        fork: []
                    };
                    initialField = {
                        id: '',
                        fork: []
                    };
                    return [4 /*yield*/, mapForm(fieldStore, page, domain, counters)];
                case 1:
                    initialForm = _b.sent();
                    return [4 /*yield*/, exploreForks(initialForm, initialFork, fieldStore, page, domain, counters)];
                case 2:
                    _b.sent();
                    (_a = initialField.fork) === null || _a === void 0 ? void 0 : _a.push(initialFork);
                    return [2 /*return*/, initialField];
            }
        });
    });
}
function mapForm(fieldStore, page, domain, counters) {
    return __awaiter(this, void 0, void 0, function () {
        var uniqueForms, inputs, labels, _i, uniqueForms_1, container, elements, _loop_3, _a, elements_1, el, matchedInputs;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    counters.mapForm++;
                    return [4 /*yield*/, findAllForms(page, counters)];
                case 1:
                    uniqueForms = _c.sent();
                    inputs = [];
                    labels = [];
                    _i = 0, uniqueForms_1 = uniqueForms;
                    _c.label = 2;
                case 2:
                    if (!(_i < uniqueForms_1.length)) return [3 /*break*/, 8];
                    container = uniqueForms_1[_i].container;
                    return [4 /*yield*/, container.$$('label, input, textarea, select')];
                case 3:
                    elements = _c.sent();
                    _loop_3 = function (el) {
                        var tagName, _d, htmlFor, textContent, fieldProperties, field_1, _e, existingRadioGroup;
                        var _f;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0: return [4 /*yield*/, el.evaluate(function (node) { return node.tagName.toLowerCase(); })];
                                case 1:
                                    tagName = _g.sent();
                                    if (!(tagName === 'label')) return [3 /*break*/, 3];
                                    return [4 /*yield*/, el.evaluate(function (label) {
                                            var _a;
                                            if (label instanceof HTMLLabelElement) {
                                                // Perform a type check to ensure it's an HTMLLabelElement
                                                return {
                                                    htmlFor: label.htmlFor || null,
                                                    textContent: ((_a = label.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''
                                                };
                                            }
                                            return {
                                                htmlFor: null,
                                                textContent: ''
                                            };
                                        })];
                                case 2:
                                    _d = _g.sent(), htmlFor = _d.htmlFor, textContent = _d.textContent;
                                    if (htmlFor) {
                                        labels.push({
                                            htmlFor: htmlFor,
                                            textContent: textContent,
                                            label: el
                                        });
                                    }
                                    return [3 /*break*/, 8];
                                case 3: return [4 /*yield*/, el.evaluate(function (el) {
                                        var id = '';
                                        var name = '';
                                        var value = '';
                                        var type = '';
                                        var required = false;
                                        var checked = false;
                                        var options;
                                        if (el instanceof HTMLInputElement) {
                                            id = el.id || el.name;
                                            name = el.name;
                                            value = el.value || '';
                                            type = el.type;
                                            required = el.required;
                                            checked = el.checked;
                                        }
                                        else if (el instanceof HTMLTextAreaElement) {
                                            id = el.id || el.name;
                                            name = el.name;
                                            value = el.value || '';
                                            type = 'textarea';
                                            required = el.required;
                                        }
                                        else if (el instanceof HTMLSelectElement) {
                                            id = el.id || el.name;
                                            name = el.name;
                                            type = 'select';
                                            required = el.required;
                                            options = Array.from(el.options).map(function (opt) {
                                                var _a;
                                                return ({
                                                    value: opt.value,
                                                    text: ((_a = opt.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '',
                                                    checked: false
                                                });
                                            });
                                        }
                                        return {
                                            id: id,
                                            name: name,
                                            type: type,
                                            required: required,
                                            value: value,
                                            checked: checked,
                                            options: options
                                        };
                                    })];
                                case 4:
                                    fieldProperties = _g.sent();
                                    _f = {
                                        id: fieldProperties.id,
                                        name: fieldProperties.name,
                                        type: fieldProperties.type,
                                        required: fieldProperties.required,
                                        value: fieldProperties.type === 'checkbox' ? fieldProperties.checked ? fieldProperties.value : '' : fieldProperties.value
                                    };
                                    if (!fieldProperties.id) return [3 /*break*/, 6];
                                    return [4 /*yield*/, labelContainsInput(page, fieldProperties.id, counters)];
                                case 5:
                                    _e = _g.sent();
                                    return [3 /*break*/, 7];
                                case 6:
                                    _e = null;
                                    _g.label = 7;
                                case 7:
                                    field_1 = (_f.labelText = _e,
                                        _f);
                                    if (fieldProperties.type === 'checkbox') {
                                        field_1.options = [{
                                                value: field_1.value || 'on',
                                                text: '',
                                                checked: fieldProperties.checked
                                            }];
                                    }
                                    else if (fieldProperties.type === 'radio') {
                                        existingRadioGroup = inputs.find(function (input) { return input.name === field_1.name && input.type === 'radio'; });
                                        if (existingRadioGroup) {
                                            (_b = existingRadioGroup.options) === null || _b === void 0 ? void 0 : _b.push({
                                                value: fieldProperties.value,
                                                text: '',
                                                checked: fieldProperties.checked
                                            });
                                        }
                                        else {
                                            inputs.push(__assign(__assign({}, field_1), { options: [{
                                                        value: fieldProperties.value,
                                                        text: '',
                                                        checked: fieldProperties.checked
                                                    }] }));
                                        }
                                        return [2 /*return*/, "continue"];
                                    }
                                    else if (fieldProperties.type === 'textarea') {
                                        field_1.value = fieldProperties.value;
                                    }
                                    else if (fieldProperties.type === 'select') {
                                        field_1.options = fieldProperties.options;
                                    }
                                    inputs.push(field_1);
                                    _g.label = 8;
                                case 8: return [2 /*return*/];
                            }
                        });
                    };
                    _a = 0, elements_1 = elements;
                    _c.label = 4;
                case 4:
                    if (!(_a < elements_1.length)) return [3 /*break*/, 7];
                    el = elements_1[_a];
                    return [5 /*yield**/, _loop_3(el)];
                case 5:
                    _c.sent();
                    _c.label = 6;
                case 6:
                    _a++;
                    return [3 /*break*/, 4];
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8: return [4 /*yield*/, page.evaluate(function (_a) {
                        var labels = _a.labels, inputs = _a.inputs, counters = _a.counters;
                        counters.matchedInputs++;
                        return inputs.map(function (input) {
                            var _a, _b;
                            var matchingLabel = null;
                            // Strategy 1: Find label with matching 'for' attribute
                            if (input.id) {
                                matchingLabel = labels.find(function (label) { return label.htmlFor === input.id; }) || input.labelText ? { texContent: input.labelText } : null;
                            }
                            // Strategy 2: Check if input has an associated label text
                            if (!matchingLabel && input.id) {
                                if (input.labelText && input.labelText.length > 0) {
                                    matchingLabel = { textContent: input.labelText };
                                }
                            }
                            // Strategy 3: Check previous sibling
                            if (!matchingLabel && input.id) {
                                var inputElement = document.querySelector("[id=\"".concat(input.id, "\"]"));
                                var prevSibling = inputElement === null || inputElement === void 0 ? void 0 : inputElement.previousElementSibling;
                                if (prevSibling && prevSibling.tagName.toLowerCase() === 'label') {
                                    matchingLabel = {
                                        textContent: ((_a = prevSibling.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''
                                    };
                                }
                            }
                            // Strategy 4: Check if input and label are in the same parent container
                            if (!matchingLabel && input.id) {
                                var inputElement_1 = document.querySelector("[id=\"".concat(input.id, "\"]"));
                                var parent_1 = inputElement_1 === null || inputElement_1 === void 0 ? void 0 : inputElement_1.parentElement;
                                if (parent_1) {
                                    var parentLabel = Array.from(parent_1.querySelectorAll('label')).find(function (label) { return parent_1.contains(inputElement_1); });
                                    if (parentLabel) {
                                        matchingLabel = {
                                            textContent: ((_b = parentLabel.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || ''
                                        };
                                    }
                                }
                            }
                            // Debugging log to help identify where it fails
                            if (!matchingLabel) {
                                console.warn("No matching label found for input with ID or name: ".concat(input.id || input.name));
                            }
                            // Strategy 5: Use placeholder as a fallback if no label is found
                            if (!matchingLabel && input.placeholder) {
                                matchingLabel = {
                                    textContent: input.placeholder.trim()
                                };
                            }
                            // Return the input with its matched label (if found)
                            return __assign(__assign({}, input), { labelText: matchingLabel ? matchingLabel.textContent : null });
                        });
                    }, { labels: labels, inputs: inputs, counters: counters })];
                case 9:
                    matchedInputs = _c.sent();
                    inputs.forEach(function (input) {
                        storeField(fieldStore, domain, input, counters);
                    });
                    return [2 /*return*/, matchedInputs];
            }
        });
    });
}
function labelContainsInput(page, id, counters) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            counters.clabelContainsInput++;
            return [2 /*return*/, page.evaluate(function (inputId) {
                    var _a;
                    // Find the input element by ID
                    var input = document.getElementById(inputId);
                    if (!input)
                        return null;
                    // Strategy 2: Check if the input is directly inside a label element
                    var parent = input.parentElement;
                    while (parent) {
                        if (parent.tagName.toLowerCase() === 'label') {
                            return ((_a = parent.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || null;
                        }
                        parent = parent.parentElement;
                    }
                    return null; // No label found
                }, id)];
        });
    });
}
function findFirstCommonParent(page, selectors) {
    return __awaiter(this, void 0, void 0, function () {
        var commonParent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, page.evaluate(function (selectors) {
                        // Helper function to check if an element contains all other elements
                        function containsAll(container, elements) {
                            return elements.every(function (el) { return container.contains(el); });
                        }
                        // Get the elements based on the selectors
                        var elements = selectors.map(function (sel) { return document.querySelector(sel); }).filter(Boolean);
                        if (elements.length < 2)
                            return null; // No common parent for less than 2 elements
                        // Start from the first element and traverse its ancestors
                        var current = elements[0];
                        while (current) {
                            if (containsAll(current, elements)) {
                                return current; // Found the common parent
                            }
                            current = current.parentElement; // Traverse up
                        }
                        return null; // No common ancestor found (edge case)
                    }, selectors)];
                case 1:
                    commonParent = _a.sent();
                    console.log('First common parent:', commonParent ? commonParent.outerHTML : 'No common parent found');
                    return [2 /*return*/];
            }
        });
    });
}
// Main function to execute the script
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var browser, fieldStore, counters, _a, _b, _c, _i, domain, domainCredentials, context, page, error_1;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0: return [4 /*yield*/, playwright_1.chromium.launch({ headless: false })];
            case 1:
                browser = _d.sent();
                fieldStore = {};
                counters = {
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
                };
                _d.label = 2;
            case 2:
                _d.trys.push([2, 13, 14, 16]);
                _a = credentials;
                _b = [];
                for (_c in _a)
                    _b.push(_c);
                _i = 0;
                _d.label = 3;
            case 3:
                if (!(_i < _b.length)) return [3 /*break*/, 12];
                _c = _b[_i];
                if (!(_c in _a)) return [3 /*break*/, 11];
                domain = _c;
                domainCredentials = credentials[domain];
                return [4 /*yield*/, browser.newContext()];
            case 4:
                context = _d.sent();
                return [4 /*yield*/, context.newPage()];
            case 5:
                page = _d.sent();
                return [4 /*yield*/, setupPopUpObserver(page)];
            case 6:
                _d.sent();
                // Perform login using the data-driven credentials
                return [4 /*yield*/, loginToSitezenga(page, domainCredentials)];
            case 7:
                // Perform login using the data-driven credentials
                _d.sent();
                // await loginToSiteszuperpiac(page, domainCredentials);
                console.log(counters);
                // Loop through each form URL and extract data
                // for (const url of domainCredentials.formUrls) {
                //     await extractFormData(fieldStore, page, url, domain, counters);
                // }
                return [4 /*yield*/, findAllFormsbad(page, "body", counters)];
            case 8:
                // Loop through each form URL and extract data
                // for (const url of domainCredentials.formUrls) {
                //     await extractFormData(fieldStore, page, url, domain, counters);
                // }
                _d.sent();
                return [4 /*yield*/, page.pause()
                    // // Find all unique forms on the page with their ordered fields
                    // const allForms = await findAllForms(page); // Assuming this function is defined elsewhere
                    // // Log or process the forms and their fields in original order
                    // allForms.forEach((form, index) => {
                    //     console.log(`Form ${index + 1}:`);
                    //     form.fields.forEach(field => {
                    //         console.log(`- ${field.type} (id: ${field.getAttribute('id')}, name: ${field.asElement.name})`);
                    //     });
                    // });
                ];
            case 9:
                _d.sent();
                // // Find all unique forms on the page with their ordered fields
                // const allForms = await findAllForms(page); // Assuming this function is defined elsewhere
                // // Log or process the forms and their fields in original order
                // allForms.forEach((form, index) => {
                //     console.log(`Form ${index + 1}:`);
                //     form.fields.forEach(field => {
                //         console.log(`- ${field.type} (id: ${field.getAttribute('id')}, name: ${field.asElement.name})`);
                //     });
                // });
                console.log(counters);
                fs.writeFileSync('results/field_store.json', JSON.stringify(fieldStore, null, 2));
                console.log('Field store saved to field_store.json.');
                return [4 /*yield*/, context.close()];
            case 10:
                _d.sent();
                _d.label = 11;
            case 11:
                _i++;
                return [3 /*break*/, 3];
            case 12: return [3 /*break*/, 16];
            case 13:
                error_1 = _d.sent();
                console.error("Error encountered: ".concat(error_1.message));
                return [3 /*break*/, 16];
            case 14: return [4 /*yield*/, browser.close()];
            case 15:
                _d.sent();
                return [7 /*endfinally*/];
            case 16: return [2 /*return*/];
        }
    });
}); })().catch(console.error);
// Function to log in to a site with data-driven credentials
function loginToSiteszuperpiac(page, domainCredentials) {
    return __awaiter(this, void 0, void 0, function () {
        var loginUrl, postLoginUrl, fields, submitButton, agreeButton, username, password, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    loginUrl = domainCredentials.loginUrl, postLoginUrl = domainCredentials.postLoginUrl, fields = domainCredentials.fields, submitButton = domainCredentials.submitButton, agreeButton = domainCredentials.agreeButton, username = domainCredentials.username, password = domainCredentials.password;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, page.goto(loginUrl)];
                case 2:
                    _a.sent();
                    if (!agreeButton) return [3 /*break*/, 4];
                    return [4 /*yield*/, page.click(agreeButton)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: 
                // Fill the login form using data-driven field selectors
                return [4 /*yield*/, page.fill(fields.username, username)];
                case 5:
                    // Fill the login form using data-driven field selectors
                    _a.sent();
                    return [4 /*yield*/, page.fill(fields.password, password)];
                case 6:
                    _a.sent();
                    // Submit login form
                    return [4 /*yield*/, page.click(submitButton)];
                case 7:
                    // Submit login form
                    _a.sent();
                    // Wait for successful navigation or page load
                    return [4 /*yield*/, page.waitForURL(postLoginUrl)];
                case 8:
                    // Wait for successful navigation or page load
                    _a.sent();
                    return [3 /*break*/, 10];
                case 9:
                    error_2 = _a.sent();
                    console.error("Login failed for ".concat(loginUrl, ": ").concat(error_2.message));
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
// Function to log in to a site with data-driven credentials
function loginToSitezenga(page, domainCredentials) {
    return __awaiter(this, void 0, void 0, function () {
        var loginUrl, postLoginUrl, fields, submitButton, formUrls, loginButton, agreeButton, username, password, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    loginUrl = domainCredentials.loginUrl, postLoginUrl = domainCredentials.postLoginUrl, fields = domainCredentials.fields, submitButton = domainCredentials.submitButton, formUrls = domainCredentials.formUrls, loginButton = domainCredentials.loginButton, agreeButton = domainCredentials.agreeButton, username = domainCredentials.username, password = domainCredentials.password;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 13, , 14]);
                    return [4 /*yield*/, page.goto(loginUrl)];
                case 2:
                    _a.sent();
                    if (!loginButton) return [3 /*break*/, 4];
                    return [4 /*yield*/, page.click(loginButton)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    if (!agreeButton) return [3 /*break*/, 6];
                    return [4 /*yield*/, page.click(agreeButton)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: 
                // Fill the login form using data-driven field selectors
                return [4 /*yield*/, page.fill(fields.username, username)];
                case 7:
                    // Fill the login form using data-driven field selectors
                    _a.sent();
                    return [4 /*yield*/, page.fill(fields.password, password)];
                case 8:
                    _a.sent();
                    // Submit login form
                    return [4 /*yield*/, page.click(submitButton)];
                case 9:
                    // Submit login form
                    _a.sent();
                    // Wait for successful navigation or page load
                    return [4 /*yield*/, page.waitForURL(postLoginUrl)];
                case 10:
                    // Wait for successful navigation or page load
                    _a.sent();
                    return [4 /*yield*/, page.goto(formUrls[0])];
                case 11:
                    _a.sent();
                    page.getByRole('button', { name: 'Tovább' }).click();
                    page.waitForTimeout(1000);
                    return [4 /*yield*/, page.pause()];
                case 12:
                    _a.sent();
                    return [3 /*break*/, 14];
                case 13:
                    error_3 = _a.sent();
                    console.error("Login failed for ".concat(loginUrl, ": ").concat(error_3.message));
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
// Compares two form states to determine if they are equal
function isFormEqual(form1, form2) {
    return JSON.stringify(form1) === JSON.stringify(form2);
}
// Function to extract and store dynamic form data
function extractFormData(fieldStore, page, url, domain, counters) {
    return __awaiter(this, void 0, void 0, function () {
        var currentForm, sanitizedUrl, baseFilename, version, filePath, existingData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    counters.cextractFormData++;
                    return [4 /*yield*/, page.goto(url)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, mapDynamicForm(fieldStore, page, domain, counters)];
                case 2:
                    currentForm = _a.sent();
                    console.log("currentForm: ", currentForm);
                    sanitizedUrl = url.replace(/[^a-z0-9]/gi, '').toLowerCase();
                    baseFilename = "".concat(sanitizedUrl, "_form_data");
                    version = 1;
                    filePath = "results/".concat(baseFilename, "_v").concat(version, ".json");
                    // Check if the file already exists and if the content matches
                    if (fs.existsSync(filePath)) {
                        existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                        // Check if the current form is different from the existing one
                        if (!isFormEqual(currentForm, existingData)) {
                            while (fs.existsSync("results/".concat(baseFilename, "_v").concat(version, ".json"))) {
                                version++;
                            }
                        }
                    }
                    filePath = "results/".concat(baseFilename, "_v").concat(version, ".json");
                    // Write the current form data to the determined file
                    fs.writeFileSync(filePath, JSON.stringify(currentForm, null, 2));
                    console.log("Form data saved to ".concat(filePath, "."));
                    return [2 /*return*/];
            }
        });
    });
}
// Generates a unique ID for each field based on its properties
function generateFieldID(field, counters) {
    counters.cgenerateFieldID++;
    return "".concat(field.type, "-").concat(field.name || field.label || field.id);
}
// Sets up an observer for pop-ups on the page
function setupPopUpObserver(page) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, page.evaluate(function () {
                        // Define the pop-up observer
                        var observer = new MutationObserver(function (mutationsList) {
                            for (var _i = 0, mutationsList_1 = mutationsList; _i < mutationsList_1.length; _i++) {
                                var mutation = mutationsList_1[_i];
                                if (mutation.type === 'childList') {
                                    // Detect the pop-up elements based on specific selectors or patterns
                                    var popUpButtons = document.querySelectorAll([
                                        '.fc-button.fc-vendor-preferences-accept-all',
                                        '.fc-button.fc-confirm-choices',
                                        'button[aria-label="Az összes elfogadása"]',
                                        'button[aria-label="Választások megerősítése"]',
                                    ].join(','));
                                    if (popUpButtons.length > 0) {
                                        console.log('Pop-up detected, attempting to dismiss...');
                                        popUpButtons.forEach(function (button) { return button.click(); }); // Click on all matching buttons
                                        observer.disconnect(); // Stop observing once the pop-up is handled
                                    }
                                }
                            }
                        });
                        // Start observing the entire document for child node additions (like pop-ups being injected)
                        observer.observe(document.body, { childList: true, subtree: true });
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Store the field under the specific domain in the fieldStore
function storeField(fieldStore, domain, field, counters) {
    counters.cstoreField++;
    if (!fieldStore[domain])
        fieldStore[domain] = {};
    var fieldID = generateFieldID(field, counters);
    // If the field doesn't already exist, store it with options
    if (!fieldStore[domain][fieldID]) {
        fieldStore[domain][fieldID] = __assign({}, field);
    }
    return fieldID;
}
// Helper function to generate all combinations of checkbox states
function generateCombinations(options, counters) {
    counters.cgenerateCombinations++;
    var result = [];
    var totalCombinations = 1 << options.length; // 2^number_of_checkboxes
    for (var i = 0; i < totalCombinations; i++) {
        var combination = [];
        for (var j = 0; j < options.length; j++) {
            if (i & (1 << j)) {
                combination.push(options[j].value);
            }
        }
        result.push(combination);
    }
    return result;
}
function findFieldById(fieldRefs, id) {
    return fieldRefs.find(function (fieldRef) { return fieldRef.id === id; });
}
function compareFormStateWithFork(state, fork, optionFieldId) {
    // Helper function to find a field by its ID in the form state
    // Step 1: Find the field in the form state where the fork occurs
    var fieldInState = findFieldById(state.fork, optionFieldId);
    if (!fieldInState) {
        // If the field with the given optionFieldId is not found in the state, return false
        return false;
    }
    // Step 2: Compare the forks
    function compareForks(fork1, fork2) {
        if (fork1.length !== fork2.length)
            return false;
        var _loop_4 = function (i) {
            var f1 = fork1[i];
            var f2 = fork2[i];
            // Compare optionValues arrays
            if (f1.optionValues.length !== f2.optionValues.length ||
                !f1.optionValues.every(function (val, idx) { return val === f2.optionValues[idx]; })) {
                return { value: false };
            }
            // Recursively compare sub-forks
            if (!compareFieldRefs(f1.fork, f2.fork)) {
                return { value: false };
            }
        };
        for (var i = 0; i < fork1.length; i++) {
            var state_1 = _loop_4(i);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        return true;
    }
    // Step 3: Compare the fieldRefs at the current level
    function compareFieldRefs(stateFieldRefs, forkFieldRefs) {
        if (stateFieldRefs.length !== forkFieldRefs.length)
            return false;
        for (var i = 0; i < stateFieldRefs.length; i++) {
            var stateFieldRef = stateFieldRefs[i];
            var forkFieldRef = forkFieldRefs[i];
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
function mapFormToDataStructure() {
    // This would return the current form's structure in your custom format
    // Placeholder: Replace with your actual implementation
    return { fork: [], optionValues: [] };
}
// Main traversal function
function traverseForm(fieldStore, currentDomain) {
    // Initial form snapshot
    var initialFormState = mapFormToDataStructure();
    var visitedForks = [initialFormState]; // Stores visited form states
    function mapFork(fieldRefList, optionValues) {
        // Traverse through fields and look for forks
        for (var _i = 0, fieldRefList_1 = fieldRefList; _i < fieldRefList_1.length; _i++) {
            var fieldRef = fieldRefList_1[_i];
            var field = fieldStore[currentDomain][fieldRef.id];
            // Check if this field has options (fork-creating field)
            if (field.options && field.options.length > 1) {
                // For each option, select it and compare the new state
                for (var _a = 0, _b = field.options; _a < _b.length; _a++) {
                    var option = _b[_a];
                    // Simulate selecting this option in the form (depends on your form interaction logic)
                    // Option's value could be applied here before mapping
                    var newFormState = mapFormToDataStructure(); // Get the updated form structure
                    // Compare new form state with the existing ones
                    var matchingFork = visitedForks.find(function (fork) {
                        // compareFormStates(fork, newFormState)
                    });
                    if (matchingFork) {
                        // If it matches an existing fork, add this option's value to the optionValues array
                        // let correspondingFork = fieldRef.fork?.find(f => compareFormStates({ form: f.fork }, matchingFork));
                        // if (correspondingFork) {
                        //     correspondingFork.optionValues.push(option.value);
                        // }
                    }
                    else {
                        // If it's a new form, create a new fork and add it to the fieldRef
                        var newFork = {
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
