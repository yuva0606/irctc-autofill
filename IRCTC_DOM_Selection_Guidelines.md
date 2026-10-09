# IRCTC Autofill — DOM Selection & Dynamic UI Guidelines

## Purpose

This document contains the DOM-selection and dynamic-UI lessons learned while building the IRCTC Autofill browser extension.

The main rule is:

> Inspect the actual IRCTC DOM first and select elements using stable attributes and structure. Do not rely on Angular-generated classes or IDs.

---

## 1. Prefer stable attributes

Prefer attributes such as:

```javascript
[formcontrolname="passengerAge"]
```

```javascript
input[formcontrolname="passengerAge"]
```

```javascript
select[formcontrolname="passengerGender"]
```

```javascript
input[name="paymentType"][value="2"]
```

These are preferable to generated Angular classes such as:

```text
ng-tns-c89-118
ng-star-inserted
ng-tns-c89-62
```

Generated Angular classes can change between renders or application versions.

---

## 2. Be careful with Angular custom components

IRCTC can use custom components instead of putting the actual input directly on the element.

Example:

```html
<p-autocomplete formcontrolname="passengerName">
    <input type="text">
</p-autocomplete>
```

This:

```javascript
document.querySelector(
    '[formcontrolname="passengerName"]'
);
```

returns the `<p-autocomplete>` component, not the actual `<input>`.

The correct approach is:

```javascript
const component = document.querySelector(
    '[formcontrolname="passengerName"]'
);

const input = component.querySelector("input");
```

For multiple passenger rows:

```javascript
const components = document.querySelectorAll(
    '[formcontrolname="passengerName"]'
);

const inputs = Array.from(components).map(
    component => component.querySelector("input")
);
```

This distinction is important.

---

## 3. Prefer semantic/stable attributes over generated classes

Good:

```javascript
document.querySelector(
    'select[formcontrolname="passengerGender"]'
);
```

Fragile:

```javascript
document.querySelector(
    '.ng-tns-c89-118'
);
```

Likewise, if an element has:

```html
<input name="paymentType" value="2">
```

prefer:

```javascript
input[name="paymentType"][value="2"]
```

instead of relying on surrounding Angular classes.

---

## 4. Selecting buttons

When a button has useful stable attributes, combine them.

Example:

```html
<button
    type="submit"
    class="btnDefault train_Search">
    Continue
</button>
```

A reasonable selector is:

```javascript
button[type="submit"].train_Search
```

If multiple buttons could match, inspect the visible text:

```javascript
function getContinueButton() {
    const buttons = document.querySelectorAll(
        'button[type="submit"].train_Search'
    );

    for (const button of buttons) {
        if (button.textContent.trim() === "Continue") {
            return button;
        }
    }

    return null;
}
```

Use the most stable combination available.

---

## 5. When an element has no useful ID/class, use visible text carefully

The IRCTC **+ Add Passenger** control was:

```html
<a tabindex="0">
    <span class="prenext">
        + Add Passenger
    </span>

    <span class="prenext">
        / Add Infant With Berth
    </span>
</a>
```

The surrounding generated Angular classes were not useful.

A suitable approach is:

```javascript
function getAddPassengerButton() {
    const spans = document.querySelectorAll("span.prenext");

    for (const span of spans) {
        if (span.textContent.includes("+ Add Passenger")) {
            return span.closest("a");
        }
    }

    return null;
}
```

This avoids depending on generated Angular class names.

---

## 6. Inspect repeated elements

For passenger fields, first check:

```javascript
document.querySelectorAll(
    '[formcontrolname="passengerName"]'
);
```

and:

```javascript
document.querySelectorAll(
    'input[formcontrolname="passengerAge"]'
);

document.querySelectorAll(
    'select[formcontrolname="passengerGender"]'
);

document.querySelectorAll(
    'select[formcontrolname="passengerBerthChoice"]'
);
```

If all four return the same number of elements, they can be mapped by index:

```text
index 0 → IRCTC passenger row 1
index 1 → IRCTC passenger row 2
index 2 → IRCTC passenger row 3
```

For example:

```javascript
nameInputs[index]
ageInputs[index]
genderSelects[index]
berthSelects[index]
```

This approach was successfully tested with the current IRCTC passenger page.

---

## 7. Dynamic Angular pages require waiting

Do not assume an element exists immediately after page load.

For example, the `+ Add Passenger` control was not present when the content script initially executed, even though it appeared later after Angular rendered the page.

A reusable helper:

```javascript
function waitForElement(getElement, timeout = 10000) {
    return new Promise((resolve) => {

        const startTime = Date.now();

        const check = () => {

            const element = getElement();

            if (element) {
                resolve(element);
                return;
            }

            if (Date.now() - startTime >= timeout) {
                resolve(null);
                return;
            }

            setTimeout(check, 200);
        };

        check();
    });
}
```

Usage:

```javascript
const button = await waitForElement(
    getAddPassengerButton
);
```

This is preferable to arbitrary long delays such as:

```javascript
setTimeout(..., 5000);
```

---

## 8. Wait after clicking a dynamic control

After clicking a control that causes Angular to modify the DOM, wait for the new DOM state before continuing.

Example:

```javascript
addButton.click();

await new Promise(resolve => setTimeout(resolve, 300));
```

Then query the passenger rows again.

Do not assume the new row exists immediately after:

```javascript
addButton.click();
```

---

## 9. Use sequential async loops when timing matters

If the flow needs to be:

```text
Fill passenger 1
    ↓
wait
Fill passenger 2
    ↓
wait
Fill passenger 3
```

do not use:

```javascript
passengers.forEach(async passenger => {
    // ...
    await delay(200);
});
```

Use:

```javascript
for (let index = 0; index < passengers.length; index++) {

    const passenger = passengers[index];

    // Fill passenger

    await delay(200);
}
```

This guarantees sequential execution.

---

## 10. Dispatch events after changing Angular-controlled inputs

Simply doing:

```javascript
input.value = "John";
```

may not update Angular's internal form state.

For text inputs:

```javascript
input.value = value;

input.dispatchEvent(
    new Event("input", { bubbles: true })
);

input.dispatchEvent(
    new Event("change", { bubbles: true })
);
```

For selects:

```javascript
select.value = value;

select.dispatchEvent(
    new Event("change", { bubbles: true })
);
```

For the IRCTC passenger name autocomplete, dispatching the `input` event was particularly important.

---

## 11. Do not guess selectors

When a new IRCTC page or control needs to be automated:

1. Open DevTools.
2. Inspect the actual element.
3. Look for stable attributes:
   - `formcontrolname`
   - `name`
   - `value`
   - `type`
   - meaningful IDs
   - meaningful classes
4. Inspect the parent/child structure.
5. Check whether the element is a custom Angular component.
6. Check whether multiple instances exist.
7. Test the selector with `querySelector()` / `querySelectorAll()`.
8. Only then add it to `selectors.js`.

---

## 12. Content-script isolation

The extension's content script runs in an isolated JavaScript environment.

Therefore, a function defined in:

```text
selectors.js
```

may not be directly callable from the normal page DevTools console:

```javascript
getAddPassengerButton()
```

even though `selectors.js` is loaded correctly.

For debugging, call the function from the content script or temporarily log the result:

```javascript
console.log(
    "Add Passenger:",
    getAddPassengerButton()
);
```

---

# Current Known-Good Selectors

These selectors were tested successfully during development:

```javascript
// Passenger name component
'[formcontrolname="passengerName"]'

// Actual name input
component.querySelector("input")

// Age
'input[formcontrolname="passengerAge"]'

// Gender
'select[formcontrolname="passengerGender"]'

// Berth
'select[formcontrolname="passengerBerthChoice"]'

// Payment: BHIM / UPI
'input[name="paymentType"][value="2"]'

// Payment: Cards / Net Banking / Wallets / Others
'input[name="paymentType"][value="3"]'

// Continue
'button[type="submit"].train_Search'
```

---

# Current Working Passenger Flow

The current extension successfully handles:

```text
Saved passengers
        ↓
Start Autofill
        ↓
Check existing IRCTC passenger rows
        ↓
Click + Add Passenger when rows are missing
        ↓
Wait for Angular DOM update
        ↓
Fill each passenger
        ↓
Name + Age + Gender + Berth
        ↓
Select configured payment mode
        ↓
Click Continue
```

---

# General Rule for Future IRCTC Changes

If IRCTC changes its DOM:

1. Inspect the new DOM.
2. Identify stable attributes/structure.
3. Avoid generated Angular classes.
4. Test the selector manually.
5. Consider whether the element is dynamically rendered.
6. Add waiting logic if necessary.
7. Update `selectors.js`.
8. Test the affected flow before changing unrelated code.

Do not make broad refactors simply because the DOM changed. Preserve the existing working functionality whenever possible.
