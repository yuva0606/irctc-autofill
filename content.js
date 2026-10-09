const VALID_GENDERS = new Set(["M", "F", "T"]);
const VALID_BERTHS = new Set(["", "LB", "MB", "UB", "SL", "SU"]);
const VALID_PAYMENT_MODES = new Set(["2", "3"]);

function fail(message) {
    console.warn(`IRCTC Autofill: ${message}`);
    return { ok: false, error: message };
}

function validateRequest(message) {
    if (!message || message.type !== "AUTOFILL_NOW" || !Array.isArray(message.passengers) || !message.passengers.length) {
        return "Invalid autofill request.";
    }
    if (!VALID_PAYMENT_MODES.has(message.paymentMode)) {
        return "Unsupported payment mode.";
    }
    if (!message.passengers.every(passenger =>
        passenger && typeof passenger.name === "string" && passenger.name.trim().length >= 3 &&
        passenger.name.trim().length <= 16 && Number.isInteger(passenger.age) &&
        passenger.age >= 1 && passenger.age <= 120 && VALID_GENDERS.has(passenger.gender) &&
        VALID_BERTHS.has(passenger.berth)
    )) {
        return "Passenger details are invalid.";
    }
    if (message.fillContact && (typeof message.contactNumber !== "string" || !/^\d{10}$/.test(message.contactNumber))) {
        return "Contact number is invalid.";
    }
    if (message.preferredCoachEnabled && (typeof message.preferredCoachNumber !== "string" || !message.preferredCoachNumber.trim())) {
        return "Preferred coach number is invalid.";
    }
    return null;
}

function setTextValue(element, value) {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
    return element.value === String(value);
}

function setSelectValue(element, value) {
    element.value = value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return element.value === value;
}

async function ensurePassengerRows(requiredCount) {
    while (true) {
        const state = getPassengerFields();
        if (state.status !== "found") {
            return fail(`Cannot identify ${state.field}.`);
        }
        if (state.count >= requiredCount) {
            return { ok: true };
        }

        const addButton = getAddPassengerButton();
        if (addButton.status !== "found") {
            return fail(`Add Passenger control is ${addButton.status}.`);
        }

        const expectedCount = state.count + 1;
        addButton.element.click();
        const grew = await waitForCondition(() => {
            const nextState = getPassengerFields();
            return nextState.status === "found" && nextState.count >= expectedCount;
        }, 5000);

        if (!grew) {
            return fail("Passenger row was not added in time.");
        }
    }
}

function preflightDiagnostic(message) {
    const passengerState = getPassengerFields();
    const fields = { passengers: passengerState.status };
    fields.contact = message.fillContact ? getContactNumberInput().status : "disabled";
    fields.confirmedBerths = message.bookOnlyIfConfirmed
        ? getBookOnlyIfConfirmedCheckbox().status
        : "disabled";
    fields.preferredCoach = message.preferredCoachEnabled
        ? getPreferredCoachInput().status
        : "disabled";
    fields.payment = getPaymentOption(message.paymentMode).status;
    return fields;
}

async function applyOptionalPreferences(message) {
    const warnings = [];

    if (message.fillContact) {
        const contact = getContactNumberInput();
        if (contact.status !== "found" || !setTextValue(contact.element, message.contactNumber)) {
            return fail(`Contact field is ${contact.status === "found" ? "not accepting values" : contact.status}.`);
        }
    }
    if (message.bookOnlyIfConfirmed) {
        const confirmed = getBookOnlyIfConfirmedCheckbox();
        if (confirmed.status !== "found") {
            warnings.push(`Confirmed-berths preference was not applied (${confirmed.status} control).`);
            console.warn("IRCTC Autofill: confirmed-berths control is unavailable.");
        } else {
            if (!confirmed.element.checked) confirmed.element.click();
            if (!confirmed.element.checked) {
                warnings.push("Confirmed-berths preference could not be verified.");
            }
        }
    }
    if (message.preferredCoachEnabled) {
        const coach = getPreferredCoachInput();
        if (coach.status !== "found") {
            warnings.push(`Preferred coach number was not applied (${coach.status} control).`);
            console.warn("IRCTC Autofill: preferred-coach control is unavailable.");
        } else if (!setTextValue(coach.element, message.preferredCoachNumber)) {
            warnings.push("Preferred coach number could not be verified.");
        }
    }
    return { ok: true, warnings };
}

async function autofill(message) {
    const validationError = validateRequest(message);
    if (validationError) return fail(validationError);

    let diagnostic;
    const pageReady = await waitForCondition(() => {
        diagnostic = preflightDiagnostic(message);
        const ready = diagnostic.passengers === "found" &&
            diagnostic.payment === "found" &&
            (diagnostic.contact === "found" || diagnostic.contact === "disabled");
        return ready;
    });
    if (!pageReady) {
        return fail(`Unsupported or incomplete IRCTC passenger page: ${JSON.stringify(diagnostic)}.`);
    }

    const rowsResult = await ensurePassengerRows(message.passengers.length);
    if (!rowsResult.ok) return rowsResult;

    const state = getPassengerFields();
    if (state.status !== "found" || state.count < message.passengers.length) {
        return fail("Passenger fields changed while preparing the form.");
    }

    for (let index = 0; index < message.passengers.length; index++) {
        const passenger = message.passengers[index];
        const fields = state.fields;
        if (!setTextValue(fields.nameInputs[index], passenger.name) ||
            !setTextValue(fields.ageInputs[index], passenger.age) ||
            !setSelectValue(fields.genderSelects[index], passenger.gender) ||
            !setSelectValue(fields.berthSelects[index], passenger.berth)) {
            return fail(`Passenger row ${index + 1} did not retain its expected values.`);
        }
    }

    const optionalResult = await applyOptionalPreferences(message);
    if (!optionalResult.ok) return optionalResult;

    const payment = getPaymentOption(message.paymentMode);
    if (payment.status !== "found") return fail(`Payment option is ${payment.status}.`);
    if (!payment.element.checked) payment.element.click();
    if (!payment.element.checked) return fail("Payment option could not be selected.");

    const finalState = getPassengerFields();
    if (finalState.status !== "found" || finalState.count < message.passengers.length ||
        !message.passengers.every((passenger, index) =>
            finalState.fields.nameInputs[index].value === passenger.name &&
            finalState.fields.ageInputs[index].value === String(passenger.age) &&
            finalState.fields.genderSelects[index].value === passenger.gender &&
            finalState.fields.berthSelects[index].value === passenger.berth
        )) {
        return fail("Passenger form changed before continuing.");
    }

    const continueButtons = Array.from(document.querySelectorAll('button[type="submit"].train_Search'))
        .filter(button => button.textContent.trim() === "Continue");
    if (continueButtons.length !== 1) return fail("Continue button is missing or ambiguous.");

    continueButtons[0].click();
    return { ok: true, warnings: optionalResult.warnings };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== "AUTOFILL_NOW") return;
    autofill(message).then(sendResponse).catch(() => sendResponse(fail("Unexpected autofill error.")));
    return true;
});
